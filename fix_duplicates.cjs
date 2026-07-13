const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';

let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
const newLines = [];
const seen = new Set();

for (const line of lines) {
  // Check for duplicate function declarations
  const match = line.match(/^\s*const\s+(handleAddCompetitor|handleRemoveCompetitor|handleAnalyzeCompetitor|handleGenerateLandscape|handleSort|toggleSort|filteredProducts)\s*=/);
  if (match) {
    const fnName = match[1];
    if (seen.has(fnName)) {
      // Skip this line
      continue;
    }
    seen.add(fnName);
  }
  newLines.push(line);
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Fixed duplicates');