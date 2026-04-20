const fs = require('fs');
let code = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');

const targetStr = `className="absolute right-[1rem] top-[50%] -translate-y-1/2 sm:static sm:translate-y-0 sm:mt-[26px] z-10 flex items-center justify-center pointer-events-none"`;
const replacementStr = `className="relative z-10 flex items-center justify-end sm:justify-center pointer-events-none -my-5 sm:my-0 sm:mt-[26px] pr-4 sm:pr-0"`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/pages/CustomerDashboard.tsx', code);
  console.log("Successfully replaced swap button layout!");
} else {
  console.log("Error: Target string not found.");
}
