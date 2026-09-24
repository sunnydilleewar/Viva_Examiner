const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.post('/analyze', projectController.analyze);

module.exports = router;
