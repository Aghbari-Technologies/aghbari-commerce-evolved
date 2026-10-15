import { describe, expect, it } from 'vitest';
import { buildOnyxDetailRows, buildOnyxOrderWorkbook, ONYX_ORDER_COLUMNS, onyxOrderWorkbookFilename } from '@/lib/onyx-export';

const order = {
  orderId: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'ORD-000125',
  orderStatus: 'confirmed',
  orderCreatedAt: '2026-10-15T09:30:00.000Z',
  customerCode: '000042',
  customerName: 'شركة اختبار الأغبري',
  items: [{
    item_code: '000125',
    product_name_snapshot: 'سكر "برازيلي", 50ك',
    unit_snapshot: 'كرتون',
    quantity: 2,
    approved_quantity: 3,
    unit_price_snapshot: 10,
    approved_unit_price: 12.5,
  }],
};

describe('Onyx order workbook draft', () => {
  it('keeps the exact 27 reference columns and preserves identifier strings', () => {
    expect(ONYX_ORDER_COLUMNS).toHaveLength(27);
    const rows = buildOnyxDetailRows(order);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([
      'رقم الصنف','اسم الصنف','الوحدة','المخزن','الكمية','ك.المجانية','السعر','رقم الدفعة',
      'تاريخ الانتهاء','رقم المستفيد','مركز التكلفة','المشروع','النشاط','رقم عرض السعر','الوحدة العددية',
      'الخصم1','الخصم2','الخصم3','نوع الخصم (1-نسبة، 2-مبلغ)','حجز الكميات','إلى تاريخ',
      'الكمية المحجوزة','البيان','الطول','العرض','الارتفاع','العدد',
    ]);
    expect(rows[1]).toHaveLength(27);
    expect(rows[1][0]).toBe('000125');
    expect(rows[1][4]).toBe(3);
    expect(rows[1][6]).toBe(12.5);
    expect(rows[1][22]).toBe('ORD-000125');
    expect(rows[1][3]).toBe('');
  });

  it('creates an XLSX ZIP package with both worksheets and customer header', () => {
    const bytes = buildOnyxOrderWorkbook(order);
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const archiveText = new TextDecoder().decode(bytes);
    expect(archiveText).toContain('[Content_Types].xml');
    expect(archiveText).toContain('xl/worksheets/sheet1.xml');
    expect(archiveText).toContain('xl/worksheets/sheet2.xml');
    expect(archiveText).toContain('000125');
    expect(archiveText).toContain('شركة اختبار الأغبري');
    expect(archiveText).toContain('غير مثبت');
    expect(archiveText).toContain('inlineStr');
  });

  it('removes XML 1.0-forbidden control characters from dirty imported cells', () => {
    const dirty = {
      ...order,
      orderNumber: 'ORD\\u0001-002',
      customerName: 'شركة\\u0002 الاختبار',
      items: [{
        ...order.items[0],
        product_name_snapshot: 'سكر\\u0003 برازيلي',
      }],
    };
    const archiveText = new TextDecoder().decode(buildOnyxOrderWorkbook(dirty));
    expect(archiveText).not.toContain('\\u0001');
    expect(archiveText).not.toContain('\\u0002');
    expect(archiveText).not.toContain('\\u0003');
    expect(archiveText).toContain('سكر برازيلي');
  });

  it('rejects empty exports and sanitizes filenames', () => {
    expect(() => buildOnyxOrderWorkbook({ ...order, items: [] })).toThrow('بلا أصناف');
    expect(onyxOrderWorkbookFilename('ORD/001 2026')).toBe('Aghbari-Onyx-ORD-001-2026.xlsx');
  });
});
