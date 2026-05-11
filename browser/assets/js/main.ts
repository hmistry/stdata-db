// Main entry point for bundled browser application
// This file serves as the bundle entry point when using esbuild or webpack

import { UIController } from './ui-controller.js';

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const controller = new UIController();
    controller.initialize().catch((error) => {
      console.error('Failed to initialize UI controller:', error);
    });
  });
} else {
  const controller = new UIController();
  controller.initialize().catch((error) => {
    console.error('Failed to initialize UI controller:', error);
  });
}

// Export for potential use as module
export { UIController };
