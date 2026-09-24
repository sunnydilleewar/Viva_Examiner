/**
 * File Parser Service
 * 
 * Safely extracts text and structured content from uploaded project documents and source code archives.
 * Supports: PDF, DOCX, PPTX, TXT, ZIP
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Directories to ignore during ZIP source code extraction
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.idea',
  '.vscode',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.env',
  'target',
  'bin',
  'obj'
]);

// Binary / media extensions to ignore inside ZIP
const IGNORED_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar', '.war', '.ear',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
  '.mp4', '.avi', '.mov', '.mkv', '.webm',
  '.mp3', '.wav', '.flac', '.ogg',
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pyc', '.pyo', '.pyd'
]);

// Source code extensions prioritized for viva evaluation
const CODE_LANGUAGE_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript (react)',
  '.ts': 'typescript',
  '.tsx': 'typescript (react)',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'c++',
  '.h': 'c/c++ header',
  '.hpp': 'c++ header',
  '.cs': 'c#',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.sql': 'sql',
  '.md': 'markdown',
  '.txt': 'text',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sh': 'shell script'
};

/**
 * Extract text from PDF
 */
async function parsePdf(filePath) {
  try {
    const dataBuffer = await fs.promises.readFile(filePath);
    const parsed = await pdfParse(dataBuffer);
    return {
      type: 'documentation',
      language: 'text',
      content: (parsed.text || '').trim()
    };
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

/**
 * Extract text from DOCX
 */
async function parseDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      type: 'documentation',
      language: 'text',
      content: (result.value || '').trim()
    };
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err.message}`);
  }
}

/**
 * Extract text from PPTX (OpenXML presentation archive)
 */
async function parsePptx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    const slidesText = [];

    // Filter for slide XML files (ppt/slides/slide1.xml, slide2.xml...)
    const slideEntries = zipEntries.filter(entry => 
      !entry.isDirectory && /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName)
    );

    // Sort slides numerically
    slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.entryName.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    for (const slide of slideEntries) {
      const xml = slide.getData().toString('utf8');
      // Match text within <a:t>...</a:t> tags
      const textMatches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const slideLines = textMatches
        .map(tag => tag.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);

      if (slideLines.length > 0) {
        slidesText.push(`[Slide ${slide.entryName.replace(/\D/g, '')}]\n${slideLines.join(' ')}`);
      }
    }

    return {
      type: 'presentation',
      language: 'text',
      content: slidesText.join('\n\n')
    };
  } catch (err) {
    throw new Error(`Failed to parse PPTX: ${err.message}`);
  }
}

/**
 * Extract text from plain text or markdown file
 */
async function parseTxt(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    return {
      type: 'documentation',
      language: ext === '.md' ? 'markdown' : 'text',
      content: content.trim()
    };
  } catch (err) {
    throw new Error(`Failed to read text file: ${err.message}`);
  }
}

/**
 * Extract source code files from ZIP archive
 */
async function parseZip(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    const extractedFiles = [];

    // Limit maximum files to avoid zip bomb exhaustion
    const MAX_ZIP_FILES = 40;
    const MAX_FILE_SIZE = 40 * 1024; // 40KB max text per file

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const normalizedPath = entry.entryName.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      const ext = path.extname(filename).toLowerCase();

      // Skip ignored directories
      const hasIgnoredDir = pathParts.some(part => IGNORED_DIRECTORIES.has(part.toLowerCase()));
      if (hasIgnoredDir) continue;

      // Skip ignored extensions / binaries
      if (IGNORED_EXTENSIONS.has(ext)) continue;

      // Must be a recognized code/doc extension
      if (!CODE_LANGUAGE_MAP[ext] && !['.env.example', 'dockerfile', 'makefile'].includes(filename.toLowerCase())) {
        continue;
      }

      // Check uncompressed size
      if (entry.header.size > 200 * 1024) continue; // skip files > 200KB

      const content = entry.getData().toString('utf8');
      const truncatedContent = content.length > MAX_FILE_SIZE
        ? content.substring(0, MAX_FILE_SIZE) + '\n...[Content truncated for length]'
        : content;

      extractedFiles.push({
        name: normalizedPath,
        type: 'source_code',
        language: CODE_LANGUAGE_MAP[ext] || 'text',
        content: truncatedContent,
        size: entry.header.size
      });

      if (extractedFiles.length >= MAX_ZIP_FILES) {
        break;
      }
    }

    return extractedFiles;
  } catch (err) {
    throw new Error(`Failed to extract ZIP archive: ${err.message}`);
  }
}

/**
 * Parse an array of uploaded files (from Multer)
 * 
 * @param {Array<Express.Multer.File>} files
 * @returns {Promise<Array<Object>>} Extracted file objects
 */
async function parseUploadedFiles(files = []) {
  const parsedResults = [];

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    const originalName = file.originalname;

    try {
      if (ext === '.pdf') {
        const doc = await parsePdf(file.path);
        parsedResults.push({
          name: originalName,
          type: doc.type,
          language: doc.language,
          content: doc.content,
          size: file.size,
          status: 'success'
        });
      } else if (ext === '.docx') {
        const doc = await parseDocx(file.path);
        parsedResults.push({
          name: originalName,
          type: doc.type,
          language: doc.language,
          content: doc.content,
          size: file.size,
          status: 'success'
        });
      } else if (ext === '.pptx') {
        const doc = await parsePptx(file.path);
        parsedResults.push({
          name: originalName,
          type: doc.type,
          language: doc.language,
          content: doc.content,
          size: file.size,
          status: 'success'
        });
      } else if (ext === '.txt' || ext === '.md') {
        const doc = await parseTxt(file.path);
        parsedResults.push({
          name: originalName,
          type: doc.type,
          language: doc.language,
          content: doc.content,
          size: file.size,
          status: 'success'
        });
      } else if (ext === '.zip') {
        const codeFiles = await parseZip(file.path);
        if (codeFiles.length === 0) {
          parsedResults.push({
            name: originalName,
            type: 'source_code',
            language: 'archive',
            content: 'No readable source code files found in archive (all files filtered or empty).',
            size: file.size,
            status: 'empty_zip'
          });
        } else {
          // Push both summary container entry and individual code files
          parsedResults.push({
            name: originalName,
            type: 'source_archive',
            language: 'zip',
            content: `Extracted ${codeFiles.length} source code files.`,
            size: file.size,
            status: 'success',
            extractedCount: codeFiles.length
          });

          // Add individual code files with zip prefix
          for (const cf of codeFiles) {
            parsedResults.push({
              name: `${originalName}/${cf.name}`,
              type: 'source_code',
              language: cf.language,
              content: cf.content,
              size: cf.size,
              status: 'success'
            });
          }
        }
      } else {
        parsedResults.push({
          name: originalName,
          type: 'unknown',
          language: 'unknown',
          content: '',
          size: file.size,
          status: 'unsupported'
        });
      }
    } catch (parseErr) {
      console.warn(`[FileParser] Error parsing ${originalName}:`, parseErr.message);
      parsedResults.push({
        name: originalName,
        type: 'error',
        language: 'unknown',
        content: `Error parsing file: ${parseErr.message}`,
        size: file.size,
        status: 'failed'
      });
    }
  }

  return parsedResults;
}

/**
 * Clean up uploaded temporary files from disk
 */
async function cleanupFiles(files = []) {
  for (const file of files) {
    if (file && file.path) {
      try {
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      } catch (err) {
        console.warn(`[FileParser] Could not delete temp file ${file.path}:`, err.message);
      }
    }
  }
}

module.exports = {
  parsePdf,
  parseDocx,
  parsePptx,
  parseTxt,
  parseZip,
  parseUploadedFiles,
  cleanupFiles
};
