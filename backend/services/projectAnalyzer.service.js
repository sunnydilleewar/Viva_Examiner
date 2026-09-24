/**
 * Project Analyzer Service
 * 
 * Prepares project information for AI analysis and parses structured project analysis.
 * Analyzes:
 * - Project objective
 * - Main features
 * - Technology stack
 * - Main modules
 * - Possible technical concepts
 * - Possible viva topics
 * 
 * Supports both manual text inputs and real uploaded project documents/source code.
 */

const { generateText } = require('./openrouter.service');

const SYSTEM_PROMPT = `You are an expert academic viva voce examiner and senior software engineer.
Your task is to analyze the provided software project information and actual source code / documentation, and break it down into a comprehensive academic evaluation structure.
You MUST respond ONLY with a single valid JSON object. Do not include markdown codeblocks (no \`\`\`json), no introductory text, and no concluding text.

The JSON object must have exactly the following structure:
{
  "projectObjective": "A clear, concise summary of the project's primary goal and core problem it solves.",
  "mainFeatures": [
    "Feature 1 description",
    "Feature 2 description"
  ],
  "technologies": [
    "Tech 1 with brief role",
    "Tech 2 with brief role"
  ],
  "modules": [
    "Module 1 name: brief responsibility",
    "Module 2 name: brief responsibility"
  ],
  "technicalTopics": [
    "Foundational computer science or engineering concept relevant to this project",
    "Architectural pattern or protocol used"
  ],
  "vivaTopics": [
    "Viva question/topic 1: Key architectural decision or trade-off",
    "Viva question/topic 2: Data integrity, security, or concurrency handling",
    "Viva question/topic 3: Scalability, error handling, or performance bottleneck"
  ]
}`;

/**
 * Safely parse JSON from model output, handling potential markdown blocks or wrappers
 */
function extractAndParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from AI model');
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Find opening '{' and closing '}' in case the model prefixed or suffixed extra commentary
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI output as JSON: ${err.message}. Raw output snippet: ${cleaned.slice(0, 120)}`);
  }

  return parsed;
}

/**
 * Validate and normalize the structured project analysis object
 */
function validateAndNormalizeAnalysis(data, inputProject) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid analysis object received from AI');
  }

  const normalizeArray = (val) => {
    if (Array.isArray(val)) {
      return val.filter(item => typeof item === 'string' && item.trim().length > 0).map(s => s.trim());
    }
    if (typeof val === 'string' && val.trim().length > 0) {
      return [val.trim()];
    }
    return [];
  };

  const projectObjective = typeof data.projectObjective === 'string' && data.projectObjective.trim().length > 0
    ? data.projectObjective.trim()
    : `Academic software evaluation for ${inputProject.projectName || 'project'}`;

  const mainFeatures = normalizeArray(data.mainFeatures);
  const technologies = normalizeArray(data.technologies);
  const modules = normalizeArray(data.modules);
  const technicalTopics = normalizeArray(data.technicalTopics);
  const vivaTopics = normalizeArray(data.vivaTopics);

  return {
    projectName: inputProject.projectName || 'Analyzed Project',
    projectObjective,
    mainFeatures,
    technologies,
    modules,
    technicalTopics,
    vivaTopics
  };
}

/**
 * Prioritize and assemble project context from extracted files.
 * Enforces size limits to protect against model context overflow.
 * 
 * Priority order:
 * 1. README and project documentation
 * 2. Dependency manifests (package.json, requirements.txt, pom.xml)
 * 3. Server / entrypoint files (server.js, app.py, main.go, index.js)
 * 4. Database schemas & models
 * 5. Other source code files
 * 
 * @param {Array<Object>} extractedFiles
 * @param {number} maxTotalChars - Maximum characters to send to LLM (default 26,000)
 */
function buildProjectContext(extractedFiles = [], maxTotalChars = 26000) {
  if (!Array.isArray(extractedFiles) || extractedFiles.length === 0) {
    return 'No project files provided.';
  }

  const priorityScore = (file) => {
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('readme') || file.type === 'documentation' || file.type === 'presentation') {
      return 1;
    }
    if (lowerName.endsWith('package.json') || lowerName.endsWith('requirements.txt') || lowerName.endsWith('pom.xml')) {
      return 2;
    }
    if (lowerName.includes('server') || lowerName.includes('app') || lowerName.includes('main') || lowerName.includes('index')) {
      return 3;
    }
    if (lowerName.includes('db') || lowerName.includes('schema') || lowerName.includes('model') || lowerName.endsWith('.sql')) {
      return 4;
    }
    return 5;
  };

  // Sort files by priority
  const sortedFiles = [...extractedFiles]
    .filter(f => f.content && f.content.trim().length > 0 && f.type !== 'source_archive')
    .sort((a, b) => priorityScore(a) - priorityScore(b));

  let totalChars = 0;
  const sections = [];

  for (const file of sortedFiles) {
    if (totalChars >= maxTotalChars) {
      sections.push(`[Additional ${sortedFiles.length - sections.length} files omitted to fit size limit]`);
      break;
    }

    const availableBudget = maxTotalChars - totalChars;
    let fileContent = file.content;

    // Truncate individual file if it exceeds budget or is excessively large
    const maxPerFile = file.type === 'documentation' ? 10000 : 4000;
    if (fileContent.length > maxPerFile) {
      fileContent = fileContent.substring(0, maxPerFile) + '\n...[Remaining content truncated for viva overview]';
    }

    if (fileContent.length > availableBudget) {
      fileContent = fileContent.substring(0, availableBudget) + '\n...[Truncated]';
    }

    sections.push(`--- FILE: ${file.name} (${file.type} | ${file.language || 'text'}) ---\n${fileContent}`);
    totalChars += fileContent.length;
  }

  return sections.join('\n\n');
}

/**
 * Analyzes basic text project information (Phase 2 legacy)
 */
async function analyzeProject({ projectName, description, technologies = [] }) {
  if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
    const err = new Error('Project name is required');
    err.statusCode = 400;
    throw err;
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    const err = new Error('Project description is required');
    err.statusCode = 400;
    throw err;
  }

  const techList = Array.isArray(technologies)
    ? technologies.filter(Boolean).join(', ')
    : String(technologies || '');

  const userPrompt = [
    `Analyze the following project for viva voce examination readiness:`,
    ``,
    `Project Name: ${projectName.trim()}`,
    `Description: ${description.trim()}`,
    `Technologies: ${techList || 'Not specified'}`,
    ``,
    `Remember to return strictly a valid JSON object matching the requested schema.`
  ].join('\n');

  const rawAiResponse = await generateText(userPrompt, SYSTEM_PROMPT, {
    temperature: 0.3
  });

  const parsedJson = extractAndParseJson(rawAiResponse);
  const normalizedAnalysis = validateAndNormalizeAnalysis(parsedJson, {
    projectName: projectName.trim(),
    description: description.trim(),
    technologies
  });

  return normalizedAnalysis;
}

/**
 * Analyzes real uploaded project files and documentation (Phase 3)
 * 
 * @param {Object} options
 * @param {string} [options.projectName]
 * @param {string} [options.description]
 * @param {string[]|string} [options.technologies]
 * @param {Array<Object>} options.extractedFiles - Parsed files from fileParser.service
 * @returns {Promise<Object>} Structured analysis
 */
async function analyzeUploadedProject({
  projectName = '',
  description = '',
  technologies = [],
  extractedFiles = []
}) {
  if (!extractedFiles || extractedFiles.length === 0) {
    const err = new Error('No readable project documentation or source code files provided.');
    err.statusCode = 400;
    throw err;
  }

  // Construct prioritized content representation
  const projectContext = buildProjectContext(extractedFiles);

  const techList = Array.isArray(technologies)
    ? technologies.filter(Boolean).join(', ')
    : String(technologies || '');

  const userPrompt = [
    `You are conducting an academic viva voce project decomposition. Analyze the following real project documentation and source code:`,
    ``,
    projectName ? `User Specified Project Name: ${projectName.trim()}` : `(Infer Project Name from repository files / documentation if not given)`,
    description ? `User Provided Overview: ${description.trim()}` : `(Extract core problem statement and objective directly from documentation/code)`,
    techList ? `User Indicated Technologies: ${techList}` : `(Detect technologies and libraries directly from source code and manifests)`,
    ``,
    `=== EXTRACTED PROJECT FILES & DOCUMENTATION ===`,
    projectContext,
    `=== END PROJECT FILES ===`,
    ``,
    `Respond strictly with the required JSON object. Ensure the "vivaTopics" formulate deep, rigorous technical examination questions specifically addressing the architecture, design choices, data flow, error handling, or performance characteristics visible in these files.`
  ].join('\n');

  const rawAiResponse = await generateText(userPrompt, SYSTEM_PROMPT, {
    temperature: 0.3
  });

  const parsedJson = extractAndParseJson(rawAiResponse);
  const normalizedAnalysis = validateAndNormalizeAnalysis(parsedJson, {
    projectName: projectName.trim() || parsedJson.projectName,
    description: description.trim(),
    technologies
  });

  // Attach analyzed files overview (clean summary without raw code body)
  const analyzedFilesSummary = extractedFiles.map(f => ({
    name: f.name,
    type: f.type,
    language: f.language || 'text',
    size: f.size || 0,
    status: f.status || 'success'
  }));

  return {
    ...normalizedAnalysis,
    analyzedFiles: analyzedFilesSummary
  };
}

module.exports = {
  analyzeProject,
  analyzeUploadedProject,
  buildProjectContext,
  extractAndParseJson,
  validateAndNormalizeAnalysis
};
