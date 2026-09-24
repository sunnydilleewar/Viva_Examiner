const { analyzeProject } = require('../services/projectAnalyzer.service');

/**
 * Project Analysis Controller
 * POST /api/projects/analyze
 * Body: { projectName, description, technologies }
 */
async function analyze(req, res, next) {
  try {
    const { projectName, description, technologies } = req.body;

    if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Field "projectName" is required and must be a non-empty string.'
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Field "description" is required and must be a non-empty string.'
      });
    }

    const analysis = await analyzeProject({
      projectName: projectName.trim(),
      description: description.trim(),
      technologies: technologies || []
    });

    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyze
};
