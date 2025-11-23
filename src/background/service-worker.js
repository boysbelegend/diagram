// Background Service Worker

// Extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Mermaid Diagram Editor installed');

    // Initialize storage
    chrome.storage.local.set({
      diagrams: [],
      settings: {
        theme: 'light',
        autoSave: true,
        defaultTemplate: 'flowchart'
      }
    });

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/editor/editor.html')
    });
  } else if (details.reason === 'update') {
    console.log('Mermaid Diagram Editor updated');
  }

  // Create context menu
  setupContextMenu();
});

// Setup context menu
function setupContextMenu() {
  // Remove existing menus
  chrome.contextMenus.removeAll(() => {
    // Create new diagram menu
    chrome.contextMenus.create({
      id: 'newDiagram',
      title: 'New Mermaid Diagram',
      contexts: ['page', 'selection']
    });

    // Create diagram from selection
    chrome.contextMenus.create({
      id: 'diagramFromSelection',
      title: 'Create Diagram from Selection',
      contexts: ['selection']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'separator1',
      type: 'separator',
      contexts: ['page']
    });

    // Template submenu
    chrome.contextMenus.create({
      id: 'templates',
      title: 'New from Template',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-flowchart',
      parentId: 'templates',
      title: 'Flowchart',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-sequence',
      parentId: 'templates',
      title: 'Sequence Diagram',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-class',
      parentId: 'templates',
      title: 'Class Diagram',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-c4',
      parentId: 'templates',
      title: 'C4 Diagram',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-er',
      parentId: 'templates',
      title: 'ER Diagram',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'template-gantt',
      parentId: 'templates',
      title: 'Gantt Chart',
      contexts: ['page']
    });
  });
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'newDiagram') {
    openEditor();
  } else if (info.menuItemId === 'diagramFromSelection') {
    openEditor(info.selectionText);
  } else if (info.menuItemId.startsWith('template-')) {
    const templateType = info.menuItemId.replace('template-', '');
    openEditorWithTemplate(templateType);
  }
});

// Open editor
function openEditor(code = null) {
  const url = chrome.runtime.getURL('src/editor/editor.html');
  const params = code ? `?code=${encodeURIComponent(code)}` : '';
  chrome.tabs.create({ url: url + params });
}

// Open editor with template
async function openEditorWithTemplate(templateType) {
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
    B->>A: Hello Alice!`,

    class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,

    c4: `C4Context
    title System Context diagram for Internet Banking System

    Person(customer, "Personal Banking Customer", "A customer of the bank")
    System(banking_system, "Internet Banking System", "Allows customers to view information")
    System_Ext(mail_system, "E-mail system", "The internal email system")

    Rel(customer, banking_system, "Uses")
    Rel(banking_system, mail_system, "Sends e-mails", "SMTP")`,

    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }`,

    gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements    :a1, 2024-01-01, 30d
    Design          :a2, after a1, 20d`
  };

  const code = templates[templateType] || templates.flowchart;
  openEditor(code);
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'saveDiagram') {
    saveDiagram(message.diagram)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (message.type === 'getDiagrams') {
    getDiagrams()
      .then((diagrams) => sendResponse({ diagrams }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'deleteDiagram') {
    deleteDiagram(message.id)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'getSettings') {
    getSettings()
      .then((settings) => sendResponse({ settings }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'updateSettings') {
    updateSettings(message.settings)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Storage functions
async function saveDiagram(diagram) {
  const result = await chrome.storage.local.get(['diagrams']);
  let diagrams = result.diagrams || [];

  const index = diagrams.findIndex(d => d.id === diagram.id);
  if (index >= 0) {
    diagrams[index] = diagram;
  } else {
    diagrams.push(diagram);
  }

  await chrome.storage.local.set({ diagrams });
  return diagram;
}

async function getDiagrams() {
  const result = await chrome.storage.local.get(['diagrams']);
  return result.diagrams || [];
}

async function deleteDiagram(id) {
  const result = await chrome.storage.local.get(['diagrams']);
  let diagrams = result.diagrams || [];

  diagrams = diagrams.filter(d => d.id !== id);

  await chrome.storage.local.set({ diagrams });
}

async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings || {
    theme: 'light',
    autoSave: true,
    defaultTemplate: 'flowchart'
  };
}

async function updateSettings(settings) {
  await chrome.storage.local.set({ settings });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'new-diagram') {
    openEditor();
  } else if (command === 'open-editor') {
    openEditor();
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by the popup, but can be used as fallback
  // if popup fails to load
  console.log('Extension icon clicked');
});

console.log('Mermaid Diagram Editor: Background service worker loaded');
