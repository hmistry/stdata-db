// Shared data models for IndexedDB (Dexie) and SQLite (Drizzle)

// ============================================================================
// Shared TypeScript Types
// ============================================================================

export interface Lot {
  id?: number;
  lotNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Test {
  id?: number;
  testName: string;
  units: 'A' | 'V'; // Amperes or Volts
  minLimit: number;
  maxLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResult {
  id?: number;
  lotId: number;
  testId: number;
  temperature: number;
  value: number;
  minLimit: number;
  maxLimit: number;
  units: 'A' | 'V';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Dexie Schema Definition
// ============================================================================

import Dexie, { Table } from 'dexie';

export class TestDataDB extends Dexie {
  lots!: Table<Lot>;
  tests!: Table<Test>;
  testResults!: Table<TestResult>;

  constructor() {
    super('TestDataDB');
    this.version(1).stores({
      lots: '++id, lotNumber', // Primary key: id, Index: lotNumber (unique)
      tests: '++id, testName', // Primary key: id, Index: testName
      testResults: '++id, [lotId+testId], lotId, testId, temperature', // Primary key: id, Compound index for FK
    });
  }
}

// ============================================================================
// Drizzle Schema Definition (for reference - not used with SQL.js)
// ============================================================================

// Note: Drizzle ORM requires native SQLite bindings which don't work in browser.
// For browser SQL.js, we use raw SQL queries instead.
// These schema definitions are kept for reference to the database structure.

// export const lotsTable = sqliteTable('lots', {
//   id: integer('id').primaryKey(),
//   lotNumber: text('lot_number').notNull().unique(),
//   createdAt: datetime('created_at').notNull(),
//   updatedAt: datetime('updated_at').notNull(),
// });

// export const testsTable = sqliteTable('tests', {
//   id: integer('id').primaryKey(),
//   testName: text('test_name').notNull().unique(),
//   units: text('units', { enum: ['A', 'V'] }).notNull(),
//   minLimit: real('min_limit').notNull(),
//   maxLimit: real('max_limit').notNull(),
//   createdAt: datetime('created_at').notNull(),
//   updatedAt: datetime('updated_at').notNull(),
// });

// export const testResultsTable = sqliteTable('test_results', {
//   id: integer('id').primaryKey(),
//   lotId: integer('lot_id').notNull(),
//   testId: integer('test_id').notNull(),
//   temperature: real('temperature').notNull(),
//   value: real('value').notNull(),
//   minLimit: real('min_limit').notNull(),
//   maxLimit: real('max_limit').notNull(),
//   units: text('units', { enum: ['A', 'V'] }).notNull(),
//   createdAt: datetime('created_at').notNull(),
//   updatedAt: datetime('updated_at').notNull(),
// });

// export const lotsRelations = relations(lotsTable, ({ many }) => ({
//   testResults: many(testResultsTable),
// }));

// export const testsRelations = relations(testsTable, ({ many }) => ({
//   testResults: many(testResultsTable),
// }));

// export const testResultsRelations = relations(testResultsTable, ({ one }) => ({
//   lot: one(lotsTable, {
//     fields: [testResultsTable.lotId],
//     references: [lotsTable.id],
//   }),
//   test: one(testsTable, {
//     fields: [testResultsTable.testId],
//     references: [testsTable.id],
//   }),
// }));

// ============================================================================
// Parsed CSV Row Type
// ============================================================================

export interface CSVRow {
  lotNumber: string;
  testName: string;
  temperature: number;
  units: 'A' | 'V';
  value: number;
  minLimit: number;
  maxLimit: number;
}

// ============================================================================
// Import Data Structure (prepared data before insertion)
// ============================================================================

export interface ImportData {
  lots: Lot[];
  tests: Test[];
  testResults: TestResult[];
}

// ============================================================================
// Query Result Structures
// ============================================================================

export interface QueryResult {
  pass: boolean;
  reason: string;
}

export interface TestResultWithPass extends TestResult {
  pass: boolean;
}

export interface QueryByLotResult {
  lot: Lot;
  tests: Array<{
    test: Test;
    results: TestResultWithPass[];
  }>;
}

export interface QueryByTestResult {
  test: Test;
  lots: Array<{
    lot: Lot;
    results: TestResultWithPass[];
  }>;
}
