const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/CustomerDashboard.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/StaffDashboard.tsx'
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace text colors
    content = content.replace(/text-gray-900(?! dark:)/g, 'text-gray-900 dark:text-white');
    content = content.replace(/text-gray-800(?! dark:)/g, 'text-gray-800 dark:text-gray-200');
    content = content.replace(/text-gray-700(?! dark:)/g, 'text-gray-700 dark:text-gray-300');
    content = content.replace(/text-gray-600(?! dark:)/g, 'text-gray-600 dark:text-gray-400');
    content = content.replace(/text-gray-500(?! dark:)/g, 'text-gray-500 dark:text-gray-400');
    
    // Replace background colors
    content = content.replace(/bg-white(?! dark:)/g, 'bg-white dark:bg-gray-800');
    content = content.replace(/bg-gray-50(?! dark:)/g, 'bg-gray-50 dark:bg-gray-900');
    content = content.replace(/bg-gray-100(?! dark:)/g, 'bg-gray-100 dark:bg-gray-700');
    
    // Replace border colors
    content = content.replace(/border-gray-100(?! dark:)/g, 'border-gray-100 dark:border-gray-700');
    content = content.replace(/border-gray-200(?! dark:)/g, 'border-gray-200 dark:border-gray-700');
    content = content.replace(/border-gray-300(?! dark:)/g, 'border-gray-300 dark:border-gray-600');
    
    // Remove ThemeToggle
    content = content.replace(/<ThemeToggle \/>/g, '');
    content = content.replace(/import ThemeToggle from '\.\.\/components\/ThemeToggle';\n?/g, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});

// Also remove ThemeToggle from Navbar.tsx
const navbarPath = path.join(__dirname, 'src/components/Navbar.tsx');
if (fs.existsSync(navbarPath)) {
  let navbarContent = fs.readFileSync(navbarPath, 'utf8');
  navbarContent = navbarContent.replace(/<ThemeToggle \/>/g, '');
  navbarContent = navbarContent.replace(/import ThemeToggle from '\.\/ThemeToggle';\n?/g, '');
  fs.writeFileSync(navbarPath, navbarContent, 'utf8');
  console.log('Fixed Navbar.tsx');
}
