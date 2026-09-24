const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed extensions and corresponding MIME patterns
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.txt', '.zip']);
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.sh', '.bin', '.msi', '.vbs', '.com', '.scr', '.pif'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'application/octet-stream' // sometimes sent for zip or custom files
]);

// Configure disk storage with safe sanitized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawBase = path.basename(file.originalname, ext);
    // Sanitize base name: alphanumeric, dash, underscore only
    const sanitizedBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniqueHash = crypto.randomBytes(6).toString('hex');
    const safeName = `${Date.now()}-${uniqueHash}-${sanitizedBase}${ext}`;
    cb(null, safeName);
  }
});

// File filter for security
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  // Reject dangerous executables immediately
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    const err = new Error(`Dangerous or executable file type rejected: "${ext}"`);
    err.statusCode = 400;
    return cb(err, false);
  }

  // Must match allowed extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const err = new Error(`Unsupported file type "${ext}". Allowed formats: PDF, DOCX, PPTX, TXT, ZIP.`);
    err.statusCode = 400;
    return cb(err, false);
  }

  // Check MIME type where practical (skip strict mime if octet-stream with valid extension)
  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase()) && file.mimetype !== 'application/octet-stream') {
    // Some browsers send generic MIME types for PPTX/DOCX; verify extension is in allowed set
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`Invalid MIME type: ${file.mimetype}`);
      err.statusCode = 400;
      return cb(err, false);
    }
  }

  cb(null, true);
}

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
    files: 10 // max 10 files per submission
  }
});

/**
 * Middleware wrapper to handle Multer-specific errors cleanly
 */
function handleUpload(fields) {
  const multerMiddleware = upload.array(fields, 10);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              status: 'error',
              message: 'File size exceeds maximum allowed limit (25MB).'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              status: 'error',
              message: 'Too many files uploaded (maximum 10 files per project).'
            });
          }
          return res.status(400).json({
            success: false,
            status: 'error',
            message: `Upload error: ${err.message}`
          });
        }
        return res.status(err.statusCode || 400).json({
          success: false,
          status: 'error',
          message: err.message || 'File upload rejected'
        });
      }
      next();
    });
  };
}

module.exports = {
  upload,
  handleUpload,
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS
};
