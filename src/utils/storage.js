// Storage utility functions

/**
 * Save a diagram to Chrome storage
 * @param {Object} diagram - The diagram object to save
 * @returns {Promise<Object>} The saved diagram
 */
export async function saveDiagram(diagram) {
  const result = await chrome.storage.local.get(['diagrams']);
  let diagrams = result.diagrams || [];

  // Ensure diagram has required fields
  const diagramToSave = {
    id: diagram.id || generateId(),
    title: diagram.title || 'Untitled Diagram',
    code: diagram.code || '',
    type: diagram.type || 'unknown',
    createdAt: diagram.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: diagram.tags || []
  };

  const index = diagrams.findIndex(d => d.id === diagramToSave.id);
  if (index >= 0) {
    diagrams[index] = diagramToSave;
  } else {
    diagrams.push(diagramToSave);
  }

  await chrome.storage.local.set({ diagrams });
  return diagramToSave;
}

/**
 * Get all diagrams from storage
 * @returns {Promise<Array>} Array of diagrams
 */
export async function getDiagrams() {
  const result = await chrome.storage.local.get(['diagrams']);
  return result.diagrams || [];
}

/**
 * Get a single diagram by ID
 * @param {string} id - The diagram ID
 * @returns {Promise<Object|null>} The diagram or null if not found
 */
export async function getDiagram(id) {
  const diagrams = await getDiagrams();
  return diagrams.find(d => d.id === id) || null;
}

/**
 * Delete a diagram
 * @param {string} id - The diagram ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteDiagram(id) {
  const result = await chrome.storage.local.get(['diagrams']);
  let diagrams = result.diagrams || [];

  const initialLength = diagrams.length;
  diagrams = diagrams.filter(d => d.id !== id);

  if (diagrams.length < initialLength) {
    await chrome.storage.local.set({ diagrams });
    return true;
  }

  return false;
}

/**
 * Get settings from storage
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings || {
    theme: 'light',
    autoSave: true,
    defaultTemplate: 'flowchart',
    autoRender: true,
    fontSize: 14,
    lineNumbers: true
  };
}

/**
 * Update settings
 * @param {Object} settings - Settings object to save
 * @returns {Promise<void>}
 */
export async function updateSettings(settings) {
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...settings };
  await chrome.storage.local.set({ settings: newSettings });
}

/**
 * Search diagrams by title or content
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching diagrams
 */
export async function searchDiagrams(query) {
  const diagrams = await getDiagrams();
  const lowerQuery = query.toLowerCase();

  return diagrams.filter(diagram =>
    diagram.title.toLowerCase().includes(lowerQuery) ||
    diagram.code.toLowerCase().includes(lowerQuery) ||
    diagram.type.toLowerCase().includes(lowerQuery) ||
    (diagram.tags && diagram.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
}

/**
 * Get diagrams by type
 * @param {string} type - Diagram type
 * @returns {Promise<Array>} Diagrams of specified type
 */
export async function getDiagramsByType(type) {
  const diagrams = await getDiagrams();
  return diagrams.filter(d => d.type === type);
}

/**
 * Export all diagrams as JSON
 * @returns {Promise<string>} JSON string of all diagrams
 */
export async function exportAllDiagrams() {
  const diagrams = await getDiagrams();
  const settings = await getSettings();

  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    diagrams,
    settings
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import diagrams from JSON
 * @param {string} jsonString - JSON string to import
 * @returns {Promise<Object>} Import result with count
 */
export async function importDiagrams(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.diagrams || !Array.isArray(data.diagrams)) {
      throw new Error('Invalid import format: diagrams array not found');
    }

    const result = await chrome.storage.local.get(['diagrams']);
    let existingDiagrams = result.diagrams || [];

    // Import diagrams (avoid duplicates by ID)
    let importedCount = 0;
    let skippedCount = 0;

    for (const diagram of data.diagrams) {
      const exists = existingDiagrams.some(d => d.id === diagram.id);

      if (!exists) {
        existingDiagrams.push(diagram);
        importedCount++;
      } else {
        skippedCount++;
      }
    }

    await chrome.storage.local.set({ diagrams: existingDiagrams });

    // Optionally import settings
    if (data.settings) {
      await updateSettings(data.settings);
    }

    return {
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: data.diagrams.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear all diagrams (with confirmation)
 * @returns {Promise<boolean>} True if cleared
 */
export async function clearAllDiagrams() {
  await chrome.storage.local.set({ diagrams: [] });
  return true;
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} Storage stats
 */
export async function getStorageStats() {
  const diagrams = await getDiagrams();

  const stats = {
    totalDiagrams: diagrams.length,
    totalSize: JSON.stringify(diagrams).length,
    byType: {},
    oldestDiagram: null,
    newestDiagram: null
  };

  // Count by type
  diagrams.forEach(d => {
    stats.byType[d.type] = (stats.byType[d.type] || 0) + 1;
  });

  // Find oldest and newest
  if (diagrams.length > 0) {
    const sorted = [...diagrams].sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    stats.oldestDiagram = sorted[0];
    stats.newestDiagram = sorted[sorted.length - 1];
  }

  return stats;
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
