// Editor state
let currentDiagram = null;
let debounceTimer = null;
let zoomLevel = 100;

// DOM elements
const codeEditor = document.getElementById('codeEditor');
const preview = document.getElementById('preview');
const errorMessage = document.getElementById('errorMessage');
const diagramTitle = document.getElementById('diagramTitle');
const lineCount = document.getElementById('lineCount');
const charCount = document.getElementById('charCount');
const status = document.getElementById('status');
const lastSaved = document.getElementById('lastSaved');
const zoomLevelDisplay = document.getElementById('zoomLevel');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFromURL();
  setupEventListeners();
  updatePreview();
  updateStats();
});

// Load diagram from URL parameters
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    codeEditor.value = decodeURIComponent(code);
  }
}

// Setup event listeners
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
  document.getElementById('exportPngBtn').addEventListener('click', exportAsPNG);
  document.getElementById('exportSvgBtn').addEventListener('click', exportAsSVG);
  document.getElementById('copyBtn').addEventListener('click', copyCode);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('helpBtn').addEventListener('click', showHelp);

  // Editor actions
  document.getElementById('formatBtn').addEventListener('click', formatCode);
  document.getElementById('clearBtn').addEventListener('click', clearEditor);

  // Preview actions
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

// Debounced preview update
function debounceUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updatePreview();
  }, 500);
}

// Update preview
async function updatePreview() {
  const code = codeEditor.value.trim();

  if (!code) {
    preview.innerHTML = '<p style="color: #9ca3af;">Start typing to see preview...</p>';
    errorMessage.style.display = 'none';
    return;
  }

  try {
    status.textContent = 'Rendering...';
    errorMessage.style.display = 'none';

    // Clear previous diagram
    preview.innerHTML = '';

    // Create container for mermaid
    const container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = code;
    preview.appendChild(container);

    // Render with mermaid
    const { svg } = await window.mermaid.render('preview-diagram', code);
    preview.innerHTML = svg;

    status.textContent = 'Ready';
  } catch (error) {
    console.error('Mermaid render error:', error);
    preview.innerHTML = '';
    errorMessage.textContent = `Error: ${error.message || 'Invalid diagram syntax'}`;
    errorMessage.style.display = 'block';
    status.textContent = 'Error';
  }
}

// Update stats
function updateStats() {
  const code = codeEditor.value;
  const lines = code.split('\n').length;
  const chars = code.length;

  lineCount.textContent = `Lines: ${lines}`;
  charCount.textContent = `Characters: ${chars}`;
}

// Save diagram
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

    // Show success feedback
    showNotification('Diagram saved successfully!', 'success');
  } catch (error) {
    console.error('Save error:', error);
    showNotification('Failed to save diagram', 'error');
  }
}

// Export as PNG
async function exportAsPNG() {
  try {
    const svgElement = preview.querySelector('svg');
    if (!svgElement) {
      showNotification('No diagram to export', 'error');
      return;
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        downloadBlob(blob, `${diagramTitle.value || 'diagram'}.png`);
        showNotification('Exported as PNG', 'success');
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (error) {
    console.error('Export PNG error:', error);
    showNotification('Failed to export PNG', 'error');
  }
}

// Export as SVG
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

// Copy code
function copyCode() {
  codeEditor.select();
  document.execCommand('copy');
  showNotification('Code copied to clipboard', 'success');
}

// Toggle theme
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Update mermaid theme
  window.mermaid.initialize({
    theme: isDark ? 'dark' : 'default'
  });
  updatePreview();
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

  // Escape: Close modal
  if (e.key === 'Escape') {
    document.getElementById('helpModal').style.display = 'none';
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

function showNotification(message, type = 'info') {
  // Simple notification - could be enhanced with a toast library
  const oldStatus = status.textContent;
  status.textContent = message;
  status.style.color = type === 'success' ? 'var(--success-color)' :
                       type === 'error' ? 'var(--error-color)' :
                       'var(--text-secondary)';

  setTimeout(() => {
    status.textContent = oldStatus;
    status.style.color = 'var(--text-secondary)';
  }, 3000);
}

// Load theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
  window.mermaid?.initialize({ theme: 'dark' });
}
