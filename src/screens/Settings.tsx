import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { differenceInCalendarDays } from 'date-fns';
import BottomNav from '../components/BottomNav';
import { getEntryCount } from '../data/queries';
import { purgeOldDeleted } from '../data/entries';
import { getSettings, updateSettings } from '../data/settings';
import { ensureNotificationPermission } from '../lib/notifications';
import type { ValidationResult } from '../data/backup';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LEAD_TIME_OPTIONS = [0, 5, 10, 15, 30] as const;
const DEFAULT_LEAD_MIN = 10;

type ImportState =
  | { step: 'idle' }
  | { step: 'validated'; result: ValidationResult; mode: 'replace' | 'merge' }
  | { step: 'importing' }
  | { step: 'done'; count: number }
  | { step: 'error'; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Settings() {
  const entryCount = useLiveQuery(() => getEntryCount());
  const settings = useLiveQuery(() => getSettings());
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });
  const [exporting, setExporting] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((estimate) => setStorageBytes(estimate.usage ?? null))
      .catch(() => setStorageBytes(null));
  }, []);

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      const { exportAndShare } = await import('../data/backup');
      await exportAndShare();
    } finally {
      setExporting(false);
    }
  }

  async function handleFileChosen(file: File): Promise<void> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { validateBackup } = await import('../data/backup');
      const outcome = validateBackup(parsed);
      if (!outcome.ok) {
        setImportState({ step: 'error', message: outcome.error });
        return;
      }
      setImportState({ step: 'validated', result: outcome.result, mode: 'merge' });
    } catch {
      setImportState({ step: 'error', message: "That file doesn't look like a NexLife backup." });
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (importState.step !== 'validated') return;
    setImportState({ step: 'importing' });
    const { commitImport } = await import('../data/backup');
    const count = await commitImport(importState.result, importState.mode);
    setImportState({ step: 'done', count });
  }

  async function handleLeadTimeChange(minutes: number): Promise<void> {
    await ensureNotificationPermission();
    await updateSettings({ notificationLeadMin: minutes });
  }

  async function handlePurge(): Promise<void> {
    const count = await purgeOldDeleted(Date.now() - THIRTY_DAYS_MS);
    setPurgeResult(count === 0 ? 'Nothing to purge.' : `Purged ${count} item${count === 1 ? '' : 's'}.`);
  }

  const lastExportLabel = (() => {
    if (!settings?.lastExportAt) return 'Never exported';
    const days = differenceInCalendarDays(new Date(), new Date(settings.lastExportAt));
    if (days <= 0) return 'Last export: today';
    if (days === 1) return 'Last export: yesterday';
    return `Last export: ${days} days ago`;
  })();

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <section className="flex flex-col gap-1 border-b border-rule pb-4">
          <p className="text-title text-paper">
            {entryCount ?? '—'} {entryCount === 1 ? 'entry' : 'entries'}
          </p>
          <p className="text-title text-muted">
            {storageBytes != null ? `${formatBytes(storageBytes)} used` : 'Storage unavailable'}
          </p>
          <p className="text-title text-muted">{lastExportLabel}</p>
        </section>

        <section className="flex flex-col gap-2 border-b border-rule py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Backup</span>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="min-h-[44px] rounded bg-signal text-title font-medium text-void disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="min-h-[44px] rounded border border-rule text-title text-paper"
          >
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileChosen(file);
              e.target.value = '';
            }}
          />

          {importState.step === 'error' && <p className="text-title text-muted">{importState.message}</p>}

          {importState.step === 'validated' && (
            <div className="flex flex-col gap-2 rounded border border-rule p-3">
              <p className="text-title text-paper">
                {importState.result.validEntries.length} entries
                {importState.result.invalidCount > 0 && `, ${importState.result.invalidCount} invalid`}
                {importState.result.invalidCount > 0 ? ' — skip invalid and import?' : ' found.'}
              </p>
              <div className="flex gap-2">
                {(['merge', 'replace'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImportState({ ...importState, mode })}
                    className={
                      'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                      (importState.mode === mode ? 'border-paper text-paper' : 'border-rule text-muted')
                    }
                  >
                    {mode === 'merge' ? 'Merge' : 'Replace everything'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportState({ step: 'idle' })}
                  className="min-h-[44px] flex-1 rounded border border-rule text-title text-paper"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmImport()}
                  className="min-h-[44px] flex-1 rounded bg-signal text-title font-medium text-void"
                >
                  Import {importState.result.validEntries.length}
                </button>
              </div>
            </div>
          )}

          {importState.step === 'importing' && <p className="text-title text-muted">Importing…</p>}
          {importState.step === 'done' && (
            <p className="text-title text-paper">Imported {importState.count} entries.</p>
          )}
        </section>

        <section className="flex flex-col gap-2 border-b border-rule py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Reminders
          </span>
          <p className="text-title text-muted">Minutes before a scheduled entry starts</p>
          <div className="flex gap-2">
            {LEAD_TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => void handleLeadTimeChange(minutes)}
                className={
                  'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                  ((settings?.notificationLeadMin ?? DEFAULT_LEAD_MIN) === minutes
                    ? 'border-paper text-paper'
                    : 'border-rule text-muted')
                }
              >
                {minutes === 0 ? 'At start' : `${minutes}m`}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Storage</span>
          <button
            type="button"
            onClick={() => void handlePurge()}
            className="min-h-[44px] rounded border border-rule text-title text-paper"
          >
            Purge deleted items older than 30 days
          </button>
          {purgeResult && <p className="text-title text-muted">{purgeResult}</p>}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
