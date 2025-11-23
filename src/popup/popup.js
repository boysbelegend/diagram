// Popup functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Load recent diagrams
  loadRecentDiagrams();

  // New diagram button
  document.getElementById('newDiagramBtn').addEventListener('click', () => {
    openEditor();
  });

  // Open editor button
  document.getElementById('openEditorBtn').addEventListener('click', () => {
    openEditor();
  });

  // Template buttons
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      const template = await getTemplate(type);
      openEditor(template);
    });
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
  });
});

// Open editor in new tab
function openEditor(initialCode = null) {
  const url = chrome.runtime.getURL('src/editor/editor.html');
  const params = initialCode ? `?code=${encodeURIComponent(initialCode)}` : '';
  chrome.tabs.create({ url: url + params });
}

// Load recent diagrams from storage
async function loadRecentDiagrams() {
  try {
    const result = await chrome.storage.local.get(['diagrams']);
    const diagrams = result.diagrams || [];

    const recentList = document.getElementById('recentList');

    if (diagrams.length === 0) {
      recentList.innerHTML = '<p class="empty-state">No recent diagrams</p>';
      return;
    }

    // Sort by updatedAt and take first 5
    const recentDiagrams = diagrams
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    recentList.innerHTML = recentDiagrams.map(diagram => `
      <div class="recent-item" data-id="${diagram.id}">
        <div>
          <div class="recent-item-title">${escapeHtml(diagram.title)}</div>
          <div class="recent-item-type">${diagram.type}</div>
        </div>
        <div class="recent-item-date">${formatDate(diagram.updatedAt)}</div>
      </div>
    `).join('');

    // Add click handlers
    recentList.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const diagram = diagrams.find(d => d.id === id);
        if (diagram) {
          openEditor(diagram.code);
        }
      });
    });
  } catch (error) {
    console.error('Error loading recent diagrams:', error);
  }
}

// Get template code
async function getTemplate(type) {
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

    c4: `C4Context
    title System Context diagram for Internet Banking System

    Person(customer, "Personal Banking Customer", "A customer of the bank")
    System(banking_system, "Internet Banking System", "Allows customers to view information about their accounts")
    System_Ext(mail_system, "E-mail system", "The internal Microsoft Exchange e-mail system")
    System_Ext(mainframe, "Mainframe Banking System", "Stores all of the core banking information")

    Rel(customer, banking_system, "Uses")
    Rel_Back(customer, mail_system, "Sends e-mails to")
    Rel(banking_system, mail_system, "Sends e-mails", "SMTP")
    Rel(banking_system, mainframe, "Uses")`,

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
    }
    LINE-ITEM {
        string productCode
        int quantity
        float price
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
    Deployment      :a6, after a5, 5d`
  };

  return templates[type] || templates.flowchart;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return hours < 1 ? 'Just now' : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}
