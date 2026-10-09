import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";

export const Route = createFileRoute("/admin/suppliers")({
  head: () => ({ meta: [{ title: "الموردون | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={null}><AdminApp initialView="suppliers" /></ClientOnly>,
});
