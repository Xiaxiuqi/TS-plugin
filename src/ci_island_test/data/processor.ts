/**
 * 主数据处理器
 * 从原始数据库数据中提取浮岛所需的角色、物品、技能、地图等信息
 */
import { CONFIG } from '../core/constants';
import { state } from '../core/state';
import { findTableByName, forEachVisibleCell, isSystemColumn, parseFormattedContent } from '../core/utils';
import { updateHeightClass } from '../ui/panel-manager';
import { extractWorldInfoData } from './worldinfo-extractor';

declare const $: any;

/**
 * 处理原始数据库数据，返回解析后的浮岛缓存数据
 */
export function processData(rawData: any): any {
  // 处理数据隔离：参考兼容性表格9.0的逻辑
  let processedData = rawData;
  if (rawData) {
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // 检查是否启用了数据隔离
      const win = window as any;
      let ST = win.SillyTavern || (win.parent ? win.parent.SillyTavern : null);
      if (!ST && win.top && win.top.SillyTavern) ST = win.top.SillyTavern;

      if (ST && ST.chat && ST.chat.length > 0) {
        let targetMsg = null;
        for (let i = ST.chat.length - 1; i >= 0; i--) {
          if (!ST.chat[i].is_user) {
            targetMsg = ST.chat[i];
            break;
          }
        }

        if (targetMsg && targetMsg.TavernDB_ACU_IsolatedData) {
          const STORAGE_KEY_V5_SETTINGS = 'shujuku_v34_allSettings_v2';
          let isolationKey = '';
          try {
            let storage: Storage | null = null;
            try {
              if (typeof win.localStorage !== 'undefined' && win.localStorage !== null) {
                storage = win.localStorage;
              }
            } catch (e) {}
            if (storage && !storage.getItem(STORAGE_KEY_V5_SETTINGS) && win.parent) {
              try {
                if (typeof win.parent.localStorage !== 'undefined' && win.parent.localStorage !== null) {
                  storage = win.parent.localStorage;
                }
              } catch (e) {}
            }
            if (storage) {
              const settingsStr = storage.getItem(STORAGE_KEY_V5_SETTINGS);
              if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                if (settings.dataIsolationEnabled && settings.dataIsolationCode)
                  isolationKey = settings.dataIsolationCode;
              }
            }
          } catch (e) {}

          if (
            isolationKey &&
            targetMsg.TavernDB_ACU_IsolatedData[isolationKey] &&
            targetMsg.TavernDB_ACU_IsolatedData[isolationKey].independentData
          ) {
            const isolatedData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey].independentData;
            processedData = {
              ...parsed,
              ...isolatedData,
              mate: { type: 'chatSheets', version: 1 },
            };
            console.log('[浮岛] 使用隔离数据处理:', isolationKey);
          }
        }
      }

      // 兼容新版和旧版格式
      if (parsed.mate && parsed.mate.type === 'chatSheets') {
        processedData = parsed;
      } else if (parsed.TavernDB_ACU_IndependentData) {
        processedData = {
          ...parsed.TavernDB_ACU_IndependentData,
          mate: { type: 'chatSheets', version: 1 },
        };
      } else if (Object.keys(parsed).some(key => key.startsWith('sheet_'))) {
        processedData = {
          ...parsed,
          mate: { type: 'chatSheets', version: 1 },
        };
      }
    } catch (e) {
      console.error('[浮岛] 处理隔离数据失败:', e);
      processedData = rawData;
    }
  }

  const result: any = {
    main: [],
    side: [],
    retired: [],
    mapLocations: [],
    protagonistLoc: '',
    hasMapTable: false,
    hasSkillsTable: false,
    hasLongGoal: false,
    /** 是否检测到角色关系数据（任何角色表存在"关系/与主角关系/角色间关系"列，且至少一行有非空关系内容） */
    hasRelationData: false,
    externalAreas: [],
    allSkills: [],
    worldInfo: {
      tasks: [] as any[],
      forces: [] as any[],
      summary: null as any,
      summaryHistory: [] as any[],
      outline: null as any,
      matchedOutline: null as any,
      newsItems: [] as string[],
    },
    charExtraInfo: {} as Record<string, any>,
  };

  const allItems: any[] = [];
  if (!processedData) return result;

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  try {
    state.optionsData = [];

    // 提取外部区域
    const globalTable = findTableByName(processedData, CONFIG.tables.global);
    if (globalTable && globalTable.content) {
      const h = globalTable.content[0] || [];
      const extIdx = getCol(h, ['外部区域列表', 'ExternalAreas']);
      if (extIdx > -1 && globalTable.content[1]) {
        const rawExt = globalTable.content[1][extIdx];
        if (rawExt)
          result.externalAreas = rawExt
            .split(/[,，;；]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s);
      }
    }

    // 1. 主角位置提取
    Object.values(processedData).forEach((s: any) => {
      if (CONFIG.tables.protagonist === s.name) {
        const h = s.content[0] || [];
        const locIdx = getCol(h, ['主角当前所在地点', '当前位置', 'Location']);
        if (s.content[1] && locIdx > -1) {
          result.protagonistLoc = s.content[1][locIdx];
        }
      }
    });

    // 备用位置提取
    if (!result.protagonistLoc) {
      const allTables = Object.values(processedData);
      for (const table of allTables as any[]) {
        if (table && table.name && table.name.includes('全局数据')) {
          const h = table.content[0] || [];
          const locIdx = getCol(h, ['地点', '位置', 'Location']);
          if (table.content[1] && locIdx > -1 && table.content[1][locIdx]) {
            result.protagonistLoc = table.content[1][locIdx];
            console.log('[位置提取] 从全局表提取到位置:', table.name, result.protagonistLoc);
            break;
          }
        }
      }
    }

    // 2. 选项数据提取
    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name || !s.content || !s.content[0]) return;
      const tableName = s.name || '';
      if (tableName.includes('选项')) {
        const optHeader = s.content[0] || [];
        s.content.slice(1).forEach((row: any) => {
          if (!row) return;
          // 使用统一过滤函数：自动跳过 row_id 等系统列
          forEachVisibleCell(row, optHeader, (_colName, cell) => {
            if (cell) {
              const optionValue = String(cell).trim();
              if (optionValue && !state.optionsData.includes(optionValue)) {
                state.optionsData.push(optionValue);
              }
            }
          });
        });
      }
    });

    // 选项数据/地图数据更新后，立即更新浮岛按钮显示状态（修复首次加载按钮不显示问题）
    try {
      const $con = $('#ci-island-container');
      if ($con && $con.length) {
        updateHeightClass($con);
      }
    } catch {
      // UI 还未初始化时忽略
    }

    // 3. 技能表检测和提取
    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name) return;
      if (s.name.includes('技能')) {
        result.hasSkillsTable = true;
        const h = s.content[0] || [];
        const nameIdx = getCol(h, ['技能名', '技能名称', '名称', 'Name']);
        const typeIdx = getCol(h, ['类型', '技能类型', 'Type', '种类', 'Category']);
        const ownerIdx = getCol(h, ['拥有人', '持有者', '角色名', '姓名', '角色名称', 'Owner']);
        const descIdx = getCol(h, ['描述', '效果', '说明', 'Desc']);

        if (nameIdx > -1) {
          s.content.slice(1).forEach((r: any, relativeIdx: number) => {
            if (!r[nameIdx]) return;
            const details: any = {};
            h.forEach((header: string, i: number) => {
              if (i !== ownerIdx && r[i] && !isSystemColumn(header)) details[header] = r[i];
            });

            result.allSkills.push({
              name: r[nameIdx],
              owner: ownerIdx > -1 ? r[ownerIdx] : '',
              type: typeIdx > -1 ? r[typeIdx] : '其他',
              desc: descIdx > -1 ? r[descIdx] : '',
              details: details,
              _src: { table: s.name, rowIdx: relativeIdx + 1 },
            });
          });
        }
      }
    });

    // 4. 物品提取
    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name) return;
      const isItemTable = /物品|背包|仓库|库存|装备/.test(s.name) && !/重要人物|主角信息|同伴/.test(s.name);
      const hasItemCol = s.content[0] && getCol(s.content[0], ['物品', '道具', '背包']) > -1;

      if (isItemTable || hasItemCol) {
        const h = s.content[0] || [];
        const nameIdx = getCol(h, ['名称', '名字', '物品']);
        const typeIdx = getCol(h, ['类型', '种类', '类别', '分类', 'Category']);
        const ownerIdx = getCol(h, ['拥有者', '拥有人', '持有者', '归属', 'Owner']);
        const countIdx = getCol(h, ['数量', '个数']);
        const descIdx = getCol(h, ['描述', '效果']);

        if (nameIdx > -1) {
          s.content.slice(1).forEach((r: any, relativeIdx: number) => {
            if (!r[nameIdx]) return;
            const details: any = {};
            h.forEach((header: any, i: number) => {
              if (i !== ownerIdx && r[i] && !isSystemColumn(header)) details[header] = r[i];
            });

            const rawType = typeIdx > -1 ? r[typeIdx] : '其他';

            allItems.push({
              name: r[nameIdx],
              owner: r[ownerIdx],
              count: countIdx > -1 ? r[countIdx] || 1 : 1,
              type: rawType,
              desc: descIdx > -1 ? r[descIdx] : '',
              details: details,
              _src: { table: s.name, rowIdx: relativeIdx + 1 },
            });
          });
        }
      }
    });

    // 5. 角色额外信息收集（charExtraInfo）
    const excludeTableKeywords = ['物品', '全局', '任务', '地图', '地点', '元素', '总结', '大纲'];
    const charExtraInfo: Record<string, any> = {};

    const leftSideSourceTables = new Set<string>();
    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name || !s.content || !s.content[0]) return;
      const h = s.content[0] || [];
      const hasLeftSideCols = h.some(
        (col: string) =>
          col &&
          ['姓名', '名字', '名称', '年龄', '性别', '职业', '身份', '状态', 'BUFF', '地点', '位置', '所在地'].some(kw =>
            col.includes(kw),
          ),
      );
      if (hasLeftSideCols) {
        leftSideSourceTables.add(s.name);
      }
    });

    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name || !s.content || !s.content[0]) return;

      const tableName = s.name || '';
      const isExcluded = excludeTableKeywords.some(kw => tableName.includes(kw));
      const isLeftSideSource = leftSideSourceTables.has(tableName);
      const isGlobalTable = tableName.includes('全局');

      if (isExcluded && !isLeftSideSource && !isGlobalTable) return;

      const h = s.content[0] || [];
      const rows = s.content.slice(1);

      const nameIdx = getCol(h, ['角色名', '姓名', '名字', '名称']);
      if (nameIdx === -1) return;

      const bodyInfoCols: number[] = [];
      const bodyStatusCols: number[] = [];
      const clothingCols: number[] = [];
      const otherInfoCols: number[] = [];

      h.forEach((colName: string, colIdx: number) => {
        if (!colName || colIdx === nameIdx) return;
        if (isSystemColumn(colName)) return;
        const col = String(colName);

        if (['特征', '身体特征', '身体部位', '部位'].some(kw => col.includes(kw))) {
          bodyInfoCols.push(colIdx);
        } else if (col.includes('状态') && !col.includes('特殊状态')) {
          bodyStatusCols.push(colIdx);
        } else if (['服装', '衣着', '装扮', '穿着'].some(kw => col.includes(kw))) {
          clothingCols.push(colIdx);
        } else if (
          ![
            '姓名',
            '名字',
            '年龄',
            '性别',
            '职业',
            '身份',
            '物品',
            '道具',
            '背包',
            '属性',
            'Stats',
            '能力值',
            '五维',
            '六维',
          ].some(kw => col.includes(kw))
        ) {
          if (!bodyStatusCols.includes(colIdx)) {
            otherInfoCols.push(colIdx);
          }
        }
      });

      rows.forEach((r: any) => {
        const charName = r[nameIdx];
        if (!charName) return;

        if (!charExtraInfo[charName]) {
          charExtraInfo[charName] = {
            bodyInfo: [],
            bodyInfoGroups: [],
            bodyStatus: [],
            clothing: [],
            clothingGroups: [],
            otherInfo: [],
            stats: [],
            bodyNotes: '',
            clothingNotes: '',
          };
        }

        const info = charExtraInfo[charName];

        // 提取属性信息
        const statsKeywords = ['属性', 'Stats', '能力值', '五维', '六维'];
        const individualStats = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];

        const statsCols = h
          .map((col: string, i: number) => ({ col, i }))
          .filter(
            ({ col }: { col: string; i: number }) =>
              col && (statsKeywords.some(kw => col.includes(kw)) || individualStats.some(kw => col === kw)),
          );

        statsCols.forEach(({ i, col }: any) => {
          const content = r[i];
          if (!content) return;

          if (individualStats.includes(col)) {
            const valStr = String(content).trim();
            let val = 0;
            let displayValue = valStr;

            if (valStr.toUpperCase() === 'MAX') {
              val = 100;
              displayValue = 'MAX';
            } else {
              val = parseInt(valStr);
            }

            if (!isNaN(val) || valStr.toUpperCase() === 'MAX') {
              if (!info.stats.some((s: any) => s.label === col)) {
                info.stats.push({ label: col, value: val, displayValue });
              }
            }
          } else {
            const parts = String(content).split(/[,;，；]/);
            parts.forEach((p: string) => {
              const split = p.split(/[:：]/);
              if (split.length >= 2) {
                const label = split[0].trim();
                const valStr = split[1].trim();
                let val = 0;
                let displayValue = valStr;

                if (valStr.toUpperCase() === 'MAX') {
                  val = 100;
                  displayValue = 'MAX';
                } else {
                  val = parseInt(valStr);
                }

                if (label && (!isNaN(val) || valStr.toUpperCase() === 'MAX')) {
                  if (!info.stats.some((s: any) => s.label === label)) {
                    info.stats.push({ label, value: val, displayValue });
                  }
                }
              }
            });
          }
        });

        // 提取身体信息（按列分组）
        bodyInfoCols.forEach(colIdx => {
          const content = r[colIdx];
          const colName = h[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            const itemsWithSrc = parsed.labels.map(l => ({
              ...l,
              _src: { table: tableName, col: colName },
            }));
            info.bodyInfoGroups.push({
              tableName: tableName,
              colName: colName,
              rawValue: String(content),
              items: itemsWithSrc,
              notes: parsed.notes || '',
            });
          }
        });

        // 提取身体状态
        bodyStatusCols.forEach(colIdx => {
          const colName = h[colIdx];
          const content = r[colIdx];
          if (content) {
            info.bodyStatus.push({
              label: colName,
              value: String(content),
              _src: { table: tableName, col: colName },
            });
          }
        });

        // 提取衣着信息（按列分组）
        clothingCols.forEach(colIdx => {
          const content = r[colIdx];
          const colName = h[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            const itemsWithSrc = parsed.labels.map(l => ({
              ...l,
              _src: { table: tableName, col: colName },
            }));
            info.clothingGroups.push({
              tableName: tableName,
              colName: colName,
              rawValue: String(content),
              items: itemsWithSrc,
              notes: parsed.notes || '',
            });
          }
        });

        // 提取其他信息（按表名分组）
        const tableItems: { label: string; value: string }[] = [];
        otherInfoCols.forEach(colIdx => {
          const colName = h[colIdx];
          const content = r[colIdx];
          if (content) {
            tableItems.push({
              label: colName,
              value: String(content),
            });
          }
        });
        if (tableItems.length > 0) {
          info.otherInfo.push({
            tableName: tableName,
            items: tableItems,
          });
        }
      });
    });

    result.charExtraInfo = charExtraInfo;

    // 6. 角色分类（main/side/retired）
    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name) return;
      const h = s.content[0] || [];
      const rows = s.content.slice(1);

      const jobKeywords = ['职业', '境界', '种族', '称号'];
      const identityKeywords = ['身份', '头衔', '地位', '立场'];

      const idx = {
        name: getCol(h, ['姓名', '名字', '名称']),
        age: getCol(h, ['年龄', '岁数']),
        sex: getCol(h, ['性别']),
        loc: getCol(h, ['地点', '位置', '所在地']),
        job: h.findIndex((x: string) => x && jobKeywords.some(kw => x.includes(kw))),
        identity: h.findIndex((x: string) => x && identityKeywords.some(kw => x.includes(kw))),
        desc: getCol(h, ['关系', '描述', '简介']),
        shortGoal: h.findIndex(
          (x: string) =>
            x &&
            ['短期目标', '心声', '当前', '即时'].some(n => x.includes(n)) &&
            !['位置', '地点', '时间'].some(ex => x.includes(ex)),
        ),
        longGoal: getCol(h, ['长期目标', '终极目标', '愿望']),
        rel: h.findIndex(
          (x: string) => x && (x.includes('关系') || x.includes('与主角关系') || x.includes('角色间关系')),
        ),
        ret: getCol(h, ['离场', '死亡', '退场']),
        item: getCol(h, ['物品', '道具', '背包']),
        special: getCol(h, ['特殊状态', '状态', 'BUFF']),
      };

      if (idx.longGoal > -1) result.hasLongGoal = true;
      if (idx.name === -1) return;

      // 关系列检测：表头里有 rel 列且至少一行有非空内容
      if (idx.rel > -1 && !result.hasRelationData) {
        const hasAnyRelation = rows.some((r: any) => {
          const v = r[idx.rel];
          return v !== null && v !== undefined && String(v).trim() !== '';
        });
        if (hasAnyRelation) result.hasRelationData = true;
      }

      const isProtagTable = s.name.includes(CONFIG.tables.protagonist);
      const isImportantTable = s.name.includes(CONFIG.tables.important) || s.name.includes('重要角色');
      const isCompanionTable = s.name.includes('同伴');

      if (isProtagTable || isImportantTable || isCompanionTable) {
        rows.forEach((r: any) => {
          const name = r[idx.name];
          if (!name) return;

          let job = '';
          let identity = '';
          const desc = idx.desc > -1 ? r[idx.desc] : '';

          if (idx.job > -1 && r[idx.job]) {
            const jobColName = h[idx.job];
            const rawJob = String(r[idx.job]);

            if (jobColName.includes('/') && rawJob.includes('/')) {
              const valParts = rawJob.split('/');
              job = valParts[0]?.trim() || '';
              if (valParts[1] && idx.identity === -1) {
                identity = valParts[1]?.trim() || '';
              }
            } else {
              const split = rawJob.split(/[:：;；]/);
              if (split.length > 1) {
                job = split[0].trim();
                if (idx.identity === -1) identity = split[1].trim();
              } else {
                job = rawJob;
              }
            }
          }

          if (idx.identity > -1 && r[idx.identity] && (!identity || idx.identity !== idx.job)) {
            const identityColName = h[idx.identity];
            const rawIdentity = String(r[idx.identity]);

            if (identityColName.includes('/') && rawIdentity.includes('/')) {
              const valParts = rawIdentity.split('/');
              identity = valParts.map((p: string) => p.trim()).join(' / ');
            } else {
              identity = rawIdentity;
            }
          }

          let sex = idx.sex > -1 ? r[idx.sex] : '?';
          let age = idx.age > -1 ? r[idx.age] : '?';
          if (idx.sex > -1 && (h[idx.sex].includes('/') || h[idx.sex].includes('年龄'))) {
            const rawSex = String(r[idx.sex]);
            const split = rawSex.split(/[:：/／;；]/);
            if (split.length > 1) {
              sex = split[0].trim();
              age = split[1].trim();
            } else if (idx.sex === idx.age) {
              age = '?';
            }
          }

          let loc = '未知';
          if (idx.loc > -1 && r[idx.loc]) loc = r[idx.loc];

          // 提前计算角色类型
          let type = 'side';
          const customCat = state.customCategories[name];
          if (customCat) type = customCat;
          else {
            const isRet = idx.ret > -1 && ['是', 'Yes', '1', '已离场'].some(x => String(r[idx.ret]).includes(x));
            const descText = job + identity + desc;
            if (isRet) type = 'retired';
            else if (isProtagTable) type = 'main';
            else if (CONFIG.keywords.some(kw => descText.includes(kw))) type = 'main';
            else if (isCompanionTable) type = 'side';
            else if (CONFIG.genericNames.some(gn => name.includes(gn)) && name.length < 4) type = 'side';
          }

          // 主角且位置未知，使用全局位置
          if (type === 'main' && (loc === '未知' || !loc) && result.protagonistLoc) {
            loc = result.protagonistLoc;
          }

          const charObj = {
            name,
            loc,
            job,
            identity,
            desc,
            age: age,
            sex: sex,
            shortGoal: idx.shortGoal > -1 ? r[idx.shortGoal] : '',
            longGoal: idx.longGoal > -1 ? r[idx.longGoal] : '',
            special: idx.special > -1 ? r[idx.special] : '',
            relation: idx.rel > -1 ? r[idx.rel] : '',
            items: [] as any[],
            _src: { table: s.name, originName: name },
          };

          // 关联物品
          const globalItems = allItems.filter(i => {
            if (!i.owner) return false;
            const owner = String(i.owner).replace(/\s/g, '').toLowerCase();
            const charNameLower = String(name).replace(/\s/g, '').toLowerCase();
            return owner.includes(charNameLower) || charNameLower.includes(owner);
          });
          charObj.items = [...charObj.items, ...globalItems];

          // 状态标签提取
          const statusCols = h
            .map((col: string, i: number) => ({ col, i }))
            .filter(
              ({ col }: { col: string; i: number }) => col && ['特殊状态', '状态', 'BUFF'].some(kw => col.includes(kw)),
            );

          let specialStatus = '';
          if (statusCols.length > 0) {
            let colsToUse = statusCols;
            const extraInfo = charExtraInfo[name];
            const hasLeftSideStatus = extraInfo && extraInfo.bodyStatus && extraInfo.bodyStatus.length > 0;

            if (statusCols.length > 1 && hasLeftSideStatus) {
              const leftSideLabels = extraInfo.bodyStatus.map((s: any) => s.label);
              colsToUse = statusCols.filter((sc: any) => !leftSideLabels.includes(sc.col));
            }

            const statusValues: string[] = [];
            colsToUse.forEach(({ i }: any) => {
              if (r[i]) statusValues.push(String(r[i]));
            });
            specialStatus = statusValues.join(' ');
          }
          charObj.special = specialStatus;

          if (type === 'main') result.main.push(charObj);
          else if (type === 'retired') result.retired.push(charObj);
          else result.side.push(charObj);
        });
      }
    });

    // 7. 地图数据提取
    const mainLocTable = findTableByName(rawData, '主要地点表');
    const elementTable = findTableByName(rawData, '地图元素表');
    result.allItems = allItems;
    result.hasMapTable = !!(mainLocTable || elementTable);

    if (mainLocTable && mainLocTable.content) {
      const h = mainLocTable.content[0] || [];
      const lIdx = {
        name: getCol(h, ['地点名称', 'Name']),
        x: getCol(h, ['X坐标', 'X']),
        y: getCol(h, ['Y坐标', 'Y']),
        w: getCol(h, ['宽度', 'Width']),
        h: getCol(h, ['高度', 'Height']),
        desc: getCol(h, ['环境描述', 'Desc']),
      };
      if (lIdx.name > -1) {
        mainLocTable.content.slice(1).forEach((r: any) => {
          const x = parseInt(r[lIdx.x]);
          const y = parseInt(r[lIdx.y]);
          if (r[lIdx.name] && !isNaN(x)) {
            result.mapLocations.push({
              name: r[lIdx.name],
              x: x,
              y: y,
              width: parseInt(r[lIdx.w]) || 100,
              height: parseInt(r[lIdx.h]) || 80,
              desc: r[lIdx.desc] || '',
            });
          }
        });
      }
    }

    if (elementTable && elementTable.content) {
      result.mapElements = [];
      const h = elementTable.content[0] || [];
      const eIdx = {
        name: getCol(h, ['元素名称', '名称', 'Name']),
        type: getCol(h, ['元素类型', '类型', 'Type']),
        loc: getCol(h, ['所属主地点', '地点', 'Location']),
        desc: getCol(h, ['元素描述', '描述', 'Desc']),
        status: getCol(h, ['状态', 'Status']),
        opt1: getCol(h, ['互动选项1', 'Option1']),
        opt2: getCol(h, ['互动选项2', 'Option2']),
        opt3: getCol(h, ['互动选项3', 'Option3']),
        x: getCol(h, ['X坐标', 'X', '元素X']),
        y: getCol(h, ['Y坐标', 'Y', '元素Y']),
        w: getCol(h, ['宽度', 'Width', '元素宽度']),
        eH: getCol(h, ['高度', 'Height', '元素高度']),
      };
      if (eIdx.name > -1 && eIdx.loc > -1) {
        elementTable.content.slice(1).forEach((r: any) => {
          if (r[eIdx.name] && r[eIdx.loc]) {
            const interactions = [];
            if (eIdx.opt1 > -1 && r[eIdx.opt1]) interactions.push(r[eIdx.opt1]);
            if (eIdx.opt2 > -1 && r[eIdx.opt2]) interactions.push(r[eIdx.opt2]);
            if (eIdx.opt3 > -1 && r[eIdx.opt3]) interactions.push(r[eIdx.opt3]);
            result.mapElements.push({
              name: r[eIdx.name],
              type: r[eIdx.type] || '物品',
              location: r[eIdx.loc],
              desc: r[eIdx.desc] || '',
              status: eIdx.status > -1 ? r[eIdx.status] : '',
              interactions: interactions,
              x: eIdx.x > -1 ? parseInt(r[eIdx.x]) : undefined,
              y: eIdx.y > -1 ? parseInt(r[eIdx.y]) : undefined,
              width: eIdx.w > -1 ? parseInt(r[eIdx.w]) : undefined,
              height: eIdx.eH > -1 ? parseInt(r[eIdx.eH]) : undefined,
            });
          }
        });
      }
    }

    // 主角位置回填
    if (result.main.length > 0 && result.protagonistLoc) {
      const protagonist =
        result.main.find((c: any) => c._src && c._src.table && c._src.table.includes(CONFIG.tables.protagonist)) ||
        result.main[0];

      if (protagonist && (protagonist.loc === '未知' || !protagonist.loc || protagonist.loc === '')) {
        protagonist.loc = result.protagonistLoc;
      }
    }

    // 8. 提取世界信息（委托给独立模块）
    result.worldInfo = extractWorldInfoData(rawData);
  } catch (e) {
    console.error('[浮岛] 解析错误', e);
  }

  return result;
}
