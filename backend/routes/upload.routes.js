const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { handleUpload } = require('../middleware/upload.middleware');

// POST /api/projects/analyze-upload
router.post('/analyze-upload', handleUpload('files'), uploadController.analyzeUpload);

module.exports = router;
