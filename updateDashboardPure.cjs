const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/pages/CustomerDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The original file used these hardcoded hex values and specific opacity classes. My previous run mutated them to `bg-gray-50 dark:bg-[#13131A]` etc.
// Let's strip ALL of that and use the pure auto-swapping classes.

// Clean up my previous mutations first:
content = content.replace(/bg-gray-50 dark:bg-\[#13131A\]/g, 'bg-white'); // Use bg-white (auto swaps to very dark in night mode)
content = content.replace(/bg-white dark:bg-\[#1A1A24\]/g, 'bg-gray-50'); // Use bg-gray-50
content = content.replace(/text-gray-900 dark:text-gray-100/g, 'text-gray-900'); // Let text-gray-900 auto swap to bright in night mode!
content = content.replace(/placeholder-gray-400 dark:placeholder-white\/30/g, 'placeholder-gray-400');
content = content.replace(/border-gray-200 dark:border-white\/5/g, 'border-gray-200 border-opacity-50');
content = content.replace(/border-gray-200 dark:border-white\/10/g, 'border-gray-200 border-opacity-50');
content = content.replace(/text-gray-500 dark:text-white\/50/g, 'text-gray-500');
content = content.replace(/text-gray-700 dark:text-white\/80/g, 'text-gray-600');
content = content.replace(/text-gray-500 dark:text-white\/40/g, 'text-gray-400');
content = content.replace(/bg-gray-200 dark:bg-\[#0A0A0C\]/g, 'bg-gray-100');
content = content.replace(/border-gray-300 dark:border-white\/20/g, 'border-gray-200');
content = content.replace(/shadow-2xl dark:shadow-\[0_20px_60px_rgba\(0,0,0,0\.8\)\]/g, 'shadow-2xl');

// Clean up any surviving from the ORIGINAL format if they weren't matched:
content = content.replace(/bg-\[#13131A\]/g, 'bg-white');
content = content.replace(/bg-\[#1A1A24\]/g, 'bg-gray-50');
content = content.replace(/text-white/g, 'text-gray-900');
content = content.replace(/placeholder-white\/30/g, 'placeholder-gray-400');
content = content.replace(/border-white\/5/g, 'border-gray-200 border-opacity-50');
content = content.replace(/border-white\/10/g, 'border-gray-200 border-opacity-50');
content = content.replace(/text-white\/50/g, 'text-gray-500');
content = content.replace(/text-white\/80/g, 'text-gray-700');
content = content.replace(/text-white\/40/g, 'text-gray-400');
content = content.replace(/bg-\[#0A0A0C\]/g, 'bg-gray-100');
content = content.replace(/border-white\/20/g, 'border-gray-200');
content = content.replace(/shadow-\[0_20px_60px_rgba\(0,0,0,0\.8\)\]/g, 'shadow-2xl');

fs.writeFileSync(filePath, content);
console.log('CustomerDashboard restored to Pure Tailwind swapped classes');
