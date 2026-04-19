const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/pages/CustomerDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/bg-\[#13131A\]/g, 'bg-gray-50 dark:bg-[#13131A]');
content = content.replace(/bg-\[#1A1A24\]/g, 'bg-white dark:bg-[#1A1A24]');
content = content.replace(/text-white/g, 'text-gray-900 dark:text-gray-100');
content = content.replace(/placeholder-white\/30/g, 'placeholder-gray-400 dark:placeholder-white/30');
content = content.replace(/border-white\/5/g, 'border-gray-200 dark:border-white/5');
content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
content = content.replace(/text-white\/50/g, 'text-gray-500 dark:text-white/50');
content = content.replace(/text-white\/80/g, 'text-gray-700 dark:text-white/80');
content = content.replace(/text-white\/40/g, 'text-gray-500 dark:text-white/40');
content = content.replace(/bg-\[#0A0A0C\]/g, 'bg-gray-200 dark:bg-[#0A0A0C]');
content = content.replace(/border-white\/20/g, 'border-gray-300 dark:border-white/20');
content = content.replace(/shadow-\[0_20px_60px_rgba\(0,0,0,0\.8\)\]/g, 'shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)]');

fs.writeFileSync(filePath, content);
console.log('CustomerDashboard updated successfully');
