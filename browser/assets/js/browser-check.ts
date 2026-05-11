// Browser support detection for IndexedDB and WebAssembly

export interface BrowserCapabilities {
  supportsIndexedDB: boolean;
  supportsWasm: boolean;
  message: string;
}

/**
 * Check if browser supports IndexedDB
 */
function checkIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Check if browser supports WebAssembly
 */
async function checkWasm(): Promise<boolean> {
  try {
    // Test basic WASM support by checking for WebAssembly global
    if (typeof WebAssembly !== 'object') {
      return false;
    }

    // Try to instantiate a minimal WASM module
    const wasmModule = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    await WebAssembly.instantiate(wasmModule);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get browser capabilities
 */
export async function getBrowserCapabilities(): Promise<BrowserCapabilities> {
  const supportsIndexedDB = checkIndexedDB();
  const supportsWasm = await checkWasm();

  let message = '';
  if (supportsIndexedDB && supportsWasm) {
    message = 'Both IndexedDB and WebAssembly supported ✓';
  } else if (supportsIndexedDB && !supportsWasm) {
    message = 'IndexedDB supported, WebAssembly not available ⚠';
  } else if (!supportsIndexedDB && supportsWasm) {
    message = 'WebAssembly supported, IndexedDB not available ⚠';
  } else {
    message = 'Neither IndexedDB nor WebAssembly supported ✗';
  }

  return { supportsIndexedDB, supportsWasm, message };
}

/**
 * Check if we can proceed with import (both DBs supported)
 */
export function canProceedWithImport(capabilities: BrowserCapabilities): boolean {
  return capabilities.supportsIndexedDB && capabilities.supportsWasm;
}
