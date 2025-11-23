// Mermaid diagram validator

/**
 * Validate Mermaid code and return errors/warnings
 * @param {string} code - The Mermaid code to validate
 * @returns {Object} Validation result with errors and warnings
 */
export function validateMermaidCode(code) {
  const errors = [];
  const warnings = [];
  const lines = code.split('\n');

  // Check if code is empty
  if (!code.trim()) {
    return {
      isValid: false,
      errors: [{ line: 0, message: 'Code is empty', severity: 'error' }],
      warnings: []
    };
  }

  // Detect diagram type
  const diagramType = detectDiagramType(code);

  if (diagramType === 'unknown') {
    errors.push({
      line: 1,
      message: 'Unknown diagram type. Must start with graph, flowchart, sequenceDiagram, classDiagram, etc.',
      severity: 'error'
    });
  }

  // Type-specific validation
  switch (diagramType) {
    case 'flowchart':
    case 'graph':
      validateFlowchart(lines, errors, warnings);
      break;
    case 'sequence':
      validateSequence(lines, errors, warnings);
      break;
    case 'class':
      validateClass(lines, errors, warnings);
      break;
    case 'c4':
      validateC4(lines, errors, warnings);
      break;
  }

  // Common validations
  validateCommon(lines, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    diagramType
  };
}

/**
 * Detect diagram type
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
 * Validate flowchart/graph diagrams
 */
function validateFlowchart(lines, errors, warnings) {
  const firstLine = lines[0].trim().toLowerCase();

  // Check direction
  const validDirections = ['td', 'tb', 'bt', 'rl', 'lr'];
  const directionMatch = firstLine.match(/(?:graph|flowchart)\s+([a-z]+)/i);

  if (directionMatch) {
    const direction = directionMatch[1].toLowerCase();
    if (!validDirections.includes(direction)) {
      errors.push({
        line: 1,
        message: `Invalid direction "${direction}". Use TD, LR, RL, or BT`,
        severity: 'error'
      });
    }
  }

  // Check for common mistakes
  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for unmatched brackets
    if (trimmed.includes('[') && !trimmed.includes(']')) {
      warnings.push({
        line: index + 1,
        message: 'Possible unmatched bracket',
        severity: 'warning'
      });
    }

    // Check for unmatched parentheses
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      warnings.push({
        line: index + 1,
        message: 'Unmatched parentheses',
        severity: 'warning'
      });
    }
  });
}

/**
 * Validate sequence diagrams
 */
function validateSequence(lines, errors, warnings) {
  const participants = new Set();
  let inBlock = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Track participants
    if (trimmed.startsWith('participant ')) {
      const match = trimmed.match(/participant\s+(\w+)/);
      if (match) {
        participants.add(match[1]);
      }
    }

    // Check for message syntax
    const messageMatch = trimmed.match(/(\w+)(->>?|-->>?)(\w+)\s*:/);
    if (messageMatch) {
      const [, from, , to] = messageMatch;

      // Warn about undefined participants
      if (!participants.has(from) && participants.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Participant "${from}" not defined`,
          severity: 'warning'
        });
      }
      if (!participants.has(to) && participants.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Participant "${to}" not defined`,
          severity: 'warning'
        });
      }
    }

    // Track blocks
    if (/^(loop|alt|opt|par|rect)\b/.test(trimmed)) {
      inBlock++;
    }
    if (trimmed === 'end') {
      inBlock--;
    }
  });

  // Check for unmatched blocks
  if (inBlock > 0) {
    errors.push({
      line: lines.length,
      message: `${inBlock} unclosed block(s) - missing "end"`,
      severity: 'error'
    });
  } else if (inBlock < 0) {
    errors.push({
      line: lines.length,
      message: 'Too many "end" statements',
      severity: 'error'
    });
  }
}

/**
 * Validate class diagrams
 */
function validateClass(lines, errors, warnings) {
  const classes = new Set();
  let inClass = false;
  let braceCount = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Track class definitions
    if (trimmed.startsWith('class ')) {
      const match = trimmed.match(/class\s+(\w+)/);
      if (match) {
        classes.add(match[1]);
        if (trimmed.includes('{')) {
          inClass = true;
          braceCount++;
        }
      }
    }

    // Track braces
    if (trimmed.includes('{')) braceCount++;
    if (trimmed.includes('}')) {
      braceCount--;
      if (braceCount === 0) inClass = false;
    }

    // Check relationship syntax
    const relMatch = trimmed.match(/(\w+)\s*(<\|--|o--|*--|-->|\.\.>)\s*(\w+)/);
    if (relMatch) {
      const [, class1, , class2] = relMatch;

      // Warn about undefined classes
      if (!classes.has(class1) && classes.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Class "${class1}" not defined`,
          severity: 'warning'
        });
      }
      if (!classes.has(class2) && classes.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Class "${class2}" not defined`,
          severity: 'warning'
        });
      }
    }
  });

  // Check for unmatched braces
  if (braceCount !== 0) {
    errors.push({
      line: lines.length,
      message: 'Unmatched braces in class definition',
      severity: 'error'
    });
  }
}

/**
 * Validate C4 diagrams
 */
function validateC4(lines, errors, warnings) {
  const entities = new Set();

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Track entities
    const entityMatch = trimmed.match(/(?:Person|System|System_Ext|Container|ContainerDb|Component)\((\w+),/);
    if (entityMatch) {
      entities.add(entityMatch[1]);
    }

    // Check relationships
    const relMatch = trimmed.match(/Rel(?:_Back)?\((\w+),\s*(\w+),/);
    if (relMatch) {
      const [, from, to] = relMatch;

      // Warn about undefined entities
      if (!entities.has(from) && entities.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Entity "${from}" not defined`,
          severity: 'warning'
        });
      }
      if (!entities.has(to) && entities.size > 0) {
        warnings.push({
          line: index + 1,
          message: `Entity "${to}" not defined`,
          severity: 'warning'
        });
      }
    }
  });
}

/**
 * Common validations for all diagram types
 */
function validateCommon(lines, errors, warnings) {
  lines.forEach((line, index) => {
    // Check for very long lines
    if (line.length > 200) {
      warnings.push({
        line: index + 1,
        message: 'Line is very long - consider breaking it up',
        severity: 'warning'
      });
    }

    // Check for trailing spaces
    if (line.endsWith(' ') || line.endsWith('\t')) {
      warnings.push({
        line: index + 1,
        message: 'Trailing whitespace',
        severity: 'info'
      });
    }
  });
}

/**
 * Get quick fixes for common errors
 */
export function getQuickFixes(error, code) {
  const fixes = [];

  if (error.message.includes('Unknown diagram type')) {
    fixes.push(
      { label: 'Change to flowchart', replacement: 'graph TD\n' },
      { label: 'Change to sequence diagram', replacement: 'sequenceDiagram\n' }
    );
  }

  if (error.message.includes('Invalid direction')) {
    fixes.push(
      { label: 'Use TD (Top Down)', replacement: 'TD' },
      { label: 'Use LR (Left to Right)', replacement: 'LR' }
    );
  }

  return fixes;
}
