const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        processDirectory(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove all dark: classes
      // This regex matches 'dark:' followed by any word characters, dashes, slashes, or brackets (for arbitrary values)
      // and removes them along with any preceding space.
      const newContent = content.replace(/\s*dark:[a-zA-Z0-9\-\/\[\]#]+/g, '');
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Removed dark classes from ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
processDirectory(path.join(__dirname, 'public')); // just in case
console.log('Done removing dark classes.');
