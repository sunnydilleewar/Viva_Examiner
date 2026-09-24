/**
 * OpenRouter Service
 * 
 * Reusable service for communicating with OpenRouter AI API.
 * - Handles authentication via environment variables
 * - Supports model configuration via OPENROUTER_MODEL
 * - Implements request timeouts via AbortController
 * - Handles and normalizes HTTP / network errors
 * - Sanitizes responses (never exposes keys or raw credential headers)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'thinkingmachines/inkling:free';
const DEFAULT_TIMEOUT_MS = 45000;

function getApiKey() {
  return process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : null;
}

function getModel() {
  return process.env.OPENROUTER_MODEL ? process.env.OPENROUTER_MODEL.trim() : DEFAULT_MODEL;
}

function isOpenRouterConfigured() {
  const key = getApiKey();
  return Boolean(key && key.length > 0);
}

/**
 * Remove `<think>...</think>` tags if present from thinking/reasoning models
 */
function cleanThinkingContent(content) {
  if (typeof content !== 'string') return content;
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Send chat completion request to OpenRouter
 * 
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<string>} Clean response text from AI
 */
async function chatCompletion({
  messages,
  model = getModel(),
  temperature = 0.4,
  maxTokens,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    const err = new Error('OpenRouter API key is not configured. Add OPENROUTER_API_KEY to your .env file.');
    err.statusCode = 503;
    throw err;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestPayload = {
    model,
    messages,
    temperature
  };

  if (maxTokens) {
    requestPayload.max_tokens = maxTokens;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Cline/3.0.0',
        'HTTP-Referer': 'https://github.com/cline/cline',
        'X-Title': 'AI Viva Examiner'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `OpenRouter API error (HTTP ${response.status} ${response.statusText})`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorDetail = errorJson.error.message;
        }
      } catch (parseErr) {
        // response was not JSON
      }

      const apiErr = new Error(errorDetail);
      apiErr.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw apiErr;
    }

    const data = await response.json();
    const rawChoice = data?.choices?.[0]?.message?.content;

    if (rawChoice === undefined || rawChoice === null) {
      throw new Error('Received empty or malformed completion from OpenRouter.');
    }

    return cleanThinkingContent(rawChoice);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      const timeoutErr = new Error(`AI request timed out after ${timeoutMs / 1000}s`);
      timeoutErr.statusCode = 504;
      throw timeoutErr;
    }

    // Re-throw handled errors
    throw error;
  }
}

/**
 * Convenience helper to generate text from a prompt
 * 
 * @param {string} prompt
 * @param {string} [systemPrompt]
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
async function generateText(prompt, systemPrompt = '', options = {}) {
  const messages = [];

  if (systemPrompt && systemPrompt.trim().length > 0) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }

  messages.push({ role: 'user', content: prompt });

  return chatCompletion({
    messages,
    ...options
  });
}

module.exports = {
  OPENROUTER_API_URL,
  getApiKey,
  getModel,
  isOpenRouterConfigured,
  chatCompletion,
  generateText
};
