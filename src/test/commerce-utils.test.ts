import { describe, expect, it } from 'vitest';
import { classifyAssistantIntent, normalizeCartDraft, summarizeAccount } from '@/lib/commerce-utils';

describe('commerce completion utilities', () => {
  it('calculates totals only from persisted invoice and payment records', () => {
    expect(summarizeAccount(
      [{ id: 'i1', total_amount: '125.50' }, { id: 'i2', total_amount: 50 }],
      [{ invoice_id: 'i1', amount: '25.50' }, { invoice_id: 'i1', amount: 10 }],
    )).toEqual({ invoiced: 175.5, paid: 35.5, outstanding: 140 });
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

  it('classifies common Arabic questions to evidence-backed actions', () => {
    expect(classifyAssistantIntent('أين فاتورتي؟')).toBe('invoice_help');
    expect(classifyAssistantIntent('ما حالة طلبي؟')).toBe('order_status');
    expect(classifyAssistantIntent('هل يوجد مخزون من السكر؟')).toBe('catalog_search');
    expect(classifyAssistantIntent('كيف أستخدمه بدون اتصال؟')).toBe('offline_help');
  });
});
