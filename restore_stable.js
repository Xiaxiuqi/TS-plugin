const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '备份', '角色浮岛_TaskFix_v7', 'index.ts');
const dest = path.join(__dirname, 'src', 'char_island', 'index.ts');
const scssSrc = path.join(__dirname, '备份', '角色浮岛_TaskFix_v7', 'style.scss');
const scssDest = path.join(__dirname, 'src', 'char_island', 'style.scss');

try {
    fs.copyFileSync(src, dest);
    console.log('Restored index.ts from TaskFix_v7');
    if (fs.existsSync(scssSrc)) {
        fs.copyFileSync(scssSrc, scssDest);
        console.log('Restored style.scss from TaskFix_v7');
    }
} catch (err) {
    console.error('Restore failed:', err);
    process.exit(1);
}
