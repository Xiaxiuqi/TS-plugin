/**
 * 世界信息数据提取器
 * 从原始表格数据中提取任务/势力/总结/大纲等信息
 */
import { isSystemColumn } from '../core/utils';

/**
 * 提取世界信息数据
 * 从表格中提取任务/行程/事件、组织/势力、总结表等信息
 */
export function extractWorldInfoData(rawData: any): any {
  const worldInfo = {
    tasks: [] as any[],
    forces: [] as any[],
    summary: null as any,
    summaryHistory: [] as any[],
    outline: null as any,
    matchedOutline: null as any,
    newsItems: [] as string[],
  };

  if (!rawData) return worldInfo;

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  try {
    const allTables = Object.values(rawData);

    // [Step 1] 提取任务/行程/事件
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      if (/任务|行程|事件|事项|事务|日志/.test(tableName)) {
        const h = table.content[0] || [];
        const rows = table.content.slice(1);
        const nameIdx = getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']);
        const descIdx = getCol(h, ['描述', '内容', '详情', '说明']);
        const statusIdx = getCol(h, ['状态', '进度']);
        const timeIdx = getCol(h, ['时间', '时限', '期限', '截止', '日期']);
        const typeIdx = getCol(h, ['类型', '种类', '分类', 'Category']);
        const publisherIdx = getCol(h, ['发布', '发布人', '发布者', '发单']);
        const executorIdx = getCol(h, ['执行', '执行人', '执行者', '接单']);
        const rewardIdx = getCol(h, ['奖励', '报酬', '酬劳']);
        const penaltyIdx = getCol(h, ['惩罚', '惩处', '失败条件']);
        const locationIdx = getCol(h, ['地点', '位置', '所在地', '目标地']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          worldInfo.tasks.push({
            name: row[nameIdx],
            desc: descIdx > -1 ? row[descIdx] : '',
            status: statusIdx > -1 ? row[statusIdx] : '',
            time: timeIdx > -1 ? row[timeIdx] : '',
            type: typeIdx > -1 ? row[typeIdx] : '',
            publisher: publisherIdx > -1 ? { label: h[publisherIdx], val: row[publisherIdx] } : null,
            executor: executorIdx > -1 ? { label: h[executorIdx], val: row[executorIdx] } : null,
            reward: rewardIdx > -1 ? { label: h[rewardIdx], val: row[rewardIdx] } : null,
            penalty: penaltyIdx > -1 ? { label: h[penaltyIdx], val: row[penaltyIdx] } : null,
            location: locationIdx > -1 ? row[locationIdx] : '',
            _table: tableName,
          });
        });
      }
    });

    // [Step 2] 提取组织/势力
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const nameLower = tableName.toLowerCase();
      if (
        nameLower.includes('组织') ||
        nameLower.includes('势力') ||
        nameLower.includes('团体') ||
        nameLower.includes('阵营') ||
        nameLower.includes('faction') ||
        nameLower.includes('group')
      ) {
        const h = table.content[0] || [];
        const rows = table.content.slice(1);
        const nameIdx = getCol(h, [
          '名称', '名字', '组织', '势力', '团体', '阵营',
          '组织名', '势力名', '团体名', '阵营名', 'Faction', 'Group',
        ]);
        const leaderIdx = getCol(h, ['领袖', '首领', '领导', '头目', '负责人', 'Leader']);
        const purposeIdx = getCol(h, ['宗旨', '目的', '理念', '目标', '宗旨', 'Purpose']);
        const descIdx = getCol(h, ['描述', '介绍', '简介', '详情', 'Description']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          const forceData: any = {
            name: row[nameIdx],
            leader: leaderIdx > -1 ? row[leaderIdx] : '',
            purpose: purposeIdx > -1 ? row[purposeIdx] : '',
            desc: descIdx > -1 ? row[descIdx] : '',
            details: {} as Record<string, string>,
          };
          h.forEach((header: string, idx: number) => {
            if (
              idx !== nameIdx &&
              idx !== leaderIdx &&
              idx !== purposeIdx &&
              idx !== descIdx &&
              row[idx] &&
              !isSystemColumn(header)
            ) {
              forceData.details[header] = row[idx];
            }
          });
          worldInfo.forces.push(forceData);
        });
      }
    });

    // [Step 3] 提取总结/纪要/往期报道
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      // 统一处理纪要表或总结表
      if (tableName.includes('纪要表') || tableName.includes('总结表')) {
        const summaryIdx = getCol(h, ['纪要', '内容', '总结', '摘要']);
        const outlineIdx = getCol(h, ['概览', '大纲', '概要', '计划']);
        const timeIdx = getCol(h, ['时间跨度', '时间', '日期']);
        const indexIdx = getCol(h, ['编码索引', '索引', '编码', '编号']);

        rows.forEach((row: any, rIdx: number) => {
          if (!row[summaryIdx]) return;
          const item = {
            content: row[summaryIdx],
            time: timeIdx > -1 ? row[timeIdx] : '',
            index: indexIdx > -1 ? row[indexIdx] : rIdx + 1,
            summaryLabel: summaryIdx > -1 ? h[summaryIdx] : '摘要',
            matchedOutline: '',
            matchedOutlineLabel: outlineIdx > -1 ? h[outlineIdx] : '大纲',
            details: {} as Record<string, string>,
          };

          if (outlineIdx > -1 && row[outlineIdx]) {
            item.matchedOutline = row[outlineIdx];
          }

          h.forEach((header: string, idx: number) => {
            if (
              idx !== summaryIdx &&
              idx !== timeIdx &&
              idx !== indexIdx &&
              idx !== outlineIdx &&
              row[idx] &&
              !isSystemColumn(header)
            ) {
              item.details[header] = row[idx];
            }
          });
          worldInfo.summaryHistory.push(item);

          if (outlineIdx > -1 && row[outlineIdx]) {
            worldInfo.outline = {
              content: row[outlineIdx],
              index: indexIdx > -1 ? row[indexIdx] : rIdx + 1,
              time: timeIdx > -1 ? row[timeIdx] : '',
              label: h[outlineIdx],
            };
          }
        });

        if (worldInfo.summaryHistory.length > 0) {
          worldInfo.summary = worldInfo.summaryHistory[worldInfo.summaryHistory.length - 1];

          // 双匹配验证：索引+时间
          if (worldInfo.summary && outlineIdx > -1) {
            rows.forEach((row: any) => {
              if (!row[outlineIdx]) return;

              const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
              const rowTime = timeIdx > -1 ? row[timeIdx] : '';

              if (rowIndex == worldInfo.summary.index && rowTime == worldInfo.summary.time) {
                worldInfo.matchedOutline = {
                  content: row[outlineIdx],
                  index: rowIndex,
                  time: rowTime,
                  label: h[outlineIdx],
                };
              }
            });
          }
        }
      }

      // 兼容旧的大纲表
      if (tableName.includes('大纲') && !tableName.includes('纪要')) {
        const outlineIdx = getCol(h, ['大纲', '概要', '内容']);
        const indexIdx = getCol(h, ['索引', '编码', '编号']);
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          worldInfo.outline = {
            content: outlineIdx > -1 ? lastRow[outlineIdx] : '',
            index: indexIdx > -1 ? lastRow[indexIdx] : rows.length,
            label: outlineIdx > -1 ? h[outlineIdx] : '大纲',
          };
        }
      }
    });

    // 生成滚动新闻条目
    if (worldInfo.tasks.length > 0) {
      worldInfo.newsItems.push('【任务速报：出现了新的事件动态！详情请关注事件板块！】');
    }
    if (worldInfo.forces.length > 0) {
      const latestForce = worldInfo.forces[worldInfo.forces.length - 1];
      worldInfo.newsItems.push(
        `【区域势力热点：发现了新势力${latestForce.name}！${latestForce.purpose ? `其宗旨为：${latestForce.purpose}；` : ''}让我们期待他们后续的活跃！】`,
      );
    }
    if (worldInfo.outline) {
      worldInfo.newsItems.push(`【当前速报：${worldInfo.outline.content}。(${worldInfo.outline.index})】`);
    }
  } catch (e) {
    console.warn('[世界信息] 数据提取错误:', e);
  }

  return worldInfo;
}
