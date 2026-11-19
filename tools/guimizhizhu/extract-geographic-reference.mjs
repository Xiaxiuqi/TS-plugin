import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const read = name => readFile(new URL(`../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}`, import.meta.url), 'utf8');
const mapText = await read('38-js-pathway-play.txt');
const mapTree = ts.createSourceFile('map.js', mapText.slice(mapText.indexOf('const MapEarthTool =')), 99, true, ts.ScriptKind.JS);
const area = mapTree.statements[0].declarationList.declarations[0].initializer.getText(mapTree);
const gameText = await read('35a-js-init-storage-crossfire.txt');
const start = gameText.indexOf('_assembleMapContext(stat_data)');
const gameTree = ts.createSourceFile('context.js', `const rules={${gameText.slice(start)}`, 99, true, ts.ScriptKind.JS);
const method = gameTree.statements[0].declarationList.declarations[0].initializer.properties[0];
if (method.name?.getText(gameTree) !== '_assembleMapContext') throw Error('Missing original geographic assembler');
const block = `// BEGIN ORIGINAL GEOGRAPHIC RULES
  function originalRules(GameDBManager, document) {
    const MapEarthTool = ${area};
    const manager = {${method.getText(gameTree)}};
    return { assemble: manager._assembleMapContext, area: MapEarthTool.calculatePolygonArea };
  }
  // END ORIGINAL GEOGRAPHIC RULES`;
const target = new URL('../../public/guimizhizhu_ui/core/geographic-context.js', import.meta.url);
const content = await readFile(target, 'utf8');
await writeFile(target, content.replace(/\/\/ BEGIN ORIGINAL GEOGRAPHIC RULES[\s\S]*?\/\/ END ORIGINAL GEOGRAPHIC RULES/, () => block)
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original geographic assembler and MapEarthTool; no legacy database/cache access.');
