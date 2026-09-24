# AI Viva Examiner 🎓

An intelligent oral examination and real-time knowledge-gap detection platform designed for academic viva voce assessments.

---

## 📌 Phase Status

* **Phase 1 (Complete):** Core Express server, SQLite database module (WAL mode), `/api/health` monitoring, and modern SaaS landing page.
* **Phase 2 (Complete):** OpenRouter AI integration service, `POST /api/ai/test` endpoint, `POST /api/projects/analyze` structured project decomposition foundation, and interactive frontend testing workbench.
* **Phase 3 (Complete):** Multi-file project upload system (PDF, DOCX, PPTX, TXT, ZIP), intelligent code & document extraction, size budget protection, database persistence (`projects`, `project_files`), `POST /api/projects/analyze-upload` endpoint, and responsive frontend upload workbench.

---

## 🏗️ Project Architecture

```text
ai-viva-examiner/
├── frontend/
│   ├── index.html         # Landing page, Project Upload workbench, AI tester & modal
│   ├── css/
│   │   └── style.css      # Deep navy & subtle cyan SaaS design system with responsive grid
│   └── js/
│       └── app.js         # API client, upload queue, stepper progress & result renderer
├── backend/
│   ├── server.js          # Express application entrypoint
│   ├── routes/
│   │   ├── index.js       # Central API route index (/health, /ai, /projects)
│   │   ├── health.routes.js # GET /api/health route definition
│   │   ├── ai.routes.js   # POST /api/ai/test route definition
│   │   ├── project.routes.js # POST /api/projects/analyze route definition
│   │   └── upload.routes.js  # POST /api/projects/analyze-upload route definition
│   ├── controllers/
│   │   ├── health.controller.js  # Health check logic
│   │   ├── ai.controller.js      # AI prompt test logic
│   │   ├── project.controller.js # Project manual analysis orchestrator
│   │   └── upload.controller.js  # Project upload, extraction, persistence & AI analysis
│   ├── services/
│   │   ├── openrouter.service.js      # OpenRouter API client, token handling & timeouts
│   │   ├── fileParser.service.js      # Parser for PDF, DOCX, PPTX, TXT, and ZIP source code
│   │   └── projectAnalyzer.service.js # Prioritization, context budgeting & JSON schema validation
│   ├── middleware/
│   │   ├── upload.middleware.js       # Multer storage, extension filtering & file security
│   │   └── errorHandler.js            # Centralized error handler and 404 fallback (never leaks keys)
│   ├── database/
│   │   ├── db.js          # SQLite connection, WAL mode, schema initialization & promise helpers
│   │   ├── index.js       # Database export facade
│   │   └── viva.db        # SQLite database file (created on launch)
│   └── uploads/           # Ephemeral upload buffer (automatically cleaned up)
├── .env                   # Local environment variables (ignored by Git)
├── .env.example           # Example environment template
├── .gitignore             # Standard git exclusions (node_modules, .env, *.db, uploads)
├── package.json           # Node.js project manifest & scripts
└── README.md              # Project documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js** (v18.x, v20.x, or v24.x)
* **npm** (v9+ or v11+)

### 2. Installation
From the `ai-viva-examiner` directory:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` if not already present:
```bash
cp .env.example .env
```

Configure parameters in `.env`:
```env
PORT=5000
OPENROUTER_API_KEY=YOUR_KEY_HERE
OPENROUTER_MODEL=thinkingmachines/inkling:free
```

### 4. Running the Application

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 5. Accessing the Platform
* **Web UI (Frontend):** [http://localhost:5000](http://localhost:5000)
* **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📡 API Specification

### 1. Health Check
* **Endpoint:** `GET /api/health`
* **Response Status:** `200 OK`
* **Response Body:**
```json
{
  "status": "ok",
  "message": "AI Viva Examiner API is running"
}
```

### 2. AI Connection Quick Test
* **Endpoint:** `POST /api/ai/test`
* **Request Body:**
```json
{
  "prompt": "Explain what JavaScript is in one sentence."
}
```
* **Response Status:** `200 OK`

### 3. Text-Based Project Analysis (Phase 2 Legacy)
* **Endpoint:** `POST /api/projects/analyze`
* **Request Body:**
```json
{
  "projectName": "AI Viva Examiner",
  "description": "An AI system that conducts project-based viva examinations.",
  "technologies": ["HTML", "CSS", "JavaScript", "Node.js", "SQLite"]
}
```

### 4. Real Project Upload & Analysis (Phase 3)
* **Endpoint:** `POST /api/projects/analyze-upload`
* **Content-Type:** `multipart/form-data`
* **Fields:**
  * `files` (one or multiple: `.pdf`, `.docx`, `.pptx`, `.txt`, `.zip`)
  * `projectName` (optional string)
  * `description` (optional string)
  * `technologies` (optional comma-separated string)
* **Response Status:** `200 OK`
* **Response Body:**
```json
{
  "success": true,
  "data": {
    "projectId": 1,
    "projectName": "Distributed KV Store",
    "projectObjective": "Implement a fault-tolerant, linearly scalable distributed key-value store using Raft consensus...",
    "mainFeatures": [
      "Raft leader election and log replication...",
      "Write-ahead logging (WAL) with SQLite...",
      "RESTful client interface via Express..."
    ],
    "technologies": [
      "Node.js: server runtime",
      "Express: RESTful HTTP interface",
      "SQLite: persistent local storage engine",
      "Raft: distributed consensus algorithm",
      "WebSockets: RPC transport layer"
    ],
    "modules": [
      "Raft Consensus Engine",
      "RPC Transport Layer",
      "Local Storage Engine",
      "REST Client Interface"
    ],
    "technicalTopics": [
      "Distributed consensus algorithms (Raft)",
      "Write-ahead logging and crash recovery",
      "Mutual TLS and secure inter-node communication"
    ],
    "vivaTopics": [
      "Viva question/topic 1: Key architectural decision or trade-off...",
      "Viva question/topic 2: Data integrity, security, or concurrency handling...",
      "Viva question/topic 3: Scalability, error handling, or performance bottleneck..."
    ],
    "analyzedFiles": [
      { "name": "Project-Report.txt", "type": "documentation", "language": "text", "size": 511, "status": "success" },
      { "name": "source-code.zip", "type": "source_archive", "language": "zip", "size": 1017, "status": "success" }
    ]
  }
}
```

---

## 🗄️ Database Architecture (SQLite)

### `projects` Table
* `id` INTEGER PRIMARY KEY AUTOINCREMENT
* `name` TEXT NOT NULL
* `description` TEXT
* `analysis_json` TEXT (complete structured analysis payload)
* `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### `project_files` Table
* `id` INTEGER PRIMARY KEY AUTOINCREMENT
* `project_id` INTEGER NOT NULL (FOREIGN KEY -> `projects.id`)
* `original_name` TEXT NOT NULL
* `stored_name` TEXT NOT NULL
* `file_type` TEXT NOT NULL
* `file_size` INTEGER NOT NULL
* `extraction_status` TEXT NOT NULL
* `extracted_chars` INTEGER DEFAULT 0
* `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

---

## 🔒 Security & Data Protection
* **File Type Whitelist:** Only `.pdf`, `.docx`, `.pptx`, `.txt`, `.zip` accepted.
* **Executable Rejection:** Automatic rejection of `.exe`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.bin`, `.msi`, `.vbs`.
* **Zero Storage Leakage:** Uploaded temp files are parsed and deleted immediately upon request completion.
* **No Path Traversal:** Cryptographically random hash-based filename generation.
* **API Key Safety:** Key remains server-side only in `.env` (ignored by Git).
* **Context Protection:** Intelligent file ranking and content truncation prevents LLM token blowouts.
