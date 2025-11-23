// Simple syntax highlighting for Mermaid diagrams

/**
 * Apply syntax highlighting to code
 * @param {string} code - The Mermaid code to highlight
 * @returns {string} HTML with syntax highlighting
 */
export function highlightSyntax(code) {
  const lines = code.split('\n');
  const highlighted = lines.map((line, index) => {
    return `<div class="code-line" data-line="${index + 1}">${highlightLine(line)}</div>`;
  }).join('');

  return highlighted;
}

/**
 * Highlight a single line of code
 * @param {string} line - Line to highlight
 * @returns {string} Highlighted HTML
 */
function highlightLine(line) {
  // Keywords
  const keywords = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
    'erDiagram', 'gantt', 'pie', 'gitGraph', 'C4Context', 'C4Container', 'C4Component',
    'title', 'section', 'participant', 'class', 'note', 'loop', 'alt', 'else', 'end',
    'activate', 'deactivate', 'Person', 'System', 'System_Ext', 'Rel', 'Rel_Back',
    'Container', 'ContainerDb', 'Component', 'Boundary', 'dateFormat'
  ];

  // Directions
  const directions = ['TD', 'TB', 'BT', 'RL', 'LR'];

  // Operators
  const operators = ['-->','---','-.->','-.-','==>','===','~~>','~~','->','--'];

  let highlighted = escapeHtml(line);

  // Highlight comments
  highlighted = highlighted.replace(/%%(.*)$/g, '<span class="comment">%%$1</span>');

  // Highlight keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
  });

  // Highlight directions
  directions.forEach(dir => {
    const regex = new RegExp(`\\b(${dir})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="direction">$1</span>');
  });

  // Highlight strings in quotes
  highlighted = highlighted.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');

  // Highlight operators
  operators.forEach(op => {
    const escaped = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    highlighted = highlighted.replace(regex, `<span class="operator">${op}</span>`);
  });

  // Highlight labels (text in square brackets or pipes)
  highlighted = highlighted.replace(/\[([^\]]+)\]/g, '<span class="label">[$1]</span>');
  highlighted = highlighted.replace(/\|([^|]+)\|/g, '<span class="label">|$1|</span>');

  // Highlight node IDs (simple alphanumeric at start)
  highlighted = highlighted.replace(/^(\s*)([A-Za-z][A-Za-z0-9_]*)/g, '$1<span class="node-id">$2</span>');

  return highlighted;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get CSS for syntax highlighting
 */
export function getSyntaxHighlightCSS() {
  return `
.code-line {
  padding-left: 4px;
}

.keyword {
  color: #d73a49;
  font-weight: 600;
}

.direction {
  color: #005cc5;
  font-weight: 600;
}

.string {
  color: #032f62;
}

.operator {
  color: #d73a49;
}

.comment {
  color: #6a737d;
  font-style: italic;
}

.label {
  color: #22863a;
}

.node-id {
  color: #6f42c1;
  font-weight: 500;
}

/* Dark theme */
body.dark-theme .keyword {
  color: #f97583;
}

body.dark-theme .direction {
  color: #79b8ff;
}

body.dark-theme .string {
  color: #9ecbff;
}

body.dark-theme .operator {
  color: #f97583;
}

body.dark-theme .comment {
  color: #6a737d;
}

body.dark-theme .label {
  color: #85e89d;
}

body.dark-theme .node-id {
  color: #b392f0;
}
`;
}
