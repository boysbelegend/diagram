// Content script for rendering Mermaid diagrams on web pages

(async function() {
  'use strict';

  // Load Mermaid library
  if (!window.mermaid) {
    await loadMermaidLibrary();
  }

  // Initialize Mermaid
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    logLevel: 'error'
  });

  // Find and render all Mermaid code blocks
  findAndRenderDiagrams();

  // Watch for dynamically added content
  observeDOMChanges();

  console.log('Mermaid Diagram Viewer: Initialized');
})();

// Load Mermaid library from CDN
function loadMermaidLibrary() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      window.mermaid = mermaid;
    `;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Find and render all Mermaid diagrams
async function findAndRenderDiagrams() {
  // Find code blocks with mermaid class or language
  const selectors = [
    'pre code.language-mermaid',
    'pre code.mermaid',
    'code.language-mermaid',
    'code.mermaid',
    '.mermaid',
    'pre.mermaid'
  ];

  const codeBlocks = document.querySelectorAll(selectors.join(', '));

  for (const block of codeBlocks) {
    if (block.dataset.mermaidRendered) continue;

    try {
      await renderDiagram(block);
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error);
      showError(block, error.message);
    }
  }
}

// Render a single diagram
async function renderDiagram(element) {
  const code = element.textContent.trim();

  if (!code) return;

  // Create container for rendered diagram
  const container = document.createElement('div');
  container.className = 'mermaid-viewer-container';
  container.dataset.originalCode = code;

  // Create diagram element
  const diagramDiv = document.createElement('div');
  diagramDiv.className = 'mermaid-diagram';

  try {
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { svg } = await window.mermaid.render(id, code);

    diagramDiv.innerHTML = svg;
    container.appendChild(diagramDiv);

    // Add action buttons
    addActionButtons(container, code);

    // Replace original element
    if (element.parentElement.tagName === 'PRE') {
      element.parentElement.replaceWith(container);
    } else {
      element.replaceWith(container);
    }

    // Mark as rendered
    container.dataset.mermaidRendered = 'true';
  } catch (error) {
    throw new Error(`Render failed: ${error.message}`);
  }
}

// Add action buttons to diagram
function addActionButtons(container, code) {
  const actions = document.createElement('div');
  actions.className = 'mermaid-actions';

  // Edit button
  const editBtn = createButton('Edit', '✏️', () => {
    openInEditor(code);
  });

  // Copy button
  const copyBtn = createButton('Copy', '📋', () => {
    copyToClipboard(code);
    showToast('Code copied to clipboard');
  });

  // View code button
  const viewCodeBtn = createButton('View Code', '👁️', () => {
    toggleCodeView(container, code);
  });

  actions.appendChild(editBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(viewCodeBtn);

  container.appendChild(actions);
}

// Create action button
function createButton(text, icon, onClick) {
  const btn = document.createElement('button');
  btn.className = 'mermaid-action-btn';
  btn.innerHTML = `<span class="icon">${icon}</span> ${text}`;
  btn.addEventListener('click', onClick);
  return btn;
}

// Open diagram in editor
function openInEditor(code) {
  const url = chrome.runtime.getURL('src/editor/editor.html');
  const params = `?code=${encodeURIComponent(code)}`;
  window.open(url + params, '_blank');
}

// Copy code to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Toggle code view
function toggleCodeView(container, code) {
  let codeView = container.querySelector('.mermaid-code-view');

  if (codeView) {
    codeView.remove();
    return;
  }

  codeView = document.createElement('pre');
  codeView.className = 'mermaid-code-view';
  codeView.textContent = code;

  const diagram = container.querySelector('.mermaid-diagram');
  diagram.insertAdjacentElement('afterend', codeView);
}

// Show error message
function showError(element, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mermaid-error';
  errorDiv.innerHTML = `
    <strong>Mermaid Diagram Error:</strong>
    <p>${message}</p>
  `;

  if (element.parentElement.tagName === 'PRE') {
    element.parentElement.replaceWith(errorDiv);
  } else {
    element.replaceWith(errorDiv);
  }
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'mermaid-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Observe DOM changes for dynamically added content
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        findAndRenderDiagrams();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
