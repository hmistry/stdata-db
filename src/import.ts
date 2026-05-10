import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { sequelize } from './db.js';
import Lot from './models/Lot.js';
import Test from './models/Test.js';
import TestResult from './models/TestResult.js';

interface CSVRow {
  'lot number': string;
  'test name': string;
  temperature: string;
  units: string;
  value: string;
  'min limit': string;
  'max limit': string;
}

async function importData() {
  try {
    console.log('🚀 Starting database import...\n');

    // Check for --no-demo flag
    const skipDemo = process.argv.includes('--no-demo');

    // Sync database (drop and recreate tables for testing)
    console.log('📊 Syncing database schema...');
    await sequelize.sync({ force: true });
    console.log('✓ Database schema synced\n');

    // Read and parse CSV
    console.log('📂 Reading CSV file...');
    const csvPath = path.resolve('data/test_data.csv');
    const rows: CSVRow[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
          })
        )
        .on('data', (row: CSVRow) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`✓ Read ${rows.length} rows from CSV\n`);

    // Track imports
    let lotsCreated = 0;
    let testsCreated = 0;
    let resultsCreated = 0;

    // Process rows in memory first
    console.log('📝 Processing data...');
    const lotMap = new Map<string, { lotNumber: string }>();
    const testMap = new Map<string, { testName: string; units: string; minLimit: number; maxLimit: number }>();
    const resultsList: {
      lotNumber: string;
      testName: string;
      units: string;
      minLimit: number;
      maxLimit: number;
      temperature: number;
      value: number;
    }[] = [];

    for (const row of rows) {
      const lotNumber = row['lot number'];
      const testKey = `${row['test name']}|${row.units}|${row['min limit']}|${row['max limit']}`;

      // Deduplicate in memory
      if (!lotMap.has(lotNumber)) {
        lotMap.set(lotNumber, { lotNumber });
      }

      if (!testMap.has(testKey)) {
        testMap.set(testKey, {
          testName: row['test name'],
          units: row.units,
          minLimit: parseFloat(row['min limit']),
          maxLimit: parseFloat(row['max limit']),
        });
      }

      resultsList.push({
        lotNumber,
        testName: row['test name'],
        units: row.units,
        minLimit: parseFloat(row['min limit']),
        maxLimit: parseFloat(row['max limit']),
        temperature: parseFloat(row.temperature),
        value: parseFloat(row.value),
      });
    }

    console.log(`✓ Identified ${lotMap.size} unique lots and ${testMap.size} unique tests\n`);

    // Bulk insert Lots
    console.log('🔄 Bulk inserting lots...');
    const lotsToInsert = Array.from(lotMap.values());
    const existingLots = await Lot.findAll({
      where: { lotNumber: Array.from(lotMap.keys()) },
    });
    const existingLotNumbers = new Set(existingLots.map((l) => l.lotNumber));
    const newLots = lotsToInsert.filter((l) => !existingLotNumbers.has(l.lotNumber));
    if (newLots.length > 0) {
      await Lot.bulkCreate(newLots, { ignoreDuplicates: true });
      lotsCreated = newLots.length;
    }
    console.log(`✓ Lots created: ${lotsCreated}`);

    // Bulk insert Tests
    console.log('🔄 Bulk inserting tests...');
    const testsToInsert = Array.from(testMap.values());
    const existingTests = await Test.findAll();
    const existingTestSet = new Set(
      existingTests.map(
        (t) => `${t.testName}|${t.units}|${t.minLimit}|${t.maxLimit}`
      )
    );
    const newTests = testsToInsert.filter(
      (t) => !existingTestSet.has(`${t.testName}|${t.units}|${t.minLimit}|${t.maxLimit}`)
    );
    if (newTests.length > 0) {
      await Test.bulkCreate(newTests, { ignoreDuplicates: true });
      testsCreated = newTests.length;
    }
    console.log(`✓ Tests created: ${testsCreated}`);

    // Fetch all lots and tests for lookup
    const allLots = await Lot.findAll();
    const allTests = await Test.findAll();
    const lotLookup = new Map(allLots.map((l) => [l.lotNumber, l.id]));
    const testLookup = new Map(
      allTests.map((t) => [
        `${t.testName}|${t.units}|${t.minLimit}|${t.maxLimit}`,
        t.id,
      ])
    );

    // Prepare TestResults for bulk insert
    console.log('🔄 Bulk inserting test results...');
    const resultsToInsert = resultsList.map((r) => ({
      lotId: lotLookup.get(r.lotNumber)!,
      testId: testLookup.get(`${r.testName}|${r.units}|${r.minLimit}|${r.maxLimit}`)!,
      temperature: r.temperature,
      value: r.value,
    }));

    await TestResult.bulkCreate(resultsToInsert, { ignoreDuplicates: true });
    resultsCreated = resultsToInsert.length;
    console.log(`✓ Results created: ${resultsCreated}\n`);

    // ===== CRUD OPERATIONS DEMO =====
    if (!skipDemo) {
      console.log('═══════════════════════════════════════');
      console.log('📖 CRUD Operations Demo');
      console.log('═══════════════════════════════════════\n');

      // READ: Get all results for first lot
      console.log('🔍 READ: Query all results for first lot...');
      const firstLot = await Lot.findOne({ order: [['id', 'ASC']] });
      if (firstLot) {
        const lotResults = await TestResult.findAll({
          where: { lotId: firstLot.id },
          include: [
            { model: Lot, attributes: ['lotNumber'] },
            { model: Test, attributes: ['testName', 'units'] },
          ],
        });
        console.log(`✓ Found ${lotResults.length} results for lot "${firstLot.lotNumber}":`);
        lotResults.slice(0, 3).forEach((result) => {
          const testResult = result as any;
          console.log(
            `  - ${testResult.Test.testName} (${testResult.Test.units}) @ ${testResult.temperature}°C: value=${testResult.value}`
          );
        });
        if (lotResults.length > 3) {
          console.log(`  ... and ${lotResults.length - 3} more`);
        }
      }
      console.log();

      // READ: Filter by temperature
      console.log('🔍 READ: Filter results by temperature (85°C)...');
      const resultsAt85 = await TestResult.findAll({
        where: { temperature: 85 },
        include: [
          { model: Lot, attributes: ['lotNumber'] },
          { model: Test, attributes: ['testName'] },
        ],
        limit: 3,
      });
      console.log(`✓ Found ${resultsAt85.length} results at 85°C (showing first 3):`);
      resultsAt85.forEach((result) => {
        const testResult = result as any;
        console.log(
          `  - Lot ${testResult.Lot.lotNumber} / ${testResult.Test.testName}: value=${testResult.value}`
        );
      });
      console.log();

      // UPDATE: Modify a test result value
      console.log('✏️  UPDATE: Modify first result value...');
      const firstResult = await TestResult.findOne({ order: [['id', 'ASC']] });
      if (firstResult) {
        const oldValue = firstResult.value;
        firstResult.value = 99.99;
        await firstResult.save();
        console.log(`✓ Updated result ID ${firstResult.id}: value ${oldValue} → ${firstResult.value}`);
      }
      console.log();

      // DELETE: Remove results for a specific lot (but keep the lot record)
      console.log('🗑️  DELETE: Remove all results for first lot...');
      if (firstLot) {
        const deletedCount = await TestResult.destroy({
          where: { lotId: firstLot.id },
        });
        console.log(`✓ Deleted ${deletedCount} results for lot "${firstLot.lotNumber}"`);
      }
      console.log();

      // Verify deletion
      console.log('✅ Verification: Count remaining results');
      const totalResults = await TestResult.count();
      const totalLots = await Lot.count();
      const totalTests = await Test.count();
      console.log(`  - Total TestResults: ${totalResults}`);
      console.log(`  - Total Lots: ${totalLots}`);
      console.log(`  - Total Tests: ${totalTests}\n`);

      console.log('═══════════════════════════════════════');
      console.log('✨ Import and CRUD demo completed successfully!');
      console.log('═══════════════════════════════════════');
    } else {
      console.log('✅ Import completed successfully! (CRUD demo skipped with --no-demo)');
    }
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run import
importData();
