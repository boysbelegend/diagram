// Settings page functionality

let settings = {};

// Default settings
const defaultSettings = {
  theme: 'light',
  defaultTemplate: 'flowchart',
  autoRender: true,
  showNotifications: true,
  fontSize: 14,
  tabSize: 2,
  lineNumbers: true,
  wordWrap: false,
  autoSave: true,
  autoSaveInterval: 30,
  exportFormat: 'png',
  exportQuality: 2,
  includeBackground: true
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  updateStorageStats();
  applyTheme();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    settings = { ...defaultSettings, ...result.settings };
    populateForm();
  } catch (error) {
    console.error('Error loading settings:', error);
    settings = { ...defaultSettings };
  }
}

// Populate form with settings
function populateForm() {
  // General
  document.getElementById('theme').value = settings.theme || 'light';
  document.getElementById('defaultTemplate').value = settings.defaultTemplate || 'flowchart';
  document.getElementById('autoRender').checked = settings.autoRender !== false;
  document.getElementById('showNotifications').checked = settings.showNotifications !== false;

  // Editor
  document.getElementById('fontSize').value = settings.fontSize || 14;
  document.getElementById('fontSizeValue').textContent = `${settings.fontSize || 14}px`;
  document.getElementById('tabSize').value = settings.tabSize || 2;
  document.getElementById('tabSizeValue').textContent = `${settings.tabSize || 2} spaces`;
  document.getElementById('lineNumbers').checked = settings.lineNumbers !== false;
  document.getElementById('wordWrap').checked = settings.wordWrap === true;
  document.getElementById('autoSave').checked = settings.autoSave !== false;
  document.getElementById('autoSaveInterval').value = settings.autoSaveInterval || 30;
  document.getElementById('autoSaveIntervalValue').textContent = `${settings.autoSaveInterval || 30}s`;

  // Export
  document.getElementById('exportFormat').value = settings.exportFormat || 'png';
  document.getElementById('exportQuality').value = settings.exportQuality || 2;
  document.getElementById('exportQualityValue').textContent = `${settings.exportQuality || 2}x`;
  document.getElementById('includeBackground').checked = settings.includeBackground !== false;
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/editor/editor.html') });
  });

  // Range inputs
  const rangeInputs = [
    { id: 'fontSize', suffix: 'px' },
    { id: 'tabSize', suffix: ' spaces' },
    { id: 'autoSaveInterval', suffix: 's' },
    { id: 'exportQuality', suffix: 'x' }
  ];

  rangeInputs.forEach(({ id, suffix }) => {
    const input = document.getElementById(id);
    const valueSpan = document.getElementById(`${id}Value`);

    input.addEventListener('input', () => {
      valueSpan.textContent = `${input.value}${suffix}`;
    });
  });

  // Theme change
  document.getElementById('theme').addEventListener('change', (e) => {
    settings.theme = e.target.value;
    applyTheme();
  });

  // Save button
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

  // Export data
  document.getElementById('exportDataBtn').addEventListener('click', exportData);

  // Import data
  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importDataInput').click();
  });

  document.getElementById('importDataInput').addEventListener('change', importData);

  // Clear data
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

// Switch section
function switchSection(sectionId) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

  // Update content
  document.querySelectorAll('.settings-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
}

// Save settings
async function saveSettings() {
  const statusSpan = document.getElementById('saveStatus');

  try {
    // Collect all settings
    settings = {
      theme: document.getElementById('theme').value,
      defaultTemplate: document.getElementById('defaultTemplate').value,
      autoRender: document.getElementById('autoRender').checked,
      showNotifications: document.getElementById('showNotifications').checked,
      fontSize: parseInt(document.getElementById('fontSize').value),
      tabSize: parseInt(document.getElementById('tabSize').value),
      lineNumbers: document.getElementById('lineNumbers').checked,
      wordWrap: document.getElementById('wordWrap').checked,
      autoSave: document.getElementById('autoSave').checked,
      autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value),
      exportFormat: document.getElementById('exportFormat').value,
      exportQuality: parseInt(document.getElementById('exportQuality').value),
      includeBackground: document.getElementById('includeBackground').checked
    };

    // Save to storage
    await chrome.storage.local.set({ settings });

    // Apply theme
    applyTheme();

    // Show success
    statusSpan.textContent = '✓ Settings saved';
    statusSpan.className = 'save-status success';

    setTimeout(() => {
      statusSpan.textContent = '';
      statusSpan.className = 'save-status';
    }, 3000);

  } catch (error) {
    console.error('Error saving settings:', error);
    statusSpan.textContent = '✗ Failed to save';
    statusSpan.className = 'save-status error';
  }
}

// Reset settings
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    settings = { ...defaultSettings };
    await chrome.storage.local.set({ settings });
    populateForm();
    applyTheme();

    const statusSpan = document.getElementById('saveStatus');
    statusSpan.textContent = '✓ Settings reset';
    statusSpan.className = 'save-status success';
  }
}

// Apply theme
function applyTheme() {
  const theme = settings.theme || 'light';

  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (theme === 'light') {
    document.body.classList.remove('dark-theme');
  } else if (theme === 'auto') {
    // Auto theme based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

// Update storage stats
async function updateStorageStats() {
  try {
    const result = await chrome.storage.local.get(['diagrams']);
    const diagrams = result.diagrams || [];

    document.getElementById('totalDiagrams').textContent = diagrams.length;

    const storageSize = JSON.stringify(diagrams).length;
    const sizeKB = (storageSize / 1024).toFixed(2);
    document.getElementById('storageUsed').textContent = `${sizeKB} KB`;

  } catch (error) {
    console.error('Error getting storage stats:', error);
  }
}

// Export data
async function exportData() {
  try {
    const result = await chrome.storage.local.get(['diagrams', 'settings']);

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      diagrams: result.diagrams || [],
      settings: result.settings || {}
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-diagrams-backup-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    const statusSpan = document.getElementById('saveStatus');
    statusSpan.textContent = '✓ Data exported';
    statusSpan.className = 'save-status success';

    setTimeout(() => {
      statusSpan.textContent = '';
      statusSpan.className = 'save-status';
    }, 3000);

  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data');
  }
}

// Import data
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.diagrams || !Array.isArray(data.diagrams)) {
        throw new Error('Invalid import format');
      }

      // Confirm import
      const count = data.diagrams.length;
      if (!confirm(`Import ${count} diagram(s)? This will merge with existing diagrams.`)) {
        return;
      }

      // Get existing data
      const existing = await chrome.storage.local.get(['diagrams']);
      let diagrams = existing.diagrams || [];

      // Merge diagrams (avoid duplicates by ID)
      let importedCount = 0;
      for (const diagram of data.diagrams) {
        const exists = diagrams.some(d => d.id === diagram.id);
        if (!exists) {
          diagrams.push(diagram);
          importedCount++;
        }
      }

      // Save merged data
      await chrome.storage.local.set({ diagrams });

      // Optionally import settings
      if (data.settings && confirm('Also import settings?')) {
        await chrome.storage.local.set({ settings: data.settings });
        settings = data.settings;
        populateForm();
        applyTheme();
      }

      // Update stats
      await updateStorageStats();

      const statusSpan = document.getElementById('saveStatus');
      statusSpan.textContent = `✓ Imported ${importedCount} diagram(s)`;
      statusSpan.className = 'save-status success';

    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data: ' + error.message);
    }
  };

  reader.readAsText(file);

  // Reset input
  event.target.value = '';
}

// Clear all data
async function clearAllData() {
  const result = await chrome.storage.local.get(['diagrams']);
  const count = (result.diagrams || []).length;

  if (!count) {
    alert('No diagrams to delete');
    return;
  }

  const confirmation = prompt(
    `⚠️ WARNING: This will permanently delete all ${count} diagram(s).\n\n` +
    `Type "DELETE" to confirm:`
  );

  if (confirmation === 'DELETE') {
    try {
      await chrome.storage.local.set({ diagrams: [] });
      await updateStorageStats();

      const statusSpan = document.getElementById('saveStatus');
      statusSpan.textContent = '✓ All data cleared';
      statusSpan.className = 'save-status success';

      setTimeout(() => {
        statusSpan.textContent = '';
        statusSpan.className = 'save-status';
      }, 3000);

    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data');
    }
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (settings.theme === 'auto') {
    applyTheme();
  }
});
