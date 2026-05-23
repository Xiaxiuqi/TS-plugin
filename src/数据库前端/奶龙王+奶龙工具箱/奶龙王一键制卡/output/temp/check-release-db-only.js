const fs = require('fs');
const p = 'projects/魔法少女是不会败北恶堕的吧！/release/魔法少女是不会败北恶堕的吧-纯数据库版.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const txt = JSON.stringify(d.data.character_book.entries);
const patterns = [
  "getvar('stat_data')",
  'getvar("stat_data")',
  "getvar('previous_stat_data')",
  'getvar("previous_stat_data")',
  "getvar('initialized_lorebooks')",
  'getvar("initialized_lorebooks")',
  'previous_stat_data',
  'initialized_lorebooks',
  '<UpdateVariable>',
  '</UpdateVariable>',
  '<JSONPatch>',
  '</JSONPatch>',
  'JSONPatch',
  'UpdateVariable',
  'stat_data'
];
const found = patterns.filter(x => txt.includes(x));
if (found.length) {
  throw new Error('release entries still contain legacy tokens: ' + found.join(', '));
}
console.log('RELEASE ENTRIES DB-ONLY OK', d.data.character_book.entries.length);
