// UI Controller - handles user interactions and DOM updates

import { getBrowserCapabilities, canProceedWithImport } from './browser-check.js';
import { parseCSV, processCSVRows } from './csv-parser.js';
import { importDataToBothDatabases } from './data-importer.js';
import { queryByLotDexie, queryByTestDexie, getLotsWithTestsDexie } from './queries-dexie.js';
import { queryByLotDrizzle, queryByTestDrizzle, getLotsWithTestsDrizzle } from './queries-drizzle.js';
import { clearAllDatabases } from './db-init.js';
import { handleError, showError, clearError } from './error-handler.js';

export class UIController {
  private capabilities: any;

  async initialize(): Promise<void> {
    // Check browser capabilities
    this.capabilities = await getBrowserCapabilities();
    this.updateBrowserStatus();

    // Attach event listeners
    this.attachEventListeners();

    // Load and display available data
    await this.displayAvailableData();
  }

  private updateBrowserStatus(): void {
    const statusEl = document.getElementById('browser-status');
    if (statusEl) {
      const canImport = canProceedWithImport(this.capabilities);
      statusEl.innerHTML = `
        <div class="status-badge ${canImport ? 'status-success' : 'status-warning'}">
          ${this.capabilities.message}
        </div>
      `;

      // Disable import button if not supported
      const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
      if (importBtn) {
        importBtn.disabled = !canImport;
      }
    }
  }

  private attachEventListeners(): void {
    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    const importBtn = document.getElementById('import-btn');
    const clearBtn = document.getElementById('clear-btn');
    const queryTypeSelect = document.getElementById('query-type');
    const queryInputs = document.getElementById('query-inputs-container');
    const executeQueryBtn = document.getElementById('execute-query-btn');

    if (importBtn) {
      importBtn.addEventListener('click', () => this.handleImport(fileInput));
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClear());
    }

    if (queryTypeSelect) {
      queryTypeSelect.addEventListener('change', (e) => this.updateQueryInputs(e.target as HTMLSelectElement));
    }

    if (executeQueryBtn) {
      executeQueryBtn.addEventListener('click', () => this.handleExecuteQuery());
    }

    // Also listen for Enter key in query input
    const queryInput = document.getElementById('query-input');
    if (queryInput) {
      queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleExecuteQuery();
        }
      });
    }
  }

  private async handleImport(fileInput: HTMLInputElement): Promise<void> {
    clearError();

    const file = fileInput.files?.[0];
    if (!file) {
      showError('Please select a CSV file');
      return;
    }

    try {
      // Read file
      const fileContent = await file.text();

      // Parse CSV
      const csvRows = parseCSV(fileContent);
      if (csvRows.length === 0) {
        showError('No valid data found in CSV file');
        return;
      }

      // Process and deduplicate
      const importData = processCSVRows(csvRows);

      // Show loading state
      const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
      const originalText = importBtn.textContent;
      importBtn.disabled = true;
      importBtn.textContent = 'Importing...';

      // Import to both DBs
      const results = await importDataToBothDatabases(importData);

      // Update results table
      this.updateImportResultsTable(results.indexeddb, results.sqlite);

      // Update performance section
      this.updatePerformanceMetrics('import', {
        indexeddb: results.indexeddb.duration,
        sqlite: results.sqlite.duration,
      });

      // Reset button
      importBtn.disabled = false;
      importBtn.textContent = originalText;

      // Reset file input
      fileInput.value = '';

      // Update available data list
      await this.displayAvailableData();

      // Show success
      showError('Data imported successfully!', 'INFO');
      setTimeout(() => clearError(), 3000);
    } catch (error) {
      const { message } = handleError(error, 'Import');
      showError(message);
    }
  }

  private async handleClear(): Promise<void> {
    if (!confirm('Are you sure you want to clear all data from both databases?')) {
      return;
    }

    try {
      await clearAllDatabases();
      clearError();
      showError('Databases cleared successfully', 'INFO');
      setTimeout(() => clearError(), 2000);

      // Clear UI
      document.getElementById('import-results-table')!.innerHTML = '';
      document.getElementById('query-results')!.innerHTML = '';
      document.getElementById('performance-metrics')!.innerHTML = '';

      // Update available data list
      await this.displayAvailableData();
    } catch (error) {
      const { message } = handleError(error, 'Clear');
      showError(message);
    }
  }

  private updateQueryInputs(select: HTMLSelectElement): void {
    const queryType = select.value;
    const container = document.getElementById('query-inputs-container') as HTMLDivElement;

    let label = '';
    if (queryType === 'by-lot') {
      label = 'Enter Lot Number:';
    } else if (queryType === 'by-test') {
      label = 'Enter Test Name:';
    }

    container.innerHTML = `
      <label for="query-input">${label}</label>
      <input type="text" id="query-input" placeholder="e.g., ZGNATA5556" />
    `;

    // Re-attach enter key listener
    const queryInput = document.getElementById('query-input');
    if (queryInput) {
      queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleExecuteQuery();
        }
      });
      queryInput.focus();
    }
  }

  private async handleExecuteQuery(): Promise<void> {
    clearError();

    const queryTypeSelect = document.getElementById('query-type') as HTMLSelectElement;
    const queryInput = document.getElementById('query-input') as HTMLInputElement;
    const queryType = queryTypeSelect.value;
    const queryValue = queryInput.value.trim();

    if (!queryValue) {
      showError('Please enter a query parameter');
      return;
    }

    try {
      const btn = document.getElementById('execute-query-btn') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Executing...';

      let dexieResult, drizzleResult;

      if (queryType === 'by-lot') {
        [dexieResult, drizzleResult] = await Promise.all([
          queryByLotDexie(queryValue),
          queryByLotDrizzle(queryValue),
        ]);
      } else if (queryType === 'by-test') {
        [dexieResult, drizzleResult] = await Promise.all([
          queryByTestDexie(queryValue),
          queryByTestDrizzle(queryValue),
        ]);
      } else {
        throw new Error('Invalid query type');
      }

      // Display results
      this.displayQueryResults(dexieResult, drizzleResult, queryType);

      // Update performance metrics
      this.updatePerformanceMetrics('query', {
        indexeddb: dexieResult.duration,
        sqlite: drizzleResult.duration,
      });

      btn.disabled = false;
      btn.textContent = originalText;
    } catch (error) {
      const { message } = handleError(error, 'Query');
      showError(message);
    }
  }

  private displayQueryResults(dexieResult: any, drizzleResult: any, queryType: string): void {
    const resultsContainer = document.getElementById('query-results') as HTMLDivElement;

    let dexieHTML = this.formatQueryResultsHTML(dexieResult, queryType);
    let drizzleHTML = this.formatQueryResultsHTML(drizzleResult, queryType);

    resultsContainer.innerHTML = `
      <div class="results-grid">
        <div class="results-column">
          <h3>IndexedDB (Dexie) Results</h3>
          <div class="timing">Query Time: ${dexieResult.duration.toFixed(2)}ms</div>
          ${dexieHTML}
        </div>
        <div class="results-column">
          <h3>SQLite (Drizzle) Results</h3>
          <div class="timing">Query Time: ${drizzleResult.duration.toFixed(2)}ms</div>
          ${drizzleHTML}
        </div>
      </div>
    `;
  }

  private formatQueryResultsHTML(result: any, queryType: string): string {
    if (!result.data) {
      return '<div class="no-results">No results found</div>';
    }

    let html = '';

    if (queryType === 'by-lot') {
      const { lot, tests } = result.data;
      html += `<div class="result-item"><strong>Lot:</strong> ${lot.lotNumber}</div>`;

      for (const group of tests) {
        html += `
          <div class="test-group">
            <strong>${group.test.testName}</strong> (${group.test.units})
            <div class="test-limits">Min: ${group.test.minLimit}, Max: ${group.test.maxLimit}</div>
            <table class="results-table">
              <thead><tr><th>Temperature</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                ${group.results
                  .map(
                    (r: any) => `
                  <tr>
                    <td>${r.temperature}°C</td>
                    <td>${r.value}</td>
                    <td class="status ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } else if (queryType === 'by-test') {
      const { test, lots } = result.data;
      html += `<div class="result-item"><strong>Test:</strong> ${test.testName} (${test.units})</div>`;
      html += `<div class="test-limits">Min: ${test.minLimit}, Max: ${test.maxLimit}</div>`;

      for (const group of lots) {
        html += `
          <div class="test-group">
            <strong>Lot:</strong> ${group.lot.lotNumber}
            <table class="results-table">
              <thead><tr><th>Temperature</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                ${group.results
                  .map(
                    (r: any) => `
                  <tr>
                    <td>${r.temperature}°C</td>
                    <td>${r.value}</td>
                    <td class="status ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    return html;
  }

  private updateImportResultsTable(dexieResult: any, sqliteResult: any): void {
    const table = document.getElementById('import-results-table') as HTMLTableElement;

    const getErrorMsg = (result: any) => (result.error ? ` - ${result.error}` : '');

    table.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Database</th>
            <th>Lots</th>
            <th>Tests</th>
            <th>Test Results</th>
            <th>Total</th>
            <th>Duration (ms)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>IndexedDB</td>
            <td>${dexieResult.lotsInserted}</td>
            <td>${dexieResult.testsInserted}</td>
            <td>${dexieResult.testResultsInserted}</td>
            <td>${dexieResult.totalInserted}</td>
            <td>${dexieResult.duration.toFixed(2)}</td>
          </tr>
          <tr>
            <td>SQLite${getErrorMsg(sqliteResult)}</td>
            <td>${sqliteResult.lotsInserted}</td>
            <td>${sqliteResult.testsInserted}</td>
            <td>${sqliteResult.testResultsInserted}</td>
            <td>${sqliteResult.totalInserted}</td>
            <td>${sqliteResult.duration.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  private updatePerformanceMetrics(operation: 'import' | 'query', timings: any): void {
    const metricsContainer = document.getElementById('performance-metrics') as HTMLDivElement;

    const improvementPct = ((timings.sqlite - timings.indexeddb) / timings.sqlite) * 100;
    const improvement = improvementPct.toFixed(1);
    const faster = timings.indexeddb < timings.sqlite ? 'IndexedDB' : 'SQLite';
    const improvementText = timings.indexeddb !== timings.sqlite ? `${faster} is ${Math.abs(improvementPct).toFixed(1)}% faster` : 'Similar performance';

    metricsContainer.innerHTML += `
      <div class="metric-item">
        <strong>${operation === 'import' ? 'Import' : 'Query'} Performance:</strong>
        <div>IndexedDB: ${timings.indexeddb.toFixed(2)}ms | SQLite: ${timings.sqlite.toFixed(2)}ms</div>
        <div class="improvement">${improvementText}</div>
      </div>
    `;
  }

  private async displayAvailableData(): Promise<void> {
    const container = document.getElementById('available-data-list') as HTMLDivElement;

    if (!container) {
      return;
    }

    try {
      // Get data from both databases
      const [dexieData, sqliteData] = await Promise.all([
        getLotsWithTestsDexie(),
        getLotsWithTestsDrizzle(),
      ]);

      // Use Dexie data as primary (or fallback to SQLite if needed)
      const lotsData = dexieData.length > 0 ? dexieData : sqliteData;

      if (lotsData.length === 0) {
        container.innerHTML = '<p style="color: #999;">No data imported yet</p>';
        return;
      }

      // Build HTML for lot list
      let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
      for (const lot of lotsData) {
        const testInfo = lot.testCount > 0 
          ? `${lot.firstTestName}${lot.firstTestName !== lot.lastTestName ? ` → ${lot.lastTestName}` : ''} (${lot.testCount})`
          : 'No tests';
        
        html += `
          <li style="padding: 8px; margin: 5px 0; background-color: white; border-left: 3px solid #4CAF50; cursor: pointer;" 
              onclick="document.getElementById('query-input').value='${lot.lotNumber}'; document.getElementById('query-type').value='by-lot';">
            <strong>${lot.lotNumber}</strong>
            <br>
            <small style="color: #666;">Tests: ${testInfo}</small>
          </li>
        `;
      }
      html += '</ul>';

      container.innerHTML = html;
    } catch (error) {
      console.error('Error displaying available data:', error);
      container.innerHTML = '<p style="color: #999;">Error loading data</p>';
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    const controller = new UIController();
    await controller.initialize();
  });
} else {
  const controller = new UIController();
  controller.initialize();
}
