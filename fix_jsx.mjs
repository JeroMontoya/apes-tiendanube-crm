import fs from 'fs';
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/<\/\s*\/>/g, '</p>');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed');