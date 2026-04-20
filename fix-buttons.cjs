const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf-8');

// Fix buttons with indigo background to use white text
content = content.replace(
  /text-gray-900 dark:text-gray-100 bg-indigo-600/g,
  'text-white bg-indigo-600'
);

content = content.replace(
  /text-gray-900 dark:text-gray-100 transition-all bg-indigo-600/g,
  'text-white transition-all bg-indigo-600'
);

content = content.replace(
  /text-gray-900 dark:text-gray-100 shadow-\[0_0_30px_rgba\(99,102,241,0\.3\)\] transition-all bg-indigo-600/g,
  'text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all bg-indigo-600'
);

content = content.replace(
  /text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-all bg-indigo-600/g,
  'text-white disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-all bg-indigo-600'
);

fs.writeFileSync('src/pages/CustomerDashboard.tsx', content);
console.log("Button text colors fixed.");
