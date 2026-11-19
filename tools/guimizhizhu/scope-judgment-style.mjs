import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';

const path = new URL('../../public/guimizhizhu_ui/modules/judgment/style.css', import.meta.url);
const sheet = postcss.parse(await readFile(path, 'utf8'));
sheet.walkRules(rule => {
  for (let parent = rule.parent; parent; parent = parent.parent)
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
  rule.selector = postcss.list.comma(rule.selector).map(selector => {
    if (selector.includes('.crypt-lord-judgment-mount') ||
      selector.includes('[data-crypt-lord-judgment-source]')) return selector;
    if (selector.startsWith('.simplified-mode'))
      return selector.replace('.simplified-mode', '.crypt-lord-judgment-mount.simplified-mode');
    return `:where(.crypt-lord-judgment-mount) ${selector}`;
  }).join(',\n    ');
});
await writeFile(path, sheet.toString());
console.log('Scoped original judgment selectors without changing animation keyframes.');
