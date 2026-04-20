const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf-8');

// Replace dark container styles with proper dual-theme glassmorphism styles
content = content.replace(
  /bg-black\/40 border border-gray-200 border-opacity-50 backdrop-blur-xl shadow-\[0_10px_40px_rgba\(0,0,0,0\.5\)\]/g,
  'bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-xl'
);
content = content.replace(
  /bg-black\/40 border border-gray-200 border-opacity-50 hover:border-gray-200 hover:bg-white\/5 backdrop-blur-xl shadow-\[0_10px_40px_rgba\(0,0,0,0\.5\)\]/g,
  'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 shadow-xl transition-all'
);
content = content.replace(
  /bg-black\/40 border border-gray-200 border-opacity-50 backdrop-blur-xl/g,
  'bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
);

fs.writeFileSync('src/pages/CustomerDashboard.tsx', content);
console.log("Card layout colors fixed.");
