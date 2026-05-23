import fs from 'node:fs';

const configs = [
  {
    path: 'src/数据库前端/新战斗内容/BP系统美化正则-新变量结构-星铁版本',
    root: '.bp-radar-widget.bp-hsr-ui.bp-newvars-ui',
    palette: {
      red: ['#ff8f8f', 'rgba(220,86,86,.16)', 'rgba(220,86,86,.34)'],
      gold: ['#f0ca75', 'rgba(200,168,108,.16)', 'rgba(200,168,108,.34)'],
      purple: ['#d6c3ff', 'rgba(166,155,208,.16)', 'rgba(166,155,208,.34)'],
      blue: ['#9fd3df', 'rgba(136,174,184,.15)', 'rgba(136,174,184,.32)'],
      green: ['#b8dfb0', 'rgba(159,191,155,.14)', 'rgba(159,191,155,.3)'],
      gray: ['#d2c7b8', 'rgba(184,175,161,.12)', 'rgba(184,175,161,.24)'],
    },
  },
  {
    path: 'src/数据库前端/新战斗内容/BP系统美化正则-新变量结构-米白版本',
    root: '.bp-radar-widget.bp-cream-ui.bp-newvars-ui',
    palette: {
      red: ['#b54a4a', 'rgba(181,74,74,.13)', 'rgba(181,74,74,.28)'],
      gold: ['#a6782a', 'rgba(183,154,98,.16)', 'rgba(183,154,98,.32)'],
      purple: ['#8f5fa8', 'rgba(138,129,157,.15)', 'rgba(138,129,157,.3)'],
      blue: ['#527999', 'rgba(116,139,157,.14)', 'rgba(116,139,157,.28)'],
      green: ['#617f58', 'rgba(127,146,124,.14)', 'rgba(127,146,124,.28)'],
      gray: ['#6f6255', 'rgba(117,107,96,.1)', 'rgba(117,107,96,.2)'],
    },
  },
];

function escRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSelectors(root, selector, groups) {
  return groups.map(group =>
    group.values.map(value => `${root} .bp-target-card[data-rarity="${value}"] ${selector}`).join(',\n    '),
  );
}

function buildBlock(root, p) {
  const groups = [
    { key: 'red', values: ['S级·论外', '出神入化'] },
    { key: 'gold', values: ['AA级·强特级'] },
    { key: 'purple', values: ['A级·特级', '出类拔萃'] },
    { key: 'blue', values: ['B级·一级', 'C级·准一级', '登堂入室', '精通'] },
    { key: 'green', values: ['D级·二级', 'E级·三级', '熟练'] },
    { key: 'gray', values: ['F级·四级', '入门', '未入门'] },
  ];

  return groups
    .map(group => {
      const [color, bg, line] = p[group.key];
      const gameTitle = buildSelectors(root, '.bp-game-title', [group]);
      const traitTitle = buildSelectors(root, '.bp-trait-title', [group]);
      const trait = buildSelectors(root, '.bp-trait', [group]);
      const traitName = buildSelectors(
        root,
        '.bp-trait-name[data-trait*="天与咒缚"],\n    ' +
          root +
          ` .bp-target-card[data-rarity="${group.values[0]}"] .bp-trait-name[data-trait*="六眼"]`,
        [group],
      );

      const specialTraitSelectors = group.values
        .map(value =>
          [
            `${root} .bp-target-card[data-rarity="${value}"] .bp-trait-name[data-trait*="天与咒缚"]`,
            `${root} .bp-target-card[data-rarity="${value}"] .bp-trait-name[data-trait*="六眼"]`,
            `${root} .bp-target-card[data-rarity="${value}"] .bp-trait-name[data-trait*="黑闪眷顾者"]`,
            `${root} .bp-target-card[data-rarity="${value}"] .bp-trait-name[data-trait*="九相图"]`,
            `${root} .bp-target-card[data-rarity="${value}"] .bp-trait-name[data-trait*="受肉体"]`,
          ].join(',\n    '),
        )
        .join(',\n    ');

      return `
    ${gameTitle} {
      color: ${color};
      background: linear-gradient(90deg, ${bg}, rgba(255,255,255,.045), transparent);
      box-shadow: inset 2px 0 0 ${line};
    }

    ${traitTitle} {
      color: ${color};
      background: linear-gradient(90deg, ${bg}, rgba(255,255,255,.04), transparent);
      box-shadow: inset 2px 0 0 ${line};
    }

    ${trait} {
      background: linear-gradient(90deg, ${bg}, rgba(255,255,255,.045));
      box-shadow: inset 2px 0 0 ${line}, inset 0 0 0 1px rgba(255,255,255,.04);
    }

    ${specialTraitSelectors} {
      color: ${color};
      background: ${bg};
      box-shadow: inset 0 0 0 1px ${line};
    }
`;
    })
    .join('');
}

function stripOldSectionColorBlock(content, root) {
  const marker = `    /* 等级联动标题与特性区块配色 */`;
  const start = content.indexOf(marker);
  if (start === -1) return content;
  const endNeedle = `    ${root} .bp-panel-foot {`;
  const end = content.indexOf(endNeedle, start);
  if (end === -1) throw new Error('Cannot find end of old section color block');
  return content.slice(0, start) + content.slice(end);
}

for (const cfg of configs) {
  if (!fs.existsSync(cfg.path)) continue;

  let content = fs.readFileSync(cfg.path, 'utf8');
  content = stripOldSectionColorBlock(content, cfg.root);

  const insertionPoint = `    ${cfg.root} .bp-panel-foot {`;
  const index = content.indexOf(insertionPoint);
  if (index === -1) {
    throw new Error(`Missing panel foot block in ${cfg.path}`);
  }

  const block = `    /* 等级联动标题与特性区块配色 */\n${buildBlock(cfg.root, cfg.palette)}\n`;
  content = content.slice(0, index) + block + content.slice(index);

  fs.writeFileSync(cfg.path, content, 'utf8');
  console.log(`updated ${cfg.path}`);
}
