/** Accepted announcement file extensions (must match backend announcementUpload) */
export const ANNOUNCEMENT_FILE_ACCEPT =
  'image/*,.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,application/pdf';

export type AnnouncementFileKind = 'image' | 'pdf' | 'document' | 'none';

export function fileKindFromFile(file: File): AnnouncementFileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  return 'document';
}

export function fileKindFromAnnouncement(ann: {
  image_mime_type?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  has_image_data?: boolean;
}): AnnouncementFileKind {
  const mime = (ann.image_mime_type || '').toLowerCase();
  const filePath = (ann.image_path || ann.image_url || '').toLowerCase();
  if (!mime && !filePath && !ann.has_image_data) return 'none';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || filePath.endsWith('.pdf')) return 'pdf';
  return 'document';
}

export function hasAnnouncementAttachment(ann: {
  image_mime_type?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  has_image_data?: boolean;
  image_data?: unknown;
}): boolean {
  return !!(
    ann.has_image_data ||
    ann.image_data ||
    ann.image_path ||
    ann.image_url
  );
}
