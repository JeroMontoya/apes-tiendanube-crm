const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add the getRowStyle function after the CategoryBadge component
content = content.replace(
  /const CategoryBadge = \(\{ category \}\) => \{[\s\S]*?\n\};/,
  (match) => match + '\n\nfunction getRowStyle(i) {\n  return {\n    borderBottom: \'1px solid rgba(255,255,255,0.04)\',\n    background: i % 2 === 0 ? \'transparent\' : \'rgba(255,255,255,0.02)\',\n    cursor: \'pointer\',\n    transition: \'background 0.15s\'\n  };\n}\n'
);

// Replace the inline style with getRowStyle(i)
content = content.replace(
  /style=\{\{ borderBottom: '1px solid rgba\(255,255,255,0\.04\)', background: i % 2 === 0 \? 'transparent' : 'rgba\(255,255,255,0\.02\)', cursor: 'pointer', transition: 'background 0\.15s' \}\}/g,
  'style={getRowStyle(i)}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed');