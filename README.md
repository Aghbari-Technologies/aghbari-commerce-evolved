# Aghbari Commerce Elevated

اشتي اقوم باكمالة عندكم وعرض الواجهات وكل شئ وتطويرة الى اعلى مستوى. الملف المضغوط project-bolt-sb1-b5g7dtki.zip يحتوي مشروع Aghbari Commerce | الأغبري الحالي (كود Vite + React + TypeScript + Supabase migrations) — استخدمه كأساس كامل دون حذف أو إعادة بناء من الصفر. الملف النصي المرفق هو وثيقة المواصفات الرئيسية (MASTER SPEC) الملزمة التي يجب اتباعها حرفياً: استراتيجية INSPECT → UNDERSTAND → PRESERVE → COMPLETE → CONNECT → IMPROVE → TEST → FIX → POLISH، الهوية الأغبري فقط، العربية RTL كلغة افتراضية، منع الـ placeholders والبيانات الوهمية، الربط الحقيقي بـ Supabase، وإكمال شجرة المنتج الكاملة (متجر العميل التجاري B2B + لوحة تحكم الإدارة + قدرات المؤسسة المتقدمة) بأفضل التقنيات الممكنة. بعد التنفيذ أعرض الواجهات وأنشر المشروع مباشرة.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aghbari-commerce-evolved.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/851f6f5c-d23d-45a6-9568-1452d5cfdd73).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: changes may flow between Lovable and the configured Git branch; verify the actual branch and synchronization state instead of assuming.
- **Full ownership**: preserve commits and use the active PR workflow. Do not push in-flight work directly to `main` while its PR is open. A Git push does not prove editor sync or production publication.

## Canonical project memory and session recovery

**Do not start a discovery loop.** Read root [`AGENTS.md`](./AGENTS.md), then read only the first/current task cursor in [latest execution state](./ops/AGHBARI-LATEST-EXECUTION-STATE.md). Match that one task to its row in [the requirement registry](./docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md), then read only the relevant source/spec clauses. `PROJECT_MEMORY.md`, [the session resume prompt](./ops/AGHBARI-SESSION-RESUME.md), and [execution mandate](./docs/canonical/AGHBARI-EXECUTION-MANDATE.md) are supporting references—not a requirement to reread every file on every session. The full product acceptance specification is [here](./docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md).

The first/current pointer in `ops/AGHBARI-LATEST-EXECUTION-STATE.md` is the **only active task cursor**. Older task IDs elsewhere are historical. If current-head CI fails, fix that failure before moving on. Save the existing state and registry after each coherent batch and before every response, pause, timeout/context limit or session end. Record the actual HEAD, changed files, real test results, tested SHA/CI, next task, and blockers. Verify actual Lovable synchronization and publish separately.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
