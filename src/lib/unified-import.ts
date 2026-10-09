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

/** Persist rows only for unverified chunks, except the final EOF row which may be missing if a prior run stopped after checkpointing the last chunk. */
export function shouldPersistParsedImportRow(
  chunkNumber: number,
  verifiedChunks: ReadonlySet<number>,
  finalizingCsv = false,
): boolean {
  return finalizingCsv || !verifiedChunks.has(chunkNumber);
}

export type VerifiedImportChunk = {
  chunk_number: number;
  byte_offset: number;
  byte_size: number;
  chunk_hash: string;
};

/**
 * Validate that the server's verified upload manifest is a contiguous prefix of this exact file.
 * A manifest with gaps, altered offsets, wrong chunk lengths or malformed hashes must not be
 * treated as resumable: doing so could skip missing bytes or overwrite rows under a false checkpoint.
 */
export function validateVerifiedImportChunkPrefix(
  chunks: VerifiedImportChunk[],
  fileSize: number,
  chunkSize: number = UPLOAD_CHUNK_BYTES,
): number[] {
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_IMPORT_FILE_BYTES) {
    throw new Error('حجم الملف غير صالح لاستئناف الاستيراد.');
  }
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > MAX_IMPORT_FILE_BYTES) {
    throw new Error('حجم شريحة الرفع غير صالح.');
  }
  const totalChunks = Math.ceil(fileSize / chunkSize);
  if (chunks.length > totalChunks) throw new Error('سجل شرائح الاستيراد يحتوي على شرائح أكثر من حجم الملف.');
  const sorted = [...chunks].sort((a, b) => a.chunk_number - b.chunk_number);
  const verified: number[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const chunk = sorted[index];
    const expectedOffset = index * chunkSize;
    const expectedSize = Math.min(chunkSize, fileSize - expectedOffset);
    if (chunk.chunk_number !== index) {
      throw new Error('تعذر الاستئناف الآمن: سجل الشرائح المحفوظة يحتوي فجوة عند الشريحة ' + index + '.');
    }
    if (chunk.byte_offset !== expectedOffset || chunk.byte_size !== expectedSize ||
        !/^[0-9a-f]{64}$/.test(chunk.chunk_hash)) {
      throw new Error('تعذر الاستئناف الآمن: بيانات الشريحة المحفوظة غير متطابقة عند الشريحة ' + index + '.');
    }
    verified.push(index);
  }
  return verified;
}

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

export type ImportTransformation = {
  field: string;
  operation: 'trim' | 'lowercase' | 'uppercase' | 'remove_spaces' | 'normalize_arabic' | 'replace_literal' | 'to_number' | 'date_iso';
  from?: string;
  to?: string;
};

export type ImportValidationRule = {
  field: string;
  rule: 'required' | 'numeric' | 'integer' | 'min' | 'max' | 'enum' | 'min_length' | 'max_length' | 'safe_pattern';
  value?: string | number;
  values?: string[];
  message?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate a profile's declarative rules before processing any data.
 * These rules are data, never JavaScript expressions or executable code.
 */
export function validateImportProfileRules(transformations: unknown[], validations: unknown[]): void {
  const operations = new Set<ImportTransformation['operation']>([
    'trim','lowercase','uppercase','remove_spaces','normalize_arabic','replace_literal','to_number','date_iso',
  ]);
  for (const [index, rule] of transformations.entries()) {
    if (!isPlainObject(rule) || typeof rule.field !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(rule.field) ||
      typeof rule.operation !== 'string' || !operations.has(rule.operation as ImportTransformation['operation'])) {
      throw new Error('قاعدة تحويل رقم ' + (index + 1) + ' غير مدعومة. استخدم field وoperation من قائمة التحويلات المسموحة.');
    }
    if (rule.operation === 'replace_literal' &&
      (typeof rule.from !== 'string' || rule.from.length > 200 || typeof rule.to !== 'string' || rule.to.length > 200)) {
      throw new Error('قاعدة replace_literal تحتاج from وto نصيين لا يتجاوز كل منهما 200 حرف.');
    }
  }

  const supported = new Set<ImportValidationRule['rule']>([
    'required','numeric','integer','min','max','enum','min_length','max_length','safe_pattern',
  ]);
  for (const [index, rule] of validations.entries()) {
    if (!isPlainObject(rule) || typeof rule.field !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(rule.field) ||
      typeof rule.rule !== 'string' || !supported.has(rule.rule as ImportValidationRule['rule'])) {
      throw new Error('قاعدة تحقق رقم ' + (index + 1) + ' غير مدعومة. استخدم field وrule من قائمة التحقق المسموحة.');
    }
    if (['min','max','min_length','max_length'].includes(String(rule.rule)) &&
      (typeof rule.value !== 'number' || !Number.isFinite(rule.value) || rule.value < 0 || rule.value > 1_000_000_000)) {
      throw new Error('قيمة الحد في قاعدة ' + rule.rule + ' غير صالحة للحقل ' + rule.field + '.');
    }
    if (rule.rule === 'enum' &&
      (!Array.isArray(rule.values) || rule.values.length > 100 || rule.values.some((value) => typeof value !== 'string' || value.length > 200))) {
      throw new Error('قاعدة enum تحتاج قائمة نصية لا تتجاوز 100 قيمة.');
    }
    if (rule.rule === 'safe_pattern') {
      const pattern = rule.value;
      // Permit bounded, simple validation patterns; reject constructs commonly used for ReDoS.
      if (typeof pattern !== 'string' || pattern.length > 120 ||
        /\\[1-9]|\(\?[=!<:]|\([^)]*[+*{][^)]*\)[+*{]|(?:\.\*){2,}/.test(pattern)) {
        throw new Error('نمط التحقق غير آمن أو طويل؛ استخدم نمطًا بسيطًا محدودًا.');
      }
      try { new RegExp(pattern, 'u'); } catch { throw new Error('نمط التحقق ليس تعبيرًا صالحًا للحقل ' + rule.field + '.'); }
    }
  }
}

function normalizeArabicValue(value: string): string {
  return value.toLocaleLowerCase('ar')
    .replace(/[\u0640]/g, '').replace(/\p{M}+/gu, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(value: string): string | null {
  const input = value.trim();
  let year = 0; let month = 0; let day = 0;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (match) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else {
    match = /^(\d{2})[/. -](\d{2})[/. -](\d{4})$/.exec(input);
    if (!match) return null;
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function applyImportProfileRules(
  row: ParsedImportRow,
  transformations: unknown[] = [],
  validations: unknown[] = [],
): ParsedImportRow {
  const data = { ...row.data };
  const errors = [...row.errors];

  for (const raw of transformations) {
    const rule = raw as ImportTransformation;
    if (!(rule.field in data) || data[rule.field] == null || data[rule.field] === '') continue;
    const value = String(data[rule.field]);
    switch (rule.operation) {
      case 'trim': data[rule.field] = value.trim(); break;
      case 'lowercase': data[rule.field] = value.toLocaleLowerCase('ar'); break;
      case 'uppercase': data[rule.field] = value.toLocaleUpperCase('ar'); break;
      case 'remove_spaces': data[rule.field] = value.replace(/\s+/g, ''); break;
      case 'normalize_arabic': data[rule.field] = normalizeArabicValue(value); break;
      case 'replace_literal': data[rule.field] = value.split(rule.from ?? '').join(rule.to ?? ''); break;
      case 'to_number': {
        const normalized = value.replace(/,/g, '').trim();
        if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
          errors.push('تعذر تحويل الحقل ' + rule.field + ' إلى رقم صالح');
        } else {
          data[rule.field] = normalized;
        }
        break;
      }
      case 'date_iso': {
        const normalized = toIsoDate(value);
        if (!normalized) errors.push('تعذر توحيد التاريخ في الحقل ' + rule.field + '؛ استخدم YYYY-MM-DD أو DD/MM/YYYY');
        else data[rule.field] = normalized;
        break;
      }
    }
  }

  for (const raw of validations) {
    const rule = raw as ImportValidationRule;
    const rawValue = data[rule.field];
    const value = rawValue == null ? '' : String(rawValue).trim();
    const numeric = value !== '' ? Number(value) : Number.NaN;
    let failed = false;
    switch (rule.rule) {
      case 'required': failed = value.length === 0; break;
      case 'numeric': failed = value !== '' && (!Number.isFinite(numeric) || !/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)); break;
      case 'integer': failed = value !== '' && (!Number.isInteger(numeric) || !Number.isFinite(numeric)); break;
      case 'min': failed = value !== '' && (!Number.isFinite(numeric) || numeric < Number(rule.value)); break;
      case 'max': failed = value !== '' && (!Number.isFinite(numeric) || numeric > Number(rule.value)); break;
      case 'enum': failed = value !== '' && !(rule.values ?? []).includes(value); break;
      case 'min_length': failed = value !== '' && value.length < Number(rule.value); break;
      case 'max_length': failed = value.length > Number(rule.value); break;
      case 'safe_pattern': failed = value !== '' && !(new RegExp(String(rule.value), 'u')).test(value); break;
    }
    if (failed) errors.push(rule.message?.slice(0, 240) || ('قاعدة التحقق ' + rule.rule + ' فشلت للحقل ' + rule.field));
  }

  const uniqueErrors = [...new Set(errors)];
  return {
    ...row,
    data,
    errors: uniqueErrors,
    status: uniqueErrors.length ? 'rejected' : row.status,
  };
}

export function validateCsvRow(values: string[], headers: string[], rowNumber: number): ParsedImportRow {
  const data: Record<string, unknown> = {};
  const errors: string[] = [];
  if (values.length > MAX_IMPORT_COLUMNS) errors.push(`عدد الأعمدة يتجاوز ${MAX_IMPORT_COLUMNS}`);
  if (values.length > headers.length) errors.push('عدد خلايا الصف أكبر من عدد أعمدة العناوين');
  for (let index = 0; index < Math.min(headers.length, values.length); index += 1) {
    const header = headers[index];
    if (!header) continue;
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
  private currentCellExceeded = false;
  private rowCount = 0;

  async push(chunk: string, onRow: (values: string[]) => void | Promise<void>, final = false): Promise<void> {
    this.pending += chunk;
    let cursor = 0;
    for (; cursor < this.pending.length; cursor += 1) {
      const char = this.pending[cursor];
      const next = this.pending[cursor + 1];
      if (char === '"' && cursor + 1 === this.pending.length && !final) break;
      if (char === '"' && this.quoted && next === '"') {
        if (!this.currentCellExceeded) {
          this.currentCell += '"';
          if (this.currentCell.length > MAX_IMPORT_CELL_CHARS) {
            this.currentCell = '';
            this.currentCellExceeded = true;
          }
        }
        cursor += 1;
        continue;
      }
      if (char === '"') {
        this.quoted = !this.quoted;
        continue;
      }
      if (char === ',' && !this.quoted) {
        this.currentRow.push(this.currentCellExceeded ? 'x'.repeat(MAX_IMPORT_CELL_CHARS + 1) : this.currentCell);
        this.currentCell = '';
        this.currentCellExceeded = false;
        continue;
      }
      if ((char === '\n' || char === '\r') && !this.quoted) {
        if (char === '\r' && next === '\n') cursor += 1;
        this.currentRow.push(this.currentCellExceeded ? 'x'.repeat(MAX_IMPORT_CELL_CHARS + 1) : this.currentCell);
        this.currentCell = '';
        this.currentCellExceeded = false;
        const values = this.currentRow;
        this.currentRow = [];
        if (values.some((part) => part.trim() !== '')) {
          this.rowCount += 1;
          if (this.rowCount > MAX_IMPORT_ROWS + 1) throw new Error(`الملف يتجاوز حد ${MAX_IMPORT_ROWS} صفاً`);
          await onRow(values);
        }
        continue;
      }
      if (!this.currentCellExceeded) {
        this.currentCell += char;
        if (this.currentCell.length > MAX_IMPORT_CELL_CHARS) {
          // Bound memory, mark the row invalid, and continue parsing without silently truncating accepted data.
          this.currentCell = '';
          this.currentCellExceeded = true;
        }
      }
    }
    this.pending = this.pending.slice(cursor);
    if (final) {
      if (this.quoted) throw new Error('ملف CSV يحتوي على علامة اقتباس غير مغلقة');
      if (this.currentCell.length || this.currentCellExceeded || this.currentRow.length || this.pending.length) {
        this.currentCell += this.pending;
        this.pending = '';
        this.currentRow.push(this.currentCellExceeded ? 'x'.repeat(MAX_IMPORT_CELL_CHARS + 1) : this.currentCell);
        this.currentCell = '';
        this.currentCellExceeded = false;
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
