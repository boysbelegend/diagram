/**
 * Mermaid initialization module
 * Initializes Mermaid library loaded from local bundle
 */

// Create a promise that resolves when Mermaid is ready
window.mermaidReady = new Promise((resolve, reject) => {
  // Wait for DOM to ensure mermaid script has loaded
  const initMermaid = () => {
    if (typeof window.mermaid !== 'undefined') {
      // Initialize Mermaid with default settings
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        logLevel: 'error'
      });

      console.log('Mermaid loaded and initialized successfully');
      resolve(window.mermaid);
    } else {
      console.error('Mermaid library not found');
      reject(new Error('Mermaid library not loaded'));
    }
  };

  // Check if already loaded or wait for load event
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMermaid);
  } else {
    initMermaid();
  }
});
