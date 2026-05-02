const fs = require('fs');

const content = fs.readFileSync('src/pages/CustomerDashboard.tsx', 'utf8');

function findClosingTagIndex(content, startIdx, openTag, closeTag) {
    let balance = 1;
    let i = startIdx;
    
    while (i < content.length) {
        let nextOpen = content.indexOf(openTag, i);
        let nextClose = content.indexOf(closeTag, i);
        
        if (nextClose === -1) return -1;
        
        if (nextOpen !== -1 && nextOpen < nextClose) {
            balance++;
            i = nextOpen + openTag.length;
        } else {
            balance--;
            i = nextClose + closeTag.length;
            if (balance === 0) {
                return i;
            }
        }
    }
    return -1;
}

// Find index of <motion.div for bottom sheet container
const lines = content.split('\n');
let startLine = lines.findIndex(l => l.includes('Bottom Sheet Container')) + 1; // 1293 index (0-based)
let startIdx = content.indexOf('<motion.div', content.indexOf('Bottom Sheet Container'));

let endIdx = findClosingTagIndex(content, startIdx + '<motion.div'.length, '<motion.div', '</motion.div>');

let endLineNum = content.substring(0, endIdx).split('\n').length;
console.log("Bottom Sheet Container motion.div ends at line:", endLineNum);
