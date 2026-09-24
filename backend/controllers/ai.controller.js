const { generateText } = require('../services/openrouter.service');

/**
 * Test AI endpoint
 * POST /api/ai/test
 * Body: { prompt: "..." }
 */
async function testAi(req, res, next) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Field "prompt" is required and must be a non-empty string.'
      });
    }

    const aiResponse = await generateText(prompt.trim(), 'You are a precise technical tutor. Provide concise, clear answers.');

    return res.status(200).json({
      success: true,
      response: aiResponse
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  testAi
};
