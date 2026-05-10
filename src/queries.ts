import { sequelize } from './db.js';
import Lot from './models/Lot.js';
import Test from './models/Test.js';
import TestResult from './models/TestResult.js';

async function queryByLot(lotNumber: string) {
  try {
    console.log(`\n📋 Query 1: Find all tests for lot "${lotNumber}"\n`);

    const lot = await Lot.findOne({
      where: { lotNumber },
      include: [
        {
          model: TestResult,
          include: [{ model: Test }],
        },
      ],
    });

    if (!lot) {
      console.log(`❌ Lot "${lotNumber}" not found`);
      return;
    }

    console.log(`✓ Lot: ${lot.lotNumber}`);
    console.log(`✓ Total Results: ${(lot as any).TestResults.length}\n`);

    const testMap = new Map<number, any>();
    (lot as any).TestResults.forEach((result: any) => {
      const testId = result.Test.id;
      if (!testMap.has(testId)) {
        testMap.set(testId, {
          test: result.Test,
          results: [],
        });
      }
      testMap.get(testId).results.push(result);
    });

    testMap.forEach(({ test, results }) => {
      console.log(
        `  📊 ${test.testName} (${test.units}) - Limits: [${test.minLimit}, ${test.maxLimit}]`
      );
      results.forEach((r: any) => {
        const pass = r.value >= test.minLimit && r.value <= test.maxLimit ? '✓' : '✗';
        console.log(`    ${pass} Temp=${r.temperature}°C, Value=${r.value}`);
      });
    });
  } catch (error) {
    console.error('❌ Error querying lot:', error);
  }
}

async function queryByTest(testName: string) {
  try {
    console.log(`\n📋 Query 2: Find all lots for test "${testName}"\n`);

    const test = await Test.findOne({
      where: { testName },
      include: [
        {
          model: TestResult,
          include: [{ model: Lot }],
        },
      ],
    });

    if (!test) {
      console.log(`❌ Test "${testName}" not found`);
      return;
    }

    console.log(`✓ Test: ${test.testName} (${test.units})`);
    console.log(`✓ Limits: [${test.minLimit}, ${test.maxLimit}]`);
    console.log(`✓ Total Results: ${(test as any).TestResults.length}\n`);

    const lotMap = new Map<number, any>();
    (test as any).TestResults.forEach((result: any) => {
      const lotId = result.Lot.id;
      if (!lotMap.has(lotId)) {
        lotMap.set(lotId, {
          lot: result.Lot,
          results: [],
        });
      }
      lotMap.get(lotId).results.push(result);
    });

    lotMap.forEach(({ lot, results }) => {
      console.log(`  📦 Lot: ${lot.lotNumber}`);
      results.forEach((r: any) => {
        const pass =
          r.value >= test.minLimit && r.value <= test.maxLimit ? '✓' : '✗';
        console.log(`    ${pass} Temp=${r.temperature}°C, Value=${r.value}`);
      });
    });
  } catch (error) {
    console.error('❌ Error querying test:', error);
  }
}

async function listAllLots() {
  try {
    console.log('\n📋 Available Lots:\n');
    const lots = await Lot.findAll();
    lots.forEach((lot) => {
      console.log(`  - ${lot.lotNumber}`);
    });
    return lots.map((l) => l.lotNumber);
  } catch (error) {
    console.error('❌ Error listing lots:', error);
    return [];
  }
}

async function listAllTests() {
  try {
    console.log('\n📋 Available Tests:\n');
    const tests = await Test.findAll();
    tests.forEach((test) => {
      console.log(`  - ${test.testName} (${test.units})`);
    });
    return tests.map((t) => t.testName);
  } catch (error) {
    console.error('❌ Error listing tests:', error);
    return [];
  }
}

async function runQueries() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Connected\n');

    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const value = args[1];

    if (command === '--lot' && value) {
      await queryByLot(value);
    } else if (command === '--test' && value) {
      await queryByTest(value);
    } else if (command === '--list-lots') {
      await listAllLots();
    } else if (command === '--list-tests') {
      await listAllTests();
    } else {
      console.log('Usage:');
      console.log(
        '  node dist/queries.js --lot <LOT_NUMBER>     # Query by lot number'
      );
      console.log(
        '  node dist/queries.js --test <TEST_NAME>     # Query by test name'
      );
      console.log(
        '  node dist/queries.js --list-lots            # List all lots'
      );
      console.log(
        '  node dist/queries.js --list-tests           # List all tests'
      );
      console.log('\nRunning example queries...\n');

      const lots = await listAllLots();
      if (lots.length > 0) {
        await queryByLot(lots[0]);
      }

      const tests = await listAllTests();
      if (tests.length > 0) {
        await queryByTest(tests[0]);
      }
    }

    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runQueries();
