
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
    .replace(/background: 'var\(--primary\)', color: 'var\(--on-surface\)'/g, 'background: \'var(--primary)\', color: \'var(--on-primary)\'')
    .replace(/color: 'var\(--on-surface\)', border: 'none', background: 'var\(--primary\)'/g, 'color: \'var(--on-primary)\', border: \'none\', background: \'var(--primary)\'');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed buttons in ' + file);
  }
});

