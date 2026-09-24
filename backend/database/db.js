const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, 'viva.db');

let dbInstance = null;

/**
 * Initializes and connects to the SQLite database.
 * Returns a Promise that resolves with the database connection.
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('[Database] Failed to connect to SQLite database:', err.message);
        return reject(err);
      }
      console.log(`[Database] SQLite connected successfully at: ${DB_PATH}`);
      dbInstance = db;

      // Enable foreign keys and WAL mode for high concurrency & reliability
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run('PRAGMA journal_mode = WAL;', (journalErr) => {
          if (journalErr) {
            console.warn('[Database] WAL mode setting note:', journalErr.message);
          }
        });

        // Create foundation schema / system info table to verify initialization
        db.run(
          `CREATE TABLE IF NOT EXISTS system_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          (schemaErr) => {
            if (schemaErr) {
              console.error('[Database] Error creating initial schema:', schemaErr.message);
              return reject(schemaErr);
            }

            // Create projects table
            db.run(
              `CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                analysis_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );`,
              (projErr) => {
                if (projErr) return reject(projErr);

                // Create project_files table
                db.run(
                  `CREATE TABLE IF NOT EXISTS project_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    original_name TEXT NOT NULL,
                    stored_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    extraction_status TEXT NOT NULL DEFAULT 'pending',
                    extracted_chars INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                  );`,
                  (filesErr) => {
                    if (filesErr) return reject(filesErr);

                    // Insert or ignore initial seed metadata
                    const initQuery = `INSERT OR IGNORE INTO system_meta (key, value) VALUES ('initialized_at', CURRENT_TIMESTAMP)`;
                    db.run(initQuery, (seedErr) => {
                      if (seedErr) {
                        console.error('[Database] Error initializing system_meta:', seedErr.message);
                        return reject(seedErr);
                      }
                      console.log('[Database] Schema (meta, projects, project_files) verified and ready.');
                      resolve(db);
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
}

/**
 * Get active database instance
 */
function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Promise-wrapped db.run
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Promise-wrapped db.get
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Promise-wrapped db.all
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  initDatabase,
  getDb,
  run,
  get,
  all,
  DB_PATH
};
