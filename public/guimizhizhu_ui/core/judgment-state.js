(() => {
  "use strict";

  const KEY = "cryptLord.judgmentState";
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  class JudgmentParser {
        constructor() {
          console.log('[JudgmentParser] 解析器已创建');
          // 定义正则表达式模式
          this.PATTERNS = {
            // 判定请求标记 - 支持两种格式：【判定请求 | ...】 和 判定请求 | ...
            REQUEST_MARKER: /(?:【判定请求\s*\|([^】]+)】|判定请求\s*\|([^>\n]+))/,

            // 判定类型识别（注意：对抗类型必须先于能力检定类型检查）
            TYPE_COMBAT: /类型[:：]\s*(?:非凡)?对抗(?:判定)?/,
            // 能力检定类型：使用负向前瞻排除"对抗"关键词
            TYPE_ABILITY: /类型[:：]\s*(?!(?:非凡)?对抗)([\u4e00-\u9fa5]+(?:\/[\u4e00-\u9fa5]+)*)/,

            // 非凡能力检定字段
            DC_VALUE: /目标难度\(DC\)[:：]\s*(\d+)/,
            SCENARIO: /情景[:：]\s*([^】\n]+)/,
            CHARACTER: /角色[:：]\s*([^\n]+)/,
            ATTRIBUTE_VALUES: /属性选取[:：]\s*([^\n]+)/,
            DICE_ROLL: /投骰结果[:：]\s*\[(\d+)\]/,
            THRESHOLD: /成功率阈值[:：]\s*(\d+)/,
            RESULT: /【判定结果[:：]\s*([^】]+)】/,

            // 非凡对抗字段（向后兼容，标记为可选）
            ENEMY: /敌人[:：]\s*([^\|]+)/,
            ENEMY_STATUS: /敌人状态[:：]\s*([^\|]+)/,
            ATTACK_TYPE: /攻击类型[:：]\s*(物理|非凡)/,
            // 精准匹配攻击手段和防御手段（使用 | 分隔符）
            ATTACK_METHOD: /攻击手段[:：]\s*([^\|]+?)\s*\|/,
            DEFENSE_METHOD: /防御手段[:：]\s*([^\n]+)/,
            SPIRIT_COST: /消耗灵性[:：]\s*<灵性[:：]\s*([+-]?\d+)>/,

            // 对抗角色信息（从"角色: A vs B"中提取初始攻防方）
            COMBAT_CHARACTERS: /角色[:：]\s*([^\s]+)\s+vs\s+([^\n]+)/,

            // 新增：先攻判定（匹配最后一个等号后的数字）
            INITIATIVE_ATTACKER: /攻方先攻值[:：][^>]*=\s*(\d+(?:\.\d+)?)\s*(?=>|$)/m,
            INITIATIVE_DEFENDER: /防方先攻值[:：][^>]*=\s*(\d+(?:\.\d+)?)\s*(?=>|$)/m,
            INITIATIVE_RESULT: /[>＞]\s*(抢占先机！|攻守逆转！)/,

            // 对抗判定（明确匹配"新攻方"和"新防方"，或者无前缀的"攻方"和"防方"）
            // 核心属性：匹配 "攻方核心属性" 或 "新攻方核心属性"
            ATTACKER_ATTR: /(?:新)?攻方核心属性\s*[:：]\s*([^\n]+)/,
            DEFENDER_ATTR: /(?:新)?防方核心属性\s*[:：]\s*([^\n]+)/,
            // 检定值：增强容错性，支持多种格式
            // 格式1: 投骰: [数字] 检定值: 数字
            // 格式2: 投骰: [数字], 检定值: 数字
            // 格式3: 投骰: [数字] = 数字
            // 修复：\]? 后面直接匹配空格和可选逗号，然后匹配"检定值"
            ATTACKER_CHECK: /(?:新)?攻方投骰\s*[:：]\s*\[?\s*(\d+)\s*\]?\s*[,，]?\s*检定值\s*[:：]?\s*(\d+(?:\.\d+)?)/m,
            DEFENDER_CHECK: /(?:新)?防方投骰\s*[:：]\s*\[?\s*(\d+)\s*\]?\s*[,，]?\s*检定值\s*[:：]?\s*(\d+(?:\.\d+)?)/m,

            // 对抗判定结果（从AI输出中提取）
            COMBAT_RESULT: /【(?:对抗)?判定结果\s*[:：]\s*([^】]+)】/,

            // 伤害计算
            DAMAGE_PHYSICAL: /活力伤害\s*=\s*[^≈]+≈[^≈]*≈\s*(\d+)|活力伤害\s*=\s*[^≈]+≈\s*(\d+)/,
            DAMAGE_POLLUTION: /污染伤害\s*=\s*[^≈]+≈[^≈]*≈\s*(\d+)|污染伤害\s*=\s*[^≈]+≈\s*(\d+)/,
            // 向后兼容：旧格式的物理伤害和非凡伤害都算作活力伤害
            DAMAGE_PHYSICAL_OLD: /物理伤害\s*=\s*[^≈]+≈[^≈]*≈\s*(\d+)|物理伤害\s*=\s*[^≈]+≈\s*(\d+)/,
            DAMAGE_EXTRAORDINARY: /非凡伤害\s*=\s*[^≈]+≈[^≈]*≈\s*(\d+)|非凡伤害\s*=\s*[^≈]+≈\s*(\d+)/,

            // 状态更新（匹配角色名称和属性变化）
            STATUS_UPDATE: /<([^:：]+)[:：]\s*([+-]?\d+)>/g,
            // 状态更新中的角色名称（在【状态更新】之后，匹配 "> 角色名" 格式）
            STATUS_CHARACTER: />\s*([^\n]+?)\s*\n\s*>\s*-/g,
          };
        }

        /**
         * 解析判定日志文本
         * @param {string} rawText - 原始判定文本
         * @returns {Object|null} 解析后的数据对象
         */
        parse(rawText) {
          try {
            console.log('[JudgmentParser] 开始解析文本');
            console.log('[JudgmentParser] 文本前100字符:', rawText.substring(0, 100));

            // 识别判定类型
            const type = this.identifyType(rawText);
            console.log('[JudgmentParser] 识别到的类型:', type);

            if (type === 'ability') {
              return this.parseAbilityCheck(rawText);
            } else if (type === 'combat') {
              return this.parseCombatCheck(rawText);
            } else {
              // 降级处理：返回包含原始文本的对象
              console.log('[JudgmentParser] 类型未知，降级处理');
              return {
                type: 'unknown',
                rawText: rawText,
                timestamp: Date.now()
              };
            }
          } catch (error) {
            console.error('[JudgmentParser] 解析失败:', error);
            // 错误处理：返回降级对象
            return {
              type: 'unknown',
              rawText: rawText,
              timestamp: Date.now(),
              error: error.message
            };
          }
        }

        /**
         * 识别判定类型
         * @param {string} text - 判定文本
         * @returns {string} 判定类型: 'ability' | 'combat' | 'unknown'
         */
        identifyType(text) {
          try {
            console.log('[JudgmentParser] 识别判定类型');

            // 检查是否包含判定请求标记
            if (!this.PATTERNS.REQUEST_MARKER.test(text)) {
              console.log('[JudgmentParser] 未找到判定请求标记');
              return 'unknown';
            }

            // 检查是否为对抗类型
            const isCombat = this.PATTERNS.TYPE_COMBAT.test(text);
            console.log('[JudgmentParser] 对抗类型检测:', isCombat);
            if (isCombat) {
              return 'combat';
            }

            // 检查是否为能力检定类型
            const isAbility = this.PATTERNS.TYPE_ABILITY.test(text);
            console.log('[JudgmentParser] 能力检定类型检测:', isAbility);
            if (isAbility) {
              return 'ability';
            }

            console.log('[JudgmentParser] 无法识别判定类型');
            return 'unknown';
          } catch (error) {
            console.error('[JudgmentParser] 类型识别失败:', error);
            return 'unknown';
          }
        }
        //判定
        /**
         * 解析非凡能力检定
         * @param {string} text - 判定文本
         * @returns {Object} 能力检定数据
         */
        parseAbilityCheck(text) {
          try {
            console.log('[JudgmentParser] 解析非凡能力检定');

            // 提取属性类型
            const typeMatch = text.match(this.PATTERNS.TYPE_ABILITY);
            const attributes = typeMatch ? typeMatch[1].split(/[\/、]/).map(s => s.trim()) : [];

            // 提取DC值
            const dcMatch = text.match(this.PATTERNS.DC_VALUE);
            const dc = dcMatch ? parseInt(dcMatch[1]) : 0;

            // 提取情景描述
            const scenarioMatch = text.match(this.PATTERNS.SCENARIO);
            const scenario = scenarioMatch ? scenarioMatch[1].trim() : '';

            // 提取角色名称
            const characterMatch = text.match(this.PATTERNS.CHARACTER);
            const character = characterMatch ? characterMatch[1].trim() : '';

            // 提取属性值（解析属性选取行）
            const attributeValues = new Map();
            const attrMatch = text.match(this.PATTERNS.ATTRIBUTE_VALUES);
            if (attrMatch) {
              const attrText = attrMatch[1];
              // 匹配形如 "灵性(360)" 或 "灵性360" 的模式
              const attrPattern = /([\u4e00-\u9fa5]+)\s*[(\（]?(\d+)[)\）]?/g;
              let match;
              while ((match = attrPattern.exec(attrText)) !== null) {
                attributeValues.set(match[1], parseInt(match[2]));
              }
            }

            // 提取投骰结果
            const diceMatch = text.match(this.PATTERNS.DICE_ROLL);
            const diceRoll = diceMatch ? parseInt(diceMatch[1]) : 0;

            // 提取成功率阈值（完整方案：支持所有可能的格式，包括小数）
            let threshold = 0;

            // 格式1: 成功率阈值: ... > 100（阈值超过基准线）
            // 直接取 > 号后的数字作为显示值
            const gtMatch = text.match(/成功率阈值[:：]\s*.+?>\s*(\d+)/);
            if (gtMatch) {
              threshold = parseInt(gtMatch[1]);
              console.log('[JudgmentParser] 成功率阈值（> 基准值）:', threshold);
            }
            // 格式2-5: 没有 > 号的情况，需要提取并计算
            else {
              let calculatedValue = 0;

              // 优先匹配 ≈ 号后的最终数字（可能是小数）
              // 例如：... = 40 + 15.28 + 17.2 ≈ 72
              const finalApproxMatch = text.match(/成功率阈值[:：].*≈\s*(\d+(?:\.\d+)?)/);
              if (finalApproxMatch) {
                calculatedValue = Math.round(parseFloat(finalApproxMatch[1]));
                console.log('[JudgmentParser] 成功率阈值（最终 ≈ 值）:', calculatedValue);
              }
              // 尝试匹配 = 号后的最终数字（在所有运算符之后，可能是小数）
              // 例如：... ≈ 40 + 60 + 17 = 117
              else {
                const finalEqualMatch = text.match(/成功率阈值[:：].*=\s*(\d+(?:\.\d+)?)(?!\s*[+\-×÷])/);
                if (finalEqualMatch) {
                  calculatedValue = Math.round(parseFloat(finalEqualMatch[1]));
                  console.log('[JudgmentParser] 成功率阈值（最终 = 值）:', calculatedValue);
                }
                // 尝试匹配 = 号后的加法表达式（只有整数）
                // 例如：成功率阈值: = 40 + 20 + 15
                else {
                  const equalMatch = text.match(/成功率阈值[:：]\s*=\s*([^≈>\n]+)/);
                  if (equalMatch) {
                    const expression = equalMatch[1].trim();
                    // 检查是否是简单加法表达式（只有整数和+）
                    if (/^\d+(\s*\+\s*\d+)+$/.test(expression)) {
                      const numbers = expression.match(/\d+/g);
                      calculatedValue = numbers.reduce((sum, num) => sum + parseInt(num), 0);
                      console.log('[JudgmentParser] 成功率阈值（= 加法）:', expression, '=', calculatedValue);
                    }
                    // 否则直接取第一个数字（可能是 = 75 这种格式）
                    else {
                      const singleNumber = expression.match(/^\d+(?:\.\d+)?/);
                      if (singleNumber) {
                        calculatedValue = Math.round(parseFloat(singleNumber[0]));
                        console.log('[JudgmentParser] 成功率阈值（= 单值）:', calculatedValue);
                      }
                    }
                  }
                  // 尝试匹配 ≈ 号后的加法表达式（只有整数）
                  // 例如：成功率阈值: ≈ 40 + 20 + 15
                  else {
                    const approxMatch = text.match(/成功率阈值[:：]\s*≈\s*([^=>\n]+)/);
                    if (approxMatch) {
                      const expression = approxMatch[1].trim();
                      // 检查是否是简单加法表达式（只有整数）
                      if (/^\d+(\s*\+\s*\d+)+$/.test(expression)) {
                        const numbers = expression.match(/\d+/g);
                        calculatedValue = numbers.reduce((sum, num) => sum + parseInt(num), 0);
                        console.log('[JudgmentParser] 成功率阈值（≈ 加法）:', expression, '=', calculatedValue);
                      }
                      // 否则直接取第一个数字（可能是 ≈ 75 这种格式）
                      else {
                        const singleNumber = expression.match(/^\d+(?:\.\d+)?/);
                        if (singleNumber) {
                          calculatedValue = Math.round(parseFloat(singleNumber[0]));
                          console.log('[JudgmentParser] 成功率阈值（≈ 单值）:', calculatedValue);
                        }
                      }
                    }
                    // 最简单格式：成功率阈值: 75
                    else {
                      const simpleMatch = text.match(/成功率阈值[:：]\s*(\d+(?:\.\d+)?)(?!\s*[+\-×÷>=≈])/);
                      if (simpleMatch) {
                        calculatedValue = Math.round(parseFloat(simpleMatch[1]));
                        console.log('[JudgmentParser] 成功率阈值（简单格式）:', calculatedValue);
                      } else {
                        console.warn('[JudgmentParser] 未能匹配成功率阈值行');
                      }
                    }
                  }
                }
              }

              // 关键逻辑：如果计算值 > 100，显示 100；否则显示实际值
              if (calculatedValue > 100) {
                threshold = 100;
                console.log('[JudgmentParser] 成功率阈值超过100，显示基准值:', threshold, '（实际值:', calculatedValue, '）');
              } else {
                threshold = calculatedValue;
              }
            }

            // 提取判定结果
            const resultMatch = text.match(this.PATTERNS.RESULT);
            let resultType = 'unknown';
            let resultDescription = '';

            if (resultMatch) {
              resultDescription = resultMatch[1].trim();
              // 根据结果描述判断类型
              if (resultDescription.includes('命运的眷顾') || resultDescription.includes('大成功')) {
                resultType = 'critical_success';
              } else if (resultDescription.includes('完美掌控') || resultDescription.includes('完胜')) {
                resultType = 'perfect';
              } else if (resultDescription.includes('勉力成功') || resultDescription.includes('险胜')) {
                resultType = 'success';
              } else if (resultDescription.includes('失控预兆') || resultDescription.includes('大失败')) {
                resultType = 'critical_failure';
              } else if (resultDescription.includes('尝试失败') || resultDescription.includes('失败')) {
                resultType = 'failure';
              }
            }

            return {
              type: 'ability',
              rawText: text,
              timestamp: Date.now(),
              request: {
                attributes: attributes,
                dc: dc,
                scenario: scenario
              },
              calculation: {
                character: character,
                attributeValues: attributeValues,
                diceRoll: diceRoll,
                threshold: threshold
              },
              result: {
                type: resultType,
                description: resultDescription
              }
            };
          } catch (error) {
            console.error('[JudgmentParser] 能力检定解析失败:', error);
            // 降级处理
            return {
              type: 'unknown',
              rawText: text,
              timestamp: Date.now(),
              error: error.message
            };
          }
        }

        /**
         * 解析非凡对抗
         * @param {string} text - 判定文本
         * @returns {Object} 对抗数据
         */
        parseCombatCheck(text) {
          try {
            console.log('[JudgmentParser] 解析非凡对抗');

            // 提取角色信息（初始攻防方）
            const charactersMatch = text.match(this.PATTERNS.COMBAT_CHARACTERS);
            const initialAttacker = charactersMatch ? charactersMatch[1].trim() : '攻方';
            const initialDefender = charactersMatch ? charactersMatch[2].trim() : '防方';

            // 提取先攻判定（支持多种格式）
            const initAttackerMatch = text.match(this.PATTERNS.INITIATIVE_ATTACKER);
            const initDefenderMatch = text.match(this.PATTERNS.INITIATIVE_DEFENDER);
            const initResultMatch = text.match(this.PATTERNS.INITIATIVE_RESULT);

            let attackerInitScore = 0;
            let defenderInitScore = 0;
            let initiativeResult = '';
            let isReversed = false;

            if (initAttackerMatch) {
              attackerInitScore = parseFloat(initAttackerMatch[1]);
            }
            if (initDefenderMatch) {
              defenderInitScore = parseFloat(initDefenderMatch[1]);
            }
            if (initResultMatch) {
              initiativeResult = initResultMatch[1]; // "抢占先机！" 或 "攻守逆转！"
              isReversed = initiativeResult === '攻守逆转！';
            }

            // 根据先攻结果确定最终的攻防方（新攻防方）
            const finalAttacker = isReversed ? initialDefender : initialAttacker;
            const finalDefender = isReversed ? initialAttacker : initialDefender;

            const initWinner = attackerInitScore > defenderInitScore ? 'attacker' : 'defender';

            // 提取敌人信息（向后兼容）
            const enemyMatch = text.match(this.PATTERNS.ENEMY);
            const enemy = enemyMatch ? enemyMatch[1].trim() : '';

            const enemyStatusMatch = text.match(this.PATTERNS.ENEMY_STATUS);
            const enemyStatus = enemyStatusMatch ? enemyStatusMatch[1].trim() : '';

            // 提取攻击类型
            const attackTypeMatch = text.match(this.PATTERNS.ATTACK_TYPE);
            const attackType = attackTypeMatch ? (attackTypeMatch[1] === '物理' ? 'physical' : 'extraordinary') : 'physical';

            // 提取攻击手段
            const attackMethodMatch = text.match(this.PATTERNS.ATTACK_METHOD);
            const attackMethod = attackMethodMatch ? attackMethodMatch[1].trim() : '';

            // 提取防御手段
            const defenseMethodMatch = text.match(this.PATTERNS.DEFENSE_METHOD);
            const defenseMethod = defenseMethodMatch ? defenseMethodMatch[1].trim() : '';

            // 提取灵性消耗
            const spiritCostMatch = text.match(this.PATTERNS.SPIRIT_COST);
            const spiritCost = spiritCostMatch ? parseInt(spiritCostMatch[1]) : 0;

            // 提取对抗判定
            const attackerAttrMatch = text.match(this.PATTERNS.ATTACKER_ATTR);
            const defenderAttrMatch = text.match(this.PATTERNS.DEFENDER_ATTR);

            const attackerAttributes = new Map();
            const defenderAttributes = new Map();

            // 解析攻方属性
            if (attackerAttrMatch) {
              const attrText = attackerAttrMatch[1];
              const attrPattern = /([\u4e00-\u9fa5]+)\s*(\d+)/g;
              let match;
              while ((match = attrPattern.exec(attrText)) !== null) {
                attackerAttributes.set(match[1], parseInt(match[2]));
              }
            }

            // 解析防方属性
            if (defenderAttrMatch) {
              const attrText = defenderAttrMatch[1];
              const attrPattern = /([\u4e00-\u9fa5]+)\s*(\d+)/g;
              let match;
              while ((match = attrPattern.exec(attrText)) !== null) {
                defenderAttributes.set(match[1], parseInt(match[2]));
              }
            }

            // 提取投骰值（支持标准格式和角色名称格式）
            // 先尝试标准格式
            let attackerRollMatch = text.match(/(?:新)?攻方投骰\s*[:：]\s*\[(\d+)\]/);
            let defenderRollMatch = text.match(/(?:新)?防方投骰\s*[:：]\s*\[(\d+)\]/);

            // 如果标准格式失败，尝试使用角色名称
            if (!attackerRollMatch && finalAttacker) {
              const escapedAttacker = finalAttacker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              attackerRollMatch = text.match(new RegExp(`${escapedAttacker}投骰\\s*[:：]\\s*\\[(\\d+)\\]`));
            }
            if (!defenderRollMatch && finalDefender) {
              const escapedDefender = finalDefender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              defenderRollMatch = text.match(new RegExp(`${escapedDefender}投骰\\s*[:：]\\s*\\[(\\d+)\\]`));
            }

            const attackerRoll = attackerRollMatch ? parseInt(attackerRollMatch[1]) : 0;
            const defenderRoll = defenderRollMatch ? parseInt(defenderRollMatch[1]) : 0;

            console.log('[JudgmentParser] 投骰值提取:', { attackerRoll, defenderRoll, finalAttacker, finalDefender });

            // 提取检定值（支持多种格式：投骰、检定值、最终检定值）
            let attackerCheckMatch = text.match(this.PATTERNS.ATTACKER_CHECK);
            let defenderCheckMatch = text.match(this.PATTERNS.DEFENDER_CHECK);

            // 如果标准格式失败，尝试使用角色名称格式
            if (!attackerCheckMatch && finalAttacker) {
              const escapedAttacker = finalAttacker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              attackerCheckMatch = text.match(new RegExp(`${escapedAttacker}投骰\\s*[:：]\\s*\\[?\\s*(\\d+)\\s*\\]?\\s*[,，]?\\s*检定值\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)`, 'm'));
            }
            if (!defenderCheckMatch && finalDefender) {
              const escapedDefender = finalDefender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              defenderCheckMatch = text.match(new RegExp(`${escapedDefender}投骰\\s*[:：]\\s*\\[?\\s*(\\d+)\\s*\\]?\\s*[,，]?\\s*检定值\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)`, 'm'));
            }

            console.log('[JudgmentParser] 检定值匹配结果:', {
              attackerCheckMatch: attackerCheckMatch ? attackerCheckMatch[0] : null,
              defenderCheckMatch: defenderCheckMatch ? defenderCheckMatch[0] : null
            });

            // 调试：输出相关文本片段
            if (!attackerCheckMatch || !defenderCheckMatch) {
              const attackerLine = text.match(/新攻方投骰[^\n]*/);
              const defenderLine = text.match(/新防方投骰[^\n]*/);
              console.log('[JudgmentParser] 调试 - 攻方投骰行:', attackerLine ? attackerLine[0] : '未找到');
              console.log('[JudgmentParser] 调试 - 防方投骰行:', defenderLine ? defenderLine[0] : '未找到');
            }

            // 优先使用最终检定值，如果没有则使用检定值
            let attackerCheck = 0;
            let defenderCheck = 0;

            if (attackerCheckMatch) {
              // 如果正则匹配到了投骰值（第1组）和检定值（第2组）
              if (attackerCheckMatch[2]) {
                attackerCheck = parseFloat(attackerCheckMatch[2]);
              } else if (attackerCheckMatch[1]) {
                attackerCheck = parseFloat(attackerCheckMatch[1]);
              }
            }

            if (defenderCheckMatch) {
              if (defenderCheckMatch[2]) {
                defenderCheck = parseFloat(defenderCheckMatch[2]);
              } else if (defenderCheckMatch[1]) {
                defenderCheck = parseFloat(defenderCheckMatch[1]);
              }
            }

            console.log('[JudgmentParser] 最终检定值:', { attackerCheck, defenderCheck });

            // 备用方案：如果主正则失败，尝试更精确的匹配
            if (attackerCheck === 0 && text.includes('检定值')) {
              // 先尝试标准格式
              let fallbackMatch = text.match(/新攻方投骰[^检\n]*检定值\s*[:：]?\s*(\d+(?:\.\d+)?)/);
              // 如果失败，尝试角色名称格式
              if (!fallbackMatch && finalAttacker) {
                const escapedAttacker = finalAttacker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                fallbackMatch = text.match(new RegExp(`${escapedAttacker}投骰[^检\\n]*检定值\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)`));
              }
              if (fallbackMatch) {
                attackerCheck = parseFloat(fallbackMatch[1]);
                console.log('[JudgmentParser] 使用备用方案提取攻方检定值:', attackerCheck);
              }
            }

            if (defenderCheck === 0 && text.includes('检定值')) {
              // 先尝试标准格式
              let fallbackMatch = text.match(/新防方投骰[^检\n]*检定值\s*[:：]?\s*(\d+(?:\.\d+)?)/);
              // 如果失败，尝试角色名称格式
              if (!fallbackMatch && finalDefender) {
                const escapedDefender = finalDefender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                fallbackMatch = text.match(new RegExp(`${escapedDefender}投骰[^检\\n]*检定值\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)`));
              }
              if (fallbackMatch) {
                defenderCheck = parseFloat(fallbackMatch[1]);
                console.log('[JudgmentParser] 使用备用方案提取防方检定值:', defenderCheck);
              }
            }

            // 判断对抗结果（优先从AI输出中提取，而不是自己计算）
            let combatResult = 'miss'; // 默认值
            const combatResultMatch = text.match(this.PATTERNS.COMBAT_RESULT);
            if (combatResultMatch) {
              const resultText = combatResultMatch[1].trim();
              // 判断是攻击成功还是防御成功
              if (/攻击成功|命中/.test(resultText)) {
                combatResult = 'hit';
              } else if (/防御成功|未命中|格挡成功|闪避成功/.test(resultText)) {
                combatResult = 'miss';
              }
              console.log('[JudgmentParser] 从AI输出提取对抗结果:', resultText, '→', combatResult);
            } else {
              // 降级方案：如果没有找到结果文本，则根据检定值比较
              combatResult = attackerCheck > defenderCheck ? 'hit' : 'miss';
              console.log('[JudgmentParser] 使用检定值比较判断结果:', combatResult);
            }

            // 提取伤害计算
            let damage = null;
            const vitalityDamageMatch = text.match(this.PATTERNS.DAMAGE_PHYSICAL); // 新格式：活力伤害
            const pollutionDamageMatch = text.match(this.PATTERNS.DAMAGE_POLLUTION);
            const physicalDamageOldMatch = text.match(this.PATTERNS.DAMAGE_PHYSICAL_OLD); // 旧格式：物理伤害
            const extraordinaryDamageMatch = text.match(this.PATTERNS.DAMAGE_EXTRAORDINARY); // 旧格式：非凡伤害

            if (vitalityDamageMatch || pollutionDamageMatch || physicalDamageOldMatch || extraordinaryDamageMatch) {
              damage = {
                // 活力伤害：优先使用新格式，否则使用旧格式的物理伤害或非凡伤害
                // 正则有两个捕获组，优先使用第一个（两个≈），否则使用第二个（一个≈）
                vitalityDamage: vitalityDamageMatch ? parseInt(vitalityDamageMatch[1] || vitalityDamageMatch[2]) : (physicalDamageOldMatch ? parseInt(physicalDamageOldMatch[1] || physicalDamageOldMatch[2]) :
                  (extraordinaryDamageMatch ? parseInt(extraordinaryDamageMatch[1] || extraordinaryDamageMatch[2]) : 0)),
                // 污染伤害：只从污染伤害字段提取
                pollutionDamage: pollutionDamageMatch ? parseInt(pollutionDamageMatch[1] || pollutionDamageMatch[2]) : 0,
                specialEffects: []
              };
            }

            // 提取状态更新
            const statusUpdates = this.extractStatusUpdates(text);

            return {
              type: 'combat',
              rawText: text,
              timestamp: Date.now(),
              characters: {
                attacker: finalAttacker, // 使用最终的攻方名称（可能已互换）
                defender: finalDefender, // 使用最终的防方名称（可能已互换）
                initialAttacker: initialAttacker, // 保存初始攻方名称
                initialDefender: initialDefender // 保存初始防方名称
              },
              request: {
                enemy: enemy,
                enemyStatus: enemyStatus,
                attackType: attackType,
                attackMethod: attackMethod,
                defenseMethod: defenseMethod,
                spiritCost: spiritCost
              },
              initiative: {
                attackerScore: attackerInitScore,
                defenderScore: defenderInitScore,
                winner: initWinner,
                result: initiativeResult // 新增：抢占先机或攻守逆转
              },
              combat: {
                attackerAttributes: attackerAttributes,
                defenderAttributes: defenderAttributes,
                attackerRoll: attackerRoll,
                defenderRoll: defenderRoll,
                attackerCheck: attackerCheck,
                defenderCheck: defenderCheck,
                result: combatResult
              },
              damage: damage,
              statusUpdates: statusUpdates
            };
          } catch (error) {
            console.error('[JudgmentParser] 对抗解析失败:', error);
            // 降级处理
            return {
              type: 'unknown',
              rawText: text,
              timestamp: Date.now(),
              error: error.message
            };
          }
        }

        /**
         * 提取状态更新
         * @param {string} text - 状态更新文本
         * @returns {Object} 状态更新对象 {attacker: [], defender: []}
         */
        extractStatusUpdates(text) {
          try {
            console.log('[JudgmentParser] 提取状态更新');

            const updates = {
              attacker: [],
              defender: []
            };

            // 查找【状态更新】部分
            const statusSection = text.match(/【状态更新】([\s\S]*?)(?=【|$)/);
            if (!statusSection) {
              return updates;
            }

            const statusText = statusSection[1];

            // 按行分割并过滤空行
            const lines = statusText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            let currentTarget = null;
            let characterCount = 0; // 记录遇到的角色数量

            for (const line of lines) {
              // 跳过引用符号
              const cleanLine = line.replace(/^[>-]\s*/, '');

              // 检查是否是角色名称行（不包含<>且不是以-开头的属性行）
              if (!cleanLine.includes('<') && !cleanLine.includes('>') && cleanLine.length > 0) {
                currentTarget = cleanLine;
                characterCount++; // 每遇到一个角色名称，计数+1
                continue;
              }

              // 提取属性变动（匹配 <属性：+/-数值> 格式）
              const matches = [...cleanLine.matchAll(this.PATTERNS.STATUS_UPDATE)];
              for (const match of matches) {
                const change = {
                  attribute: match[1].trim(),
                  value: parseInt(match[2])
                };

                // 根据角色顺序添加到对应数组
                if (currentTarget) {
                  if (characterCount === 1) {
                    // 第一个角色是攻方
                    updates.attacker.push(change);
                  } else if (characterCount === 2) {
                    // 第二个角色是防方
                    updates.defender.push(change);
                  }
                }
              }
            }

            return updates;
          } catch (error) {
            console.error('[JudgmentParser] 状态更新提取失败:', error);
            return { attacker: [], defender: [] };
          }
        }
      }

      // ===== 2. JudgmentRenderer - 渲染器类 =====
      class JudgmentRenderer {
        constructor() {
          console.log('[JudgmentRenderer] 渲染器已创建');
        }

        /**
         * 创建SVG图标元素
         * @param {string} iconId - 图标ID（对应symbol的id）
         * @param {string} className - CSS类名
         * @returns {SVGElement} SVG图标元素
         */
        createSvgIcon(iconId, className = '') {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', `svg-icon ${className}`);
          svg.setAttribute('width', '24');
          svg.setAttribute('height', '24');
          const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${iconId}`);

          svg.appendChild(use);
          return svg;
        }

        /**
         * 渲染判定块
         * @param {Object} data - 判定数据
         * @param {HTMLElement} container - 容器元素
         * @returns {HTMLElement} 渲染后的判定块元素
         */
        render(data, container) {
          console.log('[JudgmentRenderer] 开始渲染判定块, 类型:', data.type);

          try {
            let judgmentBlock = null;

            // 根据判定类型调用对应的渲染方法
            if (data.type === 'ability') {
              judgmentBlock = this.renderAbilityCheck(data);
            } else if (data.type === 'combat') {
              judgmentBlock = this.renderCombatCheck(data);
            } else {
              // 未知类型,渲染原始文本
              judgmentBlock = this.renderUnknown(data);
            }

            // 如果提供了容器,将判定块添加到容器中
            if (container && judgmentBlock) {
              container.appendChild(judgmentBlock);
            }

            return judgmentBlock;
          } catch (error) {
            console.error('[JudgmentRenderer] 渲染失败:', error);
            return null;
          }
        }

        /**
         * 渲染未知类型判定(降级处理)
         * @param {Object} data - 判定数据
         * @returns {HTMLElement} 判定块元素
         */
        renderUnknown(data) {
          const block = document.createElement('div');
          block.className = 'judgment-block';
          block.setAttribute('data-type', 'unknown');
          block.setAttribute('data-collapsed', 'true');
          // 创建标题栏
          const header = document.createElement('div');
          header.className = 'judgment-header';
          header.setAttribute('tabindex', '0');
          const icon = document.createElement('div');
          icon.className = 'judgment-icon';
          icon.textContent = '❓';
          const title = document.createElement('div');
          title.className = 'judgment-title';

          const typeSpan = document.createElement('span');
          typeSpan.className = 'judgment-type';
          typeSpan.textContent = '未格式化内容';

          title.appendChild(typeSpan);

          // 神秘符文 - 折叠状态下显示
          const runeSeal = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          runeSeal.setAttribute('class', 'judgment-rune-seal');
          runeSeal.setAttribute('viewBox', '0 0 100 100');
          runeSeal.innerHTML = /* HTML */ `
              <use href="#rune-seal"></use>
            `;

          const toggle = document.createElement('div');
          toggle.className = 'judgment-toggle';
          toggle.textContent = '▼';
          header.appendChild(icon);
          header.appendChild(title);
          header.appendChild(runeSeal);
          header.appendChild(toggle);

          // 创建详情区域
          const details = document.createElement('div');
          details.className = 'judgment-details';
          const rawTextDiv = document.createElement('div');
          rawTextDiv.className = 'judgment-section';
          rawTextDiv.style.whiteSpace = 'pre-wrap';
          rawTextDiv.textContent = data.rawText;
          details.appendChild(rawTextDiv);

          block.appendChild(header);
          block.appendChild(details);

          return block;
        }

        /**
         * 应用长文本截断
         * @param {string} text - 文本内容
         * @param {HTMLElement} container - 容器元素
         * @returns {HTMLElement|null} 包含截断功能的容器，如果不需要截断则返回null
         */
        /**
         * 渲染能力检定
         * @param {Object} data - 能力检定数据
         * @returns {HTMLElement} 判定块元素
         */
        renderAbilityCheck(data) {
          console.log('[JudgmentRenderer] 渲染能力检定');

          // 创建判定块容器
          const block = document.createElement('div');
          block.className = 'judgment-block';
          block.setAttribute('data-type', 'ability');
          block.setAttribute('data-collapsed', 'true');
          // 根据结果类型应用主题类
          const themeClass = this.getThemeClass(data.result.type);
          if (themeClass) {
            block.classList.add(themeClass);
          }

          // 创建标题栏
          const header = document.createElement('div');
          header.className = 'judgment-header';
          header.setAttribute('tabindex', '0');
          // 图标
          const icon = document.createElement('div');
          icon.className = 'judgment-icon';
          icon.textContent = '🎲';
          // 标题信息
          const title = document.createElement('div');
          title.className = 'judgment-title';

          const typeSpan = document.createElement('span');
          typeSpan.className = 'judgment-type';
          typeSpan.textContent = '非凡能力检定';

          const scenarioSpan = document.createElement('span');
          scenarioSpan.className = 'judgment-scenario';
          scenarioSpan.textContent = data.request.scenario || '未知情景';

          title.appendChild(typeSpan);
          title.appendChild(scenarioSpan);

          // 神秘符文 - 折叠状态下显示
          const runeSeal = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          runeSeal.setAttribute('class', 'judgment-rune-seal');
          runeSeal.setAttribute('viewBox', '0 0 100 100');
          runeSeal.innerHTML = /* HTML */ `
              <use href="#rune-seal"></use>
            `;

          // 结果徽章 - 折叠和展开都显示
          const resultBadge = document.createElement('div');
          resultBadge.className = `judgment-result-badge ${data.result.type}`;
          const resultText = this.getResultText(data.result.type);
          resultBadge.textContent = resultText;

          // 成功率徽章 - 折叠和展开都显示（数据缺失时不创建）
          let thresholdBadge = null;
          const thresholdValue = data.calculation && data.calculation.threshold;
          if (Number.isFinite(thresholdValue) && thresholdValue >= 0) {
            thresholdBadge = document.createElement('div');
            thresholdBadge.className = 'judgment-threshold-badge';
            thresholdBadge.textContent = `成功率 ${thresholdValue}%`;
          }

          // 折叠切换图标
          const toggle = document.createElement('div');
          toggle.className = 'judgment-toggle';
          toggle.textContent = '▼';
          header.appendChild(icon);
          header.appendChild(title);
          if (thresholdBadge) header.appendChild(thresholdBadge);
          header.appendChild(resultBadge);
          header.appendChild(runeSeal);
          header.appendChild(toggle);

          // 创建详情区域
          const details = document.createElement('div');
          details.className = 'judgment-details';
          // 判定请求区域
          const requestSection = this.renderAbilityRequest(data.request);
          details.appendChild(requestSection);

          // 计算过程区域
          const calculationSection = this.renderCalculationSteps(data.calculation);
          details.appendChild(calculationSection);

          // 判定结果区域
          const resultSection = this.renderResult(data.result);
          details.appendChild(resultSection);

          block.appendChild(header);
          block.appendChild(details);

          return block;
        }

        /**
         * 渲染能力检定请求区域
         * @param {Object} request - 请求数据
         * @returns {HTMLElement} 请求区域元素
         */
        renderAbilityRequest(request) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-request';
          const title = document.createElement('h4');
          title.textContent = '判定请求';
          section.appendChild(title);

          // 属性信息 - 添加关键信息高亮
          if (request.attributes && request.attributes.length > 0) {
            const attrInfo = document.createElement('div');
            attrInfo.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '属性:';

            const value = document.createElement('span');
            value.className = 'info-value highlight';
            value.textContent = request.attributes.join(' + ');

            attrInfo.appendChild(label);
            attrInfo.appendChild(value);
            section.appendChild(attrInfo);
          }

          // DC值 - 添加关键信息高亮
          if (request.dc) {
            const dcInfo = document.createElement('div');
            dcInfo.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '目标难度(DC):';

            const value = document.createElement('span');
            value.className = 'info-value highlight';
            value.textContent = request.dc.toString();

            dcInfo.appendChild(label);
            dcInfo.appendChild(value);
            section.appendChild(dcInfo);
          }

          // 情景描述 - 应用长文本截断
          if (request.scenario) {
            const scenarioInfo = document.createElement('div');
            scenarioInfo.className = 'request-info';
            scenarioInfo.style.display = 'block'; // 改为块级显示以便更好地处理长文本

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '情景:';
            scenarioInfo.appendChild(label);

            // 检查情景描述长度
            if (request.scenario.length > 500) {
              // 应用截断
              const truncationWrapper = this.createTruncatedText(request.scenario);
              scenarioInfo.appendChild(truncationWrapper);
            } else {
              const value = document.createElement('span');
              value.className = 'info-value';
              value.textContent = request.scenario;
              scenarioInfo.appendChild(value);
            }

            section.appendChild(scenarioInfo);
          }

          return section;
        }

        /**
         * 创建带截断功能的文本元素
         * @param {string} text - 文本内容
         * @returns {HTMLElement} 包含截断功能的容器
         */
        createTruncatedText(text) {
          const MAX_LENGTH = 500;

          const wrapper = document.createElement('div');
          wrapper.style.marginTop = '8px';

          // 创建截断的文本
          const truncatedSpan = document.createElement('span');
          truncatedSpan.className = 'info-value';
          truncatedSpan.textContent = text.substring(0, MAX_LENGTH) + '...';
          truncatedSpan.style.display = 'inline';

          // 创建完整文本（初始隐藏）
          const fullSpan = document.createElement('span');
          fullSpan.className = 'info-value';
          fullSpan.textContent = text;
          fullSpan.style.display = 'none';

          // 创建"查看更多"按钮
          const expandBtn = document.createElement('button');
          expandBtn.className = 'judgment-expand-btn';
          expandBtn.textContent = '查看更多';
          expandBtn.setAttribute('type', 'button');
          expandBtn.style.marginTop = '8px';

          // 添加点击事件
          expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const isTruncated = truncatedSpan.style.display !== 'none';

            if (isTruncated) {
              truncatedSpan.style.display = 'none';
              fullSpan.style.display = 'inline';
              expandBtn.textContent = '收起';
            } else {
              truncatedSpan.style.display = 'inline';
              fullSpan.style.display = 'none';
              expandBtn.textContent = '查看更多';
            }
          });

          wrapper.appendChild(truncatedSpan);
          wrapper.appendChild(fullSpan);
          wrapper.appendChild(expandBtn);

          return wrapper;
        }

        /**
         * 渲染计算步骤
         * @param {Object} calculation - 计算数据
         * @returns {HTMLElement} 计算步骤容器
         */
        renderCalculationSteps(calculation) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-calculation';
          const title = document.createElement('h4');
          title.textContent = '计算过程';
          section.appendChild(title);

          const stepsContainer = document.createElement('div');
          stepsContainer.className = 'calculation-steps';
          // 角色名称
          if (calculation.character) {
            const step = document.createElement('div');
            step.className = 'calc-step';
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '角色:';

            const value = document.createElement('span');
            value.className = 'step-value';
            value.textContent = calculation.character;

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          // 属性值
          if (calculation.attributeValues && calculation.attributeValues.size > 0) {
            const step = document.createElement('div');
            step.className = 'calc-step';
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '属性值:';

            const value = document.createElement('span');
            value.className = 'step-value';
            const attrArray = [];
            calculation.attributeValues.forEach((val, key) => {
              attrArray.push(`${key}(${val})`);
            });
            value.textContent = attrArray.join(' + ');

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          // 运气值已移除 - 不再单独显示

          // 投骰结果
          if (calculation.diceRoll !== undefined) {
            const step = document.createElement('div');
            step.className = 'calc-step';
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '投骰结果:';

            const value = document.createElement('span');
            value.className = 'step-value';
            value.textContent = `[${calculation.diceRoll}]`;

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          // 成功率阈值
          if (calculation.threshold !== undefined) {
            const step = document.createElement('div');
            step.className = 'calc-step';
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '成功率阈值:';

            const value = document.createElement('span');
            value.className = 'step-value';
            value.textContent = calculation.threshold.toString();

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          section.appendChild(stepsContainer);
          return section;
        }

        /**
         * 渲染判定结果
         * @param {Object} result - 结果数据
         * @returns {HTMLElement} 结果元素
         */
        renderResult(result) {
          const section = document.createElement('div');
          section.className = `judgment-section judgment-result ${result.type}`;
          // 结果图标
          const icon = document.createElement('div');
          icon.className = 'result-icon';
          icon.textContent = this.getResultIcon(result.type);

          // 结果文本 - 确保有文本标签，不仅依赖颜色（需求7.4）
          const text = document.createElement('div');
          text.className = 'result-text';
          const resultText = result.description || this.getResultText(result.type);
          text.textContent = resultText;

          // 添加详细的aria-label，描述结果类型和含义
          const resultTypeText = this.getResultText(result.type);
          section.appendChild(icon);
          section.appendChild(text);

          return section;
        }

        /**
         * 渲染对抗判定
         * @param {Object} data - 对抗数据
         * @returns {HTMLElement} 判定块元素
         */
        renderCombatCheck(data) {
          console.log('[JudgmentRenderer] 渲染对抗判定');

          // 创建判定块容器
          const block = document.createElement('div');
          block.className = 'judgment-block';
          block.setAttribute('data-type', 'combat');
          block.setAttribute('data-collapsed', 'true');
          // 根据对抗结果应用主题类
          const isHit = data.combat.result === 'hit';
          const themeClass = isHit ? 'theme-narrow-success' : 'theme-attempt-failure';
          block.classList.add(themeClass);

          // 创建标题栏
          const header = document.createElement('div');
          header.className = 'judgment-header';
          header.setAttribute('tabindex', '0');
          // 使用初始角色名称构建对抗描述（不交换）
          const initialAttacker = data.characters && data.characters.initialAttacker ? data.characters.initialAttacker : '攻方';
          const initialDefender = data.characters && data.characters.initialDefender ? data.characters.initialDefender : '防方';
          const combatDesc = `${initialAttacker} vs ${initialDefender}对抗`;
          // 图标
          const icon = document.createElement('div');
          icon.className = 'judgment-icon';
          icon.textContent = '⚔️';
          // 标题信息
          const title = document.createElement('div');
          title.className = 'judgment-title';

          const typeSpan = document.createElement('span');
          typeSpan.className = 'judgment-type';
          typeSpan.textContent = '非凡对抗';

          const scenarioSpan = document.createElement('span');
          scenarioSpan.className = 'judgment-scenario';
          scenarioSpan.textContent = combatDesc;

          title.appendChild(typeSpan);
          title.appendChild(scenarioSpan);

          // 神秘符文 - 折叠状态下显示
          const runeSeal = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          runeSeal.setAttribute('class', 'judgment-rune-seal');
          runeSeal.setAttribute('viewBox', '0 0 100 100');
          runeSeal.innerHTML = /* HTML */ `
              <use href="#rune-seal"></use>
            `;

          // 结果徽章 - 只在展开状态下显示
          const resultBadge = document.createElement('div');
          resultBadge.className = `judgment-result-badge ${isHit ? 'success' : 'failure'}`;
          // 修复：根据对抗结果显示更准确的文本
          const badgeText = isHit ? '攻击成功' : '防御成功';
          resultBadge.textContent = badgeText;
          // 折叠切换图标
          const toggle = document.createElement('div');
          toggle.className = 'judgment-toggle';
          toggle.textContent = '▼';
          header.appendChild(icon);
          header.appendChild(title);
          header.appendChild(runeSeal);
          header.appendChild(resultBadge);
          header.appendChild(toggle);

          // 创建详情区域
          const details = document.createElement('div');
          details.className = 'judgment-details';

          // 新增：原始文本信息区域（显示从判定头开始的关键信息）
          if (data.rawText) {
            const rawInfoSection = this.renderRawCombatInfo(data.rawText);
            if (rawInfoSection) {
              details.appendChild(rawInfoSection);
            }
          }

          // 先攻判定区域（只在有有效数据时显示）
          // 检查是否所有数值都为0或undefined
          if (data.initiative &&
            (data.initiative.attackerScore > 0 || data.initiative.defenderScore > 0)) {
            const initiativeSection = this.renderInitiative(data.initiative);
            details.appendChild(initiativeSection);
          }

          // 对抗请求区域
          const requestSection = this.renderCombatRequest(data.request);
          details.appendChild(requestSection);

          // 对抗判定区域
          const combatSection = this.renderCombatProcess(data.combat, data.characters);
          details.appendChild(combatSection);

          // 伤害计算区域（只在有有效伤害数据时显示）
          // 检查是否有非零伤害值或特殊效果
          if (data.damage &&
            (data.damage.vitalityDamage > 0 ||
              data.damage.pollutionDamage > 0 ||
              data.damage.baseDamage > 0 || // 向后兼容
              (data.damage.specialEffects && data.damage.specialEffects.length > 0))) {
            const damageSection = this.renderDamage(data.damage);
            details.appendChild(damageSection);
          }

          // 状态更新区域（只在有有效状态更新时显示）
          // 检查是否有非空的状态更新数组
          if (data.statusUpdates &&
            ((data.statusUpdates.attacker && data.statusUpdates.attacker.length > 0) ||
              (data.statusUpdates.defender && data.statusUpdates.defender.length > 0))) {
            const statusSection = this.renderCombatStatusUpdates(data.statusUpdates, data.characters);
            details.appendChild(statusSection);
          }

          block.appendChild(header);
          block.appendChild(details);

          return block;
        }

        /**
         * 渲染原始对抗信息（直接显示文本中的关键行）
         * @param {string} rawText - 原始文本
         * @returns {HTMLElement|null} 原始信息区域元素
         */
        renderRawCombatInfo(rawText) {
          if (!rawText) return null;

          // 提取关键行（从判定头到对抗结果）
          const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

          // 需要显示的关键信息行
          const keyLines = [];

          for (const line of lines) {
            // 跳过判定请求头（已经在标题中显示）
            if (line.includes('【判定请求') || line.includes('判定请求')) continue;

            // 收集关键信息行
            if (line.includes('类型') ||
              line.includes('角色') ||
              line.includes('先攻值') ||
              line.includes('抢占先机') ||
              line.includes('攻守逆转') ||
              line.includes('攻击类型') ||
              line.includes('攻击手段') ||
              line.includes('防御手段') ||
              line.includes('核心属性') ||
              line.includes('投骰') ||
              line.includes('检定值') ||
              line.includes('判定结果')) {
              keyLines.push(line);
            }
          }

          if (keyLines.length === 0) return null;

          // 创建信息区域
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-raw-info';

          const title = document.createElement('h4');
          title.textContent = '对抗详情';
          section.appendChild(title);

          // 创建信息列表
          const infoList = document.createElement('div');
          infoList.className = 'raw-info-list';

          for (const line of keyLines) {
            const infoLine = document.createElement('div');
            infoLine.className = 'raw-info-line';

            // 特殊处理：高亮显示先攻结果
            if (line.includes('抢占先机') || line.includes('攻守逆转')) {
              infoLine.classList.add('highlight-initiative');
            }
            // 特殊处理：高亮显示判定结果
            if (line.includes('判定结果')) {
              infoLine.classList.add('highlight-result');
            }

            infoLine.textContent = line.replace(/^[>＞]\s*/, '').replace(/【|】/g, '');
            infoList.appendChild(infoLine);
          }

          section.appendChild(infoList);
          return section;
        }

        /**
         * 渲染对抗请求区域
         * @param {Object} request - 请求数据
         * @returns {HTMLElement} 请求区域元素
         */
        renderCombatRequest(request) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-request';
          const title = document.createElement('h4');
          title.textContent = '对抗请求';
          section.appendChild(title);

          // 敌人信息
          if (request.enemy) {
            const info = document.createElement('div');
            info.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '敌人:';

            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = request.enemy;

            info.appendChild(label);
            info.appendChild(value);
            section.appendChild(info);
          }

          // 攻击类型
          if (request.attackType) {
            const info = document.createElement('div');
            info.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '攻击类型:';

            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = request.attackType === 'physical' ? '物理' : '非凡';

            info.appendChild(label);
            info.appendChild(value);
            section.appendChild(info);
          }

          // 攻击手段
          if (request.attackMethod) {
            const info = document.createElement('div');
            info.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '攻击手段:';

            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = request.attackMethod;

            info.appendChild(label);
            info.appendChild(value);
            section.appendChild(info);
          }

          // 防御手段
          if (request.defenseMethod) {
            const info = document.createElement('div');
            info.className = 'request-info';

            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = '防御手段:';

            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = request.defenseMethod;

            info.appendChild(label);
            info.appendChild(value);
            section.appendChild(info);
          }

          return section;
        }

        /**
         * 渲染先攻判定
         * @param {Object} initiative - 先攻数据
         * @returns {HTMLElement} 先攻区域元素
         */
        renderInitiative(initiative) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-initiative';
          const title = document.createElement('h4');
          title.textContent = '先攻判定';
          section.appendChild(title);

          const stepsContainer = document.createElement('div');
          stepsContainer.className = 'calculation-steps';

          // 攻方先攻
          const attackerStep = document.createElement('div');
          attackerStep.className = 'calc-step initiative-attacker';
          const attackerLabel = document.createElement('span');
          attackerLabel.className = 'step-label';
          attackerLabel.textContent = '攻方先攻值:';

          const attackerValue = document.createElement('span');
          attackerValue.className = 'step-value';
          attackerValue.textContent = initiative.attackerScore.toFixed(2);

          attackerStep.appendChild(attackerLabel);
          attackerStep.appendChild(attackerValue);
          stepsContainer.appendChild(attackerStep);

          // 防方先攻
          const defenderStep = document.createElement('div');
          defenderStep.className = 'calc-step initiative-defender';
          const defenderLabel = document.createElement('span');
          defenderLabel.className = 'step-label';
          defenderLabel.textContent = '防方先攻值:';

          const defenderValue = document.createElement('span');
          defenderValue.className = 'step-value';
          defenderValue.textContent = initiative.defenderScore.toFixed(2);

          defenderStep.appendChild(defenderLabel);
          defenderStep.appendChild(defenderValue);
          stepsContainer.appendChild(defenderStep);

          section.appendChild(stepsContainer);

          // 先攻结果 - 惊艳的显示效果
          if (initiative.result) {
            const resultContainer = document.createElement('div');
            resultContainer.className = 'initiative-result-container';

            const resultBanner = document.createElement('div');
            // 根据结果类型应用不同的样式
            const isSeizeInitiative = initiative.result === '抢占先机！';
            resultBanner.className = isSeizeInitiative ?
              'initiative-result-banner seize-initiative' :
              'initiative-result-banner reverse-initiative';

            // 左侧装饰
            const leftDecor = document.createElement('div');
            leftDecor.className = 'initiative-decor left';
            leftDecor.innerHTML = isSeizeInitiative ? '⚡' : '🔄';

            // 中间文字
            const resultText = document.createElement('div');
            resultText.className = 'initiative-result-text';
            resultText.textContent = initiative.result;

            // 右侧装饰
            const rightDecor = document.createElement('div');
            rightDecor.className = 'initiative-decor right';
            rightDecor.innerHTML = isSeizeInitiative ? '⚡' : '🔄';

            resultBanner.appendChild(leftDecor);
            resultBanner.appendChild(resultText);
            resultBanner.appendChild(rightDecor);

            resultContainer.appendChild(resultBanner);
            section.appendChild(resultContainer);
          }

          return section;
        }

        /**
         * 渲染对抗过程
         * @param {Object} combat - 对抗数据
         * @param {Object} characters - 角色名称信息
         * @returns {HTMLElement} 对抗区域元素
         */
        renderCombatProcess(combat, characters) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-combat';
          const title = document.createElement('h4');
          title.textContent = '对抗判定';
          section.appendChild(title);

          // 改进的特殊情况判断：不仅检查检定值，还要检查是否有完整的对抗数据
          const hasValidAttributes = combat.attackerAttributes && combat.attackerAttributes.size > 0 &&
            combat.defenderAttributes && combat.defenderAttributes.size > 0;
          const hasValidChecks = combat.attackerCheck > 0 || combat.defenderCheck > 0;
          const hasValidRolls = combat.attackerRoll > 0 || combat.defenderRoll > 0;

          // 只有当完全没有对抗数据时才显示"无对抗判定"
          const isSpecialCase = !hasValidAttributes && !hasValidChecks && !hasValidRolls;

          console.log('[JudgmentRenderer] 对抗数据检查:', {
            hasValidAttributes,
            hasValidChecks,
            hasValidRolls,
            isSpecialCase,
            attackerCheck: combat.attackerCheck,
            defenderCheck: combat.defenderCheck
          });

          if (isSpecialCase) {
            // 特殊情况：显示提示信息
            const specialNotice = document.createElement('div');
            specialNotice.className = 'combat-special-notice';
            specialNotice.style.textAlign = 'center';
            specialNotice.style.padding = '20px';
            specialNotice.style.color = '#a09c91';
            specialNotice.style.fontStyle = 'italic';
            specialNotice.style.fontSize = '14px';

            const noticeIcon = document.createElement('div');
            noticeIcon.style.fontSize = '32px';
            noticeIcon.style.marginBottom = '10px';
            noticeIcon.textContent = '⚠️';

            const noticeText = document.createElement('div');
            noticeText.textContent = '无对抗判定';
            noticeText.style.marginBottom = '5px';
            noticeText.style.fontWeight = 'bold';
            noticeText.style.color = '#d2b48c';

            const noticeHint = document.createElement('div');
            noticeHint.textContent = '数据解析失败，请检查判定格式';
            noticeHint.style.fontSize = '12px';
            noticeHint.style.color = '#8b7d6b';

            specialNotice.appendChild(noticeIcon);
            specialNotice.appendChild(noticeText);
            specialNotice.appendChild(noticeHint);
            section.appendChild(specialNotice);

            return section;
          }

          // 正常情况：使用VS对称布局
          const vsLayout = document.createElement('div');
          vsLayout.className = 'combat-vs-layout';

          // 攻方区域
          const attackerSide = document.createElement('div');
          attackerSide.className = `combat-side attacker ${combat.result === 'hit' ? 'winner' : ''}`;

          const attackerLabel = document.createElement('div');
          attackerLabel.className = 'combat-side-label';
          // 使用实际的攻方名称
          const attackerName = characters ? characters.attacker : '攻方';
          attackerLabel.textContent = attackerName;
          attackerSide.appendChild(attackerLabel);

          // 攻方属性
          if (combat.attackerAttributes && combat.attackerAttributes.size > 0) {
            const attrDiv = document.createElement('div');
            attrDiv.className = 'combat-side-value';
            const attrArray = [];
            combat.attackerAttributes.forEach((val, key) => {
              attrArray.push(`${key} ${val}`);
            });
            attrDiv.textContent = attrArray.join(', ');
            attackerSide.appendChild(attrDiv);
          }

          // 攻方检定值
          const attackerCheckDiv = document.createElement('div');
          attackerCheckDiv.className = 'combat-side-value highlight';
          const attackerRollText = combat.attackerRoll > 0 ? `投骰: [${combat.attackerRoll}], ` : '';
          attackerCheckDiv.textContent = `${attackerRollText}检定值: ${combat.attackerCheck.toFixed(2)}`;
          attackerSide.appendChild(attackerCheckDiv);

          // 交锋点图标
          const clashPoint = document.createElement('div');
          clashPoint.className = 'combat-clash-point';
          clashPoint.textContent = combat.result === 'hit' ? '⚔️' : '🛡️';
          // 防方区域
          const defenderSide = document.createElement('div');
          defenderSide.className = `combat-side defender ${combat.result === 'miss' ? 'winner' : ''}`;

          const defenderLabel = document.createElement('div');
          defenderLabel.className = 'combat-side-label';
          // 使用实际的防方名称
          const defenderName = characters ? characters.defender : '防方';
          defenderLabel.textContent = defenderName;
          defenderSide.appendChild(defenderLabel);

          // 防方属性
          if (combat.defenderAttributes && combat.defenderAttributes.size > 0) {
            const attrDiv = document.createElement('div');
            attrDiv.className = 'combat-side-value';
            const attrArray = [];
            combat.defenderAttributes.forEach((val, key) => {
              attrArray.push(`${key} ${val}`);
            });
            attrDiv.textContent = attrArray.join(', ');
            defenderSide.appendChild(attrDiv);
          }

          // 防方检定值
          const defenderCheckDiv = document.createElement('div');
          defenderCheckDiv.className = 'combat-side-value highlight';
          const defenderRollText = combat.defenderRoll > 0 ? `投骰: [${combat.defenderRoll}], ` : '';
          defenderCheckDiv.textContent = `${defenderRollText}检定值: ${combat.defenderCheck.toFixed(2)}`;
          defenderSide.appendChild(defenderCheckDiv);

          // 组装VS布局
          vsLayout.appendChild(attackerSide);
          vsLayout.appendChild(clashPoint);
          vsLayout.appendChild(defenderSide);

          section.appendChild(vsLayout);

          // 移除对抗结果文本显示（结果已通过交锋点图标和胜者高亮显示）

          return section;
        }

        /**
         * 渲染伤害计算
         * @param {Object} damage - 伤害数据
         * @returns {HTMLElement} 伤害区域元素
         */
        renderDamage(damage) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-damage';
          const title = document.createElement('h4');
          title.textContent = '伤害计算';
          section.appendChild(title);

          const stepsContainer = document.createElement('div');
          stepsContainer.className = 'calculation-steps';
          stepsContainer.style.marginTop = 'var(--judgment-spacing-md)';

          // 活力伤害（红色主题）
          if (damage.vitalityDamage !== undefined && damage.vitalityDamage > 0) {
            const step = document.createElement('div');
            step.className = 'calc-step damage-vitality'; // 添加特殊类名
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '活力伤害:';

            const value = document.createElement('span');
            value.className = 'step-value highlight';
            value.textContent = damage.vitalityDamage.toString();

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          // 污染伤害（紫色主题）
          if (damage.pollutionDamage !== undefined && damage.pollutionDamage > 0) {
            const step = document.createElement('div');
            step.className = 'calc-step damage-pollution'; // 添加特殊类名
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '污染伤害:';

            const value = document.createElement('span');
            value.className = 'step-value highlight';
            value.textContent = damage.pollutionDamage.toString();

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          // 向后兼容：baseDamage（旧格式）
          if (damage.baseDamage !== undefined && damage.baseDamage > 0) {
            const damageTag = document.createElement('div');
            damageTag.className = 'damage-tag';
            damageTag.textContent = `伤害: ${damage.baseDamage}`;
            section.appendChild(damageTag);
          }

          // 特殊效果
          if (damage.specialEffects && damage.specialEffects.length > 0) {
            const step = document.createElement('div');
            step.className = 'calc-step';
            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = '特殊效果:';

            const value = document.createElement('span');
            value.className = 'step-value';
            value.textContent = damage.specialEffects.join(', ');

            step.appendChild(label);
            step.appendChild(value);
            stepsContainer.appendChild(step);
          }

          if (stepsContainer.children.length > 0) {
            section.appendChild(stepsContainer);
          }

          return section;
        }

        /**
         * 渲染对抗状态更新
         * @param {Object} statusUpdates - 状态更新数据
         * @param {Object} characters - 角色名称 {attacker, defender}
         * @returns {HTMLElement} 状态更新区域元素
         */
        renderCombatStatusUpdates(statusUpdates, characters) {
          const section = document.createElement('div');
          section.className = 'judgment-section judgment-status-updates';

          const title = document.createElement('h4');
          title.textContent = '状态更新';
          section.appendChild(title);

          // 攻方状态更新（使用实际角色名称）
          if (statusUpdates.attacker && statusUpdates.attacker.length > 0) {
            const attackerName = characters ? characters.attacker : '攻方';
            const attackerDiv = this.renderStatusUpdate(statusUpdates.attacker, attackerName);
            section.appendChild(attackerDiv);
          }

          // 防方状态更新（使用实际角色名称）
          if (statusUpdates.defender && statusUpdates.defender.length > 0) {
            const defenderName = characters ? characters.defender : '防方';
            const defenderDiv = this.renderStatusUpdate(statusUpdates.defender, defenderName);
            section.appendChild(defenderDiv);
          }

          return section;
        }

        /**
         * 渲染状态更新
         * @param {Array} changes - 属性变动数组
         * @param {string} characterName - 角色名称
         * @returns {HTMLElement} 状态更新元素
         */
        renderStatusUpdate(changes, characterName) {
          const container = document.createElement('div');
          container.className = 'status-update-container';
          // 角色名称
          const nameDiv = document.createElement('div');
          nameDiv.className = 'status-update-name';
          nameDiv.textContent = characterName;
          container.appendChild(nameDiv);

          // 属性变动列表
          const changesList = document.createElement('div');
          changesList.className = 'status-update-changes';
          changes.forEach(change => {
            const changeItem = document.createElement('span');

            // 基础类名
            const isPositive = change.value >= 0;
            changeItem.className = `status-change ${isPositive ? 'positive' : 'negative'}`;

            // 根据属性名称添加特定主题类
            const attrClass = this.getAttributeThemeClass(change.attribute);
            if (attrClass) {
              changeItem.classList.add(attrClass);
            }
            // 添加SVG图标
            const iconId = this.getAttributeIcon(change.attribute);
            if (iconId) {
              const icon = this.createSvgIcon(iconId, 'icon-small');
              changeItem.appendChild(icon);
            }

            // 添加文本标签以支持可访问性（需求7.4）
            const sign = change.value >= 0 ? '+' : '';
            const changeText = `${change.attribute}: ${sign}${change.value}`;
            const textSpan = document.createElement('span');
            textSpan.textContent = changeText;
            changeItem.appendChild(textSpan);

            changesList.appendChild(changeItem);
          });

          container.appendChild(changesList);
          return container;
        }

        /**
         * 根据属性名称获取对应的图标ID
         * @param {string} attributeName - 属性名称
         * @returns {string|null} 图标ID
         */
        getAttributeIcon(attributeName) {
          const iconMap = {
            '生命': 'icon-heart',
            'HP': 'icon-heart',
            '活力': 'icon-heart',
            '灵性': 'icon-flame',
            'MP': 'icon-flame',
            '魔力': 'icon-flame',
            '理智': 'icon-brain',
            'SAN': 'icon-brain',
            '精神': 'icon-brain',
            '攻击': 'icon-sword',
            '防御': 'icon-shield',
            '恐惧': 'icon-eye',
            '感知': 'icon-eye'
          };
          return iconMap[attributeName] || null;
        }

        /**
         * 根据属性名称获取对应的主题CSS类
         * @param {string} attributeName - 属性名称
         * @returns {string|null} 主题CSS类名
         */
        getAttributeThemeClass(attributeName) {
          const themeMap = {
            '活力': 'attr-vitality',
            'HP': 'attr-vitality',
            '生命': 'attr-vitality',
            '灵性': 'attr-spirituality',
            'MP': 'attr-spirituality',
            '魔力': 'attr-spirituality',
            '理智': 'attr-sanity',
            'SAN': 'attr-sanity',
            '精神': 'attr-sanity',
            '人性': 'attr-humanity',
            '道心': 'attr-humanity' /*wc，还有道心*/
          };
          return themeMap[attributeName] || null;
        }

        /**
         * 渲染状态变动列表
         * @param {Array} changes - 状态变动数组
         * @returns {HTMLElement} 状态变动容器
         */
        renderStatusChanges(changes) {
          const container = document.createElement('div');
          container.className = 'status-changes-container';

          const changesList = document.createElement('div');
          changesList.className = 'status-changes-list';

          changes.forEach(change => {
            const changeItem = document.createElement('div');
            changeItem.className = 'status-change-item';

            // 根据变动值设置样式
            if (change.value < 0) {
              changeItem.classList.add('negative');
            } else {
              changeItem.classList.add('positive');
            }

            // 添加SVG图标
            const iconName = this.getAttributeIcon(change.attribute);
            if (iconName) {
              const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              iconSvg.setAttribute('viewBox', '0 0 24 24');
              iconSvg.setAttribute('fill', 'currentColor');
              iconSvg.innerHTML = /* HTML */ `<use href="#${iconName}"></use>`;
              changeItem.appendChild(iconSvg);
            }

            // 格式化显示文本
            const sign = change.value >= 0 ? '+' : '';
            const changeText = `${change.attribute}: ${sign}${change.value}`;
            const textSpan = document.createElement('span');
            textSpan.textContent = changeText;
            changeItem.appendChild(textSpan);

            changesList.appendChild(changeItem);
          });

          container.appendChild(changesList);
          return container;
        }

        /**
         * 获取结果类型对应的主题类
         * @param {string} resultType - 结果类型
         * @returns {string} 主题CSS类名
         */
        getThemeClass(resultType) {
          const themeMap = {
            'critical_success': 'theme-fate-blessing',
            'perfect': 'theme-perfect-control',
            'success': 'theme-narrow-success',
            'failure': 'theme-attempt-failure',
            'critical_failure': 'theme-loss-control'
          };
          return themeMap[resultType] || '';
        }

        /**
         * 获取结果类型对应的文本
         * @param {string} resultType - 结果类型
         * @returns {string} 结果文本
         */
        getResultText(resultType) {
          const textMap = {
            'critical_success': '大成功',
            'perfect': '完胜',
            'success': '险胜',
            'failure': '失败',
            'critical_failure': '大失败',
            'unknown': '未知'
          };
          return textMap[resultType] || '未知';
        }

        /**
         * 获取结果类型对应的图标
         * @param {string} resultType - 结果类型
         * @returns {string} 结果图标
         */
        getResultIcon(resultType) {
          const iconMap = {
            'critical_success': '✨',
            'perfect': '✓',
            'success': '○',
            'failure': '✗',
            'critical_failure': '💀',
            'unknown': '?'
          };
          return iconMap[resultType] || '?';
        }
      }

      // ===== 3. JudgmentInteractor - 交互器类 =====
      class JudgmentInteractor {
        constructor() {
          console.log('[JudgmentInteractor] 交互器已创建');
          this.STORAGE_KEY = 'judgment-beautifier-states';
        }

        /**
         * 初始化交互功能
         * @param {HTMLElement} judgmentBlock - 判定块元素
         */
        initialize(judgmentBlock) {
          //console.log('[JudgmentInteractor] 初始化交互功能');

          // 为判定块添加tabindex以支持键盘导航
          if (!judgmentBlock.hasAttribute('tabindex')) {
            judgmentBlock.setAttribute('tabindex', '0');
          }

          // 获取标题栏元素
          const header = judgmentBlock.querySelector('.judgment-header');
          if (!header) {
            console.warn('[JudgmentInteractor] 未找到标题栏元素');
            return;
          }

          // 点击标题栏切换折叠状态
          header.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCollapse(judgmentBlock, e);
          });

          // 键盘导航支持 - Enter和Space键
          judgmentBlock.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.toggleCollapse(judgmentBlock, e);
            }
          });
        }

        /**
         * 切换折叠/展开状态
         * @param {HTMLElement} judgmentBlock - 判定块元素
         * @param {Event} event - 点击事件（可选）
         */
        toggleCollapse(judgmentBlock, event) {
          const isCollapsed = judgmentBlock.dataset.collapsed === 'true';

          if (isCollapsed) {
            this.expand(judgmentBlock, event);
          } else {
            this.collapse(judgmentBlock);
          }

        }

        /**
         * 展开判定块
         * @param {HTMLElement} judgmentBlock - 判定块元素
         * @param {Event} event - 点击事件（可选）
         */
        expand(judgmentBlock, event) {
          //console.log('[JudgmentInteractor] 展开判定块');

          // 更新data-collapsed属性
          judgmentBlock.dataset.collapsed = 'false';

          // 添加揭示状态标记，触发特效
          judgmentBlock.classList.add('revealed');

          // 更新详情区域的aria-hidden属性
          const details = judgmentBlock.querySelector('.judgment-details');
          if (details) {}

          // 更新标题栏的aria-expanded属性
          const header = judgmentBlock.querySelector('.judgment-header');
          if (header) {}

          // 触发揭示特效（根据主题类型），传递点击事件
          this.triggerRevealEffect(judgmentBlock, event);
        }

        /**
         * 折叠判定块
         * @param {HTMLElement} judgmentBlock - 判定块元素
         */
        collapse(judgmentBlock) {
          //console.log('[JudgmentInteractor] 折叠判定块');

          // 更新data-collapsed属性
          judgmentBlock.dataset.collapsed = 'true';

          // 移除揭示状态标记
          judgmentBlock.classList.remove('revealed');

          // 更新详情区域的aria-hidden属性
          const details = judgmentBlock.querySelector('.judgment-details');
          if (details) {}

          // 更新标题栏的aria-expanded属性
          const header = judgmentBlock.querySelector('.judgment-header');
          if (header) {}
        }

        /**
         * 触发揭示特效
         * @param {HTMLElement} judgmentBlock - 判定块元素
         * @param {Event} event - 点击事件（可选）
         */
        triggerRevealEffect(judgmentBlock, event) {
          // 根据主题类型触发不同的特效
          if (judgmentBlock.classList.contains('theme-fate-blessing')) {
            // 大成功：华丽的多层粒子爆发特效
            this.createEnhancedParticleBurst(judgmentBlock, event);
          } else if (judgmentBlock.classList.contains('theme-loss-control')) {
            // 大失败：通过CSS动画实现
          } else if (judgmentBlock.classList.contains('theme-perfect-control')) {
            // 完美掌控：无额外特效
          }
        }

        /**
         * 创建增强版粒子爆发效果（大成功专用）
         * @param {HTMLElement} container - 容器元素
         * @param {Event} event - 点击事件（可选）
         */
        createEnhancedParticleBurst(container, event) {
          const rect = container.getBoundingClientRect();
          let centerX, centerY;

          // 如果有点击事件，从点击位置爆发；否则从中心爆发
          if (event && event.clientX && event.clientY) {
            centerX = event.clientX - rect.left;
            centerY = event.clientY - rect.top;
          } else {
            centerX = rect.width / 2;
            centerY = rect.height / 2;
          }

          // 第一层：大型金色粒子（16个）- 主要爆发
          this.createParticleLayer(container, centerX, centerY, {
            count: 16,
            size: 12,
            colors: ['#ffd700', '#ffed4e', '#ffa500'],
            distance: [80, 140],
            duration: 1.4,
            glow: 20,
            trail: true
          });

          // 第二层：中型白金粒子（24个）- 快速扩散
          setTimeout(() => {
            this.createParticleLayer(container, centerX, centerY, {
              count: 24,
              size: 8,
              colors: ['#ffffff', '#f0f0f0', '#ffd700'],
              distance: [60, 110],
              duration: 1.2,
              glow: 15,
              trail: true
            });
          }, 80);

          // 第三层：小型金色星芒（32个）- 闪烁效果
          setTimeout(() => {
            this.createParticleLayer(container, centerX, centerY, {
              count: 32,
              size: 6,
              colors: ['#ffed4e', '#ffd700', '#fff8dc'],
              distance: [40, 80],
              duration: 1.0,
              star: true,
              glow: 10,
              twinkle: true
            });
          }, 150);

          // 第四层：微小光点（40个）- 环境氛围
          setTimeout(() => {
            this.createParticleLayer(container, centerX, centerY, {
              count: 40,
              size: 3,
              colors: ['#ffffff', '#ffed4e'],
              distance: [30, 60],
              duration: 0.8,
              glow: 8
            });
          }, 220);
        }

        /**
         * 创建粒子层
         * @param {HTMLElement} container - 容器元素
         * @param {number} centerX - 中心X坐标
         * @param {number} centerY - 中心Y坐标
         * @param {Object} options - 配置选项
         */
        createParticleLayer(container, centerX, centerY, options) {
          const { count, size, colors, distance, duration, glow, star, trail, twinkle } = options;

          for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.top = `${centerY}px`;
            particle.style.left = `${centerX}px`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // 随机选择颜色
            const color = Array.isArray(colors) ? colors[Math.floor(Math.random() * colors.length)] : colors;
            particle.style.background = color;
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '100';

            // 星芒形状或圆形
            if (star) {
              particle.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
            } else {
              particle.style.borderRadius = '50%';
            }

            // 光晕效果
            if (glow) {
              particle.style.boxShadow = `0 0 ${glow}px ${color}, 0 0 ${glow * 2}px ${color}`;
            }

            // 拖尾效果
            if (trail) {
              particle.style.filter = `blur(${size * 0.15}px)`;
            }

            // 随机方向和距离（增加随机性）
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const dist = distance[0] + Math.random() * (distance[1] - distance[0]);
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            // 选择动画类型
            if (twinkle) {
              particle.style.animation = `particle-burst-twinkle ${duration}s ease-out forwards`;
            } else {
              particle.style.animation = `particle-burst ${duration}s ease-out forwards`;
            }

            container.appendChild(particle);

            // 动画结束后移除粒子
            setTimeout(() => {
              if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
              }
            }, duration * 1000);
          }
        }


        /**
         * 全部展开
         */
        expandAll() {
          console.log('[JudgmentInteractor] 全部展开');
          const allBlocks = document.querySelectorAll('.judgment-block');
          allBlocks.forEach(block => {
            this.expand(block);
          });
        }

        /**
         * 全部折叠
         */
        collapseAll() {
          console.log('[JudgmentInteractor] 全部折叠');
          const allBlocks = document.querySelectorAll('.judgment-block');
          allBlocks.forEach(block => {
            this.collapse(block);
          });
        }
      }

      // ===== 4. JudgmentBeautifier - 主控制器类 =====
      class JudgmentBeautifier {
        constructor() {
          this.parser = new JudgmentParser();
          this.renderer = new JudgmentRenderer();
          this.interactor = new JudgmentInteractor();
          this.judgmentBlocks = []; // 存储所有判定块的引用
          this.processedTexts = new Set(); // 避免重复处理（存储判定key）
          this.renderedCache = new Map(); // 【新增】缓存已渲染的判定HTML（key -> HTML string）
          this.observer = null; // MutationObserver实例
          this.blockIdCounter = 0; // 判定块ID计数器
          this.simplifiedMode = false; // 简化模式标志
          this.intersectionObserver = null; // 视口观察器
          console.log('[JudgmentBeautifier] 主控制器已创建');

          // 自动检测性能并降级
          this.checkPerformance();
        }

        /**
         * 性能检测与自动降级
         */
        checkPerformance() {
          // 检测移动设备
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

          // 检测低性能设备（通过硬件并发数判断）
          const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

          if (isMobile || isLowEndDevice) {
            this.toggleSimplifiedMode(true, false);
            console.log('[性能保护] 检测到移动设备或低性能设备，已自动开启简化模式');
            console.log('[性能保护] 设备信息:', {
              isMobile,
              isLowEndDevice,
              cores: navigator.hardwareConcurrency
            });
          }
        }

        /**
         * 切换简化模式
         * @param {boolean} enabled - 是否启用简化模式
         */
        toggleSimplifiedMode(enabled) {
          this.simplifiedMode = enabled;
          const body = document.body;

          if (enabled) {
            body.classList.add('simplified-mode');
            console.log('[JudgmentBeautifier] 简化模式已启用');

            // 启用视口观察器，只渲染可见区域的动画
            this.enableIntersectionObserver();
          } else {
            body.classList.remove('simplified-mode');
            console.log('[JudgmentBeautifier] 简化模式已禁用');

            // 禁用视口观察器
            this.disableIntersectionObserver();
          }
        }

        /**
         * 启用视口观察器（只为可见的判定块启用动画）
         */
        enableIntersectionObserver() {
          if (this.intersectionObserver) {
            return; // 已经启用
          }

          this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              const block = entry.target;
              if (entry.isIntersecting) {
                // 进入视口，启用动画
                block.classList.add('animate-active');
              } else {
                // 离开视口，禁用动画
                block.classList.remove('animate-active');
              }
            });
          }, {
            rootMargin: '50px', // 提前50px开始加载
            threshold: 0.1 // 10%可见时触发
          });

          // 观察所有现有的判定块
          this.judgmentBlocks.forEach(block => {
            if (block && block.element) {
              this.intersectionObserver.observe(block.element);
            }
          });

          console.log('[性能保护] 视口观察器已启用，只渲染可见区域的动画');
        }

        /**
         * 禁用视口观察器
         */
        disableIntersectionObserver() {
          if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;

            // 恢复所有判定块的动画
            this.judgmentBlocks.forEach(block => {
              if (block && block.element) {
                block.element.classList.add('animate-active');
              }
            });

            console.log('[性能保护] 视口观察器已禁用');
          }
        }



        // 在 JudgmentBeautifier 类中重写 initialize
        initialize(retryCount = 0) {
          const MAX_RETRIES = 10;
          const gametxtElement = document.querySelector('gametxt');

          if (!gametxtElement) {
            if (retryCount < MAX_RETRIES) {
              // 如果没找到，利用下一帧重试，不阻塞主线程
              requestAnimationFrame(() => {
                setTimeout(() => this.initialize(retryCount + 10), 2000);
              });
              return;
            } else {
              console.error('[JudgmentBeautifier] 达到最大重试次数，仍未找到 gametxt，停止初始化');
              return;
            }
          }

          // 只要找到了，就开始原有的美化逻辑
          console.log(`[JudgmentBeautifier] 在第 ${retryCount} 次巡检中发现目标，开始美化...`);
          this._performActualBeautify(gametxtElement);
        }

        _performActualBeautify(gametxtElement) {
          console.time("⏱️ [性能探针] 全量正则扫描");
          const textContent = gametxtElement.textContent || gametxtElement.innerText;
          const requestMarkerPattern = /(?:【判定请求\s*\|[^】]+】|判定请求\s*\|[^>\n]+>)[\s\S]*?(?=(?:【判定请求|判定请求\s*\|)|$)/g;
          const matches = textContent.match(requestMarkerPattern);
          console.timeEnd("⏱️ [性能探针] 全量正则扫描");

          if (matches) {
            matches.forEach(rawText => this.beautify(rawText, gametxtElement));
          }
          this.startObserver(gametxtElement);
        }



        /**
         * 启动MutationObserver监听gametxt内容变化
         * @param {HTMLElement} targetElement - 要监听的元素
         */
        startObserver(targetElement) {
          console.log('[JudgmentBeautifier] 启动MutationObserver进行监听（其实感觉没用啊）');

          try {
            // 如果已有observer，先断开
            if (this.observer) {
              this.observer.disconnect();
            }

            // 创建新的observer
            this.observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                // 检查是否有新增的文本节点
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                  mutation.addedNodes.forEach((node) => {
                    // 检查节点是否包含判定请求标记（支持两种格式）
                    const textContent = node.textContent || node.innerText || '';
                    if (textContent.includes('【判定请求') || textContent.includes('判定请求 |')) {
                      // 提取判定文本（支持两种格式）
                      const requestMarkerPattern = /(?:【判定请求\s*\|[^】]+】|判定请求\s*\|[^>\n]+>)[\s\S]*?(?=(?:【判定请求|判定请求\s*\|)|$)/g;
                      const matches = textContent.match(requestMarkerPattern);

                      if (matches) {
                        matches.forEach(rawText => {
                          // 检查是否已处理过
                          if (!this.processedTexts.has(rawText)) {
                            console.log('[JudgmentBeautifier] 居然真的检测到新判定日志了？');
                            this.beautify(rawText, targetElement);
                          }
                        });
                      }
                    }
                  });
                }

                // 检查文本内容变化
                if (mutation.type === 'characterData') {
                  const textContent = mutation.target.textContent || '';
                  if (textContent.includes('【判定请求') || textContent.includes('判定请求 |')) {
                    const requestMarkerPattern = /(?:【判定请求\s*\|[^】]+】|判定请求\s*\|[^>\n]+>)[\s\S]*?(?=(?:【判定请求|判定请求\s*\|)|$)/g;
                    const matches = textContent.match(requestMarkerPattern);

                    if (matches) {
                      matches.forEach(rawText => {
                        if (!this.processedTexts.has(rawText)) {
                          console.log('[JudgmentBeautifier] 检测到新判定日志(文本变化)');
                          this.beautify(rawText, targetElement);
                        }
                      });
                    }
                  }
                }
              });
            });

            // 开始监听
            this.observer.observe(targetElement, {
              childList: true,
              subtree: true,
              characterData: true
            });

            console.log('[JudgmentBeautifier] MutationObserver已启动');
          } catch (error) {
            console.error('[JudgmentBeautifier] MutationObserver启动失败:', error);
          }
        }

        /**
         * 提取判定的唯一标识（用于去重）
         * @param {string} rawText - 原始判定文本
         * @returns {string|null} 判定的唯一标识
         */
        getJudgmentKey(rawText) {
          // 提取判定请求中的关键信息作为唯一标识（支持两种格式）
          let requestMatch = rawText.match(/【判定请求\s*\|([^】]+)】/);
          if (!requestMatch) {
            // 尝试无括号格式
            requestMatch = rawText.match(/判定请求\s*\|([^>\n]+)/);
          }
          if (!requestMatch) return null;

          // 使用判定请求的内容作为key（类型+难度+情景）
          return requestMatch[1].trim();
        }

        /**
         * 检查判定文本是否完整（针对流式输出优化）
         * @param {string} rawText - 原始判定文本
         * @returns {boolean} 是否完整
         */
        isJudgmentComplete(rawText) {
          if (!rawText) return false;

          // 必须包含判定请求（支持两种格式：【判定请求 | ...】 或 判定请求 | ...）
          const hasRequest = /【判定请求\s*\|[^】]+】/.test(rawText) || /判定请求\s*\|[^>\n]+>/.test(rawText);
          if (!hasRequest) {
            console.log('[JudgmentBeautifier] 判定缺少请求标记，跳过');
            return false;
          }

          // 检查是否是对抗判定（支持两种格式）
          const isConflict = /【判定请求\s*\|[^】]*类型\s*[:：]\s*对抗/.test(rawText) ||
            /判定请求\s*\|[^>\n]*对抗/.test(rawText) ||
            /类型\s*[:：]\s*对抗判定/.test(rawText);

          if (isConflict) {
            // 对抗判定的完整性检查：必须包含核心对抗数据
            const hasStateUpdate = /【状态更新】/.test(rawText) || /状态更新/.test(rawText);
            const hasConflictResult = /【(?:对抗)?判定结果\s*[：:]\s*[^】]+】/.test(rawText);

            // 新增：检查是否包含对抗判定的核心数据（投骰和检定值）
            // 修复：支持角色名称格式（如"混混投骰"）和标准格式（如"攻方投骰"）
            const hasAttackerCheck = (/(?:新)?攻方投骰\s*[:：]\s*\[/.test(rawText) && /(?:新)?攻方[^检\n]*检定值\s*[:：]/.test(rawText)) ||
              (/[\u4e00-\u9fa5]+投骰\s*[:：]\s*\[/.test(rawText) && /检定值\s*[:：]/.test(rawText));
            const hasDefenderCheck = (/(?:新)?防方投骰\s*[:：]\s*\[/.test(rawText) && /(?:新)?防方[^检\n]*检定值\s*[:：]/.test(rawText)) ||
              (/[\u4e00-\u9fa5]+投骰\s*[:：]\s*\[/.test(rawText) && /检定值\s*[:：]/.test(rawText));
            // 更宽松的检查：只要有两个"投骰"和两个"检定值"就认为数据完整
            const diceRollCount = (rawText.match(/投骰\s*[:：]\s*\[/g) || []).length;
            const checkValueCount = (rawText.match(/检定值\s*[:：]/g) || []).length;
            const hasCombatData = diceRollCount >= 2 && checkValueCount >= 2;

            // 必须同时满足：有状态更新/结果 AND 有对抗数据
            if ((!hasStateUpdate && !hasConflictResult) || !hasCombatData) {
              console.log('[JudgmentBeautifier] 对抗判定数据不完整:', {
                hasStateUpdate,
                hasConflictResult,
                hasAttackerCheck,
                hasDefenderCheck,
                hasCombatData
              });
              //console.log('[JudgmentBeautifier] 可能还在流式输出中，等待完整数据...');
              return false;
            }

            //console.log('[JudgmentBeautifier] ✓ 对抗判定完整性检查通过');
            return true;
          } else {
            // 普通判定的完整性检查：必须包含判定结果
            const hasResult = /【判定结果\s*[：:]\s*[^】]+】/.test(rawText);
            if (!hasResult) {
              //console.log('[JudgmentBeautifier] 判定缺少结果，可能还在流式输出中...');
              return false;
            }

            // 检查是否包含关键字段
            const hasCharacter = /角色\s*[:：]/.test(rawText);
            const hasDifficulty = /目标难度\s*\(DC\)\s*[:：]/.test(rawText);
            const hasDiceResult = /投骰结果\s*[:：]/.test(rawText);

            if (!hasCharacter || !hasDifficulty || !hasDiceResult) {
              //console.log('[JudgmentBeautifier] 判定缺少关键字段（角色/难度/投骰），可能格式不完整...');
              return false;
            }

            //console.log('[JudgmentBeautifier] ✓ 普通判定完整性检查通过');
            return true;
          }
        }

        /**
         * 美化单个判定文本
         * @param {string} rawText - 原始判定文本
         * @param {HTMLElement} container - 容器元素
         * @returns {HTMLElement|null} 渲染后的判定块
         */
        beautify(rawText, container) {
          //console.log('[JudgmentBeautifier] 开始尝试美化判定文本');

          try {
            // 【优化1：流式输出支持】检查判定是否完整
            if (!this.isJudgmentComplete(rawText)) {
              //console.log('[JudgmentBeautifier] 判定还没完整，等流式输出完成再美化~');
              return null;
            }

            // 【优化2：智能去重+缓存】使用判定的唯一标识
            const judgmentKey = this.getJudgmentKey(rawText);
            if (!judgmentKey) {
              console.warn('[JudgmentBeautifier] 无法提取判定key');
              return null;
            }

            // 【关键优化】如果已经渲染过，直接返回缓存的HTML
            if (this.renderedCache.has(judgmentKey)) {
              //console.log('[JudgmentBeautifier] 判定已缓存，直接使用缓存的HTML~');
              const cachedHTML = this.renderedCache.get(judgmentKey);
              if (container) {
                container.innerHTML = cachedHTML;
                // 重新初始化交互功能
                const judgmentBlock = container.querySelector('.judgment-block');
                if (judgmentBlock) {
                  this.interactor.initialize(judgmentBlock);
                }
                return judgmentBlock;
              }
              return null;
            }

            // 第一次渲染：标记为已处理
            this.processedTexts.add(judgmentKey);

            // 1. 解析判定文本
            const data = this.parser.parse(rawText);
            if (!data) {
              console.warn('[JudgmentBeautifier] 寄，解析失败');
              return null;
            }

            // 2. 渲染判定块
            const judgmentBlock = this.renderer.render(data, null);
            if (!judgmentBlock) {
              console.warn('[JudgmentBeautifier] 寄，渲染失败');
              return null;
            }

            // 3. 为判定块分配唯一ID
            const blockId = `judgment-block-${this.blockIdCounter++}`;
            judgmentBlock.dataset.blockId = blockId;
            judgmentBlock.dataset.judgmentKey = judgmentKey; // 存储key用于后续查找

            // 4. 初始化交互功能
            this.interactor.initialize(judgmentBlock);

            // 5. 添加到容器
            if (container) {
              container.appendChild(judgmentBlock);
              // 【关键】缓存渲染后的HTML
              this.renderedCache.set(judgmentKey, container.innerHTML);
            }

            // 6. 保存引用
            this.judgmentBlocks.push({
              id: blockId,
              key: judgmentKey,
              element: judgmentBlock,
              data: data
            });

            // 7. 如果启用了视口观察器，注册这个判定块
            if (this.intersectionObserver) {
              this.intersectionObserver.observe(judgmentBlock);
            } else {
              // 如果没有启用观察器，默认启用动画
              judgmentBlock.classList.add('animate-active');
            }

            console.log('[JudgmentBeautifier] 判定块已创建并缓存:', blockId);
            return judgmentBlock;
          } catch (error) {
            console.error('[JudgmentBeautifier] 寄，美化失败:', error);
            return null;
          }
        }

        /**
         * 动态添加新判定
         * @param {string} rawText - 原始判定文本
         * @param {HTMLElement} container - 容器元素
         * @returns {HTMLElement|null} 渲染后的判定块
         */
        addJudgment(rawText, container) {
          console.log('[JudgmentBeautifier] 动态添加判定');

          try {
            // 直接调用beautify方法
            return this.beautify(rawText, container);
          } catch (error) {
            console.error('[JudgmentBeautifier] 动态添加失败:', error);
            return null;
          }
        }



        /**
         * 获取所有判定块
         * @returns {Array} 判定块数组
         */
        getAllJudgments() {
          return this.judgmentBlocks;
        }

        /**
         * 根据ID获取判定块
         * @param {string} blockId - 判定块ID
         * @returns {Object|null} 判定块对象
         */
        getJudgmentById(blockId) {
          return this.judgmentBlocks.find(block => block.id === blockId) || null;
        }

        /**
         * 清除所有判定块
         */
        clearAll() {
          console.log('[JudgmentBeautifier] 清除所有判定块');

          // 从DOM中移除所有判定块
          this.judgmentBlocks.forEach(block => {
            if (block.element && block.element.parentNode) {
              block.element.parentNode.removeChild(block.element);
            }
          });

          // 清空数组、集合和缓存
          this.judgmentBlocks = [];
          this.processedTexts.clear();
          this.renderedCache.clear(); // 【新增】清空HTML缓存
          this.blockIdCounter = 0;

          console.log('[JudgmentBeautifier] 所有判定块已清除');
        }

        /**
         * 切换简化模式（禁用复杂特效以提升性能）
         * @param {boolean} enabled - 是否启用简化模式
         */
        toggleSimplifiedMode(enabled, persist = true) {
          console.log(`[JudgmentBeautifier] ${enabled ? '启用' : '禁用'}简化模式，手机就没有特效了~`);

          const body = document.body;
          if (enabled) {
            body.classList.add('simplified-mode');
          } else {
            body.classList.remove('simplified-mode');
          }

          if (persist) {
            try {
              PlayerSettingsWorldbook.setLocalPreference('judgment-simplified-mode', enabled ? 'true' : 'false');
            } catch (error) {
              console.warn('[JudgmentBeautifier] 无法保存简化模式设置', error);
            }
          }
        }

        /**
         * 从localStorage恢复简化模式设置
         */
        restoreSimplifiedMode() {
          try {
            const saved = localStorage.getItem('judgment-simplified-mode');
            if (saved !== null) {
              this.toggleSimplifiedMode(saved === 'true', false);
            }
          } catch (error) {
            console.warn('[JudgmentBeautifier] 无法恢复简化模式设置', error);
          }
        }
      }

      // ===== 全局实例化 =====

      window.JudgmentBeautifier = JudgmentBeautifier;

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    JudgmentParser,
    JudgmentRenderer,
    JudgmentInteractor,
    JudgmentBeautifier,
    createBeautifier() { return new JudgmentBeautifier(); },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
