// Library page functionality

let diagrams = [];
let filteredDiagrams = [];
let selectedDiagram = null;
let viewMode = 'grid'; // 'grid' or 'list'

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadDiagrams();
  setupEventListeners();
  renderDiagrams();
});

// Load diagrams from storage
async function loadDiagrams() {
  try {
    const result = await chrome.storage.local.get(['diagrams']);
    diagrams = result.diagrams || [];
    filteredDiagrams = [...diagrams];
    updateCount();
  } catch (error) {
    console.error('Error loading diagrams:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // New diagram button
  document.getElementById('newDiagramBtn').addEventListener('click', createNewDiagram);

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Filters
  document.getElementById('typeFilter').addEventListener('change', applyFilters);
  document.getElementById('sortBy').addEventListener('change', applyFilters);

  // View mode
  document.getElementById('viewGridBtn').addEventListener('click', () => setViewMode('grid'));
  document.getElementById('viewListBtn').addEventListener('click', () => setViewMode('list'));

  // Delete modal
  document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

  // Close context menu on click outside
  document.addEventListener('click', () => {
    document.getElementById('contextMenu').style.display = 'none';
  });

  // Context menu actions
  document.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', handleContextAction);
  });
}

// Create new diagram
function createNewDiagram() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/editor/editor.html') });
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase();

  filteredDiagrams = diagrams.filter(diagram => {
    return (
      diagram.title.toLowerCase().includes(query) ||
      diagram.code.toLowerCase().includes(query) ||
      diagram.type.toLowerCase().includes(query)
    );
  });

  applyFilters();
}

// Apply filters and sorting
function applyFilters() {
  const typeFilter = document.getElementById('typeFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  // Apply type filter
  let filtered = [...filteredDiagrams];
  if (typeFilter !== 'all') {
    filtered = filtered.filter(d => d.type === typeFilter);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  filteredDiagrams = filtered;
  renderDiagrams();
}

// Set view mode
function setViewMode(mode) {
  viewMode = mode;

  // Update buttons
  document.getElementById('viewGridBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('viewListBtn').classList.toggle('active', mode === 'list');

  // Update grid
  const grid = document.getElementById('diagramGrid');
  grid.classList.toggle('list-view', mode === 'list');
}

// Render diagrams
function renderDiagrams() {
  const emptyState = document.getElementById('emptyState');
  const grid = document.getElementById('diagramGrid');

  if (filteredDiagrams.length === 0) {
    emptyState.style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  grid.style.display = 'grid';

  grid.innerHTML = filteredDiagrams.map(diagram => createDiagramCard(diagram)).join('');

  // Add event listeners to cards
  grid.querySelectorAll('.diagram-card').forEach(card => {
    const id = card.dataset.id;
    const diagram = diagrams.find(d => d.id === id);

    // Click to open
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.more-btn') && !e.target.closest('.diagram-actions')) {
        openDiagram(id);
      }
    });

    // More button
    const moreBtn = card.querySelector('.more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showContextMenu(e, diagram);
      });
    }

    // Action buttons
    const editBtn = card.querySelector('[data-action="edit"]');
    const exportBtn = card.querySelector('[data-action="export"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    if (editBtn) editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDiagram(id);
    });

    if (exportBtn) exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDiagram(diagram);
    });

    if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteModal(diagram);
    });
  });
}

// Create diagram card HTML
function createDiagramCard(diagram) {
  const typeIcons = {
    flowchart: '📊',
    sequence: '↔️',
    class: '🏗️',
    c4: '🏛️',
    er: '🗄️',
    state: '🔄',
    gantt: '📅',
    pie: '🥧',
    git: '🌳'
  };

  const icon = typeIcons[diagram.type] || '📄';
  const formattedDate = formatDate(diagram.updatedAt);

  return `
    <div class="diagram-card" data-id="${diagram.id}">
      <button class="more-btn">⋮</button>
      <div class="diagram-preview">
        <div style="font-size: 48px; opacity: 0.3;">${icon}</div>
        <span class="diagram-type-badge">${diagram.type}</span>
      </div>
      <div class="diagram-content">
        <h3 class="diagram-title">${escapeHtml(diagram.title)}</h3>
        <div class="diagram-meta">
          <span>${formattedDate}</span>
          <span>${getLineCount(diagram.code)} lines</span>
        </div>
        <div class="diagram-actions">
          <button data-action="edit">Edit</button>
          <button data-action="export">Export</button>
          <button data-action="delete">Delete</button>
        </div>
      </div>
    </div>
  `;
}

// Open diagram in editor
function openDiagram(id) {
  const diagram = diagrams.find(d => d.id === id);
  if (diagram) {
    const url = chrome.runtime.getURL('src/editor/editor.html');
    const params = `?code=${encodeURIComponent(diagram.code)}`;
    chrome.tabs.create({ url: url + params });
  }
}

// Show context menu
function showContextMenu(event, diagram) {
  const menu = document.getElementById('contextMenu');
  selectedDiagram = diagram;

  menu.style.display = 'block';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
}

// Handle context menu actions
function handleContextAction(e) {
  const action = e.currentTarget.dataset.action;

  if (!selectedDiagram) return;

  switch (action) {
    case 'open':
      openDiagram(selectedDiagram.id);
      break;
    case 'duplicate':
      duplicateDiagram(selectedDiagram);
      break;
    case 'export':
      exportDiagram(selectedDiagram);
      break;
    case 'delete':
      showDeleteModal(selectedDiagram);
      break;
  }

  document.getElementById('contextMenu').style.display = 'none';
}

// Duplicate diagram
async function duplicateDiagram(diagram) {
  const newDiagram = {
    ...diagram,
    id: generateId(),
    title: diagram.title + ' (Copy)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  diagrams.push(newDiagram);
  await chrome.storage.local.set({ diagrams });

  await loadDiagrams();
  applyFilters();
}

// Export diagram
function exportDiagram(diagram) {
  const dataStr = JSON.stringify({
    title: diagram.title,
    type: diagram.type,
    code: diagram.code,
    createdAt: diagram.createdAt,
    updatedAt: diagram.updatedAt
  }, null, 2);

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${diagram.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Show delete modal
function showDeleteModal(diagram) {
  selectedDiagram = diagram;
  document.getElementById('deleteTitle').textContent = diagram.title;
  document.getElementById('deleteModal').classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  selectedDiagram = null;
}

// Confirm delete
async function confirmDelete() {
  if (!selectedDiagram) return;

  diagrams = diagrams.filter(d => d.id !== selectedDiagram.id);
  await chrome.storage.local.set({ diagrams });

  hideDeleteModal();
  await loadDiagrams();
  applyFilters();
}

// Update diagram count
function updateCount() {
  const count = diagrams.length;
  const text = count === 1 ? '1 diagram' : `${count} diagrams`;
  document.getElementById('diagramCount').textContent = text;
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return date.toLocaleDateString();
}

function getLineCount(code) {
  return code.split('\n').length;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
