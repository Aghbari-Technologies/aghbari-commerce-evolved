import { describe, expect, it } from "vitest";
import {
  MAX_ARCHIVE_EXPANSION_FACTOR, MAX_IMPORT_COLUMNS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, MAX_IMPORT_CELL_CHARS,
  StreamingCsvParser, assertXlsxExpandedBytesWithinLimit, getXlsxExpandedByteLimit,
  hashFileSha256, isImportFileSizeAllowed, parseXlsxFirstWorksheet, validateCsvRow,
} from "@/lib/unified-import";

type StoredZipFixtureEntry = {
  path: string;
  content: string;
  declaredUncompressedSize?: number;
};

/** Tiny ZIP writer for parser-boundary tests; the production reader does not verify CRC. */
function makeStoredZip(entries: StoredZipFixtureEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, entry.declaredUncompressedSize ?? data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);

    localParts.push(local, data);
    centralParts.push(central);
    localOffset += local.byteLength + data.byteLength;
    centralSize += central.byteLength;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  return new Blob([...localParts, ...centralParts, end]);
}

async function repointCentralDirectoryEntry(
  archive: Blob,
  sourcePath: string,
  targetPath: string,
): Promise<Blob> {
  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let directoryOffset = -1;
  let directorySize = 0;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      directorySize = view.getUint32(offset + 12, true);
      directoryOffset = view.getUint32(offset + 16, true);
      break;
    }
  }
  if (directoryOffset < 0 || directoryOffset + directorySize > bytes.length) {
    throw new Error("ZIP fixture has no valid central directory");
  }

  let sourceEntryOffset = -1;
  let targetLocalHeaderOffset = -1;
  const directoryEnd = directoryOffset + directorySize;
  for (let offset = directoryOffset; offset + 46 <= directoryEnd;) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("ZIP fixture central entry is invalid");
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (path === sourcePath) sourceEntryOffset = offset;
    if (path === targetPath) targetLocalHeaderOffset = view.getUint32(offset + 42, true);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (sourceEntryOffset < 0 || targetLocalHeaderOffset < 0) {
    throw new Error("ZIP fixture source or target member is missing");
  }
  view.setUint32(sourceEntryOffset + 42, targetLocalHeaderOffset, true);
  return new Blob([bytes]);
}

function xlsxColumnName(columnNumber: number): string {
  let value = columnNumber;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function makeXlsxWorksheetArchive(rowXml: string): Blob {
  return makeStoredZip([
    {
      path: "xl/workbook.xml",
      content: '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" r:id="rId1"/></sheets></workbook>',
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      path: "xl/worksheets/sheet1.xml",
      content: `<worksheet><sheetData><row r="1">${rowXml}</row></sheetData></worksheet>`,
    },
  ]);
}

function xlsxInlineCell(address: string, value: string): string {
  return `<c r="${address}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

describe("large-file import boundaries", () => {
  it("accepts only positive safe file sizes at or below 100 MiB", async () => {
    expect(isImportFileSizeAllowed(1)).toBe(true);
    expect(isImportFileSizeAllowed(MAX_IMPORT_FILE_BYTES)).toBe(true);
    expect(isImportFileSizeAllowed(MAX_IMPORT_FILE_BYTES + 1)).toBe(false);
    expect(isImportFileSizeAllowed(0)).toBe(false);
    expect(isImportFileSizeAllowed(-1)).toBe(false);
    expect(isImportFileSizeAllowed(1.5)).toBe(false);
    expect(isImportFileSizeAllowed(Number.NaN)).toBe(false);
    expect(isImportFileSizeAllowed(Number.POSITIVE_INFINITY)).toBe(false);

    // The exact size ceiling is checked by the shared predicate above.
    // Real large-file processing is measured by the bounded-window CI benchmark; keep unit tests bounded.

    // Oversized blobs must be rejected before trying to read their slices.
    const overLimitBlob = { size: MAX_IMPORT_FILE_BYTES + 1 } as unknown as Blob;
    await expect(hashFileSha256(overLimitBlob)).rejects.toThrow("100MB");
    await expect(parseXlsxFirstWorksheet(overLimitBlob, () => undefined)).rejects.toThrow("100MB");
  });

  it("accepts exactly 100 CSV columns and bounds a hostile row with excess columns", async () => {
    const headers = Array.from({ length: MAX_IMPORT_COLUMNS }, (_value, index) =>
      index === 0 ? "item_code" : `field_${index}`,
    );
    const values = headers.map((_header, index) => index === 0 ? "000125" : "value");
    expect(validateCsvRow(values, headers, 1).status).toBe("valid");

    const validParser = new StreamingCsvParser();
    let validValues: string[] | undefined;
    await validParser.push(`${values.join(",")}\n`, (row) => { validValues = row; }, true);
    expect(validValues).toHaveLength(MAX_IMPORT_COLUMNS);
    expect(validateCsvRow(validValues!, headers, 1).status).toBe("valid");

    // A 50,000-delimiter line must not allocate a 50,001-element row array.
    const overflowParser = new StreamingCsvParser();
    let overflowValues: string[] | undefined;
    await overflowParser.push(`000125${",".repeat(50_000)}overflow\n`, (row) => { overflowValues = row; }, true);
    expect(overflowValues).toHaveLength(MAX_IMPORT_COLUMNS + 1);

    const rejected = validateCsvRow(overflowValues!, [...headers, "field_100"], 2);
    expect(rejected.status).toBe("rejected");
    expect(rejected.errors).toContain(`عدد الأعمدة يتجاوز ${MAX_IMPORT_COLUMNS}`);
  });

  it("accepts a 4,000-character cell and rejects 4,001 characters without truncating silently", async () => {
    const headers = ["item_code", "name"];
    const exact = validateCsvRow(["000125", "x".repeat(MAX_IMPORT_CELL_CHARS)], headers, 1);
    expect(exact.status).toBe("valid");
    expect((exact.data.name as string).length).toBe(MAX_IMPORT_CELL_CHARS);

    const parser = new StreamingCsvParser();
    let parsed: string[] | undefined;
    await parser.push(`000126,${"x".repeat(MAX_IMPORT_CELL_CHARS + 1)}\n`, (row) => { parsed = row; }, true);
    expect(parsed?.[1]).toHaveLength(MAX_IMPORT_CELL_CHARS + 1);
    const oversized = validateCsvRow(parsed!, headers, 2);
    expect(oversized.status).toBe("rejected");
    expect(oversized.errors.some((error) => error.includes(String(MAX_IMPORT_CELL_CHARS)))).toBe(true);
  });

  it("enforces XLSX column and cell limits through the actual ZIP reader", async () => {
    const cells = Array.from({ length: MAX_IMPORT_COLUMNS }, (_value, index) => {
      const value = index === 0 ? "000125" : index === 1 ? "x".repeat(MAX_IMPORT_CELL_CHARS) : `v${index + 1}`;
      return xlsxInlineCell(`${xlsxColumnName(index + 1)}1`, value);
    }).join("");
    const validArchive = makeXlsxWorksheetArchive(cells);
    let parsedRow: string[] | undefined;
    const result = await parseXlsxFirstWorksheet(validArchive, (row) => { parsedRow = row; });
    expect(result).toMatchObject({ rowCount: 1, worksheetName: "Sheet1" });
    expect(parsedRow).toHaveLength(MAX_IMPORT_COLUMNS);
    expect(parsedRow?.[1]).toHaveLength(MAX_IMPORT_CELL_CHARS);

    const tooManyCells = cells + xlsxInlineCell("CW1", "overflow");
    await expect(parseXlsxFirstWorksheet(makeXlsxWorksheetArchive(tooManyCells), () => undefined))
      .rejects.toThrow(`${MAX_IMPORT_COLUMNS} عمودًا`);

    const overlongArchive = makeXlsxWorksheetArchive(
      xlsxInlineCell("A1", "000126") + xlsxInlineCell("B1", "x".repeat(MAX_IMPORT_CELL_CHARS + 1)),
    );
    let overlongRow: string[] | undefined;
    await parseXlsxFirstWorksheet(overlongArchive, (row) => { overlongRow = row; });
    // XLXS decoding must cap a maliciously long field to a small invalid sentinel.
    expect(overlongRow?.[1]).toHaveLength(MAX_IMPORT_CELL_CHARS + 1);
    expect(validateCsvRow(overlongRow!, ["item_code", "name"], 2).status).toBe("rejected");
  });

  it("rejects a central-directory entry redirected to another member's local header", async () => {
    const workbookXml = '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" r:id="rId1"/></sheets></workbook>';
    const archive = makeStoredZip([
      { path: "xl/workbook.xml", content: workbookXml },
      {
        path: "xl/_rels/workbook.xml.rels",
        content: '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      },
      { path: "xl/worksheets/sheet1.xml", content: '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>000125</t></is></c></row></sheetData></worksheet>' },
      // Same byte count/content lets the old reader consume this payload while trusting the wrong path.
      { path: "xl/decoy.xml", content: workbookXml },
    ]);
    const redirected = await repointCentralDirectoryEntry(archive, "xl/workbook.xml", "xl/decoy.xml");
    await expect(parseXlsxFirstWorksheet(redirected, () => undefined))
      .rejects.toThrow("ترويسة مكون XLSX لا تطابق فهرس ZIP");
  });

  it("rejects a forged XLSX central-directory expansion claim before reading member bytes", async () => {
    const file = makeStoredZip([{
      path: "xl/workbook.xml",
      content: "x",
      declaredUncompressedSize: 5 * 1024 * 1024 + 1,
    }]);
    expect(getXlsxExpandedByteLimit(file.size)).toBe(5 * 1024 * 1024);
    await expect(parseXlsxFirstWorksheet(file, () => undefined)).rejects.toThrow("الحد الآمن");
  });

  it("caps XLSX expansion by both the 10x archive ratio and 100 MiB absolute maximum", () => {
    expect(MAX_ARCHIVE_EXPANSION_FACTOR).toBe(10);
    expect(getXlsxExpandedByteLimit(1024 * 1024)).toBe(10 * 1024 * 1024);
    expect(getXlsxExpandedByteLimit(1)).toBe(5 * 1024 * 1024);
    expect(getXlsxExpandedByteLimit(20 * 1024 * 1024)).toBe(MAX_IMPORT_FILE_BYTES);
    expect(() => getXlsxExpandedByteLimit(MAX_IMPORT_FILE_BYTES + 1)).toThrow("100MB");

    const limit = getXlsxExpandedByteLimit(1024 * 1024);
    expect(() => assertXlsxExpandedBytesWithinLimit(0, limit, limit)).not.toThrow();
    expect(() => assertXlsxExpandedBytesWithinLimit(0, limit + 1, limit)).toThrow("الحد الآمن");
    expect(() => assertXlsxExpandedBytesWithinLimit(limit - 10, 11, limit)).toThrow("الحد الآمن");
    expect(() => assertXlsxExpandedBytesWithinLimit(-1, 1, limit)).toThrow("الحد الآمن");
  });
});

describe("large-file CSV streaming acceptance", () => {
  it("streams the full 100,000-row limit through 64 KiB windows and rejects row 100,001", async () => {
    expect(MAX_IMPORT_ROWS).toBe(100_000);

    const parser = new StreamingCsvParser();
    const inputWindowChars = 64 * 1024;
    let inputBuffer = "";
    let parsedRows = 0;
    let firstRow: string[] | undefined;
    let lastRow: string[] | undefined;

    const onRow = (values: string[]) => {
      parsedRows += 1;
      if (parsedRows === 1) firstRow = values;
      lastRow = values;
    };

    const feed = async (part: string) => {
      inputBuffer += part;
      while (inputBuffer.length >= inputWindowChars) {
        const nextWindow = inputBuffer.slice(0, inputWindowChars);
        inputBuffer = inputBuffer.slice(inputWindowChars);
        await parser.push(nextWindow, onRow);
      }
    };

    await feed("item_code,name,quantity\r\n");
    for (let index = 1; index <= MAX_IMPORT_ROWS; index += 1) {
      const itemCode = String(index).padStart(6, "0");
      await feed(`${itemCode},Item ${index},1\r\n`);
    }
    await parser.push(inputBuffer, onRow, true);

    // The parser includes one header row, so exactly MAX_IMPORT_ROWS business rows are accepted.
    expect(parsedRows).toBe(MAX_IMPORT_ROWS + 1);
    expect(firstRow).toEqual(["item_code", "name", "quantity"]);
    expect(lastRow).toEqual(["100000", "Item 100000", "1"]);

    await expect(parser.push("100001,Overflow,1\r\n", onRow))
      .rejects.toThrow("100000");
    expect(parsedRows).toBe(MAX_IMPORT_ROWS + 1);
  });
});
