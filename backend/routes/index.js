const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const aiRoutes = require('./ai.routes');
const projectRoutes = require('./project.routes');
const uploadRoutes = require('./upload.routes');

router.use('/', healthRoutes);
router.use('/ai', aiRoutes);
router.use('/projects', projectRoutes);
router.use('/projects', uploadRoutes);

module.exports = router;
