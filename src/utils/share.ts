import { Capacitor } from '@capacitor/core';
import type { BackupFile } from '../db/backup';

/**
 * Did the user simply close the share sheet? Android reports that as an
 * error ("Share canceled"), but it is a choice, not a failure, and needs no
 * message.
 */
export function isShareCancelled(error: unknown): boolean {
  return /cancel/i.test((error as Error)?.message ?? '');
}

export interface SaveResult {
  filename: string;
  /** True when the system share sheet was used rather than a direct download. */
  shared: boolean;
}

function backupFilename(): string {
  const today = new Date();
  const stamp = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return `kidrota-backup-${stamp}.json`;
}

/**
 * Save a backup off the device.
 *
 * On Android the file is written to app storage and handed to the system share
 * sheet, so the user can put it in Drive, Files or an email. Writing straight
 * to the public Downloads folder would need storage permissions the app
 * otherwise never asks for, for no extra benefit.
 *
 * In a browser it is an ordinary download.
 */
export async function downloadBackup(file: BackupFile): Promise<SaveResult> {
  const filename = backupFilename();
  const json = JSON.stringify(file, null, 2);

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const written = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    await Share.share({
      title: 'KidRota backup',
      text: 'Your KidRota plan, as a backup file.',
      url: written.uri,
      dialogTitle: 'Save your backup',
    });

    return { filename, shared: true };
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { filename, shared: false };
}

function pngFilename(holidayName: string, suffix: string): string {
  const slug = holidayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `kidrota-${slug || 'plan'}${suffix}.png`;
}

/**
 * Turn each element into a PNG and hand them all to the share sheet at once,
 * so a whole holiday goes to WhatsApp as one message of pictures.
 *
 * Rendered at twice the screen scale, because the grid's carer labels are
 * small and a 1x capture of them is unreadable once WhatsApp has compressed
 * it. Each element is captured at its full width, so a week wider than the
 * screen still shares every day.
 */
export async function shareElementsAsImages(
  elements: HTMLElement[],
  holidayName: string,
): Promise<SaveResult> {
  const { toPng } = await import('html-to-image');
  // The capture has no page behind it, so it needs its own background.
  const backgroundColor = getComputedStyle(document.body).backgroundColor;

  const images: { filename: string; dataUrl: string }[] = [];
  for (const [index, element] of elements.entries()) {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });
    const suffix = elements.length > 1 ? `-week-${index + 1}` : '';
    images.push({ filename: pngFilename(holidayName, suffix), dataUrl });
  }

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const files: string[] = [];
    for (const image of images) {
      const written = await Filesystem.writeFile({
        path: image.filename,
        // writeFile wants base64 without the data-URL prefix.
        data: image.dataUrl.split(',')[1],
        directory: Directory.Cache,
      });
      files.push(written.uri);
    }

    await Share.share({
      title: holidayName,
      text: `${holidayName} — who has the kids`,
      files,
      dialogTitle: 'Share the plan',
    });

    return { filename: images[0]?.filename ?? '', shared: true };
  }

  for (const image of images) {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return { filename: images.map((image) => image.filename).join(', '), shared: false };
}
