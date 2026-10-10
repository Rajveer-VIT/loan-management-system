import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

/** Allowed types: extension → MIME types browsers send for it → canonical MIME. */
const ALLOWED_TYPES = {
  '.pdf': { mimes: ['application/pdf'], canonical: 'application/pdf' },
  '.jpg': { mimes: ['image/jpeg', 'image/jpg', 'image/pjpeg'], canonical: 'image/jpeg' },
  '.jpeg': { mimes: ['image/jpeg', 'image/jpg', 'image/pjpeg'], canonical: 'image/jpeg' },
  '.png': { mimes: ['image/png'], canonical: 'image/png' },
} as const;

type AllowedExtension = keyof typeof ALLOWED_TYPES;

function allowedExtension(fileName: string): AllowedExtension | null {
  const ext = path.extname(fileName).toLowerCase();
  return ext in ALLOWED_TYPES ? (ext as AllowedExtension) : null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  // The stored name is fully server-generated (random hex + whitelisted extension), so the
  // client-supplied file name can never influence the path (no traversal, no overwrite).
  filename: (_req, file, cb) => {
    const ext = allowedExtension(file.originalname) ?? '';
    cb(null, `salary-slip-${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = allowedExtension(file.originalname);
  const mimeOk = ext !== null && (ALLOWED_TYPES[ext].mimes as readonly string[]).includes(file.mimetype);
  if (mimeOk) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, JPG, and PNG files are allowed for salary slips.', 400, undefined, 'INVALID_FILE_TYPE'));
  }
};

export const uploadSalarySlip = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
  fileFilter,
});

/**
 * Checks the file's leading bytes ("magic numbers") against its extension, because
 * the extension and Content-Type header are both client-controlled.
 * Returns the canonical MIME type, or null if the content does not match.
 */
export async function sniffUploadedFile(filePath: string, originalName: string): Promise<string | null> {
  const ext = allowedExtension(originalName);
  if (!ext) return null;

  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, 8, 0);
    const bytes = header.subarray(0, bytesRead);

    const isPdf = bytes.subarray(0, 5).toString('latin1') === '%PDF-';
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const matches = ext === '.pdf' ? isPdf : ext === '.png' ? isPng : isJpeg;
    return matches ? ALLOWED_TYPES[ext].canonical : null;
  } finally {
    await handle.close();
  }
}

/** Best-effort delete of an uploaded file; never throws. */
export async function removeUploadedFile(storedName: string | undefined): Promise<void> {
  if (!storedName) return;
  // basename() guarantees we only ever touch files directly inside uploadDir.
  const target = path.join(uploadDir, path.basename(storedName));
  await fs.promises.unlink(target).catch(() => undefined);
}

export function resolveUploadedFile(storedName: string): string {
  return path.join(uploadDir, path.basename(storedName));
}
