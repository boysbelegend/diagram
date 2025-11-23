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

  // Generate unique ID for this diagram based on code
  const diagramHash = await generateHash(code);
  container.dataset.diagramHash = diagramHash;

  // Create diagram element
  const diagramDiv = document.createElement('div');
  diagramDiv.className = 'mermaid-diagram';

  try {
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { svg } = await window.mermaid.render(id, code);

    diagramDiv.innerHTML = svg;
    container.appendChild(diagramDiv);

    // Add action buttons
    addActionButtons(container, code, diagramHash);

    // Replace original element
    if (element.parentElement.tagName === 'PRE') {
      element.parentElement.replaceWith(container);
    } else {
      element.replaceWith(container);
    }

    // Mark as rendered
    container.dataset.mermaidRendered = 'true';

    // Enable drag and drop for nodes
    enableNodeDragging(container, id, diagramHash);

    // Restore saved layout
    await restoreLayout(container, diagramHash);
  } catch (error) {
    throw new Error(`Render failed: ${error.message}`);
  }
}

// Add action buttons to diagram
function addActionButtons(container, code, diagramHash) {
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

  // Drag mode toggle button
  const dragBtn = createButton('Drag Mode', '🖱️', () => {
    toggleDragMode(container, dragBtn);
  });

  // Reset layout button
  const resetBtn = createButton('Reset Layout', '🔄', async () => {
    await resetLayout(container, diagramHash);
  });

  actions.appendChild(editBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(viewCodeBtn);
  actions.appendChild(dragBtn);
  actions.appendChild(resetBtn);

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

// Enable node dragging functionality
function enableNodeDragging(container, diagramId, diagramHash) {
  const svg = container.querySelector('svg');
  if (!svg) return;

  // Store drag state
  let dragState = {
    enabled: false,
    dragging: false,
    currentNode: null,
    offset: { x: 0, y: 0 },
    diagramHash: diagramHash
  };

  // Store for this container
  container._dragState = dragState;
}

// Toggle drag mode
function toggleDragMode(container, button) {
  const dragState = container._dragState;
  if (!dragState) return;

  dragState.enabled = !dragState.enabled;

  const svg = container.querySelector('svg');
  const diagramDiv = container.querySelector('.mermaid-diagram');

  if (dragState.enabled) {
    // Enable drag mode
    button.classList.add('active');
    diagramDiv.classList.add('drag-mode');
    showToast('Drag mode enabled - Click and drag nodes');

    // Make nodes draggable
    makeNodesDraggable(svg, dragState);
  } else {
    // Disable drag mode
    button.classList.remove('active');
    diagramDiv.classList.remove('drag-mode');
    showToast('Drag mode disabled');

    // Remove drag handlers
    removeNodeDragHandlers(svg);
  }
}

// Make SVG nodes draggable
function makeNodesDraggable(svg, dragState) {
  // Find all node groups (typically g elements with specific classes)
  const nodeSelectors = [
    'g.node',
    'g.nodes > g',
    'g[class*="node"]',
    'rect[class*="node"]',
    'circle',
    'ellipse',
    'polygon'
  ];

  const nodes = svg.querySelectorAll(nodeSelectors.join(', '));

  nodes.forEach(node => {
    // Get the parent group if this is a shape element
    const draggableElement = node.tagName === 'g' ? node : node.closest('g');
    if (!draggableElement) return;

    // Skip if already has drag handler
    if (draggableElement._hasDragHandler) return;
    draggableElement._hasDragHandler = true;

    // Add visual feedback
    draggableElement.style.cursor = 'grab';

    // Mouse down
    const mouseDownHandler = (e) => {
      if (!dragState.enabled) return;
      e.stopPropagation();
      e.preventDefault();

      dragState.dragging = true;
      dragState.currentNode = draggableElement;
      draggableElement.style.cursor = 'grabbing';

      // Get current transform
      const transform = draggableElement.getAttribute('transform') || '';
      const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);

      const currentX = translateMatch ? parseFloat(translateMatch[1]) : 0;
      const currentY = translateMatch ? parseFloat(translateMatch[2]) : 0;

      // Calculate offset
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const point = svgPoint.matrixTransform(ctm.inverse());

      dragState.offset = {
        x: point.x - currentX,
        y: point.y - currentY
      };

      // Add dragging class
      draggableElement.classList.add('dragging');
    };

    draggableElement.addEventListener('mousedown', mouseDownHandler);
    draggableElement._mouseDownHandler = mouseDownHandler;
  });

  // Mouse move on SVG
  const mouseMoveHandler = (e) => {
    if (!dragState.dragging || !dragState.currentNode) return;
    e.preventDefault();

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const ctm = svg.getScreenCTM();
    const point = svgPoint.matrixTransform(ctm.inverse());

    const newX = point.x - dragState.offset.x;
    const newY = point.y - dragState.offset.y;

    // Get existing transform and preserve other transforms
    const transform = dragState.currentNode.getAttribute('transform') || '';
    const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();

    // Set new transform
    const newTransform = `translate(${newX},${newY}) ${otherTransforms}`.trim();
    dragState.currentNode.setAttribute('transform', newTransform);
  };

  // Mouse up
  const mouseUpHandler = async (e) => {
    if (dragState.dragging && dragState.currentNode) {
      dragState.currentNode.style.cursor = 'grab';
      dragState.currentNode.classList.remove('dragging');

      // Save layout after drag
      await saveLayout(svg, dragState.diagramHash);

      dragState.currentNode = null;
      dragState.dragging = false;
    }
  };

  svg.addEventListener('mousemove', mouseMoveHandler);
  svg.addEventListener('mouseup', mouseUpHandler);
  svg.addEventListener('mouseleave', mouseUpHandler);

  // Store handlers for cleanup
  svg._dragHandlers = {
    mouseMoveHandler,
    mouseUpHandler
  };
}

// Remove drag handlers
function removeNodeDragHandlers(svg) {
  // Remove node handlers
  const nodes = svg.querySelectorAll('g, rect, circle, ellipse, polygon');
  nodes.forEach(node => {
    if (node._mouseDownHandler) {
      node.removeEventListener('mousedown', node._mouseDownHandler);
      delete node._mouseDownHandler;
      delete node._hasDragHandler;
      node.style.cursor = '';
      node.classList.remove('dragging');
    }
  });

  // Remove SVG handlers
  if (svg._dragHandlers) {
    svg.removeEventListener('mousemove', svg._dragHandlers.mouseMoveHandler);
    svg.removeEventListener('mouseup', svg._dragHandlers.mouseUpHandler);
    svg.removeEventListener('mouseleave', svg._dragHandlers.mouseUpHandler);
    delete svg._dragHandlers;
  }
}

// Generate hash from string
async function generateHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Use first 16 chars
}

// Save layout to storage
async function saveLayout(svg, diagramHash) {
  try {
    const layout = {};

    // Get all nodes with transforms
    const nodes = svg.querySelectorAll('g[transform*="translate"]');
    nodes.forEach((node, index) => {
      const transform = node.getAttribute('transform');
      const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);

      if (translateMatch) {
        // Use node index as identifier (could be improved with better ID)
        const nodeId = `node-${index}`;
        layout[nodeId] = {
          x: parseFloat(translateMatch[1]),
          y: parseFloat(translateMatch[2])
        };
      }
    });

    // Get existing layouts
    const result = await chrome.storage.local.get(['diagramLayouts']);
    const layouts = result.diagramLayouts || {};

    // Save this diagram's layout
    layouts[diagramHash] = {
      layout: layout,
      timestamp: new Date().toISOString()
    };

    await chrome.storage.local.set({ diagramLayouts: layouts });

    console.log('Layout saved for diagram:', diagramHash);
  } catch (error) {
    console.error('Error saving layout:', error);
  }
}

// Restore layout from storage
async function restoreLayout(container, diagramHash) {
  try {
    const result = await chrome.storage.local.get(['diagramLayouts']);
    const layouts = result.diagramLayouts || {};

    const savedLayout = layouts[diagramHash];
    if (!savedLayout) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const nodes = svg.querySelectorAll('g[transform*="translate"]');
    nodes.forEach((node, index) => {
      const nodeId = `node-${index}`;
      const position = savedLayout.layout[nodeId];

      if (position) {
        const transform = node.getAttribute('transform') || '';
        const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();
        const newTransform = `translate(${position.x},${position.y}) ${otherTransforms}`.trim();
        node.setAttribute('transform', newTransform);
      }
    });

    console.log('Layout restored for diagram:', diagramHash);
    showToast('Layout restored from saved position');
  } catch (error) {
    console.error('Error restoring layout:', error);
  }
}

// Reset layout to original
async function resetLayout(container, diagramHash) {
  try {
    // Remove saved layout
    const result = await chrome.storage.local.get(['diagramLayouts']);
    const layouts = result.diagramLayouts || {};

    if (layouts[diagramHash]) {
      delete layouts[diagramHash];
      await chrome.storage.local.set({ diagramLayouts: layouts });
    }

    // Re-render the diagram
    const code = container.dataset.originalCode;
    if (!code) return;

    const diagramDiv = container.querySelector('.mermaid-diagram');
    if (!diagramDiv) return;

    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { svg } = await window.mermaid.render(id, code);

    diagramDiv.innerHTML = svg;

    // Re-enable dragging
    const dragState = container._dragState;
    if (dragState && dragState.enabled) {
      const newSvg = container.querySelector('svg');
      // Remove old handlers first
      removeNodeDragHandlers(newSvg);
      // Add new handlers
      makeNodesDraggable(newSvg, dragState);
    }

    showToast('Layout reset to original');
    console.log('Layout reset for diagram:', diagramHash);
  } catch (error) {
    console.error('Error resetting layout:', error);
    showToast('Failed to reset layout');
  }
}
