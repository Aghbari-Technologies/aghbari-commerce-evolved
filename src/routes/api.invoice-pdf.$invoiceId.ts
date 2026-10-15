import { createFileRoute } from "@tanstack/react-router";
import { buildCustomerInvoicePdf } from "@/lib/finance-document-pdf";
import {
  financeDocumentError,
  getFinanceDocumentClient,
  loadArabicDocumentFont,
  pdfResponse,
} from "@/lib/finance-pdf-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/invoice-pdf/$invoiceId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await getFinanceDocumentClient(request);
        if (auth.response) return auth.response;

        const invoiceId = params.invoiceId;
        if (!UUID_PATTERN.test(invoiceId)) {
          return financeDocumentError(400, "معرّف الفاتورة غير صالح.");
        }

        // RLS and scoped read grants keep this invoice bound to the signed-in customer.
        const invoiceResult = await auth.client
          .from("customer_invoices")
          .select("id,invoice_number,customer_id,status,issued_at,due_at,currency")
          .eq("id", invoiceId)
          .maybeSingle();

        if (invoiceResult.error) {
          return financeDocumentError(503, "تعذر قراءة بيانات الفاتورة.");
        }
        if (!invoiceResult.data) {
          return financeDocumentError(404, "الفاتورة غير موجودة أو غير متاحة لهذا الحساب.");
        }

        const [linesResult, customerResult] = await Promise.all([
          auth.client
            .from("customer_invoice_items")
            .select("id,item_code,description,unit,quantity")
            .eq("invoice_id", invoiceId)
            .order("created_at", { ascending: true }),
          auth.client
            .from("customers")
            .select("customer_code,business_name,contact_name")
            .eq("id", invoiceResult.data.customer_id)
            .maybeSingle(),
        ]);

        if (linesResult.error || customerResult.error) {
          return financeDocumentError(503, "تعذر تحميل تفاصيل الفاتورة.");
        }

        try {
          const bytes = await buildCustomerInvoicePdf(
            invoiceResult.data,
            linesResult.data ?? [],
            customerResult.data,
            loadArabicDocumentFont(),
          );
          return pdfResponse(bytes, "aghbari-invoice.pdf");
        } catch {
          return financeDocumentError(
            500,
            "تعذر إنشاء ملف الفاتورة؛ لم تُعرض بيانات غير مكتملة كمستند ناجح.",
          );
        }
      },
    },
  },
});
