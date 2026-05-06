import fs from 'node:fs';
import vm from 'node:vm';

const filePath = 'src/数据库前端/regex-正文-诡秘之主catiger52发';
const source = fs.readFileSync(filePath, 'utf8');

const queries = [
  'summarizer',
  'refine-modal',
  'refine_',
  '总结器',
  '大总结',
  '核心记忆摘要',
  '二次精炼',
  'refine_memory',
  'defensive_template',
  'Meta-LastSummarizedId',
  'executeTimelineCollapse',
  'loadCollapseSettings',
  'saveCollapseSettings',
  'collapseSettings',
  'isSummarizing',
  'isRefining',
  'summaryReminderShown',
  'lastExtractedCoreMemory',
  'showSummarizerModal',
  'showRefineModal',
  'checkForSummaryReminder',
];

console.log('=== SUMMARY_FEATURE_RESIDUE_CHECK ===');
for (const query of queries) {
  console.log(`${query}: ${source.includes(query)}`);
}

const scriptRegex = new RegExp('<script[^>]*>([\\s\\S]*?)<\\/script>', 'gi');
const scripts = [...source.matchAll(scriptRegex)].map(match => match[1]);
console.log(`SCRIPT_BLOCKS=${scripts.length}`);

let hasSyntaxError = false;
scripts.forEach((code, index) => {
  try {
    new vm.Script(code, {
      filename: `${filePath}#script${index}`,
      displayErrors: true,
    });
    console.log(`SCRIPT_${index}_SYNTAX=OK len=${code.length}`);
  } catch (error) {
    hasSyntaxError = true;
    console.log(`SCRIPT_${index}_SYNTAX=ERR ${error.message}`);
    if (error.stack) {
      console.log(error.stack.split('\n').slice(0, 6).join('\n'));
    }
  }
});

let rawScriptLikeCount = 0;
scripts.forEach(code => {
  const matches = code.match(/<\/?script\b/gi);
  if (matches) rawScriptLikeCount += matches.length;
});
console.log(`RAW_SCRIPT_LIKE_IN_SCRIPT_COUNT=${rawScriptLikeCount}`);

const braceDelta = (source.match(/\{/g) || []).length - (source.match(/\}/g) || []).length;
console.log(`RAW_BRACE_DELTA_OPEN_MINUS_CLOSE=${braceDelta}`);

if (hasSyntaxError || rawScriptLikeCount > 0) {
  process.exitCode = 1;
}
