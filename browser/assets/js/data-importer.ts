// Data importer for both Dexie (IndexedDB) and SQL.js (WASM SQLite)

import { dexieDB, initWasmSqlite, getSqliteDB } from './db-init.js';
import { ImportData } from './models.js';

export interface ImportResult {
  database: 'IndexedDB' | 'SQLite';
  lotsInserted: number;
  testsInserted: number;
  testResultsInserted: number;
  totalInserted: number;
  duration: number; // milliseconds
  error?: string;
}

/**
 * Import data into both databases
 */
export async function importDataToBothDatabases(
  data: ImportData
): Promise<{ indexeddb: ImportResult; sqlite: ImportResult }> {
  const [indexeddbResult, sqliteResult] = await Promise.all([
    importDataToDexie(data),
    importDataToSqlite(data),
  ]);

  return { indexeddb: indexeddbResult, sqlite: sqliteResult };
}

/**
 * Import data to Dexie (IndexedDB)
 */
async function importDataToDexie(data: ImportData): Promise<ImportResult> {
  const startTime = performance.now();

  try {
    // Insert in order: Lots -> Tests -> TestResults
    await dexieDB.lots.bulkAdd(data.lots, { allKeys: true });
    await dexieDB.tests.bulkAdd(data.tests, { allKeys: true });
    await dexieDB.testResults.bulkAdd(data.testResults, { allKeys: true });

    const duration = performance.now() - startTime;

    return {
      database: 'IndexedDB',
      lotsInserted: data.lots.length,
      testsInserted: data.tests.length,
      testResultsInserted: data.testResults.length,
      totalInserted: data.lots.length + data.tests.length + data.testResults.length,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      database: 'IndexedDB',
      lotsInserted: 0,
      testsInserted: 0,
      testResultsInserted: 0,
      totalInserted: 0,
      duration,
      error: `Failed to import to IndexedDB: ${error}`,
    };
  }
}

/**
 * Import data to SQLite via SQL.js
 */
async function importDataToSqlite(data: ImportData): Promise<ImportResult> {
  const startTime = performance.now();

  try {
    // Initialize WASM SQLite if not already done
    const db = await initWasmSqlite();

    let lotsInserted = 0;
    let testsInserted = 0;
    let testResultsInserted = 0;

    try {
      // Insert lots
      if (data.lots.length > 0) {
        const stmt = db.prepare(
          'INSERT INTO lots (id, lot_number, created_at, updated_at) VALUES (?, ?, ?, ?)'
        );
        for (const lot of data.lots) {
          stmt.bind([lot.id, lot.lotNumber, lot.createdAt.toISOString(), lot.updatedAt.toISOString()]);
          stmt.step();
          stmt.reset();
        }
        stmt.free();
        lotsInserted = data.lots.length;
      }

      // Insert tests
      if (data.tests.length > 0) {
        const stmt = db.prepare(
          'INSERT INTO tests (id, test_name, units, min_limit, max_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        for (const test of data.tests) {
          stmt.bind([
            test.id,
            test.testName,
            test.units,
            test.minLimit,
            test.maxLimit,
            test.createdAt.toISOString(),
            test.updatedAt.toISOString(),
          ]);
          stmt.step();
          stmt.reset();
        }
        stmt.free();
        testsInserted = data.tests.length;
      }

      // Insert test results
      if (data.testResults.length > 0) {
        const stmt = db.prepare(
          'INSERT INTO test_results (id, lot_id, test_id, temperature, value, min_limit, max_limit, units, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const result of data.testResults) {
          stmt.bind([
            result.id,
            result.lotId,
            result.testId,
            result.temperature,
            result.value,
            result.minLimit,
            result.maxLimit,
            result.units,
            result.createdAt.toISOString(),
            result.updatedAt.toISOString(),
          ]);
          stmt.step();
          stmt.reset();
        }
        stmt.free();
        testResultsInserted = data.testResults.length;
      }
    } catch (innerError) {
      throw new Error(`Database insertion failed: ${innerError}`);
    }

    const duration = performance.now() - startTime;

    return {
      database: 'SQLite',
      lotsInserted,
      testsInserted,
      testResultsInserted,
      totalInserted: lotsInserted + testsInserted + testResultsInserted,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      database: 'SQLite',
      lotsInserted: 0,
      testsInserted: 0,
      testResultsInserted: 0,
      totalInserted: 0,
      duration,
      error: `Failed to import to SQLite: ${error}`,
    };
  }
}
