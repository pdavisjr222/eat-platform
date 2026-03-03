import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "./config";
import type { Request } from "express";

// Ensure upload directories exist
const uploadDirs = ["images", "profiles", "listings", "events", "foraging", "documents"];

for (const dir of uploadDirs) {
  const fullPath = path.join(config.uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

// File filter for images
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  }
};

// File filter for documents
const documentFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error("Only images and documents (PDF, DOC, DOCX) are allowed"));
  }
};

// Generate unique filename
const generateFilename = (originalname: string): string => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
};

// Storage configuration for different upload types
const createStorage = (subdir: string) =>
  multer.diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = path.join(config.uploadDir, subdir);
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      callback(null, generateFilename(file.originalname));
    },
  });

// Profile image upload
export const uploadProfileImage = multer({
  storage: createStorage("profiles"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

// Listing images upload (multiple) — disk storage (legacy, unused in production)
export const uploadListingImages = multer({
  storage: createStorage("listings"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: imageFilter,
}).array("images", 10);

// Listing images upload — memory storage (converts to base64 for Neon JSONB, no disk writes)
export const uploadListingImagesMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per file
  fileFilter: imageFilter,
}).array("images", 10);

// Event image upload
export const uploadEventImage = multer({
  storage: createStorage("events"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

// Foraging spot images upload (multiple)
export const uploadForagingImages = multer({
  storage: createStorage("foraging"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: imageFilter,
}).array("images", 10);

// Document upload (for job applications, etc.)
export const uploadDocument = multer({
  storage: createStorage("documents"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: documentFilter,
}).single("document");

// General image upload
export const uploadImage = multer({
  storage: createStorage("images"),
  limits: { fileSize: config.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

// Get file URL from filename
export function getFileUrl(filename: string, subdir: string): string {
  return `/uploads/${subdir}/${filename}`;
}

// Delete file
export async function deleteFile(filepath: string): Promise<boolean> {
  try {
    const fullPath = path.join(process.cwd(), filepath.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

// Delete multiple files
export async function deleteFiles(filepaths: string[]): Promise<void> {
  for (const filepath of filepaths) {
    await deleteFile(filepath);
  }
}
