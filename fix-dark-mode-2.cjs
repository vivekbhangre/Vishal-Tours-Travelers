const fs = require('fs');
const content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');

// I will just perform the regex replacements directly in code.
let newContent = content;
// Remove all dark:text-gray-*
newContent = newContent.replace(/\s*dark:text-gray-\w+(?:\/\d+)?/g, '');
// Change dark:bg-white/5 to explicitly dark:bg-[#ffffff]/5 so it is bright
newContent = newContent.replace(/dark:bg-white\/5/g, 'dark:bg-[#ffffff]/5');
newContent = newContent.replace(/dark:bg-white\/10/g, 'dark:bg-[#ffffff]/10');
// Change dark:border-white/10 to dark:border-[#ffffff]/10
newContent = newContent.replace(/dark:border-white\/10/g, 'dark:border-[#ffffff]/10');
// For text-white on buttons (like Next button, Book a Ride), we DO NOT want `text-white` to become dark in dark mode due to `--theme-white: #020617`.
// So we explicitly set it to dark:text-[#ffffff] whenever text-white is used
newContent = newContent.replace(/text-white/g, 'text-white dark:text-[#ffffff]');
// Or we just remove the --theme-white flip from index.css instead! Wait.

fs.writeFileSync('src/pages/CustomerDashboard.tsx', newContent);
console.log('Done CustomerDashboard.tsx');
