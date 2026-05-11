# Browser Development Guide

## Quick Start

### Option 1: Development Mode (with HTTP server)

```bash
# From project root
pnpm install

# Build TypeScript files to JavaScript
pnpm browser:build

# Start HTTP server
pnpm browser:dev

# Open http://localhost:3000 in your browser
```

### Option 2: Production Build (bundled)

```bash
# From project root
pnpm install

# Build and bundle with esbuild
bash build-browser.sh

# Then serve using your preferred HTTP server:
# - Python 3: python3 -m http.server 3000
# - Node.js: npx http-server browser
# - nginx/Apache, etc.

# Update browser/index.html to use dist/bundle.min.js
```

## Development Workflow

### 1. Edit TypeScript Files

Files in `browser/assets/js/`:
- `browser-check.ts` - Browser capability detection
- `models.ts` - Data model definitions
- `db-init.ts` - Database initialization
- `csv-parser.ts` - CSV parsing logic
- `data-importer.ts` - CSV import to DBs
- `queries-dexie.ts` - IndexedDB queries
- `queries-drizzle.ts` - SQLite queries
- `ui-controller.ts` - UI logic and event handling
- `error-handler.ts` - Error utilities
- `main.ts` - Bundle entry point

### 2. Compile TypeScript

```bash
# Compile all TypeScript to JavaScript
pnpm browser:build

# Or use tsc directly
cd browser && npx tsc
```

### 3. Load in Browser

The HTML file uses ES modules and import maps to load Dexie.js from CDN. SQL.js is loaded dynamically on first use.

**index.html import maps:**
```html
<script type="importmap">
  {
    "imports": {
      "dexie": "https://cdn.jsdelivr.net/npm/dexie@4.4.2/+esm"
    }
  }
</script>
<script type="module" src="assets/js/ui-controller.js"></script>
```

**SQL.js WASM Loading (in db-init.ts):**
- Loads from: `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js`
- Only loads on first query execution (lazy loading)
- Uses `locateFile` callback to find WASM binary: `sql-wasm.wasm`
- Runs in-memory without persisting to filesystem

The `ui-controller.js` imports all modules and initializes the app automatically.

## Module Structure

### Files in browser/assets/js/

- **browser-check.ts** - Detects IndexedDB and WebAssembly support
- **models.ts** - TypeScript interfaces and Dexie database schema
- **db-init.ts** - Initializes Dexie (IndexedDB) and lazy-loads SQL.js (WASM SQLite)
- **csv-parser.ts** - Parses CSV files with field deduplication
- **data-importer.ts** - Imports data to both IndexedDB and SQLite in parallel
- **queries-dexie.ts** - Queries IndexedDB via Dexie ORM methods
- **queries-drizzle.ts** - Queries SQLite via SQL.js prepared statements (note: filename historical, uses SQL.js not Drizzle ORM)
- **ui-controller.ts** - Handles all UI interactions and DOM updates
- **error-handler.ts** - Centralized error handling utilities
- **main.ts** - Bundle entry point

### Database Technologies

- **IndexedDB**: Accessed via Dexie.js v4.4.2 ORM (loaded from CDN)
- **SQLite**: Accessed via SQL.js (WASM binary from jsDelivr CDN)
  - Lazy-loaded on first query to reduce initial page load
  - Uses prepared statements for data insertion and querying
  - Configured with `locateFile` to find WASM binary on CDN

### Dependency Graph

```
ui-controller.ts
├── browser-check.ts (browser capability detection)
├── csv-parser.ts (CSV parsing logic)
├── data-importer.ts (parallel import to both DBs)
│   ├── db-init.ts (Dexie + SQL.js initialization)
│   └── models.ts (data types)
├── queries-dexie.ts (IndexedDB queries)
│   ├── db-init.ts
│   └── models.ts
├── queries-drizzle.ts (SQLite queries via SQL.js)
│   ├── db-init.ts
│   └── models.ts
└── error-handler.ts (error utilities)
```

### Query Functions

**Dexie (IndexedDB):**
- `queryByLotDexie(lotNumber)` - Returns all tests for a lot
- `queryByTestDexie(testName)` - Returns all lots for a test
- `getLotsWithTestsDexie()` - Returns list of all lots with first/last test names
- `getRecordCountsDexie()` - Returns counts of all records

**SQL.js (WASM SQLite):**
- `queryByLotDrizzle(lotNumber)` - Returns all tests for a lot (via SQL.js)
- `queryByTestDrizzle(testName)` - Returns all lots for a test (via SQL.js)
- `getLotsWithTestsDrizzle()` - Returns list of all lots with first/last test names
- `getRecordCountsDrizzle()` - Returns counts of all records

**UI Functions:**
- `displayAvailableData()` - Fetches and displays available lots in UI

## Debugging

### Browser Console

1. Open DevTools: `F12` or `Cmd+Option+I`
2. Go to Console tab
3. Check for errors and warnings
4. Type `window.initSqlJs` to verify SQL.js loaded successfully

### IndexedDB Inspection

1. DevTools → Application tab
2. Sidebar → IndexedDB → TestDataDB
3. View Lots, Tests, TestResults stores
4. Verify row counts match import results

### SQLite WASM Inspection

1. DevTools → Console
2. Access the database: `getSqliteDB()` (if exported globally in db-init.ts)
3. Check WASM memory usage: DevTools → Performance → Memory

### Module Loading

Check Network tab to see:
- CSS loading: `assets/css/style.css`
- JavaScript modules: All files in `assets/js/*.js`
- CDN resources: `dexie@4.4.2` from cdn.jsdelivr.net
- SQL.js files: `sql-wasm.js` and `sql-wasm.wasm` (lazy-loaded)

### Available Data Display

If available data list doesn't populate:
1. Check console for errors in `displayAvailableData()`
2. Verify data was actually imported (check IndexedDB in DevTools)
3. Check both `getLotsWithTestsDexie()` and `getLotsWithTestsDrizzle()` return data

### Performance Profiling

1. DevTools → Performance tab
2. Click record, perform import/query
3. Click stop and analyze timeline
4. Note lazy WASM load spike on first SQLite query

## Building for Production

### Development Dependencies

Key dependencies that should remain external (CDN):
- **dexie@4.4.2** - IndexedDB ORM (from cdn.jsdelivr.net)
- **sql.js** - WASM SQLite (from cdn.jsdelivr.net, lazy-loaded)

### Single Bundle File with CDN

```bash
# Build minified bundle, externalize dexie
npx esbuild browser/assets/js/ui-controller.ts \
  --bundle \
  --platform=browser \
  --format=esm \
  --outfile=browser/dist/app.js \
  --external:dexie \
  --minify \
  --sourcemap
```

Then update `index.html` to use bundled code:

```html
<!-- Keep Dexie from CDN -->
<script type="importmap">
  {
    "imports": {
      "dexie": "https://cdn.jsdelivr.net/npm/dexie@4.4.2/+esm"
    }
  }
</script>
<!-- Load bundled app -->
<script type="module" src="dist/app.js"></script>
```

**Note**: SQL.js will still load dynamically from CDN on first query via the `locateFile` callback in db-init.ts

### Full Self-Contained Bundle (not recommended)

Including SQL.js in the bundle significantly increases bundle size. Current approach (lazy-loading SQL.js from CDN) is recommended for performance.

## TypeScript Configuration

File: `browser/tsconfig.json`

Key settings:
- **target**: ES2023 (modern browser features)
- **module**: ES2022 (ES modules)
- **lib**: ES2023, DOM, DOM.Iterable
- **strict**: true (strict type checking)
- **moduleResolution**: bundler (for npm packages)

## Adding New Modules

1. Create `.ts` file in `browser/assets/js/`
2. Add types and exports
3. Import in `ui-controller.ts` or `main.ts`
4. Compile: `pnpm browser:build`
5. Refresh browser (hard refresh if needed: `Cmd+Shift+R`)

## Troubleshooting

### Module not found errors

```
Error: Failed to resolve module specifier "dexie"
```

**Solution**: Ensure import maps are loaded before scripts in HTML. Dexie import map should be present in `<head>`.

### SQL.js WASM fails to load

Error message: `Failed to initialize WASM SQLite: Error: both async and sync fetching of the wasm failed`

**Causes & Solutions**:
1. **Network Issue**: Check internet connection, WASM is loaded from CDN on first query
2. **CDN Unavailable**: Verify `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/` is accessible
3. **CORS Issue**: If self-hosting, ensure proper CORS headers for CDN
4. **locateFile Path**: Check db-init.ts has correct URL: `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${fileName}`

**Debug Steps**:
- Open DevTools Console and check errors
- Check Network tab for failed CDN requests
- Try refreshing the page
- Clear browser cache (Cmd+Shift+Delete)

### TypeScript compile errors

```bash
# Check for errors without compiling
cd browser && npx tsc --noEmit

# Fix errors, then compile
pnpm browser:build
```

### CSS not loading

- Verify CSS file path: `assets/css/style.css`
- Check Network tab for 404 errors
- Hard refresh browser cache (Cmd+Shift+R)

### Available data list not displaying

Possible causes:
1. No data imported yet - import a CSV first
2. Import failed - check import results table
3. `getLotsWithTestsDexie()` or `getLotsWithTestsDrizzle()` error - check console
4. IndexedDB/SQLite not initialized - check browser capabilities

**Debug**:
- Open DevTools Console
- Check for JavaScript errors
- Verify IndexedDB has data: Application tab → IndexedDB → TestDataDB

## Performance Tips

1. **Lazy load WASM**: SQLite WASM only loads on first query
2. **Tree-shaking**: When bundled, only used code is included
3. **Minification**: Use `--minify` flag with esbuild for production
4. **Sourcemaps**: Keep `--sourcemap` in development for debugging

## Testing

### Manual Testing Checklist

- [ ] Open HTML in browser
- [ ] Check browser status shows supported features (IndexedDB ✓, WASM ✓)
- [ ] Available data list is empty initially
- [ ] Select CSV file and import
- [ ] Verify import results show counts for both databases
- [ ] Available data list populates with lot numbers and test ranges
- [ ] Click a lot in available data list - it pre-fills the query input
- [ ] Query by lot number
- [ ] Query by test name
- [ ] Check query times displayed and visible comparison
- [ ] Verify results match between IndexedDB and SQLite
- [ ] Clear data and verify both databases cleared
- [ ] Available data list becomes empty after clear
- [ ] Reload page and verify data persists in IndexedDB

### Test CSV File

Create `test_data.csv` for testing:

```csv
lot number,test name,temperature,units,value,min limit,max limit
LOT001,TEST_A,-40,A,1.5,1.0,2.0
LOT001,TEST_A,25,A,1.6,1.0,2.0
LOT001,TEST_B,-40,V,5.0,4.5,5.5
LOT002,TEST_A,-40,A,1.4,1.0,2.0
LOT002,TEST_B,-40,V,5.2,4.5,5.5
LOT003,TEST_C,85,A,1.7,1.5,2.5
```

### Expected Results

- Import: Both IndexedDB and SQLite should show 6 rows inserted (2-3 seconds typical)
- Available Data: Should show 3 lots (LOT001, LOT002, LOT003)
- LOT001 should show: "TEST_A → TEST_B (2)"
- Query LOT001: Should return all 3 results from both databases
- Query TEST_A: Should return 3 results across LOT001 and LOT002

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank page | Module load error or missing dependencies | Check console (F12) for errors, verify import maps present, clear cache |
| "Cannot find module X" | Missing dependency in import maps | Ensure dexie import map is present in HTML |
| SQL.js WASM fails | Network/CDN issue or WASM not supported | Check internet connection, verify CDN URL, try different browser |
| Data not persisting in IndexedDB | IndexedDB disabled in browser | Check browser privacy settings, enable IndexedDB |
| Data not importing to SQLite | WebAssembly not supported or WASM load failed | Use modern browser (Chrome, Firefox, Safari, Edge), check console |
| Available data list empty | No data imported or import failed | Import CSV first, check import results show data |
| Available data shows but no test names | Query function error | Check console, verify both databases have data |
| Query returns no results | Lot/test name typo or case mismatch | Names are case-sensitive, use available data list to select |
| Slow first query | WASM bundle loading | Expected on first SQLite query, subsequent queries are fast |
| Import takes too long | Large CSV file being processed | Use smaller test CSV, consider pagination in future |

## Adding New Features

### To Add a New Query Function

1. **Add to queries-dexie.ts** (for IndexedDB):
```typescript
export async function getYourDataDexie(param: string): Promise<QueryExecutionResult<YourType>> {
  const startTime = performance.now();
  // Query logic here
  return { data: result, duration: performance.now() - startTime };
}
```

2. **Add to queries-drizzle.ts** (for SQLite):
```typescript
export async function getYourDataDrizzle(param: string): Promise<QueryExecutionResult<YourType>> {
  const startTime = performance.now();
  // SQL.js prepared statement logic here
  return { data: result, duration: performance.now() - startTime };
}
```

3. **Update ui-controller.ts**:
   - Add import for new functions
   - Add new query type to dropdown if needed
   - Call both functions in parallel and compare results

4. **Compile and test**: `pnpm browser:build`

### To Modify WASM Configuration

Edit `browser/assets/js/db-init.ts` in the `initWasmSqlite()` function. Current configuration:
- CDN: jsDelivr (`https://cdn.jsdelivr.net/npm/sql.js@1.8.0/`)
- Version: 1.8.0
- Locator: `locateFile` callback finds WASM binary

### To Add UI Components

1. Add HTML to `index.html` in appropriate `<section>`
2. Add styles to `browser/assets/css/style.css`
3. Add event handlers in `ui-controller.ts`
4. Access DOM elements via `document.getElementById()` or similar

## Future Enhancement Ideas

- [ ] Export query results to CSV
- [ ] Add data visualization/charts
- [ ] Add pagination for large datasets
- [ ] Add custom SQL query editor for SQLite
- [ ] Add more predefined query templates
- [ ] Add performance benchmarking UI with charts
- [ ] Add data refresh/sync between databases
- [ ] Add database statistics and schema viewer
- [ ] Add bulk update operations
- [ ] Add data filtering and sorting options
