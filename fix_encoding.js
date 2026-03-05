const fs = require('fs');
const path = require('path');

const targetFiles = [
    'c:\\Users\\kalid\\Documents\\Antigravity\\NodeTerm\\src\\components\\ConnectionHistory.js',
    'c:\\Users\\kalid\\Documents\\Antigravity\\NodeTerm\\src\\components\\HomeTab.js'
];

targetFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace any non-ASCII character with its \uXXXX escape sequence
    const escapedContent = content.replace(/[^\x00-\x7F]/g, (char) => {
        return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase();
    });

    fs.writeFileSync(filePath, escapedContent, 'utf8');
    console.log(`Processed ${filePath}`);
});
