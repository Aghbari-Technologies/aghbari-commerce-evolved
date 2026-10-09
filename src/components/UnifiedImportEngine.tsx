import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Check, FileDown, Pause, Play, RefreshCw, ShieldCheck, Upload, XCircle } from "lucide-react";
import {
  cancelImportUploadSession, createImportJob, createImportUploadSession, fetchCentralSynonyms, fetchImportJobs, fetchImportProfiles,
  fetchImportUploadChunks, findImportDuplicate, finalizeImportJob, insertImportRows, recordImportUploadChunk, updateImportJob,
} from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatNumber } from "@/lib/format";
import { AdminPage, Button, Empty, ErrorBox, Loading, TableWrap } from "@/components/AdminPages";
import {
  DataQualityAccumulator, DEFAULT_SYNONYMS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_COLUMNS, MAX_IMPORT_ROWS,
  PROCESSING_CHUNK_ROWS, UPLOAD_CHUNK_BYTES, IncrementalSha256, StreamingCsvParser, hashFileSha256,
  applyImportProfileRules, normalizeHeader, parseXlsxFirstWorksheet, shouldPersistParsedImportRow, stableJsonStringify, validateCsvRow, validateImportProfileRules, validateVerifiedImportChunkPrefix,
  type ParsedImportRow, type QualityResult,
} from "@/lib/unified-import";
import type { ImportJob, ImportProfile } from "@/lib/types";

type Stage = "reading" | "detecting" | "mapping" | "validating" | "normalizing" | "deduplicating" | "merging" | "analytics" | "complete";
type DuplicateAction = "ignore" | "replace" | "merge" | "new_version" | "resume";
type DuplicateResult = {
  duplicate: boolean;
  profile_id: string | null;
  jobs: Array<ImportJob & { upload_session_id?: string | null }>;
  snapshots: Array<{ id: string; status: string; snapshot_version: number }>;
};
type DuplicatePrompt = {
  file: File;
  fileHash: string;
  profileId: string | null;
  periodKey: string | null;
  duplicate: DuplicateResult;
};

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "reading", label: "قراءة الملف" },
  { id: "detecting", label: "كشف النوع والبصمة" },
  { id: "mapping", label: "توحيد الأعمدة" },
  { id: "validating", label: "التحقق والجودة" },
  { id: "normalizing", label: "تطبيع البيانات وكتابة الشرائح" },
  { id: "deduplicating", label: "منع التكرار" },
  { id: "merging", label: "الدمج/اعتماد النسخة" },
  { id: "analytics", label: "إنشاء اللقطة التحليلية" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatTransferRate(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "جارٍ القياس";
  if (bytesPerSecond >= 1024 * 1024) return (bytesPerSecond / (1024 * 1024)).toFixed(1) + " MB/s";
  if (bytesPerSecond >= 1024) return (bytesPerSecond / 1024).toFixed(1) + " KB/s";
  return Math.round(bytesPerSecond) + " B/s";
}

function formatEstimatedTime(seconds: number): string {
  const remaining = Math.max(0, Math.ceil(seconds));
  if (remaining < 60) return remaining + " ثانية";
  if (remaining < 3600) return Math.floor(remaining / 60) + " دقيقة " + (remaining % 60) + " ثانية";
  return Math.floor(remaining / 3600) + " ساعة " + Math.floor((remaining % 3600) / 60) + " دقيقة";
}

export function UnifiedImportEngine({ onNotice, refreshRevision = 0 }: {
  onNotice: (message: string) => void;
  refreshRevision?: number;
}) {
  const { data: jobs, loading, error, refetch } = useFetch(fetchImportJobs);
  const { data: profiles, refetch: refetchProfiles } = useFetch(fetchImportProfiles);
  const { data: storedSynonyms, refetch: refetchSynonyms } = useFetch(fetchCentralSynonyms);
  const [stage, setStage] = useState<Stage | null>(null);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [profileId, setProfileId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [qualityPreview, setQualityPreview] = useState<QualityResult | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null);
  const [hashingFile, setHashingFile] = useState(false);
  const [sourceBytesProcessed, setSourceBytesProcessed] = useState(0);
  const [sourceBytesTotal, setSourceBytesTotal] = useState(0);
  const [bytesPerSecond, setBytesPerSecond] = useState(0);
  const [rowsPerSecond, setRowsPerSecond] = useState(0);
  const progressSampleRef = useRef<{ at: number; bytes: number; rows: number }>({ at: 0, bytes: 0, rows: 0 });
  const pausedRef = useRef(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  const preflightRef = useRef(false);

  useEffect(() => {
    if (refreshRevision === 0) return;
    void refetch();
    void refetchProfiles();
    void refetchSynonyms();
  }, [refreshRevision, refetch, refetchProfiles, refetchSynonyms]);

  function resetProgressTelemetry(totalBytes: number) {
    progressSampleRef.current = { at: performance.now(), bytes: 0, rows: 0 };
    setSourceBytesProcessed(0);
    setSourceBytesTotal(totalBytes);
    setBytesPerSecond(0);
    setRowsPerSecond(0);
  }

  function recordProgressTelemetry(bytes: number, rows: number) {
    const safeBytes = Math.max(0, bytes);
    const safeRows = Math.max(0, rows);
    setSourceBytesProcessed(safeBytes);
    const now = performance.now();
    const previous = progressSampleRef.current;
    const elapsedMs = now - previous.at;
    if (elapsedMs >= 250) {
      const elapsedSeconds = elapsedMs / 1000;
      setBytesPerSecond(Math.max(0, (safeBytes - previous.bytes) / elapsedSeconds));
      setRowsPerSecond(Math.max(0, (safeRows - previous.rows) / elapsedSeconds));
      progressSampleRef.current = { at: now, bytes: safeBytes, rows: safeRows };
    } else if (previous.at === 0) {
      progressSampleRef.current = { at: now, bytes: safeBytes, rows: safeRows };
    }
  }

  function finishPreflightCancellation() {
    cancelRef.current = false;
    pausedRef.current = false;
    preflightRef.current = false;
    setPaused(false);
    setHashingFile(false);
    setStage(null);
    setProgress(0);
    setProcessed(0);
    setSourceBytesProcessed(0);
    setSourceBytesTotal(0);
    setBytesPerSecond(0);
    setRowsPerSecond(0);
    setErrorMessage("");
    setStatusMessage("تم إلغاء قراءة الملف قبل إنشاء دفعة الاستيراد. لم يُحفظ الملف الخام ولم تُنشأ لقطة.");
  }

  const activeProfileId = profileId || (profiles ?? []).find((p: ImportProfile) => p.profile_name === "Unified CSV" && p.status === "active")?.id || null;
  const synonymMap = useMemo(() => {
    const result: Record<string, string> = { ...DEFAULT_SYNONYMS };
    const normalizeSource = (value: string) => value.trim().toLocaleLowerCase("ar").replace(/[ـ_-]+/g, " ").replace(/\s+/g, " ");
    for (const row of storedSynonyms ?? []) {
      if (row.profile_id && row.profile_id !== activeProfileId) continue;
      const source = normalizeSource(String(row.source_header ?? ""));
      const target = String(row.canonical_field ?? "").trim();
      if (source && /^[a-z][a-z0-9_]{0,79}$/.test(target)) result[source] = target;
    }
    const selectedProfile = (profiles ?? []).find((p: ImportProfile) => p.id === activeProfileId);
    for (const [sourceHeader, canonicalField] of Object.entries(selectedProfile?.synonyms ?? {})) {
      const source = normalizeSource(sourceHeader);
      const target = String(canonicalField).trim();
      if (source && /^[a-z][a-z0-9_]{0,79}$/.test(target)) result[source] = target;
    }
    return result;
  }, [storedSynonyms, profiles, activeProfileId]);

  function updatePaused(next: boolean) {
    pausedRef.current = next;
    setPaused(next);
    setStatusMessage(next
      ? hashingFile
        ? "أُوقف حساب بصمة الملف مؤقتًا بين شرائح القراءة؛ لم يُرسل الملف الخام إلى الخادم."
        : "تم الإيقاف المؤقت عند نقطة آمنة؛ الشرائح المؤكدة محفوظة ويمكن الاستئناف بإعادة اختيار الملف نفسه."
      : "استؤنفت المعالجة.");
  }

  async function processFile(
    file: File,
    fileHash: string,
    action: Exclude<DuplicateAction, "ignore" | "resume">,
    existingJob?: ImportJob & { upload_session_id?: string | null },
    selectedProfile: string | null = activeProfileId,
    selectedPeriod: string | null = periodKey.trim() || null,
  ) {
    if (runningRef.current) return;
    runningRef.current = true;
    pausedRef.current = false;
    cancelRef.current = false;
    setPaused(false);
    setHashingFile(false);
    setErrorMessage("");
    setStatusMessage("");
    setProgress(10);
    setProcessed(0);
    resetProgressTelemetry(file.size);
    setQualityPreview(null);
    let job: ImportJob | null = existingJob ?? null;
    let uploadSession: { id: string; import_job_id: string; organization_id: string; profile_id: string | null; profile_version: number | null; period_key: string | null; chunk_size_bytes: number; total_chunks: number; verified_chunks: number; status: string; file_hash: string; file_size: number } | null = null;
    let processingConfigFingerprint: string | null = null;
    let checkpointFingerprintPersisted = false;

    try {
      if (!job) {
        job = await createImportJob({
          fileName: file.name,
          fileHash,
          fileSize: file.size,
          jobType: "unified_import",
          profileId: selectedProfile,
          periodKey: selectedPeriod,
          sourceSystem: "manual",
        });
      }
      if (selectedProfile && job.profile_id && selectedProfile !== job.profile_id) {
        throw new Error("الملف التعريفي المختار لا يطابق الملف التعريفي المقيد بدفعة الاستيراد.");
      }
      // The server may create the default profile while creating the job; bind processing to
      // that persisted profile, not to a possibly stale/empty React query cache.
      selectedProfile = job.profile_id ?? selectedProfile ?? activeProfileId;

      const extension = file.name.split(".").pop()?.toLocaleLowerCase("en") ?? "";
      if (extension !== "csv" && extension !== "xlsx") {
        const isPdf = extension === "pdf";
        await updateImportJob(job.id, {
          status: "manual_mapping_required",
          data_quality_score: 0,
          error_summary: {
            code: isPdf ? "PDF_TABLE_EXTRACTION_REQUIRED" : "LEGACY_XLS_PARSER_UNAVAILABLE",
            message: isPdf
              ? "لم يتوفر مستخرج جدولي موثوق في هذه النسخة. لم يتم تخمين بيانات PDF أو توليد صفوف وهمية؛ يلزم استخراج/تعيين يدوي قبل الاعتماد."
              : "صيغة XLS الثنائية القديمة غير مدعومة مباشرة. حُفظت الميتاداتا والبصمة فقط؛ احفظ الملف بصيغة XLSX أو CSV ثم أعد الاستيراد.",
            manual_mapping_required: true,
            no_raw_file_retained: true,
          },
        });
        setStage(null);
        setStatusMessage(isPdf
          ? "سُجل ملف PDF كمسودة تعيين يدوي دون افتراض أنه جدولي."
          : "سُجل ملف XLS القديم كمسودة؛ احفظ نسخة XLSX أو CSV لإتمام الاستيراد.");
        await refetch();
        return;
      }

      const currentProfiles = await fetchImportProfiles();
      const currentSynonyms = await fetchCentralSynonyms();
      const profile = (currentProfiles ?? []).find((p: ImportProfile) => p.id === selectedProfile) as ImportProfile | undefined;
      if (selectedProfile && !profile) {
        throw new Error("تعذر تحميل إصدار الملف التعريفي المقيد بالدفعة؛ لن تتم معالجة صفوف بإعدادات غير مؤكدة.");
      }
      const transformations = profile?.transformation_rules ?? [];
      const validations = profile?.validation_rules ?? [];
      // Fail fast on malformed declarative profiles before any rows are staged.
      validateImportProfileRules(transformations, validations);
      const profileSynonyms: Record<string, string> = { ...DEFAULT_SYNONYMS };
      const normalizeSynonymSource = (value: string) => value.trim().toLocaleLowerCase("ar").replace(/[ـ_-]+/g, " ").replace(/\s+/g, " ");
      for (const row of currentSynonyms ?? []) {
        if (row.profile_id && row.profile_id !== selectedProfile) continue;
        const source = normalizeSynonymSource(String(row.source_header ?? ""));
        const target = String(row.canonical_field ?? "").trim();
        if (source && /^[a-z][a-z0-9_]{0,79}$/.test(target)) profileSynonyms[source] = target;
      }
      for (const [sourceHeader, canonicalField] of Object.entries(profile?.synonyms ?? {})) {
        const source = normalizeSynonymSource(sourceHeader);
        const target = String(canonicalField).trim();
        if (source && /^[a-z][a-z0-9_]{0,79}$/.test(target)) profileSynonyms[source] = target;
      }
      const ignoredColumns = new Set((profile?.ignored_columns ?? []).map((field) => normalizeHeader(String(field), profileSynonyms)));
      const requiredColumns = Array.isArray(profile?.required_columns) ? profile.required_columns.map(String) : ["item_code"];
      const matchingKey = String(profile?.matching_key ?? "item_code");
      const processingConfig = {
        profileId: selectedProfile,
        profileVersion: profile?.version ?? null,
        reportType: profile?.report_type ?? null,
        source: profile?.source ?? null,
        requiredColumns,
        optionalColumns: profile?.optional_columns ?? [],
        ignoredColumns: [...ignoredColumns].sort(),
        matchingKey,
        mergeStrategy: profile?.merge_strategy ?? "manual_review",
        isFullDataset: profile?.is_full_dataset ?? false,
        dateRules: profile?.date_rules ?? {},
        synonyms: Object.entries(profileSynonyms).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        transformations,
        validations,
      };
      processingConfigFingerprint = new IncrementalSha256()
        .update(new TextEncoder().encode(stableJsonStringify(processingConfig)))
        .digestHex();

      setStage("reading");
      uploadSession = await createImportUploadSession(job.id);
      if (uploadSession.file_hash !== fileHash || Number(uploadSession.file_size) !== file.size) {
        throw new Error("جلسة الاستيراد لا تطابق الملف المختار. لا يمكن متابعة المعالجة بأمان.");
      }
      if ((uploadSession.profile_id ?? null) !== (selectedProfile ?? null) ||
          (uploadSession.profile_version ?? null) !== (profile?.version ?? null) ||
          (uploadSession.period_key ?? null) !== (selectedPeriod ?? null)) {
        throw new Error("هوية الملف التعريفي أو إصداره أو الفترة لا تطابق جلسة الرفع. أوقفنا الاستئناف حتى لا تختلط نتائج دفعتين.");
      }
      if (uploadSession.chunk_size_bytes !== UPLOAD_CHUNK_BYTES ||
          uploadSession.total_chunks !== Math.ceil(file.size / UPLOAD_CHUNK_BYTES)) {
        throw new Error("إعدادات شرائح جلسة الاستيراد لا تطابق هذا الملف؛ أوقف العملية وابدأ دفعة جديدة.");
      }
      if (["cancelled", "expired", "completed"].includes(uploadSession.status)) {
        throw new Error("جلسة الاستيراد السابقة ملغاة أو منتهية؛ ابدأ دفعة جديدة بدل الكتابة فوق جلسة غير متاحة.");
      }
      const uploadManifest = await fetchImportUploadChunks(uploadSession.id);
      const verifiedChunkNumbers = validateVerifiedImportChunkPrefix(
        uploadManifest, file.size, uploadSession.chunk_size_bytes,
      );
      if (verifiedChunkNumbers.length !== uploadSession.verified_chunks) {
        throw new Error("عدد الشرائح المؤكدة لا يطابق سجل الشرائح؛ تعذر الاستئناف الآمن.");
      }
      const previousSummary = (job.error_summary ?? {}) as Record<string, unknown>;
      const savedFingerprint = previousSummary.processing_config_fingerprint;
      if (verifiedChunkNumbers.length > 0 && typeof savedFingerprint !== "string") {
        throw new Error("هذه دفعة قديمة لا تحفظ بصمة إعدادات المعالجة. ابدأ نسخة استيراد جديدة بدل دمج بيانات ربما استخدمت تعيين أعمدة مختلفًا.");
      }
      if (typeof savedFingerprint === "string" && savedFingerprint !== processingConfigFingerprint) {
        throw new Error("تغير الملف التعريفي أو المرادفات أو قواعد المعالجة منذ بدء الدفعة. تم إيقاف الاستئناف لتجنب خلط صفوف بمعايير مختلفة؛ ابدأ نسخة جديدة.");
      }
      await updateImportJob(job.id, {
        error_summary: {
          ...previousSummary,
          processing_config_fingerprint: processingConfigFingerprint,
          profile_id: selectedProfile,
          profile_version: profile?.version ?? null,
          source_file_hash: fileHash,
          no_raw_file_retained: true,
        },
      });
      checkpointFingerprintPersisted = true;
      const verifiedChunks = new Set(verifiedChunkNumbers);
      if (extension === "xlsx" && verifiedChunks.size > 0) {
        throw new Error("هذه الدفعة لها شرائح XLSX مؤكدة جزئيًا. لا يمكن استئناف XLSX الجزئي بأمان في هذه النسخة؛ اختر «إنشاء نسخة جديدة» بعد مراجعة السجل.");
      }
      if (verifiedChunks.size > 0) {
        setStatusMessage("استئناف آمن: سيعاد بناء حالة قراءة CSV محليًا، وتُتجاوز كتابة الشرائح المؤكدة، ويستمر الحفظ من أول شريحة غير مؤكدة.");
      }
      const parser = new StreamingCsvParser();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let headers: string[] | null = null;
      let quality: DataQualityAccumulator | null = null;
      let currentChunkNumber = -1;
      let finalizingCsv = false;
      let dataRows = 0;
      let batch: Array<{ rowNumber: number; data: Record<string, unknown>; status: string; errors: string[] }> = [];

      const flushBatch = async () => {
        if (!batch.length) return;
        const toSave = batch;
        batch = [];
        await insertImportRows(job!.id, toSave);
        setProcessed(dataRows);
        recordProgressTelemetry(processedBytes, dataRows);
        if (quality) setQualityPreview(quality.result());
      };

      const consumeRow = async (values: string[]) => {
        if (cancelRef.current) return;
        if (!headers) {
          if (values.length > MAX_IMPORT_COLUMNS) throw new Error("عدد الأعمدة يتجاوز الحد الأقصى " + MAX_IMPORT_COLUMNS);
          headers = values.map((value) => {
            const canonical = normalizeHeader(value, profileSynonyms);
            const rawKey = normalizeSynonymSource(value);
            return ignoredColumns.has(canonical) || ignoredColumns.has(rawKey) ? "" : canonical;
          });
          if (!headers.length || headers.every((value) => !value)) throw new Error("صف العناوين فارغ؛ يلزم تعيين الأعمدة يدويًا.");
          if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) {
            throw new Error("يوجد أكثر من عنوان يتحول إلى العمود نفسه بعد التطبيع؛ راجع قاموس المرادفات.");
          }
          setStage("mapping");
          quality = new DataQualityAccumulator(requiredColumns.length ? requiredColumns : [matchingKey], matchingKey);
          return;
        }
        if (values.length > MAX_IMPORT_COLUMNS) throw new Error("صف البيانات تجاوز حد الأعمدة.");
        if (dataRows >= MAX_IMPORT_ROWS) throw new Error("تجاوز الملف الحد الأقصى " + MAX_IMPORT_ROWS + " صف.");
        dataRows += 1;
        const baseRow: ParsedImportRow = validateCsvRow(values, headers, dataRows + 1);
        const parsed: ParsedImportRow = applyImportProfileRules(baseRow, transformations, validations);
        quality?.add(parsed);
        // Already-verified upload chunks have their structured rows committed before their
        // manifest checkpoint. Reparse those bytes locally to rebuild CSV/quality state, but
        // never write their rows again. The first incomplete chunk is upserted normally.
        if (shouldPersistParsedImportRow(currentChunkNumber, verifiedChunks, finalizingCsv)) {
          // The final unterminated CSV row may not have been staged if a prior run stopped
          // after the final chunk checkpoint but before EOF finalization; upsert it safely.
          batch.push({ rowNumber: parsed.row_number, data: parsed.data, status: parsed.status, errors: parsed.errors });
          if (batch.length >= PROCESSING_CHUNK_ROWS) await flushBatch();
        }
        if (dataRows % 100 === 0) {
          setProcessed(dataRows);
          recordProgressTelemetry(processedBytes, dataRows);
        }
        setStage("validating");
      };

      let processedBytes = 0;
      let xlsxWorksheetName: string | null = null;
      if (extension === "csv") {
        const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_BYTES);
        for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
          while (pausedRef.current && !cancelRef.current) await delay(180);
          if (cancelRef.current) break;
          currentChunkNumber = chunkNumber;
          const byteOffset = chunkNumber * UPLOAD_CHUNK_BYTES;
          const bytes = new Uint8Array(await file.slice(byteOffset, Math.min(file.size, byteOffset + UPLOAD_CHUNK_BYTES)).arrayBuffer());
          const chunkHash = new IncrementalSha256().update(bytes).digestHex();
          await parser.push(decoder.decode(bytes, { stream: byteOffset + bytes.length < file.size }), consumeRow, false);
          await flushBatch();
          if (verifiedChunks.has(chunkNumber)) {
            const checkpoint = uploadManifest[chunkNumber];
            if (!checkpoint || checkpoint.chunk_hash !== chunkHash) {
              throw new Error("بصمة الشريحة " + (chunkNumber + 1) + " تختلف عن نقطة الاستئناف المحفوظة؛ لم يتم تجاوزها.");
            }
          } else {
            await recordImportUploadChunk({
              sessionId: uploadSession.id,
              chunkNumber,
              byteOffset,
              byteSize: bytes.byteLength,
              chunkHash,
            });
          }
          processedBytes += bytes.byteLength;
          setProcessed(dataRows);
          recordProgressTelemetry(processedBytes, dataRows);
          setStage("normalizing");
          setProgress(Math.min(82, 10 + Math.round((processedBytes / Math.max(file.size, 1)) * 72)));
        }
      } else {
        // XLSX row provenance is inside compressed ZIP members, not raw-file byte chunks.
        // A failed run with recorded byte checkpoints is therefore fail-closed above. Fresh or
        // uncheckpointed runs parse once, persist idempotently, then record the raw-byte manifest.
        setStage("reading");
        setProgress(18);
        let worksheetRows = 0;
        const workbook = await parseXlsxFirstWorksheet(file, async (values) => {
          while (pausedRef.current && !cancelRef.current) await delay(180);
          if (cancelRef.current) return;
          currentChunkNumber = -1;
          await consumeRow(values);
          worksheetRows += 1;
          if (worksheetRows % 100 === 0) {
            setProcessed(dataRows);
            recordProgressTelemetry(processedBytes, dataRows);
            setProgress(Math.min(70, 18 + Math.round((worksheetRows / (MAX_IMPORT_ROWS + 1)) * 52)));
          }
        });
        xlsxWorksheetName = workbook.worksheetName;
        if (cancelRef.current) {
          setProcessed(dataRows);
        } else {
          await flushBatch();
          if (!headers) throw new Error("ورقة XLSX لا تحتوي على صف عناوين صالح.");
          setStage("normalizing");
          setProgress(72);
          const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_BYTES);
          for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
            while (pausedRef.current && !cancelRef.current) await delay(180);
            if (cancelRef.current) break;
            const byteOffset = chunkNumber * UPLOAD_CHUNK_BYTES;
            const bytes = new Uint8Array(await file.slice(byteOffset, Math.min(file.size, byteOffset + UPLOAD_CHUNK_BYTES)).arrayBuffer());
            const chunkHash = new IncrementalSha256().update(bytes).digestHex();
            await recordImportUploadChunk({
              sessionId: uploadSession.id,
              chunkNumber,
              byteOffset,
              byteSize: bytes.byteLength,
              chunkHash,
            });
            processedBytes += bytes.byteLength;
            recordProgressTelemetry(processedBytes, dataRows);
            setProgress(Math.min(82, 72 + Math.round((processedBytes / Math.max(file.size, 1)) * 10)));
          }
        }
      }

      if (cancelRef.current) {
        if (uploadSession) {
          try { await cancelImportUploadSession(uploadSession.id); } catch { /* cancellation of the job remains recorded below */ }
        }
        await updateImportJob(job.id, {
          status: "cancelled",
          error_summary: { code: "CANCELLED_BY_USER", message: "ألغى المستخدم الدفعة؛ لم يتم إنشاء Snapshot.", no_raw_file_retained: true },
        });
        await refetch();
        setStage(null);
        setStatusMessage("ألغيت الدفعة. لم تُحفظ بيانات الملف الخام.");
        return;
      }

      if (extension === "csv") {
        finalizingCsv = true;
        await parser.push(decoder.decode(), consumeRow, true);
        await flushBatch();
        if (!headers) throw new Error("تعذر اكتشاف صف عناوين صالح في CSV.");
      } else if (!headers) {
        throw new Error("ورقة XLSX لا تحتوي على صف عناوين صالح.");
      }
      setStage("deduplicating");
      setProgress(86);
      await updateImportJob(job.id, {
        total_rows: dataRows,
        processed_rows: dataRows,
        error_summary: {
          no_raw_file_retained: true,
          source_file_hash: fileHash,
          profile_id: selectedProfile,
          profile_version: profile?.version ?? null,
          processing_config_fingerprint: processingConfigFingerprint,
          period_key: selectedPeriod,
          parser: extension === "csv" ? "streaming-csv" : "xlsx-first-visible-sheet",
          worksheet_name: xlsxWorksheetName,
          processing_chunk_rows: PROCESSING_CHUNK_ROWS,
          upload_chunk_bytes: UPLOAD_CHUNK_BYTES,
        },
      });
      setStage("merging");
      const result = await finalizeImportJob(job.id, action);
      setStage("analytics");
      setProgress(96);
      setQualityPreview(quality?.result() ?? null);
      setProgress(100);
      setStage("complete");
      if (result.status === "manual_review") {
        setStatusMessage("تحتاج الدفعة إلى مراجعة بشرية قبل اعتماد Snapshot. الجودة " + result.data_quality_score + "/100.");
      } else if (result.status === "rejected") {
        setStatusMessage("رُفضت الدفعة وفق نتيجة الجودة " + result.data_quality_score + "/100؛ لم تُنشأ لقطة معتمدة.");
      } else {
        setStatusMessage("انتهت المعالجة: " + result.status + " • DQS " + result.data_quality_score + "/100 • Snapshot " + (result.snapshot_id ?? "غير منشأ"));
      }
      await refetch();
      onNotice(result.status === "completed" ? "اكتمل الاستيراد بجودة " + result.data_quality_score + "/100" : "انتهت الدفعة بالحالة: " + result.status);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر معالجة الملف.";
      setStage(null);
      setErrorMessage(message);
      if (job) {
        try {
          const failureSummary: Record<string, unknown> = {
            ...((job.error_summary ?? {}) as Record<string, unknown>),
            code: "IMPORT_PROCESSING_FAILED",
            message,
            resumable: true,
            no_raw_file_retained: true,
          };
          if (checkpointFingerprintPersisted && processingConfigFingerprint) {
            failureSummary.processing_config_fingerprint = processingConfigFingerprint;
          }
          await updateImportJob(job.id, { status: "failed", error_summary: failureSummary });
        } catch { /* preserve the original error */ }
      }
      await refetch();
    } finally {
      runningRef.current = false;
      pausedRef.current = false;
      setPaused(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || runningRef.current || preflightRef.current) return;
    if (file.size === 0) { setErrorMessage('الملف فارغ. اختر ملفًا يحتوي على بيانات.'); return; }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setErrorMessage("حجم الملف يتجاوز الحد المسموح 100MB.");
      return;
    }
    preflightRef.current = true;
    cancelRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setHashingFile(true);
    setErrorMessage("");
    setStatusMessage("");
    setStage("reading");
    setProgress(0);
    setProcessed(0);
    resetProgressTelemetry(file.size);
    try {
      const fileHash = await hashFileSha256(file, (bytes) => {
        setProgress(Math.round((bytes / Math.max(file.size, 1)) * 10));
        recordProgressTelemetry(bytes, 0);
      }, {
        isPaused: () => pausedRef.current,
        isCancelled: () => cancelRef.current,
      });
      setHashingFile(false);
      if (cancelRef.current) { finishPreflightCancellation(); return; }
      setStage("detecting");
      const duplicate = await findImportDuplicate(fileHash, activeProfileId, periodKey.trim() || null) as DuplicateResult;
      if (cancelRef.current) { finishPreflightCancellation(); return; }
      if (duplicate.duplicate) {
        setDuplicatePrompt({
          file,
          fileHash,
          profileId: activeProfileId,
          periodKey: periodKey.trim() || null,
          duplicate,
        });
        setStage(null);
        setStatusMessage("وجد المحرك ملفًا بنفس البصمة للملف التعريفي والفترة المحددين. اختر الإجراء قبل المتابعة.");
        return;
      }
      await processFile(file, fileHash, "new_version", undefined, activeProfileId, periodKey.trim() || null);
    } catch (cause) {
      if (cancelRef.current || (cause instanceof Error && cause.message.includes("تم إلغاء حساب بصمة الملف"))) {
        finishPreflightCancellation();
        return;
      }
      setHashingFile(false);
      setStage(null);
      setErrorMessage(cause instanceof Error ? cause.message : "تعذر قراءة بصمة الملف.");
    } finally {
      preflightRef.current = false;
      setHashingFile(false);
    }
  }

  async function resolveDuplicate(action: DuplicateAction) {
    if (!duplicatePrompt) return;
    const pending = duplicatePrompt;
    setDuplicatePrompt(null);
    if (action === "ignore") {
      setStatusMessage("لم يُنشأ استيراد جديد؛ احتفظ النظام بالنسخة السابقة دون تعديل.");
      return;
    }
    if (action === "resume") {
      const openJob = pending.duplicate.jobs.find((item) =>
        ["staging", "uploading", "failed"].includes(item.status) && Boolean(item.upload_session_id),
      );
      if (!openJob) {
        setErrorMessage("لا توجد دفعة غير مكتملة قابلة للاستئناف لهذا الملف.");
        return;
      }
      await processFile(pending.file, pending.fileHash, "new_version", openJob, pending.profileId, pending.periodKey);
      return;
    }
    await processFile(pending.file, pending.fileHash, action, undefined, pending.profileId, pending.periodKey);
  }

  async function resumeFromHistory(event: ChangeEvent<HTMLInputElement>, job: ImportJob & { upload_session_id?: string | null }) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || runningRef.current || preflightRef.current) return;
    if (file.size !== job.file_size) {
      setErrorMessage("حجم الملف لا يطابق الدفعة السابقة.");
      return;
    }
    preflightRef.current = true;
    cancelRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setHashingFile(true);
    setErrorMessage("");
    setStatusMessage("");
    setStage("reading");
    setProgress(0);
    setProcessed(0);
    resetProgressTelemetry(file.size);
    try {
      const fileHash = await hashFileSha256(file, (bytes) => {
        setProgress(Math.round((bytes / Math.max(file.size, 1)) * 10));
        recordProgressTelemetry(bytes, 0);
      }, {
        isPaused: () => pausedRef.current,
        isCancelled: () => cancelRef.current,
      });
      setHashingFile(false);
      if (cancelRef.current) { finishPreflightCancellation(); return; }
      if (fileHash !== job.file_hash) {
        setStage(null);
        setErrorMessage("بصمة الملف لا تطابق الدفعة السابقة؛ اختر الملف الأصلي نفسه.");
        return;
      }
      await processFile(file, fileHash, "new_version", job, job.profile_id ?? activeProfileId, job.period_key ?? null);
    } catch (cause) {
      if (cancelRef.current || (cause instanceof Error && cause.message.includes("تم إلغاء حساب بصمة الملف"))) {
        finishPreflightCancellation();
        return;
      }
      setHashingFile(false);
      setStage(null);
      setErrorMessage(cause instanceof Error ? cause.message : "تعذر استئناف الدفعة.");
    } finally {
      preflightRef.current = false;
      setHashingFile(false);
    }
  }

  return (
    <AdminPage eyebrow="البيانات والذكاء" title="محرك الاستيراد الموحد" description="معالجة CSV متدفقة، بصمات SHA-256، ملف تعريفي وإدارة نسخ دون حفظ الملفات الخام." icon={Upload} note="ملف خام لا يغادر المتصفح؛ الحفظ في الخادم يقتصر على الميتاداتا والصفوف المنظمة واللقطات.">
      <div className="import-layout">
        <section className="panel import-upload-panel">
          <div className="import-upload-icon"><Upload size={26} /></div>
          <h2>رفع ملف للمعالجة</h2>
          <p>يدعم CSV وملفات XLSX الجدولية (الورقة المرئية الأولى). صيغة XLS الثنائية وPDF تبقيان في مسار التعيين اليدوي؛ لا تُخترع بيانات غير مستخرجة.</p>
          <div className="form-grid">
            <label className="form-field"><span>الملف التعريفي</span>
              <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
                <option value="">الملف الموحد (تلقائي)</option>
                {(profiles ?? []).filter((profile: ImportProfile) => profile.status === "active").map((profile: ImportProfile) =>
                  <option key={profile.id} value={profile.id}>{profile.profile_name} — v{profile.version}</option>,
                )}
              </select>
            </label>
            <label className="form-field"><span>الفترة (اختياري)</span>
              <input value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} maxLength={120} placeholder="مثال: 2026-01 أو 2026-Q1" />
            </label>
          </div>
          <label className="import-dropzone">
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFile} disabled={Boolean(stage && stage !== "complete") || Boolean(duplicatePrompt)} />
            <FileDown size={22} /><strong>اختر CSV أو XLSX أو XLS أو PDF</strong>
            <span>100MB كحد أقصى • شرائح 4MB • دفعات معالجة 1,000 صف</span>
          </label>
          {errorMessage && <div className="form-error"><XCircle size={15} /> {errorMessage}</div>}
          {statusMessage && <div className="privacy-note" role="status"><ShieldCheck size={17} /><span>{statusMessage}</span></div>}
          <div className="privacy-note"><ShieldCheck size={17} /><span>الملف الخام لا يُخزن. لا تُحذف سجلات تشغيلية بسبب غيابها من ملف الاستيراد.</span></div>
        </section>

        {duplicatePrompt && <section className="panel" role="alert" style={{ gridColumn: "1 / -1", borderColor: "#d8c17a" }}>
          <h2>تم اكتشاف ملف مطابق</h2>
          <p>الاسم: <strong>{duplicatePrompt.file.name}</strong> • SHA-256: <code>{duplicatePrompt.fileHash.slice(0, 20)}…</code> • دفعات سابقة: {duplicatePrompt.duplicate.jobs.length} • لقطات: {duplicatePrompt.duplicate.snapshots.length}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="outline" onClick={() => void resolveDuplicate("ignore")}>تجاهل</Button>
            {duplicatePrompt.duplicate.jobs.some((item) => ["staging", "failed"].includes(item.status) && Boolean(item.upload_session_id)) &&
              <Button variant="secondary" onClick={() => void resolveDuplicate("resume")}>استئناف دفعة غير مكتملة</Button>}
            <Button variant="secondary" onClick={() => void resolveDuplicate("replace")}>استبدال النسخة</Button>
            <Button variant="secondary" onClick={() => void resolveDuplicate("merge")}>دمج وفق سياسة الملف</Button>
            <Button onClick={() => void resolveDuplicate("new_version")}>إنشاء نسخة جديدة</Button>
          </div>
          <small style={{ display: "block", marginTop: 8 }}>الاستبدال يؤرشف اللقطة السابقة ولا يمحو سجلها. التعارضات التي تتطلب قرارًا بشريًا توقف الدمج.</small>
        </section>}

        <section className="panel pipeline-panel">
          <div className="panel-head">
            <div><h2>مراحل المعالجة</h2><p>تقدم فعلي من القراءة والصفوف المحفوظة إلى قرار الخادم واللقطة.</p></div>
            {stage && stage !== "complete" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["reading", "mapping", "validating", "normalizing"].includes(stage) &&
                <button type="button" className="pause-button" aria-pressed={paused} onClick={() => updatePaused(!pausedRef.current)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "استئناف" : "إيقاف مؤقت"}</button>}
              {["reading", "detecting", "mapping", "validating", "normalizing"].includes(stage) &&
                <button type="button" className="pause-button" onClick={() => { cancelRef.current = true; pausedRef.current = false; setPaused(false); }}>{hashingFile ? "إلغاء قراءة الملف" : "إلغاء آمن"}</button>}
            </div>}
            {stage && ["deduplicating", "merging", "analytics"].includes(stage) &&
              <small role="status" style={{ color: "#8b5e22" }}>بدأت مرحلة التحقق/الاعتماد الخادمي؛ أُخفي زر الإلغاء لأن إنهاء المعاملة بأمان أهم من قطعها في منتصف العملية.</small>}
          </div>
          <div className="pipeline">{STAGES.map((item, index) => {
            const current = stage === item.id;
            const complete = stage === "complete" || (stage && STAGES.findIndex((entry) => entry.id === stage) > index);
            return <div className={"pipeline-step " + (current ? "current" : "") + (complete ? " complete" : "")} key={item.id}>
              <span>{complete ? <Check size={14} /> : index + 1}</span><small>{item.label}</small>
            </div>;
          })}</div>
          {stage && <div className="progress-area">
            <div className="progress-label"><span>المرحلة الحالية: {STAGES.find((item) => item.id === stage)?.label ?? "اكتملت المعالجة"}</span><b>{progress}%</b></div>
            <div className="progress-track" role="progressbar" aria-label="تقدم الاستيراد" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress))}><i style={{ width: progress + "%" }} /></div>
            <small>{formatNumber(processed)} صف تمت قراءته {qualityPreview ? "• DQS أولي " + qualityPreview.score + "/100 (" + qualityPreview.label + ")" : ""}</small>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 8, marginTop: 10, fontSize: 12 }}>
              <span>الصفوف المتبقية: {stage === "complete" ? "0 — اكتملت القراءة" : ["deduplicating", "merging", "analytics"].includes(stage) ? "0 — بانتظار قرار الخادم" : "يُحدد بعد اكتمال القراءة"}</span>
              <span>سرعة قراءة الملف: {formatTransferRate(bytesPerSecond)}</span>
              <span>سرعة الصفوف: {rowsPerSecond > 0 ? formatNumber(Number(rowsPerSecond.toFixed(1))) + " صف/ث" : "جارٍ القياس"}</span>
              <span>الوقت المتبقي التقريبي: {stage === "complete" ? "اكتملت المعالجة" : ["deduplicating", "merging", "analytics"].includes(stage) ? "مرحلة الاعتماد الخادمي" : bytesPerSecond > 0 && sourceBytesTotal > sourceBytesProcessed ? formatEstimatedTime((sourceBytesTotal - sourceBytesProcessed) / bytesPerSecond) : "جارٍ حساب التقدير"}</span>
              <span>حجم الملف: {(sourceBytesProcessed / (1024 * 1024)).toFixed(1)} / {(sourceBytesTotal / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        </section>

        <section className="panel import-jobs-panel">
          <div className="panel-head"><div><h2>سجل الدفعات</h2><p>البصمة والميتا والنتائج دون حفظ الملفات الخام</p></div><Button variant="outline" onClick={refetch}><RefreshCw size={15} /> تحديث</Button></div>
          {loading ? <Loading /> : error ? <ErrorBox message={error} /> : jobs?.length ? <TableWrap><table>
            <thead><tr><th>الملف</th><th>الحالة</th><th>DQS</th><th>الصفوف</th><th>التاريخ</th><th>الاستئناف</th></tr></thead>
            <tbody>{jobs.map((job) => <tr key={job.id}>
              <td><strong>{job.file_name ?? "—"}</strong><small>{job.file_hash?.slice(0, 16) ?? "—"}…</small></td>
              <td><span className={"badge " + (job.status === "completed" ? "success" : job.status === "rejected" ? "danger" : "warning")}>{job.status === "manual_mapping_required" ? "تعيين يدوي" : job.status === "manual_review" ? "مراجعة بشرية" : job.status}</span></td>
              <td>{job.data_quality_score == null ? "—" : job.data_quality_score + "/100 (" + (qualityPreview?.score === job.data_quality_score ? qualityPreview.label : job.data_quality_score >= 90 ? "ممتاز" : job.data_quality_score >= 75 ? "مقبول" : job.data_quality_score >= 50 ? "تحذير" : "مرفوض") + ")"}</td>
              <td>{formatNumber(job.processed_rows)} / {formatNumber(job.total_rows)}</td>
              <td>{new Date(job.created_at).toLocaleDateString("ar")}</td>
              <td>{["staging", "failed"].includes(job.status) && job.upload_session_id &&
                <label className="sf-link" style={{ cursor: "pointer" }}>اختر الملف الأصلي<input type="file" accept=".csv" style={{ display: "none" }} disabled={Boolean(stage && stage !== "complete")} onChange={(event) => void resumeFromHistory(event, job)} /></label>}</td>
            </tr>)}</tbody>
          </table></TableWrap> : <Empty text="لا توجد دفعات مستوردة بعد" />}
        </section>
      </div>
    </AdminPage>
  );
}
