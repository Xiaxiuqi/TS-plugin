const fs = require('fs');

const filePath = 'src/数据库前端/regex-正文-诡秘之主catiger52发';
const targetSrcdocLine = 20339;
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split(/\r?\n/);

function printAround(title, lineNo, radius = 10) {
  console.log(`\n=== ${title}: ${lineNo} ===`);
  const start = Math.max(1, lineNo - radius);
  const end = Math.min(lines.length, lineNo + radius);
  for (let i = start; i <= end; i++) {
    console.log(`${String(i).padStart(6, ' ')} | ${lines[i - 1]}`);
  }
}

console.log(`FILE=${filePath}`);
console.log(`TOTAL_LINES=${lines.length}`);
console.log(`RAW_OPEN_BRACE=${(text.match(/\{/g) || []).length}`);
console.log(`RAW_CLOSE_BRACE=${(text.match(/\}/g) || []).length}`);

printAround('source line equals srcdoc line', targetSrcdocLine);
printAround('source line if srcdoc starts at <!DOCTYPE html> line 3', targetSrcdocLine + 2);

const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRe.exec(text)) !== null) {
  const startLine = text.slice(0, match.index).split(/\r?\n/).length;
  const body = match[1];
  const bodyLines = body.split(/\r?\n/);
  scripts.push({ index: scripts.length + 1, startLine, body, bodyLines });
}

console.log(`\nSCRIPT_COUNT=${scripts.length}`);
for (const script of scripts) {
  console.log(
    `SCRIPT #${script.index} startLine=${script.startLine} bodyLines=${script.bodyLines.length} len=${script.body.length}`,
  );
}

for (const script of scripts) {
  const sourceLineIfVmLineIsDocumentLine = targetSrcdocLine;
  if (
    sourceLineIfVmLineIsDocumentLine >= script.startLine &&
    sourceLineIfVmLineIsDocumentLine <= script.startLine + script.bodyLines.length
  ) {
    printAround(`target line inside script #${script.index} by document mapping`, sourceLineIfVmLineIsDocumentLine, 14);
  }

  const sourceLineIfVmLineIsScriptBodyLine = script.startLine + targetSrcdocLine - 1;
  if (sourceLineIfVmLineIsScriptBodyLine >= 1 && sourceLineIfVmLineIsScriptBodyLine <= lines.length) {
    printAround(
      `target line if VM line is script-body-relative for script #${script.index}`,
      sourceLineIfVmLineIsScriptBodyLine,
      8,
    );
  }
}

function findRawScriptLikeInScriptBodies() {
  const rawRe = /<\/?script/i;
  let count = 0;
  for (const script of scripts) {
    script.bodyLines.forEach((line, i) => {
      if (rawRe.test(line)) {
        count++;
        console.log(`RAW_SCRIPT_LIKE_IN_SCRIPT #${script.index} sourceLine=${script.startLine + i + 1} | ${line}`);
      }
    });
  }
  console.log(`RAW_SCRIPT_LIKE_IN_SCRIPT_COUNT=${count}`);
}

function stripJavaScript(code) {
  let output = '';
  let state = 'code';
  let quote = '';
  let escaped = false;
  let templateExprDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const n = code[i + 1];

    if (state === 'code') {
      if (c === '/' && n === '/') {
        output += '  ';
        i++;
        state = 'lineComment';
        continue;
      }
      if (c === '/' && n === '*') {
        output += '  ';
        i++;
        state = 'blockComment';
        continue;
      }
      if (c === '"' || c === "'") {
        output += ' ';
        quote = c;
        escaped = false;
        state = 'string';
        continue;
      }
      if (c === '`') {
        output += ' ';
        escaped = false;
        state = 'template';
        continue;
      }
      output += c;
      continue;
    }

    if (state === 'lineComment') {
      if (c === '\n') {
        output += '\n';
        state = 'code';
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (c === '*' && n === '/') {
        output += ' ';
        i++;
        state = 'code';
      }
      continue;
    }

    if (state === 'string') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === quote) {
        state = 'code';
      }
      continue;
    }

    if (state === 'template') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '`') {
        state = 'code';
      } else if (c === '$' && n === '{') {
        output += '${';
        i++;
        templateExprDepth = 1;
        state = 'templateExpr';
      }
      continue;
    }

    if (state === 'templateExpr') {
      if (c === '/' && n === '/') {
        output += '  ';
        i++;
        state = 'templateExprLineComment';
        continue;
      }
      if (c === '/' && n === '*') {
        output += '  ';
        i++;
        state = 'templateExprBlockComment';
        continue;
      }
      if (c === '"' || c === "'") {
        output += ' ';
        quote = c;
        escaped = false;
        state = 'templateExprString';
        continue;
      }
      if (c === '`') {
        output += ' ';
        escaped = false;
        state = 'nestedTemplate';
        continue;
      }
      output += c;
      if (c === '{') {
        templateExprDepth++;
      } else if (c === '}') {
        templateExprDepth--;
        if (templateExprDepth === 0) {
          state = 'template';
        }
      }
      continue;
    }

    if (state === 'templateExprLineComment') {
      if (c === '\n') {
        output += '\n';
        state = 'templateExpr';
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'templateExprBlockComment') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (c === '*' && n === '/') {
        output += ' ';
        i++;
        state = 'templateExpr';
      }
      continue;
    }

    if (state === 'templateExprString') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === quote) {
        state = 'templateExpr';
      }
      continue;
    }

    if (state === 'nestedTemplate') {
      if (c === '\n') {
        output += '\n';
      } else {
        output += ' ';
      }
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '`') {
        state = 'templateExpr';
      }
      continue;
    }
  }

  return output;
}

function analyzeBracketsForScript(script) {
  const stripped = stripJavaScript(script.body);
  const bodyLines = stripped.split(/\r?\n/);
  const stack = [];
  const openSet = new Set(['{', '[', '(']);
  const closeToOpen = { '}': '{', ']': '[', ')': '(' };
  let mismatchCount = 0;

  for (let lineIndex = 0; lineIndex < bodyLines.length; lineIndex++) {
    const line = bodyLines[lineIndex];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const sourceLine = script.startLine + lineIndex + 1;
      const sourceCol = col + 1;
      if (openSet.has(ch)) {
        stack.push({ ch, line: sourceLine, col: sourceCol });
      } else if (closeToOpen[ch]) {
        const top = stack.pop();
        if (!top || top.ch !== closeToOpen[ch]) {
          mismatchCount++;
          console.log(
            `MISMATCH #${mismatchCount} script #${script.index} close=${ch} at ${sourceLine}:${sourceCol} top=${top ? JSON.stringify(top) : 'EMPTY'}`,
          );
          printAround(`mismatch around script #${script.index}`, sourceLine, 8);
          if (mismatchCount >= 10) return { stack, mismatchCount };
        }
      }
    }
  }

  return { stack, mismatchCount };
}

for (const script of scripts.filter(s => s.startLine > 100)) {
  console.log(`\n=== JS_PARSE script #${script.index} sourceStart=${script.startLine} ===`);
  try {
    new Function(script.body);
    console.log('NEW_FUNCTION=OK');
  } catch (error) {
    console.log(`NEW_FUNCTION=ERROR ${error.name}: ${error.message}`);
    const errLineMatch = String(error.stack || '').match(/<anonymous>:(\d+):(\d+)/);
    if (errLineMatch) {
      const bodyLine = Number(errLineMatch[1]);
      const sourceLine = script.startLine + bodyLine - 1;
      printAround(`new Function error mapped source line`, sourceLine, 12);
    }
  }

  const bracket = analyzeBracketsForScript(script);
  console.log(`BRACKET_MISMATCH_COUNT=${bracket.mismatchCount}`);
  console.log(`BRACKET_REMAINING_STACK=${bracket.stack.length}`);
  if (bracket.stack.length) {
    console.log('LAST_30_UNCLOSED_OPENS=');
    for (const item of bracket.stack.slice(-30)) {
      console.log(JSON.stringify(item));
    }
  }
}

findRawScriptLikeInScriptBodies();

console.log('\n=== DYNAMIC_COMPILATION_POINTS ===');
const dynRe = /\b(?:new\s+Function|Function\s*\(|eval\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`])/g;
lines.forEach((line, i) => {
  if (dynRe.test(line)) {
    console.log(`${String(i + 1).padStart(6, ' ')} | ${line}`);
  }
  dynRe.lastIndex = 0;
});
