# stdata-db

A high-performance TypeScript tool for generating test data, importing CSV files into SQLite databases, and querying test results using Sequelize ORM.

## Features

- **CSV Test Data Generator**: Generate realistic test data with configurable lots, tests, and temperature conditions
- **Bulk CSV Import**: Import hundreds of thousands of rows into SQLite using optimized bulk operations
- **Sequelize ORM**: Normalized schema with Lots, Tests, and TestResults tables
- **Query Tools**: Easy-to-use CLI for querying test data by lot number or test name
- **CRUD Operations**: Create, read, update, delete test results with full relationship support

## Setup

### Prerequisites

- Node.js (v18 or later)
- pnpm (v11.0.9 or later)

### Installation

1. Clone the repository:
```bash
cd /path/to/stdata-db
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the TypeScript:
```bash
pnpm build
```

## Quick Start

### 1. Generate Test Data

Generate a CSV file with test data:

```bash
pnpm generate
```

This creates `data/test_data.csv` with test results across multiple lots and temperatures.

### 2. Import into SQLite

Import the CSV file into SQLite database:

```bash
# Standard import with CRUD demo
pnpm import

# Fast import, skip demo
pnpm import --no-demo
```

This creates `data/test.db` with normalized schema and all data.

### 3. Query Test Data

#### List all lots
```bash
pnpm query --list-lots
```

#### List all tests
```bash
pnpm query --list-tests
```

#### Query all tests for a specific lot
```bash
pnpm query --lot OIGBGT3368
```

Returns all tests, temperatures, and values for a given lot with pass/fail indicators.

#### Query all lots for a specific test
```bash
pnpm query --test "Some test 0001"
```

Returns all lots that have been tested with the specified test.

## Database Schema

The SQLite database uses a normalized three-table schema:

```
┌─────────┐         ┌──────────────┐         ┌────────────┐
│  Lots   │────1:N──│ TestResults  │───N:1───│   Tests    │
├─────────┤         ├──────────────┤         ├────────────┤
│ id (PK) │         │ id (PK)      │         │ id (PK)    │
│ lotNum  │         │ lotId (FK)   │         │ testName   │
│ created │         │ testId (FK)  │         │ units      │
│ updated │         │ temperature  │         │ minLimit   │
│         │         │ value        │         │ maxLimit   │
│         │         │ created      │         │ created    │
│         │         │ updated      │         │ updated    │
└─────────┘         └──────────────┘         └────────────┘
```

**Lots**: Batch identifiers for test runs
**Tests**: Test definitions with pass/fail limits
**TestResults**: Individual measurement data points

## Customizing Test Data Generation

The test data generator can be customized by modifying constants in `src/generator.ts`:

### Number of Lots and Tests

```typescript
// src/generator.ts
const NUM_LOTS = 100;           // Number of unique lot identifiers to generate
const NUM_TESTS = 1000;         // Number of unique test definitions
```

### Temperature Conditions

```typescript
// src/generator.ts
const TEMPERATURES = [-40.0, 0.0, 25.0, 70.0, 85.0];  // Test temperatures in °C
```

To test at different temperatures, modify the array. Example:
```typescript
const TEMPERATURES = [25.0, 85.0];  // Only room temp and high temp
const TEMPERATURES = [0.0, 25.0, 50.0, 75.0, 100.0];  // 5 temperature steps
```

### Measurement Value Range

```typescript
// src/generator.ts
const MIN_VALUE_RANGE = -100.0;     // Minimum possible measured value
const MAX_VALUE_RANGE = 100.0;      // Maximum possible measured value
```

To generate values in a different range:
```typescript
const MIN_VALUE_RANGE = 0.0;        // 0 to 1000 volt range
const MAX_VALUE_RANGE = 1000.0;
```

### Example: Custom Configuration

Generate fewer lots and tests, test at specific temperatures:

```typescript
// src/generator.ts
const NUM_LOTS = 5;                          // 5 lots instead of 100
const NUM_TESTS = 50;                        // 50 tests instead of 1000
const TEMPERATURES = [25.0, 85.0];           // Only 2 temperature points
const MIN_VALUE_RANGE = -50.0;
const MAX_VALUE_RANGE = 150.0;
```

Then regenerate and re-import:
```bash
pnpm generate
pnpm import --no-demo
```

## Performance

### Bulk Import Performance

The import script uses optimized bulk operations for fast data loading:

- **500K rows**: ~6 seconds
- **1M rows**: ~12 seconds
- **10M rows**: ~120 seconds

Performance is linear with data volume due to bulk SQL INSERT operations.

### Query Performance

Queries are optimized with proper indexing:

- **List all lots**: <100ms
- **Query by lot number**: <500ms (20K results)
- **Query by test name**: <200ms (thousands of results)

## Project Structure

```
stdata-db/
├── data/
│   ├── test_data.csv          # Generated test data
│   └── test.db                # SQLite database
├── src/
│   ├── db.ts                  # Sequelize configuration
│   ├── generator.ts           # Test data generator
│   ├── import.ts              # CSV import script
│   ├── queries.ts             # Query interface
│   └── models/
│       ├── Lot.ts             # Lot model
│       ├── Test.ts            # Test model
│       └── TestResult.ts      # TestResult model
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Available npm/pnpm Commands

```bash
# Build TypeScript to JavaScript
pnpm build

# Generate test data CSV
pnpm generate

# Import CSV into SQLite database
pnpm import              # With CRUD demo
pnpm import --no-demo  # Fast import, skip demo

# Query test data
pnpm query --list-lots
pnpm query --list-tests
pnpm query --lot <LOT_NUMBER>
pnpm query --test <TEST_NAME>
```

## Workflow Example

```bash
# 1. Start fresh
rm data/test.db data/test_data.csv

# 2. Generate new test data (modify generator.ts constants first if desired)
pnpm generate

# 3. Import into database
pnpm import --no-demo

# 4. Query the results
pnpm query --list-lots
pnpm query --lot OIGBGT3368
pnpm query --test "Some test 0001"
```

## Troubleshooting

### Port/Database Already in Use

If you see errors about the database being locked, ensure no other processes have `test.db` open and run:
```bash
pnpm import --no-demo
```

### Build Errors

Ensure TypeScript compiles:
```bash
pnpm build
```

### Missing Dependencies

Reinstall dependencies:
```bash
pnpm install
```

## License

ISC

## Author

Generated with Sequelize + SQLite + csv-parse
