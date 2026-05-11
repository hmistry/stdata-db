# stdata-db

A high-performance TypeScript tool for generating test data, importing CSV files into SQLite databases, and querying test results. It tests 3 different db implementations - local SQLite DB, browser IndexedDB, and browser WASM SQLite DB.

## Overview

This project provides two independent testing schemes:

1. **Local SQLite Testing** - Command-line tool for bulk importing CSV data and querying via CLI
2. **Browser-Based Dual Database Testing** - GUI tool comparing IndexedDB vs WASM SQLite performance

Both schemes use the same CSV data format and normalized database schema.

## Setup

### Prerequisites

- Node.js (v18 or later)
- pnpm (v11.0.9 or later)

### Installation

```bash
# Clone and setup
cd /path/to/stdata-db
pnpm install
pnpm build
```

## Local SQLite Testing

Command-line tool for generating, importing, and querying test data in SQLite.

### Quick Start

```bash
# 1. Generate test data CSV
pnpm generate

# 2. Import into SQLite database
pnpm import

# 3. Query the results
pnpm query --list-lots
```

### Commands

```bash
# Generate test data
pnpm generate

# Import CSV into database (includes CRUD demo)
pnpm import

# Import CSV without demo (faster)
pnpm import --no-demo

# Query operations
pnpm query --list-lots              # List all lot numbers
pnpm query --list-tests             # List all tests
pnpm query --lot OIGBGT3368         # Query tests for a specific lot
pnpm query --test "Some test 0001"  # Query lots for a specific test
```

### Query Examples

Query by lot number to see all tests and results:
```bash
pnpm query --lot OIGBGT3368
```

Query by test name to see all lots tested:
```bash
pnpm query --test "ResistanceTest"
```

## Browser-Based Dual Database Testing

GUI tool for comparing IndexedDB (Dexie.js) vs WASM SQLite (SQL.js) performance side-by-side.

### Quick Start

```bash
# 1. Generate test data (if not already done)
pnpm generate

# 2. Build TypeScript files
pnpm browser:build

# 3. Start development server
pnpm browser:dev

# 4. Open http://localhost:3000 in your browser
```

### Features

- **Dual Database**: Import to both IndexedDB and SQLite simultaneously
- **Performance Metrics**: Side-by-side timing comparison
- **Available Data List**: View all lots with test ranges, click to select
- **Query Results**: See identical results from both databases
- **Browser Support**: Automatic detection of IndexedDB and WebAssembly
- **Lazy WASM Loading**: SQLite WASM loads only on first query

### Usage

1. **Import CSV**: Click "Import CSV" button, select your file
   - Supported format: `lot number,test name,temperature,units,value,min limit,max limit`
   - Data loads to both databases in parallel
2. **View Data**: Check "📋 Available Data" section - shows all lots with test ranges
3. **Query Data**: 
   - Enter lot number or click from available list
   - Select query mode (by lot or by test)
   - Compare side-by-side results
4. **Clear Data**: Reset both databases with one click

### Browser Requirements

- Chrome, Firefox, Safari, Edge (recent versions)
- IndexedDB, WebAssembly, ES2022 JavaScript
- ~50MB storage for test data
- Internet connection (CDN assets cached after first load)

## Common Reference

### CSV Format

All testing schemes use this CSV structure:

| Column | Type | Description |
|--------|------|-------------|
| lot number | string | Batch identifier (e.g., ZGNATA5556) |
| test name | string | Test name (e.g., ResistanceTest) |
| temperature | number | Temperature in °C |
| units | string | Unit: A (Amperes) or V (Volts) |
| value | number | Measured value |
| min limit | number | Lower spec limit |
| max limit | number | Upper spec limit |

Example CSV:
```csv
lot number,test name,temperature,units,value,min limit,max limit
ZGNATA5556,ResistanceTest,25,A,4.5,3.0,6.0
ZGNATA5556,VoltageTest,25,V,12.0,10.0,15.0
ZGNATA5557,ResistanceTest,30,A,4.2,3.0,6.0
```

### Database Schema

All implementations use this normalized three-table schema:

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

### Customizing Test Data Generation

Edit constants in `src/generator.ts`:

```typescript
const NUM_LOTS = 100;                    // Number of lots
const NUM_TESTS = 1000;                  // Number of tests
const TEMPERATURES = [-40, 0, 25, 70, 85];  // Temperature points
const MIN_VALUE_RANGE = -100.0;
const MAX_VALUE_RANGE = 100.0;
```

Then regenerate:
```bash
pnpm generate
```

## Performance

### Local SQLite Import Speed

- **500K rows**: ~6 seconds
- **1M rows**: ~12 seconds
- **10M rows**: ~120 seconds

### Local SQLite Query Speed

- **List all lots**: <100ms
- **Query by lot**: <500ms (20K results)
- **Query by test**: <200ms

### Browser Database Performance

Browser performance varies based on database size. Use the browser tool to compare:
- IndexedDB (browser storage)
- WASM SQLite (in-memory via Wasm)

## Project Structure

```
stdata-db/
├── src/                           # Node.js source (TypeScript)
│   ├── db.ts                      # Database configuration
│   ├── generator.ts               # Test data generator
│   ├── import.ts                  # CSV import CLI
│   ├── queries.ts                 # Query CLI
│   └── models/
│       ├── Lot.ts
│       ├── Test.ts
│       └── TestResult.ts
├── browser/                       # Browser-based GUI tool
│   ├── index.html                 # Main page
│   ├── server.js                  # Dev HTTP server
│   ├── assets/
│   │   ├── js/                    # Compiled TypeScript → JavaScript
│   │   ├── css/style.css          # Styling
│   │   └── ts/                    # TypeScript source
│   │       ├── ui-controller.ts
│   │       ├── db-init.ts
│   │       ├── models.ts
│   │       ├── queries-dexie.ts
│   │       ├── queries-drizzle.ts (SQL.js)
│   │       ├── csv-parser.ts
│   │       ├── data-importer.ts
│   │       ├── error-handler.ts
│   │       └── browser-check.ts
│   ├── README.md                  # Browser tool documentation
│   ├── DEVELOPMENT.md             # Development guide
│   └── tsconfig.json
├── data/
│   ├── test_data.csv              # Generated CSV (if exists)
│   └── test.db                    # SQLite database (if exists)
├── dist/                          # Compiled JavaScript (local)
├── package.json
├── tsconfig.json
└── README.md
```

## Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm build` | Compile TypeScript (src/ → dist/) |
| `pnpm generate` | Create test_data.csv |
| `pnpm import` | Import CSV to SQLite with demo |
| `pnpm import --no-demo` | Import without demo |
| `pnpm query --list-lots` | List all lot numbers |
| `pnpm query --list-tests` | List all tests |
| `pnpm query --lot <LOT>` | Query by lot number |
| `pnpm query --test <TEST>` | Query by test name |
| `pnpm browser:build` | Compile browser TypeScript |
| `pnpm browser:dev` | Start browser dev server (http://localhost:3000) |
| `pnpm browser:bundle` | Create production bundle |

## Troubleshooting

### Local SQLite Issues

**Database Already in Use**
```bash
# Kill any processes with test.db open
pnpm import --no-demo
```

**Build Errors**
```bash
# Recompile
pnpm build
```

**Missing Dependencies**
```bash
# Reinstall
pnpm install
```

### Browser Tool Issues

**WASM SQLite Failed to Initialize**
- Check internet connection (loads from CDN on first use)
- Refresh browser page
- Check browser console (F12) for errors

**No Data in Available Data List**
- Verify import completed (check Import Results)
- Try Clear → Re-import

**Queries Return No Results**
- Verify data exists in available list
- Check spelling (case-sensitive)
- Try a different lot/test from available list

**Port 3000 Already in Use**
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

## Additional Resources

For detailed browser tool documentation, see [browser/README.md](browser/README.md)

For development guide and architecture details, see [browser/DEVELOPMENT.md](browser/DEVELOPMENT.md)

## License

MIT License - Hiren Mistry

## Author

Hiren Mistry and Copilot.
