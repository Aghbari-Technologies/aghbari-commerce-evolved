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

  it('classifies common Arabic questions to evidence-backed actions', () => {
    expect(classifyAssistantIntent('أين فاتورتي؟')).toBe('invoice_help');
    expect(classifyAssistantIntent('ما حالة طلبي؟')).toBe('order_status');
    expect(classifyAssistantIntent('هل يوجد مخزون من السكر؟')).toBe('catalog_search');
    expect(classifyAssistantIntent('كيف أستخدمه بدون اتصال؟')).toBe('offline_help');
  });
});
