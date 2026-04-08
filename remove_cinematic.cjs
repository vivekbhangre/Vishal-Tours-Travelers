const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');

// Remove the state declaration
content = content.replace(/const \[isCinematicMode, setIsCinematicMode\] = useState\(true\);\s*\/\/[^\n]*\n/, '');

// Replace simple ternary: isCinematicMode ? 'dark' : 'light'
content = content.replace(/\$\{isCinematicMode \? '([^']*)' : '([^']*)'\}/g, '$2');
content = content.replace(/isCinematicMode \? '([^']*)' : '([^']*)'/g, "'$2'");

// Replace multiline ternary
content = content.replace(/isCinematicMode\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/g, "'$2'");

// There are nested ones like:
// isSelected ? (isCinematicMode ? 'A' : 'B') : (isCinematicMode ? 'C' : 'D')
// Let's run the simple replacement multiple times until it stabilizes
let prevContent;
do {
  prevContent = content;
  content = content.replace(/\(isCinematicMode \? '([^']*)' : '([^']*)'\)/g, "'$2'");
  content = content.replace(/isCinematicMode \? '([^']*)' : '([^']*)'/g, "'$2'");
} while (content !== prevContent);

// Remove isCinematicMode props from components
content = content.replace(/isCinematicMode=\{isCinematicMode\}/g, '');
content = content.replace(/isCinematicMode\s*:\s*boolean/g, '');
content = content.replace(/isCinematicMode,/g, '');
content = content.replace(/,\s*isCinematicMode/g, '');

fs.writeFileSync('src/pages/CustomerDashboard.tsx', content);
console.log("Done");
