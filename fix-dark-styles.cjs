const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    // Dark surfaces
    .replace(/rgba\(12,\s*12,\s*14,\s*0\.95\)/g, 'var(--surface)')
    .replace(/#17150d/gi, 'var(--surface)')
    .replace(/#0d0c08/gi, 'var(--background)')
    .replace(/#1a1500/gi, 'var(--on-primary)')
    // Text colors
    .replace(/#f5f1e6/gi, 'var(--on-background)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, 'var(--surface-container-low)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--border-subtle)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, 'var(--glass-border)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'var(--border-medium)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'var(--outline)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.5\)/g, 'var(--on-surface-variant)')
    .replace(/rgba\(255,\s*255,\s*255,\s*0\.7\)/g, 'var(--on-surface-variant)')
    .replace(/color:\s*['"]#fff['"]/gi, 'color: \'var(--on-surface)\'')
    .replace(/color:\s*['"]#ffffff['"]/gi, 'color: \'var(--on-surface)\'');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed hardcoded dark mode colors in ' + file);
  }
});
