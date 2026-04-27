const fs = require('fs');
let content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');

// replace text-gray-900 with text-gray-900 dark:text-white in <select> tags
content = content.replace(/<select([\s\S]*?)className="([\s\S]*?)text-gray-900([\s\S]*?)"/g, (match, p1, p2, p3) => {
    if (match.includes('dark:text-white')) return match;
    return `<select${p1}className="${p2}text-gray-900 dark:text-white${p3}"`;
});

// The user specifically wants the options to have a WHITE background and dark text ALWAYS ("white background so the text can be visible" and "whatever the option user selects that should be come in the WHITE text")
// Wait, "when the dark mode is on then under this Ride Type field whatever the option user selects that should be come in the WHITE text" -> meaning the select text should be white in dark mode.
// "and when the user clicks this filed and the drop option should be come in the white background so the text can be visible." -> options should be white bg, black text even in dark mode.
content = content.replace(/<option([^>]*)>/g, (match, p1) => {
    if (p1.includes('className')) return match;
    return `<option${p1} className="bg-white text-gray-900">`;
});

fs.writeFileSync('src/pages/CustomerDashboard.tsx', content);
