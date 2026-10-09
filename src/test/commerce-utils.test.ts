import { DataQualityAccumulator, IncrementalSha256, StreamingCsvParser, chooseImportStatus, normalizeHeader, validateCsvRow } from '@/lib/unified-import';
import { describe, expect, it } from 'vitest';
import { classifyAssistantIntent, normalizeCartDraft, summarizeAccount, validateQuickOrderLines } from '@/lib/commerce-utils';

describe('commerce completion utilities', () => {
  it('calculates totals only from persisted invoice and payment records', () => {
    expect(summarizeAccount(
      [{ id: 'i1', total_amount: '125.50' }, { id: 'i2', total_amount: 50 }],
      [{ invoice_id: 'i1', amount: '25.50' }, { invoice_id: 'i1', amount: 10 }],
    )).toEqual({ invoiced: 175.5, paid: 35.5, outstanding: 140 });
  });

  it('excludes void invoices from the account balance', () => {
    expect(summarizeAccount(
      [{ id: 'live', total_amount: 100 }, { id: 'void', total_amount: 500, status: 'void' }],
      [{ invoice_id: 'live', amount: 20 }, { invoice_id: 'void', amount: 500 }],
    )).toEqual({ invoiced: 100, paid: 20, outstanding: 80 });
  });

  it('rejects malformed, duplicate, fractional, and unbounded offline cart lines', () => {
    expect(normalizeCartDraft([
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p1', quantity: 8 },
      { product_id: 'p2', quantity: 0 },
      { product_id: 'p3', quantity: 1.5 },
      { product_id: 'p4', quantity: 10001 },
      null,
    ])).toEqual([{ product_id: 'p1', quantity: 2 }]);
  });

  it('validates multi-product quick orders and rejects quantities beyond stock', () => {
    expect(validateQuickOrderLines([
      { product_id: 'p1', product_name: 'Sugar', quantity: 3, available: 8, already_in_cart: 2 },
      { product_id: 'p2', product_name: 'Rice', quantity: 4, available: 4 },
    ])).toEqual({ valid: true });
    expect(validateQuickOrderLines([
      { product_id: 'p1', product_name: 'Sugar', quantity: 7, available: 8, already_in_cart: 2 },
    ])).toEqual({ valid: false, reason: 'insufficient_stock', product_name: 'Sugar' });
  });

  it('rejects empty or fractional quick-order quantities', () => {
    expect(validateQuickOrderLines([])).toEqual({ valid: false, reason: 'empty' });
    expect(validateQuickOrderLines([
      { product_id: 'p1', product_name: 'Sugar', quantity: 1.5, available: 8 },
    ])).toEqual({ valid: false, reason: 'invalid_quantity', product_name: 'Sugar' });
  });

  it('hashes incrementally with the standard SHA-256 vectors', () => {
    expect(new IncrementalSha256().digestHex()).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    const digest = new IncrementalSha256();
    digest.update(new TextEncoder().encode('a'));
    digest.update(new TextEncoder().encode('b'));
    digest.update(new TextEncoder().encode('c'));
    expect(digest.digestHex()).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('parses CSV quotes, CRLF, and escaped quotes across chunk boundaries', async () => {
    const parser = new StreamingCsvParser();
    const rows: string[][] = [];
    await parser.push('item_code,name\r\n000125,"Rice,', (row) => rows.push(row));
    await parser.push(' ""Premium"" rice"\r\n000126,Sugar\r', (row) => rows.push(row));
    await parser.push('\n', (row) => rows.push(row), true);
    expect(rows).toEqual([
      ['item_code','name'],
      ['000125','Rice, "Premium" rice'],
      ['000126','Sugar'],
    ]);
  });

  it('normalizes Arabic headers and preserves leading zeroes while rejecting oversize cells', () => {
    expect(normalizeHeader('  رمز الصنف  ')).toBe('item_code');
    expect(validateCsvRow(['000125','Rice'], ['item_code','product_name'], 2).data.item_code).toBe('000125');
    const invalid = validateCsvRow(['000126','x'.repeat(4001)], ['item_code','product_name'], 3);
    expect(invalid.status).toBe('rejected');
    expect(invalid.errors[0]).toContain('تتجاوز');
  });

  it('computes all data-quality dimensions deterministically and gates import acceptance', () => {
    const quality = new DataQualityAccumulator(['item_code','product_name'], 'item_code');
    quality.add({ row_number: 2, data: { item_code: '000125', product_name: 'Rice', quantity: '2', date: '2026-01-10' }, status: 'valid', errors: [] });
    quality.add({ row_number: 3, data: { item_code: '000126', product_name: 'Sugar', quantity: '5', date: '2026-01-11' }, status: 'valid', errors: [] });
    const result = quality.result();
    expect(result.score).toBe(100);
    expect(result.label).toBe('excellent');
    expect(chooseImportStatus(result.score)).toBe('completed');

    expect(chooseImportStatus(74)).toBe('manual_review');
    expect(chooseImportStatus(49)).toBe('rejected');
  });

  it('classifies common Arabic questions to evidence-backed actions', () => {
    expect(classifyAssistantIntent('أين فاتورتي؟')).toBe('invoice_help');
    expect(classifyAssistantIntent('ما حالة طلبي؟')).toBe('order_status');
    expect(classifyAssistantIntent('هل يوجد مخزون من السكر؟')).toBe('catalog_search');
    expect(classifyAssistantIntent('كيف أستخدمه بدون اتصال؟')).toBe('offline_help');
  });
});
