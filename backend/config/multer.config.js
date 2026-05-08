import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// ─── Upload dirs (local + serverless) ────────────────────────────────────────

const baseUploadDir = (() => {
  if (process.env.UPLOAD_DIR) return path.resolve(process.env.UPLOAD_DIR);
  if (process.env.VERCEL) return path.join(os.tmpdir(), 'uploads');
  return path.join(process.cwd(), 'uploads');
})();

const AVATAR_DIR = path.join(baseUploadDir, 'avatars');
const REPORTS_DIR = path.join(baseUploadDir, 'reports');

function ensureDir(dir, cb) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  } catch (err) {
    cb(err);
  }
}

// ─── Avatar Storage ───────────────────────────────────────────────────────────

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => ensureDir(AVATAR_DIR, cb),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});

const avatarFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(Object.assign(new Error('Only JPEG, PNG, and WebP images are allowed'), { status: 400 }));
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('avatar');

// ─── Medical Report Storage ───────────────────────────────────────────────────

const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => ensureDir(REPORTS_DIR, cb),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `report-${uuidv4()}${ext}`);
  },
});

const reportFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(Object.assign(new Error('Only PDF and image files are allowed'), { status: 400 }));
};

export const uploadReport = multer({
  storage: reportStorage,
  fileFilter: reportFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
}).single('report_doc');

// ─── Multer error handler (use as middleware) ─────────────────────────────────

export function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  next(err);
}