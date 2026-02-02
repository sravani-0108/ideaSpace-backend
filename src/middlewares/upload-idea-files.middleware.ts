import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Create uploads directory for idea files if it doesn't exist
const ideaFilesDir = path.join(__dirname, '../../uploads/idea-files');
if (!fs.existsSync(ideaFilesDir)) {
  fs.mkdirSync(ideaFilesDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, ideaFilesDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename: userId-timestamp.extension
    const userId = (req as any).userId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${uniqueSuffix}${ext}`);
  },
});

// File filter for documentation (PDF, DOC, DOCX), videos (MP4, MOV, AVI), and ZIP files
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimes = [
    // Documentation
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    // ZIP files
    'application/zip',
    'application/x-zip-compressed',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, MP4, MOV, AVI, and ZIP files are allowed.'));
  }
};

// Configure multer for idea files
export const uploadIdeaFiles = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter,
});

// Separate upload handlers for different file types
export const uploadDocumentation = uploadIdeaFiles.single('documentation');
export const uploadVideo = uploadIdeaFiles.single('video');
export const uploadZip = uploadIdeaFiles.single('zipFile');

