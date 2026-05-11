// Query functions for SQL.js (WASM SQLite)

import { getSqliteDB, isSqliteLoaded } from './db-init.js';
import { QueryByLotResult, QueryByTestResult, TestResultWithPass, Lot, Test, TestResult } from './models.js';

export interface QueryExecutionResult<T> {
  data: T;
  duration: number; // milliseconds
}

/**
 * Calculate if a test result passes
 */
function calculatePass(value: number, minLimit: number, maxLimit: number): boolean {
  return value >= minLimit && value <= maxLimit;
}

/**
 * Query by Lot Number using SQL.js
 */
export async function queryByLotDrizzle(
  lotNumber: string
): Promise<QueryExecutionResult<QueryByLotResult | null>> {
  const startTime = performance.now();

  if (!isSqliteLoaded()) {
    throw new Error('SQLite database not initialized');
  }

  const db = getSqliteDB();
  if (!db) {
    throw new Error('SQLite database not available');
  }

  try {
    // Find lot
    const lotStmt = db.prepare('SELECT id, lot_number, created_at, updated_at FROM lots WHERE lot_number = ?');
    lotStmt.bind([lotNumber]);
    let lot: Lot | null = null;

    if (lotStmt.step()) {
      const row = lotStmt.getAsObject();
      lot = {
        id: row.id as number,
        lotNumber: row.lot_number as string,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      };
    }
    lotStmt.free();

    if (!lot) {
      return {
        data: null,
        duration: performance.now() - startTime,
      };
    }

    // Get all test results for this lot with test details
    const resultsStmt = db.prepare(`
      SELECT 
        tr.id, tr.lot_id, tr.test_id, tr.temperature, tr.value, 
        tr.min_limit, tr.max_limit, tr.units, tr.created_at, tr.updated_at,
        t.id as test_id_col, t.test_name, t.units as test_units, t.min_limit as test_min, t.max_limit as test_max
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE tr.lot_id = ?
      ORDER BY t.test_name, tr.temperature
    `);
    resultsStmt.bind([lot.id]);

    const resultsMap = new Map<number, any>();
    const testMap = new Map<number, Test>();

    while (resultsStmt.step()) {
      const row = resultsStmt.getAsObject();
      const testId = row.test_id_col as number;

      // Add test if not seen before
      if (!testMap.has(testId)) {
        testMap.set(testId, {
          id: testId,
          testName: row.test_name as string,
          units: row.test_units as 'A' | 'V',
          minLimit: row.test_min as number,
          maxLimit: row.test_max as number,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add result
      if (!resultsMap.has(testId)) {
        resultsMap.set(testId, []);
      }

      resultsMap.get(testId)!.push({
        id: row.id as number,
        lotId: row.lot_id as number,
        testId: row.test_id as number,
        temperature: row.temperature as number,
        value: row.value as number,
        minLimit: row.min_limit as number,
        maxLimit: row.max_limit as number,
        units: row.units as 'A' | 'V',
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        pass: calculatePass(row.value as number, row.min_limit as number, row.max_limit as number),
      });
    }
    resultsStmt.free();

    // Build test groups
    const testGroups = Array.from(testMap.entries()).map(([testId, test]) => ({
      test,
      results: resultsMap.get(testId) || [],
    }));

    const duration = performance.now() - startTime;

    return {
      data: {
        lot,
        tests: testGroups,
      },
      duration,
    };
  } catch (error) {
    throw new Error(`Query failed: ${error}`);
  }
}

/**
 * Query by Test Name using SQL.js
 */
export async function queryByTestDrizzle(
  testName: string
): Promise<QueryExecutionResult<QueryByTestResult | null>> {
  const startTime = performance.now();

  if (!isSqliteLoaded()) {
    throw new Error('SQLite database not initialized');
  }

  const db = getSqliteDB();
  if (!db) {
    throw new Error('SQLite database not available');
  }

  try {
    // Find test
    const testStmt = db.prepare(
      'SELECT id, test_name, units, min_limit, max_limit, created_at, updated_at FROM tests WHERE test_name = ?'
    );
    testStmt.bind([testName]);
    let test: Test | null = null;

    if (testStmt.step()) {
      const row = testStmt.getAsObject();
      test = {
        id: row.id as number,
        testName: row.test_name as string,
        units: row.units as 'A' | 'V',
        minLimit: row.min_limit as number,
        maxLimit: row.max_limit as number,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      };
    }
    testStmt.free();

    if (!test) {
      return {
        data: null,
        duration: performance.now() - startTime,
      };
    }

    // Get all test results for this test with lot details
    const resultsStmt = db.prepare(`
      SELECT 
        tr.id, tr.lot_id, tr.test_id, tr.temperature, tr.value, 
        tr.min_limit, tr.max_limit, tr.units, tr.created_at, tr.updated_at,
        l.id as lot_id_col, l.lot_number, l.created_at as lot_created, l.updated_at as lot_updated
      FROM test_results tr
      JOIN lots l ON tr.lot_id = l.id
      WHERE tr.test_id = ?
      ORDER BY l.lot_number, tr.temperature
    `);
    resultsStmt.bind([test.id]);

    const resultsMap = new Map<number, any>();
    const lotMap = new Map<number, Lot>();

    while (resultsStmt.step()) {
      const row = resultsStmt.getAsObject();
      const lotId = row.lot_id_col as number;

      // Add lot if not seen before
      if (!lotMap.has(lotId)) {
        lotMap.set(lotId, {
          id: lotId,
          lotNumber: row.lot_number as string,
          createdAt: new Date(row.lot_created as string),
          updatedAt: new Date(row.lot_updated as string),
        });
      }

      // Add result
      if (!resultsMap.has(lotId)) {
        resultsMap.set(lotId, []);
      }

      resultsMap.get(lotId)!.push({
        id: row.id as number,
        lotId: row.lot_id as number,
        testId: row.test_id as number,
        temperature: row.temperature as number,
        value: row.value as number,
        minLimit: row.min_limit as number,
        maxLimit: row.max_limit as number,
        units: row.units as 'A' | 'V',
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        pass: calculatePass(row.value as number, row.min_limit as number, row.max_limit as number),
      });
    }
    resultsStmt.free();

    // Build lot groups
    const lotGroups = Array.from(lotMap.entries()).map(([lotId, lot]) => ({
      lot,
      results: resultsMap.get(lotId) || [],
    }));

    const duration = performance.now() - startTime;

    return {
      data: {
        test,
        lots: lotGroups,
      },
      duration,
    };
  } catch (error) {
    throw new Error(`Query failed: ${error}`);
  }
}

/**
 * Get count of records in SQLite
 */
export async function getRecordCountsDrizzle(): Promise<{
  lots: number;
  tests: number;
  testResults: number;
}> {
  if (!isSqliteLoaded()) {
    return { lots: 0, tests: 0, testResults: 0 };
  }

  const db = getSqliteDB();
  if (!db) {
    return { lots: 0, tests: 0, testResults: 0 };
  }

  const counts = { lots: 0, tests: 0, testResults: 0 };

  const lotsStmt = db.prepare('SELECT COUNT(*) as count FROM lots');
  if (lotsStmt.step()) {
    counts.lots = lotsStmt.getAsObject().count as number;
  }
  lotsStmt.free();

  const testsStmt = db.prepare('SELECT COUNT(*) as count FROM tests');
  if (testsStmt.step()) {
    counts.tests = testsStmt.getAsObject().count as number;
  }
  testsStmt.free();

  const resultsStmt = db.prepare('SELECT COUNT(*) as count FROM test_results');
  if (resultsStmt.step()) {
    counts.testResults = resultsStmt.getAsObject().count as number;
  }
  resultsStmt.free();

  return counts;
}

/**
 * Get list of all lots with their first and last test names
 */
export async function getLotsWithTestsDrizzle(): Promise<
  Array<{
    lotNumber: string;
    firstTestName: string | null;
    lastTestName: string | null;
    testCount: number;
  }>
> {
  if (!isSqliteLoaded()) {
    return [];
  }

  const db = getSqliteDB();
  if (!db) {
    return [];
  }

  try {
    // Get all lots
    const lotsStmt = db.prepare('SELECT id, lot_number FROM lots ORDER BY lot_number');
    const lots: Array<{ id: number; lotNumber: string }> = [];

    while (lotsStmt.step()) {
      const row = lotsStmt.getAsObject();
      lots.push({
        id: row.id as number,
        lotNumber: row.lot_number as string,
      });
    }
    lotsStmt.free();

    // For each lot, get the tests
    const lotsWithTests = lots.map((lot) => {
      const testsStmt = db.prepare(`
        SELECT DISTINCT t.test_name
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.lot_id = ?
        ORDER BY t.test_name
      `);
      testsStmt.bind([lot.id]);

      const testNames: string[] = [];
      while (testsStmt.step()) {
        const row = testsStmt.getAsObject();
        testNames.push(row.test_name as string);
      }
      testsStmt.free();

      return {
        lotNumber: lot.lotNumber,
        firstTestName: testNames.length > 0 ? testNames[0] : null,
        lastTestName: testNames.length > 0 ? testNames[testNames.length - 1] : null,
        testCount: testNames.length,
      };
    });

    return lotsWithTests;
  } catch (error) {
    console.error('Error fetching lots with tests:', error);
    return [];
  }
}
