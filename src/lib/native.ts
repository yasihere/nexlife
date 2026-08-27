// Capacitor bridges (CLAUDE.md §4). Zero React imports. Every function here is
// safe to call from a plain browser dev tab too — Capacitor's native plugins
// only get dynamically imported (and used) when actually running on-device.

import { Capacitor } from '@capacitor/core';

/**
 * Hands the user a text file: the native share sheet on-device (so a backup
 * can go straight to Drive, per SPEC.md), or a plain browser download when
 * running in a dev tab (`npm run dev`) where there's no native shell to share
 * through. @capacitor/filesystem and @capacitor/share are dynamically
 * imported, so a `npm run dev` session that never exports never loads them.
 */
export async function saveAndShareFile(
  filename: string,
  contents: string,
  mimeType: string
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: uri });
    return;
  }

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * A 10ms tick on complete/drop (PROMPTS.md Phase 8, #7). No-op outside native,
 * and honours prefers-reduced-motion — haptics are a form of motion feedback,
 * so the same preference that stops the Now Line sliding stops this buzzing.
 */
export async function hapticTick(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { Haptics } = await import('@capacitor/haptics');
  await Haptics.vibrate({ duration: 10 });
}
