import { performance } from "node:perf_hooks";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  StreamingCsvParser,
} from "../src/lib/unified-import";

const WINDOW_CHARS = 64 * 1024;
const ROW_BATCH_SIZE = 64;
const DESCRIPTION_CHARS = 768;

function snapshotMemory() {
  const usage = process.memoryUsage();
  return { heapUsedBytes: usage.heapUsed, rssBytes: usage.rss };
}

async function main(): Promise<void> {
  const parser = new StreamingCsvParser();
  let parsedRows = 0;
  let acceptedInputBytes = 0;
  let bufferedInput = "";
  let lineBatch: string[] = [];
  let sampleCount = 0;
  const baseline = snapshotMemory();
  let sampledPeakHeapBytes = baseline.heapUsedBytes;
  let sampledPeakRssBytes = baseline.rssBytes;

  const sampleMemory = () => {
    const usage = snapshotMemory();
    sampledPeakHeapBytes = Math.max(sampledPeakHeapBytes, usage.heapUsedBytes);
    sampledPeakRssBytes = Math.max(sampledPeakRssBytes, usage.rssBytes);
    sampleCount += 1;
  };

  const onRow = (_values: string[]) => {
    parsedRows += 1;
  };

  const feed = async (part: string) => {
    // Synthetic input is ASCII, so character count equals byte count.
    acceptedInputBytes += part.length;
    bufferedInput += part;
    while (bufferedInput.length >= WINDOW_CHARS) {
      const nextWindow = bufferedInput.slice(0, WINDOW_CHARS);
      bufferedInput = bufferedInput.slice(WINDOW_CHARS);
      await parser.push(nextWindow, onRow);
      sampleMemory();
    }
  };

  const startedAt = performance.now();
  await feed("item_code,name,description,quantity\r\n");
  const description = "x".repeat(DESCRIPTION_CHARS);
  for (let index = 1; index <= MAX_IMPORT_ROWS; index += 1) {
    lineBatch.push(`${String(index).padStart(6, "0")},Benchmark item ${index},${description},1\r\n`);
    if (lineBatch.length >= ROW_BATCH_SIZE) {
      await feed(lineBatch.join(""));
      lineBatch = [];
    }
  }
  if (lineBatch.length > 0) await feed(lineBatch.join(""));
  await parser.push(bufferedInput, onRow, true);
  sampleMemory();

  const elapsedMs = performance.now() - startedAt;
  const minExpectedBytes = 75 * 1024 * 1024;
  if (parsedRows !== MAX_IMPORT_ROWS + 1) {
    throw new Error(`Expected header + ${MAX_IMPORT_ROWS} rows, got ${parsedRows}.`);
  }
  if (acceptedInputBytes < minExpectedBytes || acceptedInputBytes > MAX_IMPORT_FILE_BYTES) {
    throw new Error(`Synthetic input size ${acceptedInputBytes} is outside the expected 75 MiB–100 MiB benchmark range.`);
  }

  const report = {
    benchmark: "aghbari-csv-streaming",
    result: "PASS",
    businessRows: MAX_IMPORT_ROWS,
    rowsParsedIncludingHeader: parsedRows,
    inputBytes: acceptedInputBytes,
    inputMiB: Number((acceptedInputBytes / (1024 * 1024)).toFixed(2)),
    chunkWindowChars: WINDOW_CHARS,
    rowBatchSize: ROW_BATCH_SIZE,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    throughputMiBPerSecond: Number((acceptedInputBytes / (1024 * 1024) / (elapsedMs / 1000)).toFixed(2)),
    baselineHeapUsedBytes: baseline.heapUsedBytes,
    sampledPeakHeapUsedBytes: sampledPeakHeapBytes,
    sampledHeapDeltaBytes: Math.max(0, sampledPeakHeapBytes - baseline.heapUsedBytes),
    baselineRssBytes: baseline.rssBytes,
    sampledPeakRssBytes: sampledPeakRssBytes,
    sampledRssDeltaBytes: Math.max(0, sampledPeakRssBytes - baseline.rssBytes),
    memorySamples: sampleCount,
    note: "Synthetic, bounded-window CI measurement; sampled heap/RSS is not a production P95 or full transient peak.",
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`Import streaming benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
