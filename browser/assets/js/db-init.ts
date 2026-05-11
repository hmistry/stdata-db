// Database initialization for Dexie (IndexedDB) and SQL.js (WASM SQLite)

import { TestDataDB } from './models.js';

// ============================================================================
// Dexie Database Instance
// ============================================================================

export const dexieDB = new TestDataDB();

// ============================================================================
// SQL.js Database (Lazy-loaded)
// ============================================================================

let sqliteDb: any = null;
let wasmLoaded = false;

/**
 * Initialize SQL.js database (lazy-loaded)
 * This is called on first query to avoid loading large WASM bundle at page load
 */
export async function initWasmSqlite(): Promise<any> {
  if (sqliteDb) {
    return sqliteDb;
  }

  if (wasmLoaded) {
    throw new Error('WASM SQLite initialization failed');
  }

  try {
    // Lazy-load sql.js
    const initSqlJs = await loadSqlJsModule();
    
    // Configure SQL.js to find the WASM file from jsDelivr CDN
    const SQL = await initSqlJs({
      locateFile: (fileName: string) => {
        // jsDelivr CDN hosts both the JS and WASM files in the same directory
        if (fileName.includes('.wasm')) {
          return `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${fileName}`;
        }
        return fileName;
      }
    });

    // Create in-memory database
    sqliteDb = new SQL.Database();

    // Initialize schema
    initializeSqliteSchema(sqliteDb);

    wasmLoaded = true;
    return sqliteDb;
  } catch (error) {
    wasmLoaded = true;
    throw new Error(`Failed to initialize WASM SQLite: ${error}`);
  }
}

/**
 * Load SQL.js module from CDN
 */
async function loadSqlJsModule(): Promise<any> {
  // Check if already loaded
  if (typeof (window as any).initSqlJs !== 'undefined') {
    return (window as any).initSqlJs;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SQL.js load timeout after 30 seconds'));
    }, 30000);

    const script = document.createElement('script');
    
    // Using jsDelivr CDN which is more reliable for WASM
    script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      clearTimeout(timeout);
      // Wait a tick for initSqlJs to be available
      setTimeout(() => {
        if (typeof (window as any).initSqlJs !== 'undefined') {
          resolve((window as any).initSqlJs);
        } else {
          reject(new Error('initSqlJs not available after script load'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load sql.js from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize SQLite schema
 */
function initializeSqliteSchema(db: any): void {
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS lots (
      id INTEGER PRIMARY KEY,
      lot_number TEXT NOT NULL UNIQUE,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY,
      test_name TEXT NOT NULL UNIQUE,
      units TEXT NOT NULL CHECK(units IN ('A', 'V')),
      min_limit REAL NOT NULL,
      max_limit REAL NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY,
      lot_id INTEGER NOT NULL,
      test_id INTEGER NOT NULL,
      temperature REAL NOT NULL,
      value REAL NOT NULL,
      min_limit REAL NOT NULL,
      max_limit REAL NOT NULL,
      units TEXT NOT NULL CHECK(units IN ('A', 'V')),
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (test_id) REFERENCES tests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_test_results_lot_id ON test_results(lot_id);
    CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
  `);
}

/**
 * Reset both databases
 */
export async function clearAllDatabases(): Promise<void> {
  // Clear Dexie
  await dexieDB.lots.clear();
  await dexieDB.tests.clear();
  await dexieDB.testResults.clear();

  // Clear SQLite if loaded
  if (sqliteDb) {
    sqliteDb.run(`DELETE FROM test_results;`);
    sqliteDb.run(`DELETE FROM tests;`);
    sqliteDb.run(`DELETE FROM lots;`);
  }
}

/**
 * Get SQLite database instance
 */
export function getSqliteDB(): any {
  return sqliteDb;
}

/**
 * Check if SQLite is loaded
 */
export function isSqliteLoaded(): boolean {
  return sqliteDb !== null;
}

