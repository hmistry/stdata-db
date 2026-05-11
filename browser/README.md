# Browser Test Data Comparison Tool

A dual-database comparison tool for testing IndexedDB (Dexie.js) and WASM SQLite (SQL.js) performance with CSV test data.

## Features

- 🔍 **Browser Support Detection**: Automatically checks for IndexedDB and WebAssembly support
- 📋 **Available Data List**: View all imported lot numbers with their test ranges (clickable for quick selection)
- 📤 **CSV Import**: Load test data into both databases simultaneously with performance timing
- ⚡ **Performance Metrics**: Track import and query execution times with detailed comparisons
- 📊 **Side-by-Side Results**: Compare query results from both databases to verify consistency
- 🔄 **Lazy WASM Loading**: SQLite WASM bundle only loads on first query (reduces initial page load)
- ✨ **Responsive UI**: Works on desktop and mobile browsers

## Prerequisites

- Node.js 18+
- pnpm

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build TypeScript

```bash
# Build TypeScript files
pnpm browser:build

# Or build and bundle into a single file
pnpm browser:bundle
```

### 3. Run Development Server

```bash
pnpm browser:dev
```

Then open `http://localhost:3000` in your browser.

## Usage

### 1. Import CSV Data

1. Click **"Choose File"** to select a CSV file with test data
2. The CSV should have columns: `lot number,test name,temperature,units,value,min limit,max limit`
3. Click **"Import CSV"** button
4. View import times for both databases in the results table

### 2. View Available Data

After importing, the **"Available Data"** section displays:
- All imported lot numbers
- First and last test names for each lot (alphabetically sorted)
- Number of tests per lot
- **Click any lot** to automatically populate it in the query input

### 3. Query Data

1. Select query type: **"Query by Lot Number"** or **"Query by Test Name"**
2. Enter a lot number (e.g., `ZGNATA5556`) or test name, or click from available data list
3. Click **"Execute Query"** (or press Enter)
4. View side-by-side results with query execution times

### 4. Performance Comparison

- Import times are displayed after CSV import
- Query times are shown for each database result
- Performance metrics section shows % improvement indicating which database is faster
- Pass/Fail indicators show value compared to min/max limits

### 5. Clear Data

Click **"Clear All Data"** to reset both databases (confirmation required)

## CSV Format

Expected CSV format (with or without header):

```
lot number,test name,temperature,units,value,min limit,max limit
ZGNATA5556,Some test 0001,-40,A,-72.7,-80.7,-11.6
ZGNATA5556,Some test 0001,0,A,-12.1,-80.7,-11.6
ZGNATA5556,Some test 0002,-40,V,5.2,2.0,8.0
```

- **lot number**: String identifier for the component batch
- **test name**: String identifier for the test
- **temperature**: Number (temperature in Celsius)
- **units**: `A` (Amperes) or `V` (Volts)
- **value**: Number (measured value)
- **min limit**: Number (minimum pass threshold)
- **max limit**: Number (maximum pass threshold)

## Architecture

### TypeScript Modules

- **browser-check.ts**: Detects IndexedDB and WebAssembly support
- **models.ts**: TypeScript interfaces and Dexie database schema
- **db-init.ts**: Initializes Dexie (IndexedDB) and lazy-loads SQL.js (WASM SQLite)
- **csv-parser.ts**: Parses CSV files with field deduplication
- **data-importer.ts**: Imports data to both IndexedDB and SQLite in parallel with timing
- **queries-dexie.ts**: Queries IndexedDB using Dexie ORM methods
- **queries-drizzle.ts**: Queries SQLite using SQL.js prepared statements (historical name, actual implementation uses SQL.js)
- **ui-controller.ts**: Handles all UI interactions, event listeners, and DOM updates
- **error-handler.ts**: Centralized error handling and validation utilities

### Build Targets

- **TypeScript Target**: ES2023
- **Module Format**: ES2022
- **Bundling**: esbuild (optional, for production)

## Performance Notes

- **IndexedDB (Dexie.js)**: Object store access with indexes; good for normalized data
- **WASM SQLite (SQL.js)**: Traditional SQL queries with JOIN support; runs entirely in memory
- **Lazy Loading**: SQLite WASM bundle (~1-2MB) loads only on first query, reducing initial page load time
- **Deduplication**: CSV data is deduplicated in memory before import to both databases
- **Parallel Import**: Both databases are populated simultaneously for fair comparison

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| WebAssembly | ✅ | ✅ | ✅ | ✅ |
| ES2023 | ✅ | ✅ | ⚠️ | ✅ |

⚠️ Safari may require updates to support all ES2023 features

## Development

### Quick Development Workflow

```bash
# 1. Build TypeScript to JavaScript
pnpm browser:build

# 2. Start development server
pnpm browser:dev

# 3. Open http://localhost:3000 in your browser
# Server runs on Node.js (no need for Python or manual setup)
```

### Available Scripts

From project root (all commands are defined in `package.json`):

```bash
# Build: Compile TypeScript files to JavaScript
pnpm browser:build

# Dev: Start Node.js HTTP server and watch for changes
pnpm browser:dev

# Bundle: Create production-ready bundle with esbuild
pnpm browser:bundle
```

### Manual Development (if needed)

If you want to run commands manually outside pnpm scripts:

```bash
# Compile TypeScript manually
cd browser && npx tsc

# Bundle with esbuild manually
npx esbuild browser/assets/js/ui-controller.ts \
  --bundle \
  --platform=browser \
  --format=esm \
  --outfile=browser/dist/app.js \
  --minify
```

## Files Structure

```
browser/
├── index.html              # Main HTML file
├── tsconfig.json           # TypeScript configuration (ES2023)
├── assets/
│   ├── js/                 # TypeScript source files
│   │   ├── browser-check.ts
│   │   ├── models.ts
│   │   ├── db-init.ts
│   │   ├── csv-parser.ts
│   │   ├── data-importer.ts
│   │   ├── queries-dexie.ts
│   │   ├── queries-drizzle.ts
│   │   ├── ui-controller.ts
│   │   └── error-handler.ts
│   └── css/
│       └── style.css       # Main stylesheet
└── dist/                   # Compiled output (after build)
```

## Limitations & Notes

- **SQLite In-Memory**: WASM SQLite runs entirely in memory; data is lost on page refresh (use IndexedDB for persistence)
- **Browser Storage**: IndexedDB has per-origin quota (~50MB+), SQLite is in-memory only
- **Data Persistence**: Only IndexedDB persists data across browser sessions automatically
- **Query Types**: Currently supports predefined queries: queryByLot, queryByTest, getLotsWithTests
- **Large Datasets**: Both databases should handle millions of rows, but WASM performance degrades with very large in-memory SQLite
- **Network Requirement**: SQLite WASM loads from CDN on first use (requires internet connection)

## Future Enhancements

- [ ] SQL query editor for custom queries
- [ ] Data export (JSON, CSV)
- [ ] Import history/versioning
- [ ] Pagination for large result sets
- [ ] Custom performance benchmarking
- [ ] Real-time data sync from backend
- [ ] Multi-database support (more DB engines)

## Troubleshooting

### WASM SQLite fails to load
- **Error**: "Failed to initialize WASM SQLite: both async and sync fetching of the wasm failed"
- **Solutions**:
  - Check internet connection (WASM loads from CDN)
  - Clear browser cache and reload
  - Try a different browser (Chrome/Firefox recommended)
  - Check DevTools Console for detailed error messages

### IndexedDB errors
- Check browser DevTools → Application tab → IndexedDB → TestDataDB
- Verify sufficient disk space available
- Try clearing IndexedDB in browser settings (Privacy/Data)

### CSV import fails
- Verify CSV format matches expected columns exactly
- Check for encoding issues (use UTF-8)
- Look for malformed rows in console (F12)
- Ensure CSV headers are present

### Available data list doesn't populate
- Verify data was successfully imported (check Import Results table)
- Check both databases show data inserted
- Try clearing and re-importing
- Open console (F12) to check for JavaScript errors

### Query returns no results
- Lot/test names are case-sensitive
- Use the Available Data list to select a lot (ensures correct spelling)
- Verify data was imported successfully

## License

MIT License - Hiren Mistry

