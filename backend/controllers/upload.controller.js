/**
 * Upload Controller
 * 
 * Handles project file uploads, parsing, database persistence, and AI project analysis.
 */

const { parseUploadedFiles, cleanupFiles } = require('../services/fileParser.service');
const { analyzeUploadedProject } = require('../services/projectAnalyzer.service');
const db = require('../database');

/**
 * Handle project files upload & AI analysis
 * POST /api/projects/analyze-upload
 */
async function analyzeUpload(req, res, next) {
  const uploadedFiles = req.files || [];

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: 'No files were uploaded. Please provide at least one documentation file (PDF/DOCX/PPTX/TXT) or source code (ZIP).'
    });
  }

  try {
    const { projectName = '', description = '', technologies = '' } = req.body;

    const parsedTech = typeof technologies === 'string'
      ? technologies.split(',').map(t => t.trim()).filter(Boolean)
      : (Array.isArray(technologies) ? technologies : []);

    // 1. Extract text and content from uploaded files
    const extractedFiles = await parseUploadedFiles(uploadedFiles);

    // Verify at least one file yielded usable content
    const hasUsableContent = extractedFiles.some(f => 
      f.content && f.content.trim().length > 0 && f.status !== 'failed' && f.status !== 'unsupported'
    );

    if (!hasUsableContent) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Could not extract usable text or code from the uploaded files. Ensure files are not empty or corrupted.'
      });
    }

    // 2. Persist project in SQLite
    const initialProjectName = projectName.trim() || uploadedFiles[0].originalname;
    const projectInsert = await db.run(
      `INSERT INTO projects (name, description) VALUES (?, ?)`,
      [initialProjectName, description.trim() || 'Uploaded project documentation & code']
    );
    const projectId = projectInsert.lastID;

    // 3. Persist file metadata in SQLite
    for (const file of uploadedFiles) {
      const match = extractedFiles.find(ef => ef.name === file.originalname);
      const extractionStatus = match ? match.status : 'success';
      const extractedChars = match && match.content ? match.content.length : 0;

      await db.run(
        `INSERT INTO project_files (project_id, original_name, stored_name, file_type, file_size, extraction_status, extracted_chars)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          file.originalname,
          file.filename,
          match?.type || file.mimetype || 'unknown',
          file.size,
          extractionStatus,
          extractedChars
        ]
      );
    }

    // 4. Send prioritized content to OpenRouter AI
    const analysis = await analyzeUploadedProject({
      projectName: initialProjectName,
      description: description.trim(),
      technologies: parsedTech,
      extractedFiles
    });

    // 5. Update project record with final name and analysis JSON in SQLite
    await db.run(
      `UPDATE projects SET name = ?, analysis_json = ? WHERE id = ?`,
      [analysis.projectName || initialProjectName, JSON.stringify(analysis), projectId]
    );

    // 6. Return response
    return res.status(200).json({
      success: true,
      data: {
        projectId,
        ...analysis
      }
    });
  } catch (error) {
    next(error);
  } finally {
    // 7. Cleanup temporary uploaded files from disk
    await cleanupFiles(uploadedFiles);
  }
}

module.exports = {
  analyzeUpload
};
