// CSV Parser for test data

import { CSVRow, ImportData, Lot, Test, TestResult } from './models.js';

/**
 * Parse CSV string and return structured data
 */
export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  const rows: CSVRow[] = [];

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('lot') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parts = parseCSVLine(line);
      if (parts.length < 7) continue;

      const row: CSVRow = {
        lotNumber: parts[0].trim(),
        testName: parts[1].trim(),
        temperature: parseFloat(parts[2]),
        units: (parts[3].trim() as 'A' | 'V'),
        value: parseFloat(parts[4]),
        minLimit: parseFloat(parts[5]),
        maxLimit: parseFloat(parts[6]),
      };

      // Validate required fields
      if (row.lotNumber && row.testName && !isNaN(row.value)) {
        rows.push(row);
      }
    } catch (error) {
      console.warn(`Failed to parse CSV line ${i + 1}:`, line, error);
    }
  }

  return rows;
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts;
}

/**
 * Process CSV rows into normalized data structure with deduplication
 */
export function processCSVRows(csvRows: CSVRow[]): ImportData {
  const lotsMap = new Map<string, Lot>();
  const testsMap = new Map<string, Test>();
  const testResults: TestResult[] = [];

  const now = new Date();
  let testResultId = 1;

  for (const row of csvRows) {
    // Create/get Lot
    if (!lotsMap.has(row.lotNumber)) {
      lotsMap.set(row.lotNumber, {
        id: lotsMap.size + 1,
        lotNumber: row.lotNumber,
        createdAt: now,
        updatedAt: now,
      });
    }
    const lot = lotsMap.get(row.lotNumber)!;

    // Create/get Test (use testName + units as unique key)
    const testKey = `${row.testName}|${row.units}`;
    if (!testsMap.has(testKey)) {
      testsMap.set(testKey, {
        id: testsMap.size + 1,
        testName: row.testName,
        units: row.units,
        minLimit: row.minLimit,
        maxLimit: row.maxLimit,
        createdAt: now,
        updatedAt: now,
      });
    }
    const test = testsMap.get(testKey)!;

    // Create TestResult
    testResults.push({
      id: testResultId++,
      lotId: lot.id!,
      testId: test.id!,
      temperature: row.temperature,
      value: row.value,
      minLimit: row.minLimit,
      maxLimit: row.maxLimit,
      units: row.units,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    lots: Array.from(lotsMap.values()),
    tests: Array.from(testsMap.values()),
    testResults,
  };
}
