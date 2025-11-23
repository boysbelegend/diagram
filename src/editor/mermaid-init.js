/**
 * Mermaid initialization module
 * Loads and initializes Mermaid library from CDN
 */

// Create a promise that resolves when Mermaid is ready
window.mermaidReady = new Promise((resolve, reject) => {
  // Dynamically import Mermaid from CDN
  import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
    .then((module) => {
      const mermaid = module.default;

      // Initialize Mermaid with default settings
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 'error'
      });

      // Make Mermaid globally available
      window.mermaid = mermaid;

      console.log('Mermaid loaded and initialized successfully');
      resolve(mermaid);
    })
    .catch((error) => {
      console.error('Failed to load Mermaid:', error);
      reject(error);
    });
});
