const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';

let content = fs.readFileSync(path, 'utf8');

// Find the second AppViewRenderer function and remove it
let firstIdx = content.indexOf('function AppViewRenderer(');
let secondIdx = content.indexOf('function AppViewRenderer(', content.indexOf('function AppViewRenderer(') + 1);

console.log('First at:', firstIdx);
console.log('Second at:', secondIdx);

// Find the end of the second function
let idx = content.indexOf('function AppViewRenderer(', content.indexOf('function AppViewRenderer(') + 1);
let braceCount = 0;
let foundFirstBrace = false;
for (let i = content.indexOf('function AppViewRenderer(', content.indexOf('function AppViewRenderer(') + 1); i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    foundFirstBrace = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (foundFirstBrace && braceCount === 0) {
      console.log('End of second function at:', i);
      // Remove the duplicate
      let newContent = content.substring(0, content.indexOf('function AppViewRenderer(', content.indexOf('function AppViewRenderer(') + 1)) + content.substring(i + 1);
      fs.writeFileSync('C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx', newContent, 'utf8');
      console.log('Removed duplicate AppViewRenderer');
      break;
    }
  }
}