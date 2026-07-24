const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    
    // Replace locales
    updated = updated.replace(/'es-AR'/g, "'es-CO'");
    updated = updated.replace(/"es-AR"/g, '"es-CO"');
    
    // Replace currencies
    updated = updated.replace(/'ARS'/g, "'COP'");
    updated = updated.replace(/"ARS"/g, '"COP"');

    if (original !== updated) {
        fs.writeFileSync(file, updated, 'utf8');
        console.log('Updated', file);
        changedCount++;
    }
});

console.log('Total files updated: ' + changedCount);
