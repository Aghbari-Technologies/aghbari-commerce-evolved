import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, StreamingCsvParser } from "@/lib/unified-import";

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
