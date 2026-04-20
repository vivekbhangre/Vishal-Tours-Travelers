const fs = require('fs');
let content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');
content = content.replace(/dark:hover:bg-white\/10/g, 'dark:hover:bg-[#ffffff]/10');
content = content.replace(/dark:hover:bg-white\/5/g, 'dark:hover:bg-[#ffffff]/5');
content = content.replace(/dark:bg-white\/10/g, 'dark:bg-[#ffffff]/10'); // just in case
content = content.replace(/dark:bg-white\/5/g, 'dark:bg-[#ffffff]/5');
fs.writeFileSync('src/pages/CustomerDashboard.tsx', content);
