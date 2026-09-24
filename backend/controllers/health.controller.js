/**
 * Health check controller
 * GET /api/health
 */
function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'AI Viva Examiner API is running'
  });
}

module.exports = {
  getHealth
};
