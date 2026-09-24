/**
 * AI Viva Examiner — Frontend Application Logic (Phases 1, 2 & 3)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ========================================================================
  // NEW UI: Page Navigation & Landing
  // ========================================================================

  const pageLanding   = document.getElementById('pageLanding');
  const appShell      = document.getElementById('appShell');
  const btnGetStarted = document.getElementById('btnGetStarted');
  const btnLogin      = document.getElementById('btnLogin');
  const sidebarToggle = document.getElementById('sidebarToggle');

  if (sidebarToggle && appShell) {
    sidebarToggle.addEventListener('click', () => {
      appShell.classList.toggle('sidebar-collapsed');
    });
  }

  const revealTargets = document.querySelectorAll('.quick-action-card, .project-list-item, .session-list-item, .upload-panel-card, .upload-results-card, .viva-summary-card, .viva-features-card, .perf-report-card, .feedback-col, .status-box, .settings-item');
  if (revealTargets.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((element, index) => {
      element.style.animationDelay = `${Math.min(index * 0.06, 0.32)}s`;
      revealObserver.observe(element);
    });
  } else {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  }

  /** Switch from landing to app shell */
  function enterApp() {
    if (pageLanding) pageLanding.style.display = 'none';
    if (appShell)    appShell.style.display = 'flex';
    navigateTo('dashboard');
    checkBackendHealth();
  }

  if (btnGetStarted) btnGetStarted.addEventListener('click', enterApp);
  if (btnLogin)      btnLogin.addEventListener('click',      enterApp);

  /** Navigate to a named page within the app shell */
  function navigateTo(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageId);
    });
    document.querySelectorAll('.app-page').forEach(page => {
      page.classList.toggle('active', page.id === `page-${pageId}`);
    });
    const topbarTitle = document.getElementById('topbarTitle');
    const titleMap = { dashboard: 'Dashboard', projects: 'My Projects', viva: 'Viva Sessions', reports: 'Reports', settings: 'Settings' };
    if (topbarTitle) topbarTitle.textContent = titleMap[pageId] || pageId;
  }

  // Sidebar nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Back / view-all links
  document.querySelectorAll('.back-link[data-page], .view-all-link[data-page]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); navigateTo(el.dataset.page); });
  });

  // Dashboard quick-action cards
  const qaUpload    = document.getElementById('qaUpload');
  const qaReports   = document.getElementById('qaReports');
  const qaStartViva = document.getElementById('qaStartViva');
  if (qaUpload)    qaUpload.addEventListener('click',    () => navigateTo('projects'));
  if (qaReports)   qaReports.addEventListener('click',   () => navigateTo('reports'));
  if (qaStartViva) qaStartViva.addEventListener('click', () => navigateTo('viva'));

  // Viva tabs toggle
  document.querySelectorAll('.viva-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.viva-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Generate Viva → reveal session wrapper
  const btnGenerateViva    = document.getElementById('btnGenerateViva');
  const vivaSessionWrapper = document.getElementById('vivaSessionWrapper');
  if (btnGenerateViva && vivaSessionWrapper) {
    btnGenerateViva.addEventListener('click', () => {
      vivaSessionWrapper.style.display = 'block';
      vivaSessionWrapper.scrollIntoView({ behavior: 'smooth' });
      startVivaTimer();
    });
  }

  // End Session
  const btnEndSession = document.getElementById('btnEndSession');
  if (btnEndSession && vivaSessionWrapper) {
    btnEndSession.addEventListener('click', () => { vivaSessionWrapper.style.display = 'none'; });
  }

  // Viva chat submit
  const btnSubmitAnswer = document.getElementById('btnSubmitAnswer');
  const vivaAnswerInput = document.getElementById('vivaAnswerInput');
  const vivaChatWindow  = document.getElementById('vivaChatWindow');
  const qpItems         = document.querySelectorAll('.qp-item');
  let questionIndex = 0;
  const sampleFollowUps = [
    'Follow-up: How do you handle JWT token expiry and refresh tokens in your project?',
    'Follow-up: Can you explain how you designed the database schema for this feature?',
    'Follow-up: How did you ensure scalability in your system architecture?',
    'Follow-up: What security vulnerabilities did you consider during development?',
    'Follow-up: How would you improve this feature given more time?',
  ];

  if (btnSubmitAnswer && vivaAnswerInput && vivaChatWindow) {
    function submitVivaAnswer() {
      const answer = vivaAnswerInput.value.trim();
      if (!answer) return;
      const userMsg = document.createElement('div');
      userMsg.className = 'chat-msg';
      userMsg.innerHTML = `<div class="chat-avatar user-avatar-chat">ST</div><div class="chat-bubble"><p>${escapeHtml(answer)}</p></div>`;
      vivaChatWindow.appendChild(userMsg);
      vivaAnswerInput.value = '';
      vivaChatWindow.scrollTop = vivaChatWindow.scrollHeight;
      if (qpItems[questionIndex]) { qpItems[questionIndex].classList.remove('active'); qpItems[questionIndex].classList.add('done'); }
      questionIndex = Math.min(questionIndex + 1, qpItems.length - 1);
      if (qpItems[questionIndex]) qpItems[questionIndex].classList.add('active');
      setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg examiner-msg';
        aiMsg.innerHTML = `<div class="chat-avatar ai-avatar">AI</div><div class="chat-bubble"><p><strong>${sampleFollowUps[questionIndex % sampleFollowUps.length]}</strong></p></div>`;
        vivaChatWindow.appendChild(aiMsg);
        vivaChatWindow.scrollTop = vivaChatWindow.scrollHeight;
      }, 700);
    }
    btnSubmitAnswer.addEventListener('click', submitVivaAnswer);
    vivaAnswerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitVivaAnswer(); } });
  }

  qpItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      qpItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      questionIndex = idx;
    });
  });

  // Viva timer
  const vivaTimer = document.getElementById('vivaTimer');
  let timerSeconds = 165;
  let timerInterval = null;
  function startVivaTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const s = (timerSeconds % 60).toString().padStart(2, '0');
        if (vivaTimer) vivaTimer.textContent = `${m}:${s}`;
      } else {
        clearInterval(timerInterval);
        if (vivaTimer) vivaTimer.textContent = '00:00';
      }
    }, 1000);
  }

  // View report button scrolls to perf card
  document.querySelectorAll('.btn-view-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = document.getElementById('perfReportCard');
      if (card) card.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Main drop zone for upload page
  const mainDropZone = document.getElementById('mainDropZone');
  if (mainDropZone) {
    mainDropZone.addEventListener('dragover',  (e) => { e.preventDefault(); mainDropZone.style.borderColor = 'var(--accent)'; });
    mainDropZone.addEventListener('dragleave', ()  => { mainDropZone.style.borderColor = ''; });
    mainDropZone.addEventListener('drop',      (e) => { e.preventDefault(); mainDropZone.style.borderColor = ''; if (e.dataTransfer?.files) addFilesToQueue(e.dataTransfer.files); });
  }

  function updateSelectedFilesSection() {
    const section = document.getElementById('selectedFilesSection');
    if (section) section.style.display = selectedFilesQueue.length > 0 ? 'block' : 'none';
  }

  // ========================================================================
  // END NEW UI NAVIGATION — Original logic continues below
  // ========================================================================

  // DOM Elements - Status & Monitor
  const navStatusDot   = document.getElementById('navStatusDot') || document.querySelector('.status-dot');
  const navStatusLabel = document.getElementById('navStatusLabel');
  const statusApi      = document.getElementById('statusApi');
  const statusDb       = document.getElementById('statusDb');
  const logConsole     = document.getElementById('logConsole');
  const logTimestamp   = document.getElementById('logTimestamp');
  const btnRefreshStatus = document.getElementById('btnRefreshStatus');

  // DOM Elements - Phase 3 Project Upload
  const projectUploadForm = document.getElementById('projectUploadForm');
  const uploadProjectName = document.getElementById('uploadProjectName');
  const uploadProjectDesc = document.getElementById('uploadProjectDesc');
  const uploadProjectTech = document.getElementById('uploadProjectTech');
  const docFileInput      = document.getElementById('docFileInput');
  const codeFileInput     = document.getElementById('codeFileInput');
  const docDropZone       = document.getElementById('docDropZone');
  const codeDropZone      = document.getElementById('codeDropZone');
  const selectedFilesList = document.getElementById('selectedFilesList');
  const selectedFilesCount = document.getElementById('selectedFilesCount');
  const btnClearFiles     = document.getElementById('btnClearFiles');
  const btnSubmitUpload   = document.getElementById('btnSubmitUpload');
  const uploadBtnText     = document.getElementById('uploadBtnText');
  const uploadSpinner     = document.getElementById('uploadSpinner');
  const uploadStepper     = document.getElementById('uploadStepper');
  const stepUpload        = document.getElementById('stepUpload');
  const stepExtract       = document.getElementById('stepExtract');
  const stepAnalyze       = document.getElementById('stepAnalyze');
  const stepComplete      = document.getElementById('stepComplete');
  const uploadStatusBadge = document.getElementById('uploadStatusBadge');
  const uploadResultMeta  = document.getElementById('uploadResultMeta');
  const uploadResultsBody = document.getElementById('uploadResultsBody');

  // DOM Elements - Phase 2 AI Quick Test
  const btnRunAiTest = document.getElementById('btnRunAiTest');
  const aiTestPrompt = document.getElementById('aiTestPrompt');
  const aiTestResult = document.getElementById('aiTestResult');

  // DOM Elements - Phase 2 Project Analysis Form
  const projectAnalysisForm = document.getElementById('projectAnalysisForm');
  const analysisProjectName = document.getElementById('analysisProjectName');
  const analysisDescription = document.getElementById('analysisDescription');
  const analysisTechnologies = document.getElementById('analysisTechnologies');
  const btnAnalyzeProject   = document.getElementById('btnAnalyzeProject');
  const analyzeBtnText      = document.getElementById('analyzeBtnText');
  const analyzeSpinner      = document.getElementById('analyzeSpinner');
  const analysisStatusBadge = document.getElementById('analysisStatusBadge');
  const analysisResultsBody = document.getElementById('analysisResultsBody');

  // Modal Elements
  const vivaModal        = document.getElementById('vivaModal');
  const btnStartVivaHeader = document.getElementById('btnStartVivaHeader');
  const btnStartVivaMain   = document.getElementById('btnStartVivaMain');
  const btnCloseModal    = document.getElementById('btnCloseModal');
  const btnCancelModal   = document.getElementById('btnCancelModal');
  const btnConfirmViva   = document.getElementById('btnConfirmViva');

  // Upload State
  let selectedFilesQueue = [];

  /**
   * Determine base API URL (works when served via Express or standalone)
   */
  const getApiBaseUrl = () => {
    if (window.location.origin && window.location.origin.startsWith('http')) {
      return `${window.location.origin}/api`;
    }
    // Fallback for file:// direct opening
    return 'http://localhost:5000/api';
  };

  /**
   * Format file bytes to human readable format
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Safely escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Query backend health endpoint
   */
  async function checkBackendHealth() {
    const apiUrl = `${getApiBaseUrl()}/health`;
    const now = new Date().toLocaleTimeString();

    if (logTimestamp) {
      logTimestamp.textContent = now;
    }

    if (logConsole) {
      logConsole.textContent = `[${now}] Pinging ${apiUrl}...`;
    }

    try {
      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (navStatusDot) navStatusDot.className = 'status-dot online';
      if (navStatusLabel) navStatusLabel.textContent = 'API Online';

      if (statusApi) {
        statusApi.textContent = 'Operational (200 OK)';
        statusApi.className = 'status-box-value status-ready';
      }

      if (statusDb) {
        statusDb.textContent = 'Initialized & Active';
        statusDb.className = 'status-box-value status-ready';
      }

      if (logConsole) {
        logConsole.textContent = [
          `[${now}] Connected to AI Viva Examiner Backend.`,
          `Response: ${JSON.stringify(data, null, 2)}`,
          `Latency: ${latencyMs}ms | Database: SQLite 3 Connected (Projects & Files Active)`,
          `Platform: Node.js Express 5 | OpenRouter: Online & Connected (Phase 3)`
        ].join('\n');
      }
    } catch (error) {
      console.warn('[AI Viva Examiner] Backend connection warning:', error.message);

      if (navStatusDot) navStatusDot.className = 'status-dot offline';
      if (navStatusLabel) navStatusLabel.textContent = 'API Offline';

      if (statusApi) {
        statusApi.textContent = 'Unavailable';
        statusApi.className = 'status-box-value status-error';
      }

      if (statusDb) {
        statusDb.textContent = 'Standby (Server offline)';
        statusDb.className = 'status-box-value';
      }

      if (logConsole) {
        logConsole.textContent = [
          `[${now}] Connection failed to ${apiUrl}`,
          `Error: ${error.message}`,
          `Ensure the backend is running with 'npm start' on port 5000.`
        ].join('\n');
      }
    }
  }

  // ==========================================================================
  // Phase 3: Project Upload Management
  // ==========================================================================

  function addFilesToQueue(files) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Avoid duplicate filenames
      const exists = selectedFilesQueue.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFilesQueue.push(file);
      }
    }
    renderSelectedFiles();
  }

  function removeFileFromQueue(index) {
    selectedFilesQueue.splice(index, 1);
    renderSelectedFiles();
  }

  function clearFilesQueue() {
    selectedFilesQueue = [];
    if (docFileInput) docFileInput.value = '';
    if (codeFileInput) codeFileInput.value = '';
    renderSelectedFiles();
  }

  function renderSelectedFiles() {
    if (!selectedFilesList || !selectedFilesCount) return;

    selectedFilesCount.textContent = selectedFilesQueue.length;
    // Show/hide the new collapsible files panel
    updateSelectedFilesSection();

    if (selectedFilesQueue.length === 0) {
      selectedFilesList.innerHTML = `<div class="no-files-notice">No files selected yet. Choose documentation or a source code ZIP above.</div>`;
      if (btnClearFiles) btnClearFiles.style.display = 'none';
      if (btnSubmitUpload) btnSubmitUpload.disabled = true;
      return;
    }

    if (btnClearFiles) btnClearFiles.style.display = 'inline-block';
    if (btnSubmitUpload) btnSubmitUpload.disabled = false;

    selectedFilesList.innerHTML = selectedFilesQueue.map((file, idx) => {
      const ext = file.name.split('.').pop().toUpperCase();
      return `
        <div class="selected-file-item">
          <div class="file-item-info">
            <span class="badge badge-neutral" style="font-size: 0.65rem;">${escapeHtml(ext)}</span>
            <span class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <span class="file-item-meta">(${formatBytes(file.size)})</span>
          </div>
          <button type="button" class="file-item-remove" data-index="${idx}" title="Remove file">&times;</button>
        </div>
      `;
    }).join('');

    // Attach remove handlers
    const removeButtons = selectedFilesList.querySelectorAll('.file-item-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        removeFileFromQueue(index);
      });
    });
  }

  // File Input Listeners
  if (docFileInput) {
    docFileInput.addEventListener('change', (e) => {
      addFilesToQueue(e.target.files);
    });
  }

  if (codeFileInput) {
    codeFileInput.addEventListener('change', (e) => {
      addFilesToQueue(e.target.files);
    });
  }

  if (btnClearFiles) {
    btnClearFiles.addEventListener('click', clearFilesQueue);
  }

  // Drag & drop handlers
  [docDropZone, codeDropZone].forEach(zone => {
    if (!zone) return;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.style.borderColor = 'var(--color-blue-600)';
      zone.style.backgroundColor = 'var(--color-cyan-50)';
    });

    zone.addEventListener('dragleave', () => {
      zone.style.borderColor = '';
      zone.style.backgroundColor = '';
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      zone.style.backgroundColor = '';
      if (e.dataTransfer && e.dataTransfer.files) {
        addFilesToQueue(e.dataTransfer.files);
      }
    });
  });

  /**
   * Update Progress Stepper Indicator
   */
  function setStepperState(currentStep) {
    if (!uploadStepper) return;
    uploadStepper.style.display = 'flex';

    const steps = [
      { id: 'stepUpload', el: stepUpload, num: 1 },
      { id: 'stepExtract', el: stepExtract, num: 2 },
      { id: 'stepAnalyze', el: stepAnalyze, num: 3 },
      { id: 'stepComplete', el: stepComplete, num: 4 }
    ];

    steps.forEach(step => {
      if (!step.el) return;
      if (step.num < currentStep) {
        step.el.className = 'step-indicator completed';
      } else if (step.num === currentStep) {
        step.el.className = 'step-indicator active';
      } else {
        step.el.className = 'step-indicator';
      }
    });
  }

  /**
   * Submit Project Upload
   */
  if (projectUploadForm) {
    projectUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (selectedFilesQueue.length === 0) {
        alert('Please choose at least one documentation file or source code ZIP.');
        return;
      }

      // UI Loading state
      if (btnSubmitUpload) btnSubmitUpload.disabled = true;
      if (uploadBtnText) uploadBtnText.textContent = 'Processing Submission...';
      if (uploadSpinner) uploadSpinner.style.display = 'inline-block';
      if (uploadStatusBadge) {
        uploadStatusBadge.textContent = 'Uploading...';
        uploadStatusBadge.className = 'badge badge-accent';
      }

      setStepperState(1); // Uploading

      if (uploadResultsBody) {
        uploadResultsBody.innerHTML = `
          <div class="empty-state">
            <div class="spinner" style="width: 28px; height: 28px; border-width: 3px; border-top-color: var(--color-blue-600); margin-bottom: 0.75rem;"></div>
            <p id="uploadDynamicStatus">Uploading files and preparing extraction pipeline...</p>
          </div>
        `;
      }

      const formData = new FormData();
      for (const file of selectedFilesQueue) {
        formData.append('files', file);
      }

      if (uploadProjectName?.value) {
        formData.append('projectName', uploadProjectName.value.trim());
      }
      if (uploadProjectDesc?.value) {
        formData.append('description', uploadProjectDesc.value.trim());
      }
      if (uploadProjectTech?.value) {
        formData.append('technologies', uploadProjectTech.value.trim());
      }

      // Progress animation timer while request is running
      const statusTextEl = document.getElementById('uploadDynamicStatus');
      const timer1 = setTimeout(() => {
        setStepperState(2); // Extracting
        if (statusTextEl) statusTextEl.textContent = 'Extracting and parsing documents, slides, and source code files...';
        if (uploadStatusBadge) uploadStatusBadge.textContent = 'Extracting Files...';
      }, 1200);

      const timer2 = setTimeout(() => {
        setStepperState(3); // AI Analyzing
        if (statusTextEl) statusTextEl.textContent = 'Sending prioritized project architecture to OpenRouter AI for viva decomposition...';
        if (uploadStatusBadge) uploadStatusBadge.textContent = 'AI Reasoning...';
      }, 3500);

      try {
        const response = await fetch(`${getApiBaseUrl()}/projects/analyze-upload`, {
          method: 'POST',
          body: formData
        });

        clearTimeout(timer1);
        clearTimeout(timer2);

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || 'Failed to analyze project submission.');
        }

        setStepperState(4); // Complete
        if (uploadStatusBadge) {
          uploadStatusBadge.textContent = 'Analysis Complete';
          uploadStatusBadge.className = 'badge badge-accent';
        }

        renderUploadedProjectResults(data.data);
      } catch (err) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        console.error('[Upload Analysis Error]', err);

        if (uploadStatusBadge) {
          uploadStatusBadge.textContent = 'Upload Failed';
          uploadStatusBadge.className = 'badge badge-neutral';
        }

        if (uploadResultsBody) {
          uploadResultsBody.innerHTML = `
            <div class="analysis-block" style="border-color: rgba(239, 68, 68, 0.4); background-color: #fff1f2;">
              <div class="analysis-block-header">
                <span class="analysis-block-title" style="color: var(--color-rose-600);">Submission Error</span>
              </div>
              <p style="color: var(--color-slate-700); font-size: 0.88rem;">${escapeHtml(err.message)}</p>
            </div>
          `;
        }
      } finally {
        if (btnSubmitUpload) btnSubmitUpload.disabled = false;
        if (uploadBtnText) uploadBtnText.textContent = 'Analyze Project';
        if (uploadSpinner) uploadSpinner.style.display = 'none';
      }
    });
  }

  /**
   * Render real project upload analysis into DOM
   */
  function renderUploadedProjectResults(data) {
    if (!uploadResultsBody) return;

    if (uploadResultMeta) {
      uploadResultMeta.textContent = `Project ID #${data.projectId || '1'} — ${data.analyzedFiles?.length || 0} files extracted`;
    }

    const renderList = (items, isViva = false) => {
      if (!Array.isArray(items) || items.length === 0) {
        return '<p style="font-size: 0.82rem; color: var(--color-slate-400);">None detected</p>';
      }
      return `
        <ul class="analysis-list">
          ${items.map(item => `
            <li class="${isViva ? 'analysis-list-item viva-topic-item' : 'analysis-list-item'}">
              <span>${escapeHtml(item)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    };

    const renderChips = (chips) => {
      if (!Array.isArray(chips) || chips.length === 0) {
        return '<p style="font-size: 0.82rem; color: var(--color-slate-400);">None detected</p>';
      }
      return `
        <div class="analysis-chips">
          ${chips.map(c => `<span class="analysis-chip">${escapeHtml(c)}</span>`).join('')}
        </div>
      `;
    };

    // Render files table
    const filesTableHtml = Array.isArray(data.analyzedFiles) && data.analyzedFiles.length > 0
      ? `
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Analyzed Project Files (${data.analyzedFiles.length})</span>
          </div>
          <div style="overflow-x: auto;">
            <table class="analyzed-files-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Language</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                ${data.analyzedFiles.map(f => `
                  <tr>
                    <td style="color: var(--color-slate-900); font-weight: 500;">${escapeHtml(f.name)}</td>
                    <td><span class="badge badge-neutral" style="font-size: 0.65rem;">${escapeHtml(f.type)}</span></td>
                    <td>${escapeHtml(f.language || 'text')}</td>
                    <td>${formatBytes(f.size)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
      : '';

    uploadResultsBody.innerHTML = `
      <div class="analysis-content">
        <!-- Project Overview -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Project Overview & Objective</span>
          </div>
          <h4 style="font-size: 1.15rem; margin-bottom: 0.4rem; color: var(--color-slate-900);">${escapeHtml(data.projectName)}</h4>
          <p class="analysis-objective-text">${escapeHtml(data.projectObjective)}</p>
        </div>

        <!-- Technology Stack -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Technology Stack Identified</span>
          </div>
          ${renderChips(data.technologies)}
        </div>

        <!-- Main Features -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Main Features</span>
          </div>
          ${renderList(data.mainFeatures)}
        </div>

        <!-- Modules -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Core Modules</span>
          </div>
          ${renderList(data.modules)}
        </div>

        <!-- Technical Topics & Concepts -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Foundational Technical Concepts</span>
          </div>
          ${renderList(data.technicalTopics)}
        </div>

        <!-- Viva Topics -->
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Targeted Viva Examination Topics</span>
          </div>
          ${renderList(data.vivaTopics, true)}
        </div>

        <!-- Analyzed Files Table -->
        ${filesTableHtml}
      </div>
    `;
  }

  // ==========================================================================
  // Phase 2: Manual AI Test & Direct JSON Analysis (Preserved)
  // ==========================================================================

  async function runAiQuickTest() {
    if (!aiTestResult) return;

    const prompt = (aiTestPrompt?.value || 'Explain what JavaScript is in one sentence.').trim();
    if (!prompt) {
      aiTestResult.textContent = 'Error: Please enter a prompt first.';
      aiTestResult.className = 'quick-test-result error';
      return;
    }

    aiTestResult.textContent = 'Communicating with OpenRouter model...';
    aiTestResult.className = 'quick-test-result';
    if (btnRunAiTest) btnRunAiTest.disabled = true;

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'AI generation failed');
      }

      aiTestResult.textContent = `[AI Response]: ${data.response}`;
      aiTestResult.className = 'quick-test-result';
    } catch (err) {
      aiTestResult.textContent = `[Error]: ${err.message}`;
      aiTestResult.className = 'quick-test-result error';
    } finally {
      if (btnRunAiTest) btnRunAiTest.disabled = false;
    }
  }

  async function runProjectAnalysis() {
    const projectName = (analysisProjectName?.value || '').trim();
    const description = (analysisDescription?.value || '').trim();
    const techRaw = (analysisTechnologies?.value || '').trim();
    const technologies = techRaw ? techRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!projectName || !description) {
      alert('Please fill in both the Project Name and Description.');
      return;
    }

    if (btnAnalyzeProject) btnAnalyzeProject.disabled = true;
    if (analyzeBtnText) analyzeBtnText.textContent = 'Analyzing Project...';
    if (analyzeSpinner) analyzeSpinner.style.display = 'inline-block';
    if (analysisStatusBadge) {
      analysisStatusBadge.textContent = 'Processing...';
      analysisStatusBadge.className = 'badge badge-accent';
    }

    if (analysisResultsBody) {
      analysisResultsBody.innerHTML = `
        <div class="empty-state">
          <div class="spinner" style="width: 24px; height: 24px; border-width: 3px; border-top-color: var(--color-blue-600); margin-bottom: 0.5rem;"></div>
          <p>Sending project metadata to OpenRouter AI for structured evaluation...</p>
        </div>
      `;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/projects/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, description, technologies })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to analyze project');
      }

      if (analysisStatusBadge) {
        analysisStatusBadge.textContent = 'Analysis Complete';
        analysisStatusBadge.className = 'badge badge-accent';
      }

      renderManualAnalysisResults(data.data);
    } catch (err) {
      console.error('[Project Analysis Error]', err);
      if (analysisStatusBadge) {
        analysisStatusBadge.textContent = 'Analysis Failed';
        analysisStatusBadge.className = 'badge badge-neutral';
      }

      if (analysisResultsBody) {
        analysisResultsBody.innerHTML = `
          <div class="analysis-block" style="border-color: rgba(239, 68, 68, 0.4); background-color: #fff1f2;">
            <div class="analysis-block-header">
              <span class="analysis-block-title" style="color: var(--color-rose-600);">Analysis Error</span>
            </div>
            <p style="color: var(--color-slate-700); font-size: 0.88rem;">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    } finally {
      if (btnAnalyzeProject) btnAnalyzeProject.disabled = false;
      if (analyzeBtnText) analyzeBtnText.textContent = 'Analyze Project with AI';
      if (analyzeSpinner) analyzeSpinner.style.display = 'none';
    }
  }

  function renderManualAnalysisResults(analysis) {
    if (!analysisResultsBody) return;

    const renderList = (items, isViva = false) => {
      if (!Array.isArray(items) || items.length === 0) {
        return '<p style="font-size: 0.82rem; color: var(--color-slate-400);">None specified</p>';
      }
      return `
        <ul class="analysis-list">
          ${items.map(item => `
            <li class="${isViva ? 'analysis-list-item viva-topic-item' : 'analysis-list-item'}">
              <span>${escapeHtml(item)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    };

    const renderChips = (chips) => {
      if (!Array.isArray(chips) || chips.length === 0) {
        return '<p style="font-size: 0.82rem; color: var(--color-slate-400);">None detected</p>';
      }
      return `
        <div class="analysis-chips">
          ${chips.map(c => `<span class="analysis-chip">${escapeHtml(c)}</span>`).join('')}
        </div>
      `;
    };

    analysisResultsBody.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Project Objective</span>
          </div>
          <p class="analysis-objective-text">${escapeHtml(analysis.projectObjective)}</p>
        </div>

        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Technology Stack Identified</span>
          </div>
          ${renderChips(analysis.technologies)}
        </div>

        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Main Features</span>
          </div>
          ${renderList(analysis.mainFeatures)}
        </div>

        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Core Modules</span>
          </div>
          ${renderList(analysis.modules)}
        </div>

        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Foundational Technical Concepts</span>
          </div>
          ${renderList(analysis.technicalTopics)}
        </div>

        <div class="analysis-block">
          <div class="analysis-block-header">
            <span class="analysis-block-title">Targeted Viva Examination Topics</span>
          </div>
          ${renderList(analysis.vivaTopics, true)}
        </div>
      </div>
    `;
  }

  // Modal Handlers
  function openModal() {
    if (vivaModal) {
      vivaModal.classList.add('active');
      vivaModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (vivaModal) {
      vivaModal.classList.remove('active');
      vivaModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  if (btnStartVivaHeader) btnStartVivaHeader.addEventListener('click', () => {
    const uploadSection = document.getElementById('project-upload');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      openModal();
    }
  });

  if (btnStartVivaMain) btnStartVivaMain.addEventListener('click', () => {
    const uploadSection = document.getElementById('project-upload');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      openModal();
    }
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (vivaModal) {
    vivaModal.addEventListener('click', (e) => {
      if (e.target === vivaModal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && vivaModal && vivaModal.classList.contains('active')) {
      closeModal();
    }
  });

  if (btnConfirmViva) {
    btnConfirmViva.addEventListener('click', () => {
      closeModal();
      const uploadSection = document.getElementById('project-upload');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (btnRunAiTest) {
    btnRunAiTest.addEventListener('click', runAiQuickTest);
  }

  if (projectAnalysisForm) {
    projectAnalysisForm.addEventListener('submit', (e) => {
      e.preventDefault();
      runProjectAnalysis();
    });
  }

  if (btnRefreshStatus) {
    btnRefreshStatus.addEventListener('click', checkBackendHealth);
  }

  // Run initial health verification
  checkBackendHealth();
});
