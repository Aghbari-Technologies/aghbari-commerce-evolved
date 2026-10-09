/**
 * Shared deterministic primitives for every import source.
 * Raw files are streamed and never persisted; callers persist metadata and normalized rows only.
 */
export const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 100_000;
export const MAX_IMPORT_COLUMNS = 100;
export const MAX_IMPORT_CELL_CHARS = 4_000;
export const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;
export const PROCESSING_CHUNK_ROWS = 1_000;
export const MAX_ARCHIVE_EXPANSION_FACTOR = 10;

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** Incremental SHA-256 implementation avoids buffering a 100MB file just to fingerprint it. */
export class IncrementalSha256 {
  private state = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private byteLength = 0n;
  private finished = false;

  update(input: Uint8Array): this {
    if (this.finished) throw new Error('SHA-256 digest is already finalized');
    this.byteLength += BigInt(input.byteLength);
    let offset = 0;
    if (this.bufferLength) {
      const take = Math.min(64 - this.bufferLength, input.length);
      this.buffer.set(input.subarray(0, take), this.bufferLength);
      this.bufferLength += take;
      offset += take;
      if (this.bufferLength === 64) {
        this.compress(this.buffer);
        this.bufferLength = 0;
      }
    }
    while (offset + 64 <= input.length) {
      this.compress(input.subarray(offset, offset + 64));
      offset += 64;
    }
    if (offset < input.length) {
      this.buffer.set(input.subarray(offset), 0);
      this.bufferLength = input.length - offset;
    }
    return this;
  }

  digestHex(): string {
    if (this.finished) throw new Error('SHA-256 digest can only be read once');
    const bits = this.byteLength * 8n;
    this.buffer[this.bufferLength++] = 0x80;
    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength);
      this.compress(this.buffer);
      this.bufferLength = 0;
    }
    this.buffer.fill(0, this.bufferLength, 56);
    const view = new DataView(this.buffer.buffer);
    view.setUint32(56, Number((bits >> 32n) & 0xffffffffn), false);
    view.setUint32(60, Number(bits & 0xffffffffn), false);
    this.compress(this.buffer);
    this.finished = true;
    return Array.from(this.state, (value) => value.toString(16).padStart(8, '0')).join('');
  }

  private compress(block: Uint8Array): void {
    const words = new Uint32Array(64);
    const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const x = words[i - 15];
      const y = words[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = Array.from(this.state);
    for (let i = 0; i < 64; i += 1) {
      const sigma1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choice = (e & f) ^ (~e & g);
      const t1 = (h + sigma1 + choice + SHA256_K[i] + words[i]) >>> 0;
      const sigma0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sigma0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    const work = [a,b,c,d,e,f,g,h];
    for (let i = 0; i < 8; i += 1) this.state[i] = (this.state[i] + work[i]) >>> 0;
  }
}

export async function hashFileSha256(file: Blob, onProgress?: (processedBytes: number) => void): Promise<string> {
  const digest = new IncrementalSha256();
  for (let offset = 0; offset < file.size; offset += UPLOAD_CHUNK_BYTES) {
    const bytes = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + UPLOAD_CHUNK_BYTES)).arrayBuffer());
    digest.update(bytes);
    onProgress?.(Math.min(file.size, offset + bytes.byteLength));
  }
  return digest.digestHex();
}

export const DEFAULT_SYNONYMS: Record<string, string> = {
  'الصنف': 'item_code', 'رمز الصنف': 'item_code', 'الكود': 'item_code', 'sku': 'item_code', 'code': 'item_code',
  'اسم الصنف': 'product_name', 'المنتج': 'product_name', 'اسم المنتج': 'product_name', 'name': 'product_name',
  'الكمية': 'quantity', 'الرصيد': 'quantity', 'المخزون': 'quantity', 'qty': 'quantity', 'quantity': 'quantity',
  'العميل': 'customer_code', 'كود العميل': 'customer_code', 'customer': 'customer_code',
  'المورد': 'supplier_code', 'كود المورد': 'supplier_code', 'supplier': 'supplier_code',
  'الإيراد': 'revenue', 'المبيعات': 'revenue', 'sales': 'revenue', 'revenue': 'revenue',
  'السعر': 'price', 'التكلفة': 'cost', 'التاريخ': 'date', 'date': 'date',
};

export function normalizeHeader(value: string, synonyms: Record<string, string> = DEFAULT_SYNONYMS): string {
  const cleaned = value.trim().toLocaleLowerCase('ar').replace(/[ـ_-]+/g, ' ').replace(/\s+/g, ' ');
  return synonyms[cleaned] ?? cleaned.replace(/\s/g, '_');
}

export type ParsedImportRow = {
  row_number: number;
  data: Record<string, unknown>;
  status: 'valid' | 'warning' | 'rejected';
  errors: string[];
};

export function validateCsvRow(values: string[], headers: string[], rowNumber: number): ParsedImportRow {
  const data: Record<string, unknown> = {};
  const errors: string[] = [];
  if (values.length > MAX_IMPORT_COLUMNS) errors.push(`عدد الأعمدة يتجاوز ${MAX_IMPORT_COLUMNS}`);
  if (values.length > headers.length) errors.push('عدد خلايا الصف أكبر من عدد أعمدة العناوين');
  for (let index = 0; index < Math.min(headers.length, values.length); index += 1) {
    const value = values[index] ?? '';
    if (value.length > MAX_IMPORT_CELL_CHARS) {
      errors.push(`الخلية ${headers[index]} تتجاوز ${MAX_IMPORT_CELL_CHARS} حرف`);
      continue;
    }
    // Keep identifiers as strings to preserve leading zeros (e.g. SKU 000125).
    data[headers[index]] = value.trim();
  }
  if (!String(data.item_code ?? '').trim() && !String(data.customer_code ?? '').trim() && !String(data.supplier_code ?? '').trim()) {
    errors.push('مفتاح الهوية التجاري مطلوب (رمز الصنف أو العميل أو المورد)');
  }
  for (const field of ['quantity','revenue','price','cost']) {
    const value = data[field];
    if (value !== undefined && value !== '' && (typeof value !== 'string' || !/^-?[0-9]+(?:\.[0-9]+)?$/.test(value))) {
      errors.push(`الحقل ${field} يجب أن يكون رقماً صالحاً`);
    }
  }
  return { row_number: rowNumber, data, status: errors.length ? 'rejected' : 'valid', errors };
}

/** Stateful RFC4180-style CSV parser. It handles CRLF and escaped quotes across read boundaries. */
export class StreamingCsvParser {
  private pending = '';
  private currentRow: string[] = [];
  private currentCell = '';
  private quoted = false;
  private rowCount = 0;

  async push(chunk: string, onRow: (values: string[]) => void | Promise<void>, final = false): Promise<void> {
    this.pending += chunk;
    let cursor = 0;
    for (; cursor < this.pending.length; cursor += 1) {
      const char = this.pending[cursor];
      const next = this.pending[cursor + 1];
      if (char === '"' && cursor + 1 === this.pending.length && !final) break;
      if (char === '"' && this.quoted && next === '"') {
        this.currentCell += '"';
        cursor += 1;
        continue;
      }
      if (char === '"') {
        this.quoted = !this.quoted;
        continue;
      }
      if (char === ',' && !this.quoted) {
        this.currentRow.push(this.currentCell);
        this.currentCell = '';
        continue;
      }
      if ((char === '\n' || char === '\r') && !this.quoted) {
        if (char === '\r' && next === '\n') cursor += 1;
        this.currentRow.push(this.currentCell);
        this.currentCell = '';
        const values = this.currentRow;
        this.currentRow = [];
        if (values.some((part) => part.trim() !== '')) {
          this.rowCount += 1;
          if (this.rowCount > MAX_IMPORT_ROWS + 1) throw new Error(`الملف يتجاوز حد ${MAX_IMPORT_ROWS} صفاً`);
          await onRow(values);
        }
        continue;
      }
      this.currentCell += char;
      if (this.currentCell.length > MAX_IMPORT_CELL_CHARS) {
        // Keep parsing state stable but refuse the row instead of truncating user data.
        throw new Error(`خلية تتجاوز الحد الأقصى ${MAX_IMPORT_CELL_CHARS} حرفاً؛ لم يتم اقتطاع البيانات`);
      }
    }
    this.pending = this.pending.slice(cursor);
    if (final) {
      if (this.quoted) throw new Error('ملف CSV يحتوي على علامة اقتباس غير مغلقة');
      if (this.currentCell.length || this.currentRow.length || this.pending.length) {
        this.currentCell += this.pending;
        this.pending = '';
        this.currentRow.push(this.currentCell);
        this.currentCell = '';
        const values = this.currentRow;
        this.currentRow = [];
        if (values.some((part) => part.trim() !== '')) {
          this.rowCount += 1;
          if (this.rowCount > MAX_IMPORT_ROWS + 1) throw new Error(`الملف يتجاوز حد ${MAX_IMPORT_ROWS} صفاً`);
          await onRow(values);
        }
      }
    }
  }
}

export type QualityBreakdown = {
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
  temporalReferentialIntegrity: number;
};
export type QualityResult = QualityBreakdown & { score: number; label: 'excellent' | 'acceptable' | 'warning' | 'rejected' };

export class DataQualityAccumulator {
  private total = 0;
  private completeFields = 0;
  private requiredFieldCount = 0;
  private validRows = 0;
  private consistentRows = 0;
  private temporalReferentialRows = 0;
  private readonly keys = new Set<string>();

  constructor(private readonly requiredColumns: string[], private readonly matchingKey: string) {}

  add(row: ParsedImportRow): void {
    this.total += 1;
    this.requiredFieldCount += Math.max(this.requiredColumns.length, 1);
    const required = this.requiredColumns.length ? this.requiredColumns : [this.matchingKey];
    this.completeFields += required.filter((field) => String(row.data[field] ?? '').trim() !== '').length;
    if (row.status !== 'rejected') this.validRows += 1;

    const key = String(row.data[this.matchingKey] ?? '').trim();
    if (key) this.keys.add(key);

    const numericFields = ['quantity','revenue','price','cost'];
    const consistent = numericFields.every((field) => {
      const value = row.data[field];
      return value === undefined || value === '' || (typeof value === 'string' && /^-?[0-9]+(?:\.[0-9]+)?$/.test(value));
    });
    if (consistent) this.consistentRows += 1;

    const date = String(row.data.date ?? '').trim();
    const dateOkay = !date || /^([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}[/. -][0-9]{2}[/. -][0-9]{4})$/.test(date);
    if (key && dateOkay) this.temporalReferentialRows += 1;
  }

  result(): QualityResult {
    const pct = (value: number) => this.total ? (value / this.total) * 100 : 0;
    const completeness = this.total ? (this.completeFields / Math.max(this.requiredFieldCount, 1)) * 100 : 0;
    const validity = pct(this.validRows);
    const uniqueness = this.total ? (this.keys.size / this.total) * 100 : 0;
    const consistency = pct(this.consistentRows);
    const temporalReferentialIntegrity = pct(this.temporalReferentialRows);
    const score = Math.max(0, Math.min(100, Math.round((completeness + validity + uniqueness + consistency + temporalReferentialIntegrity) / 5)));
    const label = score >= 90 ? 'excellent' : score >= 75 ? 'acceptable' : score >= 50 ? 'warning' : 'rejected';
    return { score, label, completeness, validity, uniqueness, consistency, temporalReferentialIntegrity };
  }
}

export function chooseImportStatus(score: number): 'completed' | 'manual_review' | 'rejected' {
  if (!Number.isFinite(score) || score < 50) return 'rejected';
  if (score < 75) return 'manual_review';
  return 'completed';
}
