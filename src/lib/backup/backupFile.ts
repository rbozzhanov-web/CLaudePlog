import { loadJson, saveJson } from '@/src/lib/webJsonStore';
import { FlightLogEntry } from '@/src/types/logbook';
import { BACKUP_FILE_NAME, serializeBackup } from './format';
import { buildLogbookHtml } from './pdfDoc';

const BACKUP_TEXT_KEY = 'pilot-logbook:backup';
const BACKUP_META_KEY = 'pilot-logbook:backup-meta';

/**
 * A browser has no Documents directory to write the live backup into, and no file-sharing pane —
 * the closest equivalent is a snapshot kept in this origin's localStorage, used only to drive the
 * Settings screen's "last written" hint. It is not a substitute for OPFS, which already holds the
 * real data; it is a safety net a pilot can still download as a portable file at any time.
 */
let memoryBackupText: string | undefined;

function readBackupText(): string | undefined {
  try {
    return localStorage.getItem(BACKUP_TEXT_KEY) ?? undefined;
  } catch {
    return memoryBackupText;
  }
}

function writeBackupText(text: string): void {
  try {
    localStorage.setItem(BACKUP_TEXT_KEY, text);
  } catch {
    memoryBackupText = text;
  }
}

export interface BackupFileStatus {
  exists: boolean;
  /** Bytes, for showing that the file is real and non-empty. */
  size?: number;
  modifiedAt?: Date;
}

interface BackupMeta {
  modifiedAt: string;
}

function parseBackupMeta(raw: unknown): BackupMeta | undefined {
  const value = raw as Partial<BackupMeta> | undefined;
  return typeof value?.modifiedAt === 'string' ? { modifiedAt: value.modifiedAt } : undefined;
}

export function readBackupStatus(): BackupFileStatus {
  const text = readBackupText();
  if (text === undefined) return { exists: false };
  const meta = loadJson<BackupMeta | undefined>(BACKUP_META_KEY, parseBackupMeta, undefined);
  return {
    exists: true,
    size: new Blob([text]).size,
    modifiedAt: meta?.modifiedAt ? new Date(meta.modifiedAt) : undefined,
  };
}

/** Overwrites the local backup snapshot. Called both by the auto-backup and by the explicit Export button. */
export function writeBackup(entries: FlightLogEntry[]): string {
  const text = serializeBackup(entries);
  writeBackupText(text);
  saveJson(BACKUP_META_KEY, { modifiedAt: new Date().toISOString() } satisfies BackupMeta);
  return text;
}

function downloadTextFile(fileName: string, mimeType: string, contents: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function shareBackup(entries: FlightLogEntry[]): Promise<void> {
  const text = writeBackup(entries);
  downloadTextFile(BACKUP_FILE_NAME, 'application/json', text);
}

/** Returns the file's text, or undefined if the pilot cancelled the picker. */
export function pickBackupText(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    const finish = (text: string | undefined) => {
      input.remove();
      resolve(text);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => finish(undefined);
      reader.readAsText(file);
    };
    // Chromium and Safari both fire `cancel` on a dismissed file dialog; without it, cancelling
    // never fires `change` and this promise would hang forever instead of resolving undefined.
    input.oncancel = () => finish(undefined);

    document.body.appendChild(input);
    input.click();
  });
}

export async function sharePdf(entries: FlightLogEntry[]): Promise<void> {
  const html = buildLogbookHtml(entries);
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Pop-up blocked — allow pop-ups for this site to print the logbook.');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
