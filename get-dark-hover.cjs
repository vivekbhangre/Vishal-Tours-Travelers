const fs = require('fs');
const content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');
const darkClasses = new Set();
const regex = /dark:(hover|active|focus):[\w\-\/\[\]\#]+/g;
let match;
while ((match = regex.exec(content)) !== null) {
  darkClasses.add(match[0]);
}
console.log(Array.from(darkClasses).sort().join('\n'));
