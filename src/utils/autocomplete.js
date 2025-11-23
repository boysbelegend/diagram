// Autocomplete suggestions for Mermaid diagrams

/**
 * Get autocomplete suggestions based on current context
 * @param {string} code - Full code
 * @param {number} cursorPos - Cursor position
 * @returns {Array} Array of suggestions
 */
export function getAutocompleteSuggestions(code, cursorPos) {
  const beforeCursor = code.substring(0, cursorPos);
  const lines = beforeCursor.split('\n');
  const currentLine = lines[lines.length - 1];
  const words = currentLine.trim().split(/\s+/);
  const lastWord = words[words.length - 1] || '';

  // Determine context
  const diagramType = detectDiagramType(code);

  // Get suggestions based on context
  let suggestions = [];

  // Start of document - diagram type suggestions
  if (lines.length === 1 && words.length <= 1) {
    suggestions = getDiagramTypeSuggestions(lastWord);
  }
  // Flowchart/Graph specific
  else if (diagramType === 'flowchart' || diagramType === 'graph') {
    suggestions = getFlowchartSuggestions(currentLine, lastWord);
  }
  // Sequence diagram specific
  else if (diagramType === 'sequence') {
    suggestions = getSequenceSuggestions(currentLine, lastWord);
  }
  // Class diagram specific
  else if (diagramType === 'class') {
    suggestions = getClassSuggestions(currentLine, lastWord);
  }
  // C4 diagram specific
  else if (diagramType === 'c4') {
    suggestions = getC4Suggestions(currentLine, lastWord);
  }
  // Generic suggestions
  else {
    suggestions = getGenericSuggestions(lastWord);
  }

  return suggestions.filter(s =>
    s.text.toLowerCase().startsWith(lastWord.toLowerCase())
  );
}

/**
 * Detect diagram type from code
 */
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
  if (firstLine.startsWith('c4')) return 'c4';

  return 'unknown';
}

/**
 * Get diagram type suggestions
 */
function getDiagramTypeSuggestions(partial) {
  return [
    { text: 'graph TD', description: 'Flowchart (Top Down)', snippet: 'graph TD\n    A[Start] --> B[End]' },
    { text: 'flowchart LR', description: 'Flowchart (Left to Right)', snippet: 'flowchart LR\n    A[Start] --> B[End]' },
    { text: 'sequenceDiagram', description: 'Sequence Diagram', snippet: 'sequenceDiagram\n    participant A\n    participant B\n    A->>B: Message' },
    { text: 'classDiagram', description: 'Class Diagram', snippet: 'classDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }' },
    { text: 'stateDiagram-v2', description: 'State Diagram', snippet: 'stateDiagram-v2\n    [*] --> State1\n    State1 --> [*]' },
    { text: 'erDiagram', description: 'ER Diagram', snippet: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places' },
    { text: 'gantt', description: 'Gantt Chart', snippet: 'gantt\n    title Project\n    dateFormat YYYY-MM-DD\n    section Tasks\n    Task1 :a1, 2024-01-01, 30d' },
    { text: 'pie', description: 'Pie Chart', snippet: 'pie title Data\n    "A" : 45\n    "B" : 55' },
    { text: 'gitGraph', description: 'Git Graph', snippet: 'gitGraph\n    commit\n    branch develop\n    commit' },
    { text: 'C4Context', description: 'C4 Context Diagram', snippet: 'C4Context\n    title System Context\n    Person(user, "User", "A user")\n    System(sys, "System", "Main system")' }
  ];
}

/**
 * Get flowchart suggestions
 */
function getFlowchartSuggestions(line, word) {
  const suggestions = [
    { text: '-->', description: 'Arrow', snippet: '--> ' },
    { text: '---', description: 'Line', snippet: '--- ' },
    { text: '-.->',description: 'Dotted arrow', snippet: '-.-> ' },
    { text: '==>', description: 'Thick arrow', snippet: '==> ' },
    { text: 'TD', description: 'Top Down', snippet: 'TD' },
    { text: 'LR', description: 'Left to Right', snippet: 'LR' },
    { text: 'TB', description: 'Top to Bottom', snippet: 'TB' },
    { text: 'RL', description: 'Right to Left', snippet: 'RL' }
  ];

  // Add node shapes if starting a new node
  if (line.trim().match(/^[A-Za-z]\w*$/)) {
    suggestions.push(
      { text: '[Square]', description: 'Square node', snippet: '[Square]' },
      { text: '(Round)', description: 'Round node', snippet: '(Round)' },
      { text: '{Diamond}', description: 'Diamond node', snippet: '{Diamond}' },
      { text: '([Stadium])', description: 'Stadium node', snippet: '([Stadium])' },
      { text: '[[Subroutine]]', description: 'Subroutine', snippet: '[[Subroutine]]' },
      { text: '[(Database)]', description: 'Database', snippet: '[(Database)]' }
    );
  }

  return suggestions;
}

/**
 * Get sequence diagram suggestions
 */
function getSequenceSuggestions(line, word) {
  return [
    { text: 'participant', description: 'Define participant', snippet: 'participant ' },
    { text: '->>', description: 'Solid arrow', snippet: '->> ' },
    { text: '-->>', description: 'Dotted arrow', snippet: '-->> ' },
    { text: '-)', description: 'Async arrow', snippet: '-) ' },
    { text: '--)', description: 'Async dotted', snippet: '--) ' },
    { text: 'activate', description: 'Activate lifeline', snippet: 'activate ' },
    { text: 'deactivate', description: 'Deactivate lifeline', snippet: 'deactivate ' },
    { text: 'Note', description: 'Add note', snippet: 'Note right of A: ' },
    { text: 'loop', description: 'Loop block', snippet: 'loop Label\n    \nend' },
    { text: 'alt', description: 'Alternative block', snippet: 'alt Condition\n    \nelse\n    \nend' },
    { text: 'par', description: 'Parallel block', snippet: 'par\n    \nand\n    \nend' }
  ];
}

/**
 * Get class diagram suggestions
 */
function getClassSuggestions(line, word) {
  return [
    { text: 'class', description: 'Define class', snippet: 'class ClassName {\n    \n}' },
    { text: '<|--', description: 'Inheritance', snippet: '<|-- ' },
    { text: '*--', description: 'Composition', snippet: '*-- ' },
    { text: 'o--', description: 'Aggregation', snippet: 'o-- ' },
    { text: '-->', description: 'Association', snippet: '--> ' },
    { text: '..>', description: 'Dependency', snippet: '..> ' },
    { text: '+', description: 'Public', snippet: '+' },
    { text: '-', description: 'Private', snippet: '-' },
    { text: '#', description: 'Protected', snippet: '#' },
    { text: '~', description: 'Package', snippet: '~' }
  ];
}

/**
 * Get C4 suggestions
 */
function getC4Suggestions(line, word) {
  return [
    { text: 'Person', description: 'Define person', snippet: 'Person(id, "Name", "Description")' },
    { text: 'System', description: 'Define system', snippet: 'System(id, "Name", "Description")' },
    { text: 'System_Ext', description: 'External system', snippet: 'System_Ext(id, "Name", "Description")' },
    { text: 'Container', description: 'Define container', snippet: 'Container(id, "Name", "Technology", "Description")' },
    { text: 'ContainerDb', description: 'Database container', snippet: 'ContainerDb(id, "Name", "Technology", "Description")' },
    { text: 'Component', description: 'Define component', snippet: 'Component(id, "Name", "Technology", "Description")' },
    { text: 'Rel', description: 'Relationship', snippet: 'Rel(from, to, "Label")' },
    { text: 'Rel_Back', description: 'Back relationship', snippet: 'Rel_Back(from, to, "Label")' },
    { text: 'System_Boundary', description: 'System boundary', snippet: 'System_Boundary(id, "Name") {\n    \n}' }
  ];
}

/**
 * Get generic suggestions
 */
function getGenericSuggestions(word) {
  return [
    { text: 'title', description: 'Add title', snippet: 'title ' },
    { text: 'section', description: 'Add section', snippet: 'section ' }
  ];
}

/**
 * Apply suggestion at cursor position
 */
export function applySuggestion(code, cursorPos, suggestion) {
  const beforeCursor = code.substring(0, cursorPos);
  const afterCursor = code.substring(cursorPos);

  // Find the start of the current word
  const match = beforeCursor.match(/(\S+)$/);
  const wordStart = match ? cursorPos - match[0].length : cursorPos;

  const newCode = code.substring(0, wordStart) + suggestion.snippet + afterCursor;
  const newCursorPos = wordStart + suggestion.snippet.length;

  return { code: newCode, cursorPos: newCursorPos };
}
