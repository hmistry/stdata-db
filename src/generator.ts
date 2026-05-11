import * as fs from 'fs';
import * as path from 'path';

// Types
interface TestMetadata {
  name: string;
  unit: 'A' | 'V';
  minLimit: number;
  maxLimit: number;
}

interface CSVRow {
  lotNumber: string;
  testName: string;
  temperature: number;
  units: string;
  value: number;
  minLimit: number;
  maxLimit: number;
}

// Constants
const NUM_LOTS = 3;
const NUM_TESTS = 10;
const TEMPERATURES = [25.0, 85.0]; //[-40.0, 0.0, 25.0, 70.0, 85.0];
const MIN_VALUE_RANGE = -100.0;
const MAX_VALUE_RANGE = 100.0;

// Utility functions
function generateLotNumber(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lotNumber = '';

  // Generate 6 random uppercase letters
  for (let i = 0; i < 6; i++) {
    lotNumber += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate 4 random digits
  for (let i = 0; i < 4; i++) {
    lotNumber += Math.floor(Math.random() * 10);
  }

  return lotNumber;
}

function generateTestMetadata(): TestMetadata[] {
  const tests: TestMetadata[] = [];

  for (let i = 1; i <= NUM_TESTS; i++) {
    const testNum = String(i).padStart(4, '0');
    const unit = Math.random() > 0.5 ? 'A' : 'V';

    // Generate min limit (between MIN_VALUE_RANGE and 0)
    const minLimit = parseFloat(
      (Math.random() * (0 - MIN_VALUE_RANGE) + MIN_VALUE_RANGE).toFixed(1)
    );

    // Generate max limit (between minLimit + 1 and MAX_VALUE_RANGE)
    // Ensure max > min with a significant gap
    const maxLimit = parseFloat(
      (Math.random() * (MAX_VALUE_RANGE - (minLimit + 1)) + (minLimit + 1)).toFixed(1)
    );

    tests.push({
      name: `Some test ${testNum}`,
      unit,
      minLimit,
      maxLimit,
    });
  }

  return tests;
}

function generateRandomValue(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateCSVData(): CSVRow[] {
  const rows: CSVRow[] = [];
  const testMetadata = generateTestMetadata();

  for (let lotIdx = 0; lotIdx < NUM_LOTS; lotIdx++) {
    const lotNumber = generateLotNumber();

    for (const test of testMetadata) {
      for (const temperature of TEMPERATURES) {
        const value = generateRandomValue(test.minLimit, test.maxLimit);

        rows.push({
          lotNumber,
          testName: test.name,
          temperature,
          units: test.unit,
          value,
          minLimit: test.minLimit,
          maxLimit: test.maxLimit,
        });
      }
    }
  }

  return rows;
}

function generateCSVContent(rows: CSVRow[]): string {
  const header = 'lot number,test name,temperature,units,value,min limit,max limit\n';

  const csvRows = rows.map((row) => {
    return [
      row.lotNumber,
      row.testName,
      row.temperature,
      row.units,
      row.value,
      row.minLimit,
      row.maxLimit,
    ].join(',');
  });

  return header + csvRows.join('\n');
}

async function main() {
  try {
    console.log('Generating test data...');

    // Generate data
    const csvData = generateCSVData();
    const csvContent = generateCSVContent(csvData);

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to CSV file
    const outputPath = path.join(dataDir, 'test_data.csv');
    fs.writeFileSync(outputPath, csvContent);

    console.log(`✓ Test data generated successfully!`);
    console.log(`✓ Output: ${outputPath}`);
    console.log(`✓ Total rows: ${csvData.length + 1} (including header)`);
    console.log(`✓ Breakdown: ${NUM_LOTS} lots × ${NUM_TESTS} tests × ${TEMPERATURES.length} temperatures = ${NUM_LOTS * NUM_TESTS * TEMPERATURES.length} rows total`);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
}

main();
