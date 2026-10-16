import { describe, expect, it } from "vitest";
import {
  MAX_ARCHIVE_EXPANSION_FACTOR, MAX_IMPORT_COLUMNS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, MAX_IMPORT_CELL_CHARS,
  StreamingCsvParser, assertXlsxExpandedBytesWithinLimit, getXlsxExpandedByteLimit,
  isImportFileSizeAllowed, validateCsvRow,
} from "@/lib/unified-import";

describe("large-file import boundaries", () => {
  it("accepts only positive safe file sizes at or below 100 MiB", () => {
    expect(isImportFileSizeAllowed(1)).toBe(true);
    expect(isImportFileSizeAllowed(MAX_IMPORT_FILE_BYTES)).toBe(true);
    expect(isImportFileSizeAllowed(MAX_IMPORT_FILE_BYTES + 1)).toBe(false);
    expect(isImportFileSizeAllowed(0)).toBe(false);
    expect(isImportFileSizeAllowed(-1)).toBe(false);
    expect(isImportFileSizeAllowed(1.5)).toBe(false);
    expect(isImportFileSizeAllowed(Number.NaN)).toBe(false);
    expect(isImportFileSizeAllowed(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("accepts exactly 100 CSV columns and rejects a 101st column", () => {
    const headers = Array.from({ length: MAX_IMPORT_COLUMNS }, (_value, index) =>
      index === 0 ? "item_code" : `field_${index}`,
    );
    const values = headers.map((_header, index) => index === 0 ? "000125" : "value");
    expect(validateCsvRow(values, headers, 1).status).toBe("valid");

    const tooManyHeaders = [...headers, "field_100"];
    const tooManyValues = [...values, "overflow"];
    const rejected = validateCsvRow(tooManyValues, tooManyHeaders, 2);
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
