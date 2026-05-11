// Query functions for Dexie (IndexedDB)

import { dexieDB } from './db-init.js';
import { QueryByLotResult, QueryByTestResult, TestResultWithPass } from './models.js';

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
 * Query by Lot Number using Dexie
 */
export async function queryByLotDexie(
  lotNumber: string
): Promise<QueryExecutionResult<QueryByLotResult | null>> {
  const startTime = performance.now();

  try {
    // Find lot
    const lot = await dexieDB.lots.where('lotNumber').equals(lotNumber).first();
    if (!lot) {
      return {
        data: null,
        duration: performance.now() - startTime,
      };
    }

    // Find all test results for this lot
    const results = await dexieDB.testResults.where('lotId').equals(lot.id!).toArray();

    // Group by test
    const testIds = new Set(results.map((r) => r.testId));
    const tests = await Promise.all(
      Array.from(testIds).map((testId) => dexieDB.tests.get(testId))
    );

    // Build result structure
    const testGroups = tests.map((test) => {
      const testResults = results
        .filter((r) => r.testId === test!.id)
        .map((r) => ({
          ...r,
          pass: calculatePass(r.value, r.minLimit, r.maxLimit),
        }))
        .sort((a, b) => a.temperature - b.temperature);

      return {
        test: test!,
        results: testResults as TestResultWithPass[],
      };
    });

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
 * Query by Test Name using Dexie
 */
export async function queryByTestDexie(
  testName: string
): Promise<QueryExecutionResult<QueryByTestResult | null>> {
  const startTime = performance.now();

  try {
    // Find test
    const test = await dexieDB.tests.where('testName').equals(testName).first();
    if (!test) {
      return {
        data: null,
        duration: performance.now() - startTime,
      };
    }

    // Find all test results for this test
    const results = await dexieDB.testResults.where('testId').equals(test.id!).toArray();

    // Get all unique lots
    const lotIds = new Set(results.map((r) => r.lotId));
    const lots = await Promise.all(Array.from(lotIds).map((lotId) => dexieDB.lots.get(lotId)));

    // Build result structure
    const lotGroups = lots.map((lot) => {
      const testResults = results
        .filter((r) => r.lotId === lot!.id)
        .map((r) => ({
          ...r,
          pass: calculatePass(r.value, r.minLimit, r.maxLimit),
        }))
        .sort((a, b) => a.temperature - b.temperature);

      return {
        lot: lot!,
        results: testResults as TestResultWithPass[],
      };
    });

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
 * Get count of records in Dexie
 */
export async function getRecordCountsDexie(): Promise<{
  lots: number;
  tests: number;
  testResults: number;
}> {
  return {
    lots: await dexieDB.lots.count(),
    tests: await dexieDB.tests.count(),
    testResults: await dexieDB.testResults.count(),
  };
}

/**
 * Get list of all lots with their first and last test names
 */
export async function getLotsWithTestsDexie(): Promise<
  Array<{
    lotNumber: string;
    firstTestName: string | null;
    lastTestName: string | null;
    testCount: number;
  }>
> {
  const lots = await dexieDB.lots.toArray();

  const lotsWithTests = await Promise.all(
    lots.map(async (lot) => {
      const results = await dexieDB.testResults.where('lotId').equals(lot.id!).toArray();
      
      if (results.length === 0) {
        return {
          lotNumber: lot.lotNumber,
          firstTestName: null,
          lastTestName: null,
          testCount: 0,
        };
      }

      // Get unique test names for this lot
      const testIds = [...new Set(results.map((r) => r.testId))];
      const tests = await Promise.all(testIds.map((id) => dexieDB.tests.get(id)));

      const testNames = tests.map((t) => t?.testName ?? '').filter((n) => n.length > 0);
      const sortedTestNames = testNames.sort();

      return {
        lotNumber: lot.lotNumber,
        firstTestName: sortedTestNames[0] || null,
        lastTestName: sortedTestNames[sortedTestNames.length - 1] || null,
        testCount: testNames.length,
      };
    })
  );

  return lotsWithTests.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
}
