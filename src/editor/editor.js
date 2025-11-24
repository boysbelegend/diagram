/**
 * ==============================================
 * MERMAID DIAGRAM EDITOR - MAIN SCRIPT
 * ==============================================
 *
 * This editor provides a full-featured environment for creating
 * and editing Mermaid diagrams with live preview, drag-and-drop
 * node repositioning, and multiple export formats.
 *
 * Key Features:
 * - Live preview with real-time rendering
 * - Interactive drag-and-drop for repositioning nodes
 * - Grid snapping and alignment tools
 * - Export to PNG, SVG, and PDF
 * - Layout persistence across sessions
 * - Keyboard shortcuts for productivity
 */

// ==============================================
// GLOBAL STATE
// ==============================================

/**
 * Current diagram being edited
 * @type {Object|null} Contains id, title, code, type, timestamps
 */
let currentDiagram = null;

/**
 * Timer for debouncing preview updates
 * @type {number|null}
 */
let debounceTimer = null;

/**
 * Current zoom level percentage (100 = normal)
 * @type {number}
 */
let zoomLevel = 100;

/**
 * State object for drag-and-drop functionality
 * @type {Object}
 */
let dragState = {
  enabled: false,        // Whether drag mode is currently active
  dragging: false,       // Whether user is currently dragging a node
  currentNode: null,     // The SVG element currently being dragged
  offset: { x: 0, y: 0 }, // Mouse offset from node origin during drag
  diagramHash: null,     // SHA-256 hash identifying the current diagram
  gridSnap: false,       // Whether grid snapping is enabled
  gridSize: 10,          // Grid size in pixels (default 10px)
  selectedNodes: []      // Array of currently selected nodes (future feature)
};

// ==============================================
// DOM ELEMENT REFERENCES
// ==============================================

const codeEditor = document.getElementById('codeEditor');
const preview = document.getElementById('preview');
const errorMessage = document.getElementById('errorMessage');
const diagramTitle = document.getElementById('diagramTitle');
const lineCount = document.getElementById('lineCount');
const charCount = document.getElementById('charCount');
const status = document.getElementById('status');
const lastSaved = document.getElementById('lastSaved');
const zoomLevelDisplay = document.getElementById('zoomLevel');

// ==============================================
// INITIALIZATION
// ==============================================

/**
 * Initialize the editor when DOM is loaded
 * Sets up all event listeners and loads initial content
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Mermaid to be loaded
  try {
    await window.mermaidReady;
    console.log('Editor initializing with Mermaid loaded');
  } catch (error) {
    console.error('Failed to load Mermaid library:', error);
    showNotification('Failed to load diagram library', 'error');
  }

  loadFromURL();
  setupEventListeners();
  updatePreview();
  updateStats();
});

/**
 * Load diagram code from URL parameters
 * Useful for opening diagrams from external links
 */
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    codeEditor.value = decodeURIComponent(code);
  }
}

/**
 * Setup all event listeners for UI interactions
 * Connects buttons, inputs, and keyboard shortcuts to their handlers
 */
function setupEventListeners() {
  // Code editor changes
  codeEditor.addEventListener('input', () => {
    updateStats();
    debounceUpdate();
  });

  // Template selection
  document.getElementById('templateSelect').addEventListener('change', (e) => {
    if (e.target.value) {
      loadTemplate(e.target.value);
      e.target.value = '';
    }
  });

  // Toolbar buttons
  document.getElementById('saveBtn').addEventListener('click', saveDiagram);
  document.getElementById('saveAsBtn').addEventListener('click', saveAsDiagram);
  document.getElementById('exportPngBtn').addEventListener('click', exportAsPNG);
  document.getElementById('exportSvgBtn').addEventListener('click', exportAsSVG);
  document.getElementById('exportPdfBtn').addEventListener('click', exportAsPDF);
  document.getElementById('copyBtn').addEventListener('click', copyCode);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('helpBtn').addEventListener('click', showHelp);

  // Editor actions
  document.getElementById('formatBtn').addEventListener('click', formatCode);
  document.getElementById('clearBtn').addEventListener('click', clearEditor);

  // Preview actions
  document.getElementById('dragModeBtn').addEventListener('click', toggleDragMode);
  document.getElementById('gridSnapBtn').addEventListener('click', toggleGridSnap);
  document.getElementById('alignLeftBtn').addEventListener('click', () => alignNodes('left'));
  document.getElementById('alignCenterBtn').addEventListener('click', () => alignNodes('center'));
  document.getElementById('alignRightBtn').addEventListener('click', () => alignNodes('right'));
  document.getElementById('resetLayoutBtn').addEventListener('click', resetLayout);
  document.getElementById('zoomInBtn').addEventListener('click', () => zoom(10));
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(-10));
  document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Help modal
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('helpModal').style.display = 'none';
  });

  // Resize handle
  setupResizeHandle();
}

// ==============================================
// PREVIEW RENDERING
// ==============================================

/**
 * Debounce preview updates to avoid excessive re-rendering
 * Waits 500ms after user stops typing before updating
 */
function debounceUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updatePreview();
  }, 500);
}

/**
 * Update the live preview with current diagram code
 * Renders the Mermaid diagram, enables drag functionality,
 * and restores any saved layout positions
 *
 * @async
 */
async function updatePreview() {
  const code = codeEditor.value.trim();

  if (!code) {
    preview.innerHTML = '<p style="color: #9ca3af;">Start typing to see preview...</p>';
    errorMessage.style.display = 'none';
    return;
  }

  // Check if Mermaid is loaded
  if (!window.mermaid) {
    try {
      await window.mermaidReady;
    } catch (error) {
      preview.innerHTML = '<p style="color: #ef4444;">Failed to load Mermaid library. Please refresh the page.</p>';
      errorMessage.style.display = 'none';
      return;
    }
  }

  try {
    status.textContent = 'Rendering...';
    errorMessage.style.display = 'none';

    // Clear previous diagram
    preview.innerHTML = '';

    // Generate hash for this diagram
    dragState.diagramHash = await generateHash(code);

    // Create container for mermaid
    const container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = code;
    preview.appendChild(container);

    // Render with mermaid
    const { svg } = await window.mermaid.render('preview-diagram', code);
    preview.innerHTML = svg;

    // Enable drag functionality
    enableNodeDragging();

    // Restore saved layout if exists
    await restoreLayout(dragState.diagramHash);

    status.textContent = 'Ready';
  } catch (error) {
    console.error('Mermaid render error:', error);
    preview.innerHTML = '';
    errorMessage.textContent = `Error: ${error.message || 'Invalid diagram syntax'}`;
    errorMessage.style.display = 'block';
    status.textContent = 'Error';
  }
}

/**
 * Update editor statistics (line count, character count)
 * Called whenever the code editor content changes
 */
function updateStats() {
  const code = codeEditor.value;
  const lines = code.split('\n').length;
  const chars = code.length;

  lineCount.textContent = `Lines: ${lines}`;
  charCount.textContent = `Characters: ${chars}`;
}

// ==============================================
// DIAGRAM STORAGE
// ==============================================

/**
 * Save the current diagram to Chrome Storage
 * Creates a new diagram if none exists, updates existing one
 *
 * @async
 */
async function saveDiagram() {
  try {
    const diagram = {
      id: currentDiagram?.id || generateId(),
      title: diagramTitle.value || 'Untitled Diagram',
      code: codeEditor.value,
      type: detectDiagramType(codeEditor.value),
      createdAt: currentDiagram?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Get existing diagrams
    const result = await chrome.storage.local.get(['diagrams']);
    let diagrams = result.diagrams || [];

    // Update or add
    const index = diagrams.findIndex(d => d.id === diagram.id);
    if (index >= 0) {
      diagrams[index] = diagram;
    } else {
      diagrams.push(diagram);
    }

    // Save to storage
    await chrome.storage.local.set({ diagrams });

    currentDiagram = diagram;
    lastSaved.textContent = 'Saved just now';
    status.textContent = 'Saved';

    // Calculate storage size
    const storageResult = await chrome.storage.local.get(null);
    const storageSize = JSON.stringify(storageResult).length;
    const storageMB = (storageSize / 1024 / 1024).toFixed(2);

    // Show success feedback with storage location info
    showNotification(
      `Diagram saved to Chrome Local Storage (${storageMB}MB used)`,
      'success',
      5000
    );
  } catch (error) {
    console.error('Save error:', error);
    showNotification('Failed to save diagram', 'error');
  }
}

/**
 * Save the current diagram as a new copy with a different name
 * Always creates a new diagram with a new ID
 *
 * @async
 */
async function saveAsDiagram() {
  try {
    // Prompt user for new diagram title
    const newTitle = prompt('Enter a name for the new diagram:',
                           (diagramTitle.value || 'Untitled Diagram') + ' - Copy');

    // User cancelled
    if (newTitle === null) {
      return;
    }

    // Create new diagram with new ID
    const diagram = {
      id: generateId(), // Always generate new ID for Save As
      title: newTitle || 'Untitled Diagram',
      code: codeEditor.value,
      type: detectDiagramType(codeEditor.value),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Get existing diagrams
    const result = await chrome.storage.local.get(['diagrams']);
    let diagrams = result.diagrams || [];

    // Add new diagram
    diagrams.push(diagram);

    // Save to storage
    await chrome.storage.local.set({ diagrams });

    // Update current diagram reference and UI
    currentDiagram = diagram;
    diagramTitle.value = diagram.title;
    lastSaved.textContent = 'Saved just now';
    status.textContent = 'Saved as new';

    // Show success feedback
    showNotification('Diagram saved as new copy!', 'success');
  } catch (error) {
    console.error('Save As error:', error);
    showNotification('Failed to save diagram', 'error');
  }
}

// ==============================================
// EXPORT FUNCTIONS
// ==============================================

/**
 * Export the current diagram as PNG image
 * Converts SVG to canvas, then to PNG blob for download
 *
 * @async
 */
async function exportAsPNG() {
  try {
    const svgElement = preview.querySelector('svg');
    if (!svgElement) {
      showNotification('No diagram to export', 'error');
      return;
    }

    status.textContent = 'Generating high-quality PNG...';

    // Get SVG dimensions
    const bbox = svgElement.getBBox();
    const svgWidth = bbox.width || parseFloat(svgElement.getAttribute('width')) || 800;
    const svgHeight = bbox.height || parseFloat(svgElement.getAttribute('height')) || 600;

    // Use high scale factor for better quality (3x for retina displays)
    const scale = 3;

    // Create high-resolution canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Export with maximum quality
      canvas.toBlob((blob) => {
        downloadBlob(blob, `${diagramTitle.value || 'diagram'}.png`);
        status.textContent = 'Ready';
        showNotification('Exported as high-quality PNG (3x resolution)', 'success');
      }, 'image/png', 1.0);
    };

    img.onerror = () => {
      status.textContent = 'Ready';
      showNotification('Failed to export PNG', 'error');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (error) {
    console.error('Export PNG error:', error);
    status.textContent = 'Ready';
    showNotification('Failed to export PNG', 'error');
  }
}

/**
 * Export the current diagram as SVG file
 * Preserves vector quality for scaling
 */
function exportAsSVG() {
  try {
    const svgElement = preview.querySelector('svg');
    if (!svgElement) {
      showNotification('No diagram to export', 'error');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    downloadBlob(blob, `${diagramTitle.value || 'diagram'}.svg`);
    showNotification('Exported as SVG', 'success');
  } catch (error) {
    console.error('Export SVG error:', error);
    showNotification('Failed to export SVG', 'error');
  }
}

/**
 * Export the current diagram as PDF document
 * Uses jsPDF library to generate PDF with automatic page orientation
 * Scales diagram to fit A4 page with margins
 *
 * @async
 */
async function exportAsPDF() {
  try {
    const svgElement = preview.querySelector('svg');
    if (!svgElement) {
      showNotification('No diagram to export', 'error');
      return;
    }

    // Check if jsPDF library is loaded
    if (typeof window.jspdf === 'undefined') {
      showNotification('PDF library not loaded', 'error');
      return;
    }

    status.textContent = 'Generating PDF...';

    // Get actual SVG dimensions using getBBox for accurate sizing
    const bbox = svgElement.getBBox();
    const svgWidth = bbox.width || parseFloat(svgElement.getAttribute('width')) || svgElement.viewBox.baseVal.width || 800;
    const svgHeight = bbox.height || parseFloat(svgElement.getAttribute('height')) || svgElement.viewBox.baseVal.height || 600;

    // Convert SVG to image data URL for PDF embedding
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      // Create canvas to render SVG with higher resolution
      // Create high-resolution canvas for better PDF quality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      // Use 2x scale for better PDF quality (balance between quality and file size)
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;

      // Use scale factor for better quality
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;

      // Scale context for high-res rendering
      ctx.scale(scale, scale);

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, svgWidth, svgHeight);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to high-quality image data
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Create PDF
      const { jsPDF } = window.jspdf;

      // Calculate PDF dimensions (A4 or custom based on diagram size)
      const orientation = svgWidth > svgHeight ? 'landscape' : 'portrait';
      const pdfWidth = orientation === 'landscape' ? 297 : 210; // A4 in mm
      const pdfHeight = orientation === 'landscape' ? 210 : 297;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit in PDF while maintaining aspect ratio
      const margin = 10;
      const maxWidth = pdfWidth - (2 * margin);
      const maxHeight = pdfHeight - (2 * margin);

      const aspectRatio = svgWidth / svgHeight;
      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Center the image
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', x, y, width, height);

      // Add title if exists (moved to bottom to avoid overlap)
      if (diagramTitle.value) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(diagramTitle.value, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
      }

      // Save PDF
      pdf.save(`${diagramTitle.value || 'diagram'}.pdf`);

      status.textContent = 'Ready';
      showNotification('Exported as high-quality PDF (2x resolution)', 'success');
    };

    img.onerror = () => {
      status.textContent = 'Ready';
      showNotification('Failed to generate PDF', 'error');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

  } catch (error) {
    console.error('Export PDF error:', error);
    status.textContent = 'Ready';
    showNotification('Failed to export PDF', 'error');
  }
}

// ==============================================
// UI UTILITIES
// ==============================================

/**
 * Copy diagram code to clipboard
 */
function copyCode() {
  codeEditor.select();
  document.execCommand('copy');
  showNotification('Code copied to clipboard', 'success');
}

/**
 * Toggle between light and dark themes
 * Persists theme choice in localStorage
 */
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Update mermaid theme if loaded
  if (window.mermaid) {
    window.mermaid.initialize({
      theme: isDark ? 'dark' : 'default'
    });
    updatePreview();
  }
}

// Show help
function showHelp() {
  document.getElementById('helpModal').style.display = 'flex';
}

// Format code (basic)
function formatCode() {
  const code = codeEditor.value;
  const lines = code.split('\n');
  const formatted = lines.map(line => line.trim()).join('\n');
  codeEditor.value = formatted;
  updateStats();
  updatePreview();
}

// Clear editor
function clearEditor() {
  if (confirm('Are you sure you want to clear the editor?')) {
    codeEditor.value = '';
    diagramTitle.value = '';
    currentDiagram = null;
    updateStats();
    updatePreview();
  }
}

// Zoom functions
function zoom(delta) {
  zoomLevel = Math.max(25, Math.min(200, zoomLevel + delta));
  applyZoom();
}

function resetZoom() {
  zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  preview.style.transform = `scale(${zoomLevel / 100})`;
  zoomLevelDisplay.textContent = `${zoomLevel}%`;
}

// Load template
async function loadTemplate(type) {
  const templates = {
    flowchart: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,

    sequence: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hello Alice!
    A->>B: How are you?
    B->>A: I'm good, thanks!`,

    class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,

    state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Fail
    Error --> Idle : Retry
    Success --> [*]`,

    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses

    CUSTOMER {
        string name
        string email
        string phone
    }
    ORDER {
        int orderNumber
        date orderDate
        string status
    }`,

    gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements    :a1, 2024-01-01, 30d
    Design          :a2, after a1, 20d
    section Development
    Backend         :a3, after a2, 45d
    Frontend        :a4, after a2, 40d
    section Testing
    Testing         :a5, after a3, 15d
    Deployment      :a6, after a5, 5d`,

    pie: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,

    git: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,

    c4: `C4Context
    title System Context diagram for Internet Banking System

    Person(customer, "Personal Banking Customer", "A customer of the bank")
    System(banking_system, "Internet Banking System", "Allows customers to view information about their accounts")
    System_Ext(mail_system, "E-mail system", "The internal Microsoft Exchange e-mail system")
    System_Ext(mainframe, "Mainframe Banking System", "Stores all of the core banking information")

    Rel(customer, banking_system, "Uses")
    Rel_Back(customer, mail_system, "Sends e-mails to")
    Rel(banking_system, mail_system, "Sends e-mails", "SMTP")
    Rel(banking_system, mainframe, "Uses")`
  };

  codeEditor.value = templates[type] || templates.flowchart;
  updateStats();
  updatePreview();
}

// Keyboard shortcuts
function handleKeyboard(e) {
  // Ctrl+Shift+S: Save As
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    saveAsDiagram();
    return;
  }

  // Ctrl+S: Save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveDiagram();
  }

  // Ctrl+Enter: Update preview
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    updatePreview();
  }

  // Ctrl+/: Toggle comment (basic)
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    // TODO: Implement comment toggle
  }

  // Ctrl+Plus: Zoom in
  if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    zoom(10);
  }

  // Ctrl+Minus: Zoom out
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    zoom(-10);
  }

  // Ctrl+0: Reset zoom
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    resetZoom();
  }

  // Arrow keys: Move selected node (only when drag mode is enabled)
  if (dragState.enabled && dragState.currentNode && !e.ctrlKey && !e.shiftKey) {
    const moveAmount = e.altKey ? 1 : 10; // Fine movement with Alt key

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveNodeByKey(dragState.currentNode, -moveAmount, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveNodeByKey(dragState.currentNode, moveAmount, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveNodeByKey(dragState.currentNode, 0, -moveAmount);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveNodeByKey(dragState.currentNode, 0, moveAmount);
        break;
    }
  }

  // Escape: Close modal or deselect node
  if (e.key === 'Escape') {
    document.getElementById('helpModal').style.display = 'none';
    if (dragState.currentNode) {
      dragState.currentNode.classList.remove('selected');
      dragState.currentNode = null;
    }
  }
}

// Move node by keyboard
async function moveNodeByKey(node, deltaX, deltaY) {
  const transform = node.getAttribute('transform') || '';
  const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);

  if (!translateMatch) return;

  let newX = parseFloat(translateMatch[1]) + deltaX;
  let newY = parseFloat(translateMatch[2]) + deltaY;

  // Apply grid snapping if enabled
  if (dragState.gridSnap) {
    newX = Math.round(newX / dragState.gridSize) * dragState.gridSize;
    newY = Math.round(newY / dragState.gridSize) * dragState.gridSize;
  }

  const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();
  const newTransform = `translate(${newX},${newY}) ${otherTransforms}`.trim();
  node.setAttribute('transform', newTransform);

  // Save layout
  const svg = preview.querySelector('svg');
  if (svg && dragState.diagramHash) {
    await saveLayout(svg, dragState.diagramHash);
  }
}

// Setup resize handle
function setupResizeHandle() {
  const resizeHandle = document.querySelector('.resize-handle');
  const editorPanel = document.querySelector('.editor-panel');
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerWidth = document.querySelector('.main-content').offsetWidth;
    const newWidth = (e.clientX / containerWidth) * 100;

    if (newWidth > 20 && newWidth < 80) {
      editorPanel.style.flex = `0 0 ${newWidth}%`;
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
  });
}

// Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function detectDiagramType(code) {
  const firstLine = code.trim().split('\n')[0].toLowerCase();

  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) return 'flowchart';
  if (firstLine.startsWith('sequencediagram')) return 'sequence';
  if (firstLine.startsWith('classdiagram')) return 'class';
  if (firstLine.startsWith('statediagram')) return 'state';
  if (firstLine.startsWith('erdiagram')) return 'er';
  if (firstLine.startsWith('gantt')) return 'gantt';
  if (firstLine.startsWith('pie')) return 'pie';
  if (firstLine.startsWith('gitgraph')) return 'git';
  if (firstLine.startsWith('c4context') || firstLine.startsWith('c4container') || firstLine.startsWith('c4component')) return 'c4';

  return 'unknown';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showNotification(message, type = 'info', duration = 3000) {
  // Simple notification - could be enhanced with a toast library
  const oldStatus = status.textContent;
  status.textContent = message;
  status.style.color = type === 'success' ? 'var(--success-color)' :
                       type === 'error' ? 'var(--error-color)' :
                       'var(--text-secondary)';

  setTimeout(() => {
    status.textContent = oldStatus;
    status.style.color = 'var(--text-secondary)';
  }, duration);
}

// Load theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
  // Apply dark theme to Mermaid when it's loaded
  if (window.mermaidReady) {
    window.mermaidReady.then((mermaid) => {
      mermaid.initialize({ theme: 'dark' });
    });
  }
}

// ==============================================
// DRAG AND DROP FUNCTIONALITY
// ==============================================

/**
 * Enable node dragging capability in the preview
 * Initializes storage for drag event handlers
 * Called after each diagram render
 */
function enableNodeDragging() {
  const svg = preview.querySelector('svg');
  if (!svg) return;

  // Store reference to cleanup handlers if needed
  preview._dragHandlers = [];
}

/**
 * Toggle drag mode on/off
 * When enabled, allows users to click and drag diagram nodes
 * Provides visual feedback and enables grid snapping if configured
 */
function toggleDragMode() {
  const btn = document.getElementById('dragModeBtn');
  dragState.enabled = !dragState.enabled;

  const svg = preview.querySelector('svg');
  if (!svg) return;

  if (dragState.enabled) {
    // Enable drag mode
    btn.classList.add('active');
    preview.classList.add('drag-mode');
    showNotification('Drag mode enabled', 'success');

    // Make nodes draggable
    makeNodesDraggable(svg);
  } else {
    // Disable drag mode
    btn.classList.remove('active');
    preview.classList.remove('drag-mode');
    showNotification('Drag mode disabled', 'success');

    // Remove drag handlers
    removeNodeDragHandlers(svg);
  }
}

/**
 * Make all SVG nodes in the diagram draggable
 * Attaches mouse event handlers to enable dragging
 *
 * @param {SVGElement} svg - The SVG element containing the diagram
 */
function makeNodesDraggable(svg) {
  // Limit SVG size to 4K (3840x2160) to prevent excessive memory usage
  const MAX_WIDTH = 3840;
  const MAX_HEIGHT = 2160;

  // Get current SVG dimensions
  const currentWidth = parseFloat(svg.getAttribute('width') || svg.viewBox.baseVal.width || 800);
  const currentHeight = parseFloat(svg.getAttribute('height') || svg.viewBox.baseVal.height || 600);

  // Apply size limits
  if (currentWidth > MAX_WIDTH || currentHeight > MAX_HEIGHT) {
    const scale = Math.min(MAX_WIDTH / currentWidth, MAX_HEIGHT / currentHeight);
    const newWidth = currentWidth * scale;
    const newHeight = currentHeight * scale;

    svg.setAttribute('width', newWidth);
    svg.setAttribute('height', newHeight);

    // Update viewBox if it exists
    if (svg.viewBox.baseVal.width > 0) {
      svg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
    }
  }

  // CSS selectors for different node types in Mermaid diagrams
  const nodeSelectors = [
    'g.node',              // Standard flowchart nodes
    'g.nodes > g',         // Node groups
    'g[class*="node"]',    // Any element with "node" in class
    'rect[class*="node"]', // Rectangle nodes
    'circle',              // Circle nodes
    'ellipse',             // Ellipse nodes
    'polygon'              // Polygon nodes (diamonds, etc.)
  ];

  const nodes = svg.querySelectorAll(nodeSelectors.join(', '));

  nodes.forEach(node => {
    // Get the parent group element if this is a shape element
    const draggableElement = node.tagName === 'g' ? node : node.closest('g');
    if (!draggableElement) return;

    // Skip if already has drag handler to avoid duplicates
    if (draggableElement._hasDragHandler) return;
    draggableElement._hasDragHandler = true;

    // Add visual feedback (grab cursor)
    draggableElement.style.cursor = 'grab';

    /**
     * Handle mouse down event - start dragging
     */
    const mouseDownHandler = (e) => {
      if (!dragState.enabled) return;
      e.stopPropagation();
      e.preventDefault();

      // Remove selection from previous node
      if (dragState.currentNode && dragState.currentNode !== draggableElement) {
        dragState.currentNode.classList.remove('selected');
      }

      dragState.dragging = true;
      dragState.currentNode = draggableElement;
      draggableElement.style.cursor = 'grabbing';

      // Mark as selected
      draggableElement.classList.add('selected');

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

  /**
   * Handle mouse move event - update node position while dragging
   * Applies grid snapping if enabled and updates connected edges
   */
  const mouseMoveHandler = (e) => {
    if (!dragState.dragging || !dragState.currentNode) return;
    e.preventDefault();

    // Convert mouse coordinates to SVG coordinate space
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const ctm = svg.getScreenCTM();
    const point = svgPoint.matrixTransform(ctm.inverse());

    // Get old position for calculating delta
    const oldTransform = dragState.currentNode.getAttribute('transform') || '';
    const oldTranslateMatch = oldTransform.match(/translate\(([^,]+),([^)]+)\)/);
    const oldX = oldTranslateMatch ? parseFloat(oldTranslateMatch[1]) : 0;
    const oldY = oldTranslateMatch ? parseFloat(oldTranslateMatch[2]) : 0;

    // Calculate new position relative to original click point
    let newX = point.x - dragState.offset.x;
    let newY = point.y - dragState.offset.y;

    // Apply grid snapping if enabled (rounds to nearest grid point)
    if (dragState.gridSnap) {
      newX = Math.round(newX / dragState.gridSize) * dragState.gridSize;
      newY = Math.round(newY / dragState.gridSize) * dragState.gridSize;
    }

    // Calculate delta for edge updates
    const deltaX = newX - oldX;
    const deltaY = newY - oldY;

    // Get existing transform and preserve non-translate transforms
    const transform = dragState.currentNode.getAttribute('transform') || '';
    const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();

    // Apply new position
    const newTransform = `translate(${newX},${newY}) ${otherTransforms}`.trim();
    dragState.currentNode.setAttribute('transform', newTransform);

    // Update connected edges (arrows/paths)
    updateConnectedEdges(svg, dragState.currentNode, deltaX, deltaY);
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

/**
 * Update connected edges (arrows/paths) when a node is moved
 * Finds all edges connected to the moved node and adjusts their positions
 *
 * @param {SVGElement} svg - The SVG element containing the diagram
 * @param {SVGElement} node - The node that was moved
 * @param {number} deltaX - The change in X position
 * @param {number} deltaY - The change in Y position
 */
function updateConnectedEdges(svg, node, deltaX, deltaY) {
  // Only update if there's actual movement
  if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) return;

  // Get all edges (paths with markers or specific edge classes)
  const edges = svg.querySelectorAll('path.edge, path[marker-end], g.edgePath, g.edge, g[class*="edge"]');

  edges.forEach(edge => {
    // Get the path element (might be nested in a group)
    const pathElement = edge.tagName === 'path' ? edge : edge.querySelector('path');
    if (!pathElement) return;

    // Check if this edge is connected to the moved node
    // by checking if the path is near the node's position
    const nodeBBox = node.getBBox();
    const nodeTransform = node.getAttribute('transform') || '';
    const nodeTranslateMatch = nodeTransform.match(/translate\(([^,]+),([^)]+)\)/);
    const nodeX = nodeTranslateMatch ? parseFloat(nodeTranslateMatch[1]) : 0;
    const nodeY = nodeTranslateMatch ? parseFloat(nodeTranslateMatch[2]) : 0;

    // Get the path's current 'd' attribute
    const d = pathElement.getAttribute('d');
    if (!d) return;

    // Parse and update path coordinates
    // This handles both absolute and relative path commands
    const updatedPath = updatePathCoordinates(d, nodeX, nodeY, nodeBBox, deltaX, deltaY);

    if (updatedPath !== d) {
      pathElement.setAttribute('d', updatedPath);
    }

    // Also update edge labels if they exist
    const edgeLabel = edge.querySelector('text, foreignObject');
    if (edgeLabel) {
      const labelTransform = edgeLabel.getAttribute('transform') || '';
      const labelMatch = labelTransform.match(/translate\(([^,]+),([^)]+)\)/);
      if (labelMatch) {
        const labelX = parseFloat(labelMatch[1]);
        const labelY = parseFloat(labelMatch[2]);

        // Check if label is near the moved node
        const distX = Math.abs(labelX - nodeX);
        const distY = Math.abs(labelY - nodeY);

        if (distX < 200 && distY < 200) {
          const newLabelTransform = labelTransform.replace(
            /translate\([^)]+\)/,
            `translate(${labelX + deltaX},${labelY + deltaY})`
          );
          edgeLabel.setAttribute('transform', newLabelTransform);
        }
      }
    }
  });
}

/**
 * Update path coordinates based on node movement
 * Adjusts path points that are near the moved node
 *
 * @param {string} pathData - The SVG path 'd' attribute
 * @param {number} nodeX - The node's X position
 * @param {number} nodeY - The node's Y position
 * @param {DOMRect} nodeBBox - The node's bounding box
 * @param {number} deltaX - The change in X position
 * @param {number} deltaY - The change in Y position
 * @returns {string} Updated path data
 */
function updatePathCoordinates(pathData, nodeX, nodeY, nodeBBox, deltaX, deltaY) {
  // Regular expression to match path commands and their coordinates
  const pathRegex = /([MLCQSTAZmlcqstaz])([^MLCQSTAZmlcqstaz]*)/g;
  let updatedPath = '';
  let match;

  // Node center position
  const nodeCenterX = nodeX + nodeBBox.width / 2;
  const nodeCenterY = nodeY + nodeBBox.height / 2;
  const connectionThreshold = Math.max(nodeBBox.width, nodeBBox.height) + 50;

  while ((match = pathRegex.exec(pathData)) !== null) {
    const command = match[1];
    const coords = match[2].trim();

    if (!coords) {
      updatedPath += command;
      continue;
    }

    // Split coordinates
    const numbers = coords.split(/[\s,]+/).filter(s => s.length > 0).map(parseFloat);

    if (numbers.length === 0) {
      updatedPath += command;
      continue;
    }

    updatedPath += command;

    // Process coordinate pairs
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 >= numbers.length) {
        updatedPath += numbers[i];
        break;
      }

      let x = numbers[i];
      let y = numbers[i + 1];

      // Check if this coordinate is near the moved node
      // For absolute commands (uppercase)
      if (command === command.toUpperCase() && command !== 'Z') {
        const dist = Math.sqrt(
          Math.pow(x - nodeCenterX + deltaX, 2) +
          Math.pow(y - nodeCenterY + deltaY, 2)
        );

        if (dist < connectionThreshold) {
          x += deltaX;
          y += deltaY;
        }
      }

      updatedPath += (i > 0 ? ',' : '') + x + ',' + y;
    }
  }

  return updatedPath;
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
    showNotification('Layout saved', 'success');
  } catch (error) {
    console.error('Error saving layout:', error);
  }
}

// Restore layout from storage
async function restoreLayout(diagramHash) {
  try {
    const result = await chrome.storage.local.get(['diagramLayouts']);
    const layouts = result.diagramLayouts || {};

    const savedLayout = layouts[diagramHash];
    if (!savedLayout) return;

    const svg = preview.querySelector('svg');
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
  } catch (error) {
    console.error('Error restoring layout:', error);
  }
}

// Reset layout to original
async function resetLayout() {
  try {
    if (!dragState.diagramHash) {
      showNotification('No diagram to reset', 'error');
      return;
    }

    // Remove saved layout
    const result = await chrome.storage.local.get(['diagramLayouts']);
    const layouts = result.diagramLayouts || {};

    if (layouts[dragState.diagramHash]) {
      delete layouts[dragState.diagramHash];
      await chrome.storage.local.set({ diagramLayouts: layouts });
    }

    // Re-render the diagram
    await updatePreview();

    showNotification('Layout reset to original', 'success');
    console.log('Layout reset for diagram:', dragState.diagramHash);
  } catch (error) {
    console.error('Error resetting layout:', error);
    showNotification('Failed to reset layout', 'error');
  }
}

// Toggle grid snap
function toggleGridSnap() {
  const btn = document.getElementById('gridSnapBtn');
  dragState.gridSnap = !dragState.gridSnap;

  if (dragState.gridSnap) {
    btn.classList.add('active');
    showNotification(`Grid snap enabled (${dragState.gridSize}px)`, 'success');
  } else {
    btn.classList.remove('active');
    showNotification('Grid snap disabled', 'success');
  }
}

// Align nodes
async function alignNodes(alignment) {
  const svg = preview.querySelector('svg');
  if (!svg) {
    showNotification('No diagram to align', 'error');
    return;
  }

  const nodes = svg.querySelectorAll('g[transform*="translate"]');
  if (nodes.length === 0) {
    showNotification('No nodes to align', 'error');
    return;
  }

  // Get all node positions and bounding boxes
  const nodeData = [];
  nodes.forEach((node, index) => {
    const transform = node.getAttribute('transform');
    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translateMatch) {
      const bbox = node.getBBox();
      nodeData.push({
        node,
        index,
        x: parseFloat(translateMatch[1]),
        y: parseFloat(translateMatch[2]),
        bbox
      });
    }
  });

  if (nodeData.length === 0) return;

  // Calculate alignment position
  let alignX, alignY;

  switch (alignment) {
    case 'left':
      alignX = Math.min(...nodeData.map(d => d.x));
      nodeData.forEach(data => {
        const transform = data.node.getAttribute('transform') || '';
        const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();
        const newTransform = `translate(${alignX},${data.y}) ${otherTransforms}`.trim();
        data.node.setAttribute('transform', newTransform);
      });
      break;

    case 'center':
      const minX = Math.min(...nodeData.map(d => d.x + d.bbox.x));
      const maxX = Math.max(...nodeData.map(d => d.x + d.bbox.x + d.bbox.width));
      const centerX = (minX + maxX) / 2;

      nodeData.forEach(data => {
        const nodeCenterX = data.x + data.bbox.x + data.bbox.width / 2;
        const offsetX = centerX - nodeCenterX;
        const newX = data.x + offsetX;

        const transform = data.node.getAttribute('transform') || '';
        const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();
        const newTransform = `translate(${newX},${data.y}) ${otherTransforms}`.trim();
        data.node.setAttribute('transform', newTransform);
      });
      break;

    case 'right':
      const maxRight = Math.max(...nodeData.map(d => d.x + d.bbox.x + d.bbox.width));
      nodeData.forEach(data => {
        const nodeRight = data.x + data.bbox.x + data.bbox.width;
        const offsetX = maxRight - nodeRight;
        const newX = data.x + offsetX;

        const transform = data.node.getAttribute('transform') || '';
        const otherTransforms = transform.replace(/translate\([^)]+\)/, '').trim();
        const newTransform = `translate(${newX},${data.y}) ${otherTransforms}`.trim();
        data.node.setAttribute('transform', newTransform);
      });
      break;
  }

  // Save layout after alignment
  await saveLayout(svg, dragState.diagramHash);

  showNotification(`Nodes aligned ${alignment}`, 'success');
}

// ==============================================
// EDGE AND CANVAS UTILITIES
// ==============================================

/**
 * Update edges connected to a node when it moves
 * Recalculates edge paths to maintain connections
 *
 * @param {SVGElement} svg - The SVG container
 * @param {SVGElement} node - The node that was moved
 */
function updateConnectedEdges(svg, node) {
  try {
    // Get node's bounding box in SVG coordinate space
    const nodeBBox = node.getBBox();
    const nodeTransform = node.getAttribute('transform') || '';
    const translateMatch = nodeTransform.match(/translate\(([^,]+),([^)]+)\)/);

    if (!translateMatch) return;

    const nodeX = parseFloat(translateMatch[1]);
    const nodeY = parseFloat(translateMatch[2]);

    // Calculate node center point
    const nodeCenterX = nodeX + nodeBBox.x + nodeBBox.width / 2;
    const nodeCenterY = nodeY + nodeBBox.y + nodeBBox.height / 2;

    // Get node ID from various possible attributes
    const nodeId = node.id ||
                   node.getAttribute('data-id') ||
                   node.getAttribute('class')?.match(/node-(\w+)/)?.[1] ||
                   Array.from(node.querySelectorAll('[id]'))[0]?.id;

    if (!nodeId) return;

    // Find all edges (paths) in the diagram
    const edges = svg.querySelectorAll('path.flowchart-link, path.edge-pattern, path[class*="edge"], path[marker-end], g.edgePath path');

    edges.forEach(edge => {
      // Check if this edge is connected to the moved node
      const edgeClasses = edge.getAttribute('class') || '';
      const edgeId = edge.id || edge.parentElement?.id || '';

      // Try to determine if this edge is connected to our node
      if (edgeClasses.includes(nodeId) || edgeId.includes(nodeId)) {
        // Get the current path data
        const pathData = edge.getAttribute('d');
        if (!pathData) return;

        // Parse path commands
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
        if (!commands || commands.length < 2) return;

        // Update first point (if this edge starts from our node)
        let updatedPath = pathData;
        const firstCommand = commands[0];
        if (firstCommand.startsWith('M')) {
          const coords = firstCommand.substring(1).trim().split(/[\s,]+/);
          if (coords.length >= 2) {
            const firstX = parseFloat(coords[0]);
            const firstY = parseFloat(coords[1]);

            // If the first point is close to the node, update it
            const distance = Math.sqrt(Math.pow(firstX - nodeCenterX, 2) + Math.pow(firstY - nodeCenterY, 2));
            if (distance < 200) { // Threshold for connection detection
              updatedPath = updatedPath.replace(/^M[\s\d,.-]+/, `M${nodeCenterX},${nodeCenterY}`);
            }
          }
        }

        // Update last point (if this edge ends at our node)
        const lastCommand = commands[commands.length - 1];
        const lastCoordMatch = lastCommand.match(/([\d.-]+),([\d.-]+)/g);
        if (lastCoordMatch && lastCoordMatch.length > 0) {
          const lastCoords = lastCoordMatch[lastCoordMatch.length - 1].split(',');
          const lastX = parseFloat(lastCoords[0]);
          const lastY = parseFloat(lastCoords[1]);

          // If the last point is close to the node, update it
          const distance = Math.sqrt(Math.pow(lastX - nodeCenterX, 2) + Math.pow(lastY - nodeCenterY, 2));
          if (distance < 200) {
            // Find the last coordinate pair and replace it
            const coordPattern = /([\d.-]+),([\d.-]+)(?![\d.-])/;
            const matches = [...updatedPath.matchAll(new RegExp(coordPattern, 'g'))];
            if (matches.length > 0) {
              const lastMatch = matches[matches.length - 1];
              updatedPath = updatedPath.substring(0, lastMatch.index) +
                           `${nodeCenterX},${nodeCenterY}` +
                           updatedPath.substring(lastMatch.index + lastMatch[0].length);
            }
          }
        }

        edge.setAttribute('d', updatedPath);
      }
    });
  } catch (error) {
    console.error('Error updating edges:', error);
  }
}

/**
 * Expand SVG canvas when nodes are dragged outside bounds
 * Dynamically adjusts viewBox to accommodate all nodes
 *
 * @param {SVGElement} svg - The SVG container
 * @param {SVGElement} node - The node being dragged
 */
function expandCanvasIfNeeded(svg, node) {
  try {
    // Get current viewBox or create default
    let viewBox = svg.getAttribute('viewBox');
    let vbX = 0, vbY = 0, vbWidth = 800, vbHeight = 600;

    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/);
      vbX = parseFloat(parts[0]) || 0;
      vbY = parseFloat(parts[1]) || 0;
      vbWidth = parseFloat(parts[2]) || 800;
      vbHeight = parseFloat(parts[3]) || 600;
    } else {
      // Initialize viewBox from SVG dimensions
      const svgWidth = parseFloat(svg.getAttribute('width')) || 800;
      const svgHeight = parseFloat(svg.getAttribute('height')) || 600;
      vbWidth = svgWidth;
      vbHeight = svgHeight;
    }

    // Get node's bounding box
    const nodeBBox = node.getBBox();
    const nodeTransform = node.getAttribute('transform') || '';
    const translateMatch = nodeTransform.match(/translate\(([^,]+),([^)]+)\)/);

    if (!translateMatch) return;

    const nodeX = parseFloat(translateMatch[1]);
    const nodeY = parseFloat(translateMatch[2]);

    // Calculate node bounds in SVG space
    const nodeLeft = nodeX + nodeBBox.x;
    const nodeRight = nodeX + nodeBBox.x + nodeBBox.width;
    const nodeTop = nodeY + nodeBBox.y;
    const nodeBottom = nodeY + nodeBBox.y + nodeBBox.height;

    // Add padding
    const padding = 50;

    // Check if expansion is needed
    let needsExpansion = false;
    let newVbX = vbX, newVbY = vbY, newVbWidth = vbWidth, newVbHeight = vbHeight;

    // Expand left
    if (nodeLeft < vbX + padding) {
      newVbX = nodeLeft - padding;
      newVbWidth = vbWidth + (vbX - newVbX);
      needsExpansion = true;
    }

    // Expand right
    if (nodeRight > vbX + vbWidth - padding) {
      newVbWidth = nodeRight - newVbX + padding;
      needsExpansion = true;
    }

    // Expand top
    if (nodeTop < vbY + padding) {
      newVbY = nodeTop - padding;
      newVbHeight = vbHeight + (vbY - newVbY);
      needsExpansion = true;
    }

    // Expand bottom
    if (nodeBottom > vbY + vbHeight - padding) {
      newVbHeight = nodeBottom - newVbY + padding;
      needsExpansion = true;
    }

    // Apply new viewBox if needed
    if (needsExpansion) {
      svg.setAttribute('viewBox', `${newVbX} ${newVbY} ${newVbWidth} ${newVbHeight}`);

      // Also update SVG dimensions to maintain aspect ratio
      svg.setAttribute('width', newVbWidth);
      svg.setAttribute('height', newVbHeight);
    }
  } catch (error) {
    console.error('Error expanding canvas:', error);
  }
}
