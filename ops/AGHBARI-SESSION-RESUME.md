# AGHBARI SESSION RESUME — اقرأ هذا أولًا بعد أي انقطاع

انسخ النص الموجود في القسم “رسالة الإقلاع الجاهزة” وأرسله في أول رسالة بأي جلسة جديدة.

## الحالة المرجعية المحفوظة
- المشروع الوحيد: متجر الأغبري | Aghbari Commerce.
- المستودع: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved
- الفرع المعتمد: `main`.
- محرر Lovable المكتوب في README: https://lovable.dev/projects/851f6f5c-d23d-45a6-9568-1452d5cfdd73
- المعاينة العامة: https://aghbari-commerce-evolved.lovable.app
- تعليمات التنفيذ: `docs/canonical/AGHBARI-EXECUTION-MANDATE.md`.
- المواصفة الهندسية الكاملة التي أرسلها المالك: `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` (نص محفوظ كاملًا).
- سجل المتطلبات الوحيد: `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`.
- ذاكرة المشروع: `PROJECT_MEMORY.md`.
- سجل الحالة والتقدم: `ops/AGHBARI-LATEST-EXECUTION-STATE.md` و`ops/AGHBARI-DEVELOPMENT-PROGRESS.md`.

## رسالة الإقلاع الجاهزة

أنت وكيل التنفيذ البرمجي لمتجر الأغبري | Aghbari Commerce. ابدأ من الحالة المحفوظة داخل المستودع، لا من الصفر ولا من الذاكرة العامة. افتح أولًا `PROJECT_MEMORY.md` ثم `ops/AGHBARI-SESSION-RESUME.md` و`ops/AGHBARI-LATEST-EXECUTION-STATE.md` و`docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md` و`docs/canonical/AGHBARI-EXECUTION-MANDATE.md`؛ المواصفة الكاملة في `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` هي مرجع المالك. استخدم آخر `main` SHA الفعلي، لا تفترض أن SHA المسجل سابقًا ما زال HEAD؛ افحص `git status`/آخر commits/CI مرة واحدة وحدّث السجل إن تغيرت الحالة. تابع مباشرة من أول قبول غير مغلق في سجل المتطلبات، ولا تعِد استكشاف الملفات نفسها ولا تطلب مني إعادة إرسال معلومات سبق حفظها. نفّذ: INSPECT → CLASSIFY GAPS → IMPLEMENT → CONNECT → TEST → FIX → VERIFY → COMMIT → PUSH MAIN → SYNC LOVABLE. حافظ على كل عمل صحيح، لا تنشئ بدائل مكررة ولا بيانات/نجاحات وهمية. لا تستخدم نقاط Lovable الخمس إلا بعد اكتمال الكود في Git والاختبارات والدفع، ولحل عائق فعلي فقط. بعد كل دفعة: اختبر SHA المحدد، سجل الملفات والأوامر والنتائج والفشل، حدّث ملف الحالة والتقدم وسجل المتطلبات، ثم ادفع إلى main وتحقق من CI. لا تطبق أي ترحيل على الإنتاج ولا تدّع اتصال Supabase/Onyx/AI/WhatsApp أو مزامنة Lovable دون إثبات مباشر. إذا انقطع الاتصال أو انتهت الجلسة، أعد فتح هذا الملف وابدأ من HEAD الحقيقي وأول بوابة غير مغلقة، دون تكرار ما ثبت.

## آخر حالة مثبتة وقت إنشاء هذا الملف
- `main` عند بدء الدفعة التوثيقية الأولى كان `05fcacbf4ddb6bfd025ab4b1fee7c144a44d4459` ثم دُفعت ملفات الذاكرة برسالة commit `971a49d75b546ccba0a05d8829c8d9c38cae085a`. افحص HEAD الحي؛ لا تعتبر أي SHA في هذا الملف هو HEAD الحالي تلقائيًا.
- CI على `f75dcb7fd3f4a598b2acf6db6d649e0f54c92fac` نجح: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687301037
- CI على `05fcacbf4ddb6bfd025ab4b1fee7c144a44d4459` اكتمل بنجاح: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687685412. كان CI على `971a49d75b546ccba0a05d8829c8d9c38cae085a` قيد التنفيذ عند آخر فحص: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687897943 — تحقق من CI المطابق لأحدث HEAD.
- في الفحص الحي العام، الصفحة الرئيسية و`/login` و`/admin` و`/orders` أعادت محتوى الأغبري، بينما عناوين `/admin/operations` و`/admin/products` و`/admin/orders` و`/admin/finance` و`/assistant` و`/barcode` و`/offline` و`/manifest.webmanifest` رجعت أخطاء 404 من أداة الفحص الخارجي. هذا مؤشر يحتاج إعادة تحقق من المتصفح/الخادم، وليس وحده حكمًا نهائيًا على كل جلسات التطبيق.
- طلب محرر Lovable الخاص رجع 403 للفحص الخارجي؛ المزامنة الدقيقة مع المحرر غير مثبتة. ادعم الاستنتاج بالأدلة ولا تنشئ نجاحًا مفترضًا.
- Supabase المرجعي في إعداد الكود هو `ffxxjaolfntzbapmfbuv`؛ اتصال Supabase الحالي لم يثبت إمكانية الوصول إليه. لا تلمس مشروع Supabase مختلفًا.

## عند الاستئناف
1. افحص HEAD والـ CI الحاليين فقط، واحتفظ بأي commits أحدث من الحالة المسجلة.
2. افتح سجل الفجوات وخذ أعلى بوابة قابلة للإغلاق دون اعتماد خارجي.
3. أصلح المصدر واختبره قبل push؛ لا تدفع تغييرات غير مختبرة إن كان بالإمكان إجراء CI أولًا، ولا تجبر main.
4. بعد الدفع انتظر نتيجة CI عبر فحص مباشر، ثم سجّل الـ SHA والنتيجة.
5. افحص مزامنة Lovable بشكل مستقل. إذا بقيت محجوبة بـ 403، سجّلها BLOCKED ولا تستهلك نقطة بلا فائدة.


## Newest verified implementation checkpoint — 2026-10-15
- Code SHA tested: `6112b24c2807fbb013b9fcd2d38c889631286a7c`.
- CI [38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670) completed **SUCCESS**: unit tests, isolated PostgreSQL acceptance, lint, build, and expanded route/PWA smoke.
- An XLSX draft exporter was added to approved order details. Keep it classified PARTIAL until the actual Onyx import profile is tested and a central export audit event is recorded.
- Production Supabase and Lovable runtime remain blocked/unverified; do not apply migrations to a different Supabase project and do not spend Lovable points on speculative prompts. The public deep-route/PWA 404 and Lovable editor 403 are documented in latest state/progress.
- Always verify current HEAD after any documentation follow-up commit; the code-proof SHA above is not automatically the current HEAD.

## Latest security checkpoint — 2026-10-15 (supersedes earlier fixed-ID status)

- Current code merge recorded before this documentation update: `fe22af0424947b56ae80e0679621cf0df333e284`; PR #26 is merged: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/26
- Exact tested PR head `c117b0eee5b19411c1fa3bf5162dbef1e939455f`: CI [38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) **PASS**. Exact merge SHA `fe22af0424947b56ae80e0679621cf0df333e284`: CI [38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) **PASS**.
- Files changed: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- Source evidence: client fixed tenant ID exports were removed; active profile, organization and default warehouse now come from `get_current_tenant_context()`; restrictive authenticated-user RLS boundaries and cross-tenant SELECT/INSERT negative checks pass on isolated PostgreSQL 17.
- Do not overstate closure: expected production Supabase project ref `ffxxjaolfntzbapmfbuv` is not accessible. No production migration was applied. Authenticated browser E2E, full pricing-tier privacy and anonymous storefront domain-to-tenant scoping remain open. Lovable sync remains unverified and points remain unused.
- At any resumption, read this checkpoint and the latest state/registry/progress, then re-check live `main` and latest exact-SHA CI before changing files.
