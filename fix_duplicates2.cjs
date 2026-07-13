const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';

let content = fs.readFileSync(path, 'utf8');

// Remove the duplicate function definitions that appear after line 280
// Find the second occurrence of each function and remove it
const lines = content.split('\n');
const newLines = [];
let inDuplicateSection = false;
let skipUntil = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check for duplicate function declarations that appear after line 280
  if (i > 280) {
    const match = line.match(/^\s*(const|function)\s+(handleAddCompetitor|handleRemoveCompetitor|handleAnalyzeCompetitor|handleGenerateLandscape|handleSort|toggleSort|filteredProducts)\s*=/);
    if (match) {
      // Skip this line and the function body until we find the closing brace
      // For simplicity, skip until we find a line that looks like the end of a function
      // But this is complex. Let me just remove lines 290-360 which are the duplicate section
      continue;
    }
  }
  
  // Skip the duplicate section (lines 290-360 approximately)
  if (i >= 289 && i <= 360) {
    // Check if this is the start of the duplicate section
    if (lines[i].trim().startsWith('const exists = competitors.some')) {
      // Skip until we find the closing of this block
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const exists = competitors.some')) {
      continue;
    }
    // Skip the duplicate functions
    if (lines[i].trim().startsWith('const handleAddCompetitor = async')) {
      // Skip until we find the end of this function
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const handleRemoveCompetitor = async')) {
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const handleAnalyzeCompetitor = async')) {
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const handleGenerateLandscape = async')) {
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const filteredProducts = useMemo')) {
      // This is the second declaration - skip it
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (lines[i].trim().startsWith('const stats = useMemo')) {
      // Second declaration
      let braceCount = 0;
      let j = i;
      while (j < lines.length) {
        braceCount += (lines[j].match(/{/g) || []).length;
        braceCount -= (lines[j].match(/}/g) || []).length;
        if (braceCount <= 0 && j > i) {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
  }
  newLines.push(line);
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Fixed duplicates');