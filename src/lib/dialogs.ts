export interface ConfirmOptions {
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * A yes/no dialog as a promise — same signature as the native app's dialogs.ts, but backed by
 * `window.confirm` rather than React Native's `Alert`, which `react-native-web` does not
 * implement at all (a real bug in the old, now-deleted web build: an "Undo import" confirmation
 * silently did nothing on web for weeks because of this).
 *
 * `window.confirm` only offers one button's worth of label, so `confirmLabel`/`cancelLabel`
 * aren't rendered — the message states the action instead. Kept as parameters anyway so call
 * sites don't need a platform-specific signature.
 */
export function confirm(title: string, message: string, _options: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
}

export function notify(title: string, message?: string): void {
  window.alert(message ? `${title}\n\n${message}` : title);
}
