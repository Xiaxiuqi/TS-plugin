// Generated from original EffectManager and TurnManager; regenerate with extract-effect-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules;
  const KEY = 'cryptLord.battleEffectReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps = {}) {
    const console = deps.console || { log() {}, warn() {}, error() {} };
    const window = deps.window || {};
    const EffectTransferManager = deps.transfer;
    const EnemyControlManager = deps.control || { markDamaged() {} };
    class OriginalAttributes { static recalculateAllSixDimStats(hero) {
        // 状态一致性检查：验证hero对象完整性
        if (!hero) {
            console.error(`[AttributeCalculator] Hero对象为空或未定义`);
            return;
        }

        if (!hero.baseStats) {
            console.error(`[AttributeCalculator] Hero缺少baseStats快照: ${hero.name || 'Unknown'}`);
            return;
        }

        if (!hero.additionalStats) {
            console.error(`[AttributeCalculator] Hero缺少additionalStats: ${hero.name || 'Unknown'}`);
            return;
        }

        // 验证baseStats包含必要的六维属性
        const sixDimStats = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
        const missingStats = sixDimStats.filter(stat => hero.baseStats[stat] === undefined);
        if (missingStats.length > 0) {
            console.error(`[AttributeCalculator] baseStats缺少属性: ${missingStats.join(', ')} (${hero.name || 'Unknown'})`);
            return;
        }

        sixDimStats.forEach(statName => {
            // 1. 从baseStats获取基础值
            const baseValue = hero.baseStats[statName];

            if (baseValue === undefined) {
                console.warn(`[AttributeCalculator] baseStats中缺少${statName}属性: ${hero.name}`);
                return;
            }

            // 2. 收集所有影响该属性的buff/debuff
            let percentageTotal = 0;
            let fixedTotal = 0;

            if (hero.effects && hero.effects.length > 0) {
                hero.effects.forEach(effect => {
                    if ((effect.type === 'buff' || effect.type === 'debuff')
                        && effect.stat === statName) {

                        if (effect.valueType === 'percentage') {
                            const mod = effect.power / 100;
                            percentageTotal += (effect.type === 'buff' ? mod : -mod);
                        } else if (effect.valueType === 'fixed') {
                            fixedTotal += (effect.type === 'buff' ? effect.power : -effect.power);
                        }
                    }
                });
            }

            // 3. 计算最终上限值
            let finalValue = baseValue * (1 + percentageTotal) + fixedTotal;
            finalValue = Math.max(0, Math.floor(finalValue));

            // 4. 更新上限值
            hero.additionalStats[statName] = finalValue;

            // 5. 调整当前值（不能超过新上限）
            // 运气没有当前值，跳过检查
            if (statName !== '运气') {
                const currentStatName = `当前${statName}`;
                if (hero.additionalStats[currentStatName] > finalValue) {
                    hero.additionalStats[currentStatName] = finalValue;
                    console.log(`[AttributeCalculator] ${hero.name} 的${currentStatName}超过新上限，已调整: ${hero.additionalStats[currentStatName]} → ${finalValue}`);
                }
            }
        });

        console.log(`[AttributeCalculator] ${hero.name} 的六维属性已重新计算`);
    } }
    const AttributeCalculator = deps.attributes || OriginalAttributes;
class EffectManager {
    constructor() {
        console.log('[EffectManager] 技能效果管理器已初始化');
    }

    /**
     * 解析power值（支持序列映射）
     * @param {number|Object} powerConfig - power配置（固定值或映射表）
     * @param {Hero} caster - 施法者对象
     * @param {string} effectName - 效果名称（用于日志）
     * @returns {number} 解析后的固定数值
     */
    resolvePowerValue(powerConfig, caster, effectName) {
        // 如果是固定数值，直接返回
        if (typeof powerConfig !== 'object' || powerConfig === null) {
            return powerConfig ?? 0;
        }

        // 如果是序列映射，但没有施法者信息，使用默认值
        if (!caster) {
            const defaultValue = powerConfig['default'] ?? powerConfig['9'] ?? 0;
            console.warn(`[EffectManager] 效果 ${effectName} 使用序列映射但缺少施法者信息，使用默认值: ${defaultValue}`);
            return defaultValue;
        }

        // 根据施法者序列等级查询映射表
        const sequenceRank = caster.sequenceRank;

        if (sequenceRank === undefined) {
            const defaultValue = powerConfig['default'] ?? powerConfig['9'] ?? 0;
            console.warn(`[EffectManager] 施法者 ${caster.name} 缺少sequenceRank属性，使用默认值: ${defaultValue}`);
            return defaultValue;
        }

        // 尝试精确匹配
        if (powerConfig[sequenceRank] !== undefined) {
            return powerConfig[sequenceRank];
        }

        // 使用默认值
        const defaultValue = powerConfig['default'] ?? powerConfig['9'] ?? 0;
        console.warn(`[EffectManager] 效果 ${effectName} 没有为序列${sequenceRank}配置power，使用默认值: ${defaultValue}`);
        return defaultValue;
    }

    /**
     * 标准化效果配置（向后兼容旧格式）
     * @param {Object} effect - 原始效果配置
     * @returns {Object} 标准化后的效果配置
     */
    normalizeEffect(effect) {
        // 创建副本，避免修改原对象
        const normalized = { ...effect };

        // 兼容旧的modifier字段：转换为power + valueType
        if (normalized.modifier !== undefined && normalized.power === undefined) {
            console.warn(`[EffectManager] 检测到旧格式modifier，已转换为power: ${effect.name}`);
            normalized.power = normalized.modifier * 100;  // 0.3 → 30
            normalized.valueType = 'percentage';
            delete normalized.modifier;
        }

        // 忽略buff/debuff的triggerTiming字段
        if ((normalized.type === 'buff' || normalized.type === 'debuff') && normalized.triggerTiming) {
            console.warn(`[EffectManager] Buff/Debuff不使用triggerTiming，已忽略: ${effect.name}`);
            delete normalized.triggerTiming;
        }

        return normalized;
    }

    /**
     * 判断是否为伤害修正系数
     * @param {string} stat - 属性名称
     * @returns {boolean}
     */
    isDamageModifierStat(stat) {
        return ['damageDealtIncrease', 'damageDealtDecrease',
                'damageTakenIncrease', 'damageTakenDecrease'].includes(stat);
    }

    /**
     * 判断是否为六维属性
     * @param {string} stat - 属性名称
     * @returns {boolean}
     */
    isSixDimStat(stat) {
        return ['活力', '敏捷', '灵性', '理智', '人性', '运气'].includes(stat);
    }

    /**
     * 验证效果配置
     * @param {Object} effect - 效果配置
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validateEffect(effect) {
        const errors = [];

        // 验证必需字段
        if (!effect.name) {
            errors.push('效果缺少name字段');
        }

        if (!effect.type) {
            errors.push('效果缺少type字段');
        } else if (!['buff', 'debuff', 'poison', 'regen'].includes(effect.type)) {
            errors.push(`无效的效果类型: ${effect.type}`);
        }

        // 验证power值非负
        if (effect.power !== undefined) {
            if (typeof effect.power === 'number' && effect.power < 0) {
                errors.push(`power值不能为负数: ${effect.power}`);
            }
        }

        // 验证duration在合理范围内（1-99）
        if (effect.duration !== undefined) {
            if (typeof effect.duration !== 'number' || effect.duration < 1 || effect.duration > 99) {
                errors.push(`duration必须在1-99之间: ${effect.duration}`);
            }
        }

        // 验证valueType
        if (effect.valueType && !['fixed', 'percentage'].includes(effect.valueType)) {
            errors.push(`无效的valueType: ${effect.valueType}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /** 存入一个已经完成 power 解析与传递分配的效果实例。 */
    storeResolvedEffect(hero, effectInstance) {
        if (!hero.effects) hero.effects = [];
        const existingEffectIndex = hero.effects.findIndex(
            e => e.name === effectInstance.name && e.duration > 0
        );
        if (existingEffectIndex !== -1) {
            const existingEffect = hero.effects[existingEffectIndex];
            const newPower = effectInstance.power ?? 0;
            const oldPower = existingEffect.power ?? 0;
            const newDuration = effectInstance.duration;
            const oldDuration = existingEffect.duration;
            if (newPower > oldPower) {
                hero.effects[existingEffectIndex] = effectInstance;
                if (this.isSixDimStat(effectInstance.stat)) AttributeCalculator.recalculateAllSixDimStats(hero);
                return { replaced: true, reason: 'stronger' };
            }
            if (newPower === oldPower && newDuration > oldDuration) {
                existingEffect.duration = newDuration;
                // poison 合并后无法再区分每一跳的来源；只要这一份已经在施加期完成过
                // 效果传递，就统一标记为已分配，避免后续跳伤重复传播。
                if (effectInstance.effectTransferResolved) existingEffect.effectTransferResolved = true;
                return { refreshed: true, reason: 'duration_refresh' };
            }
            return { rejected: true, reason: 'weaker' };
        }
        hero.effects.push(effectInstance);
        if (this.isSixDimStat(effectInstance.stat)) AttributeCalculator.recalculateAllSixDimStats(hero);
        return { applied: true };
    }

    /**
     * 应用效果到角色
     * @param {Hero} hero - 目标角色
     * @param {Object} effect - 效果对象
     */
    applyEffect(hero, effect, caster = null, skill = null, context = {}) {
        // 验证效果配置
        const validation = this.validateEffect(effect);
        if (!validation.valid) {
            console.error(`[EffectManager] 效果配置无效: ${effect.name}`, validation.errors);
            return {
                applied: false,
                reason: `配置无效: ${validation.errors.join(', ')}`
            };
        }
        if (!hero.effects) {
            hero.effects = [];
        }

        // 标准化效果配置（向后兼容）
        const normalizedEffect = this.normalizeEffect(effect);

        // 验证伤害修正系数必须是百分比类型
        if (this.isDamageModifierStat(normalizedEffect.stat) && normalizedEffect.valueType !== 'percentage') {
            console.error(`[EffectManager] 伤害修正系数只支持百分比: ${normalizedEffect.name}`);
            return {
                applied: false,
                reason: '伤害修正系数只支持百分比类型'
            };
        }

        // 解析power值（支持序列映射）
        let resolvedPower = this.resolvePowerValue(normalizedEffect.power, caster, normalizedEffect.name);

        // 🆕 应用标签修正到Poison和Regen效果
        if (normalizedEffect.type === 'poison' && caster && window.tagManager) {
            try {
                const tagModifier = window.tagManager.calculateTagDamageModifier(caster, hero, skill || { skillTags: [] });
                const modifiedPower = Math.max(0, Math.floor(resolvedPower * (1 + tagModifier)));

                if (tagModifier !== 0) {
                    console.log(`[EffectManager] Poison效果 ${normalizedEffect.name} 应用标签修正: ${resolvedPower} → ${modifiedPower} (${tagModifier > 0 ? '+' : ''}${(tagModifier * 100).toFixed(0)}%)`);
                }

                resolvedPower = modifiedPower;
            } catch (error) {
                console.error('[EffectManager] Poison标签修正计算失败:', error);
            }
        } else if (normalizedEffect.type === 'regen' && caster && window.tagManager) {
            try {
                const tagModifier = window.tagManager.calculateTagHealingModifier(caster, hero, skill || { skillTags: [] });
                const modifiedPower = Math.max(0, Math.floor(resolvedPower * (1 + tagModifier)));

                if (tagModifier !== 0) {
                    console.log(`[EffectManager] Regen效果 ${normalizedEffect.name} 应用标签修正: ${resolvedPower} → ${modifiedPower} (${tagModifier > 0 ? '+' : ''}${(tagModifier * 100).toFixed(0)}%)`);
                }

                resolvedPower = modifiedPower;
            } catch (error) {
                console.error('[EffectManager] Regen标签修正计算失败:', error);
            }
        }

        // 创建效果实例（存储解析后的固定值）
        const effectInstance = {
            name: normalizedEffect.name,
            type: normalizedEffect.type,
            duration: normalizedEffect.duration ?? 3,
            power: resolvedPower,
            stat: normalizedEffect.stat ?? null,
            valueType: normalizedEffect.valueType ?? 'fixed',
            priority: normalizedEffect.priority ?? 0,
            triggerTiming: normalizedEffect.triggerTiming ?? 'turn_start',
            // 整场效果仍给 duration 一个合法数值以兼容旧 UI / 校验，但所有递减与
            // 清理路径都会识别 battlePersistent，战斗结束前绝不会过期。
            battlePersistent: normalizedEffect.battlePersistent === true,
            appliedAt: Date.now(),
            // 🆕 施加者。当前没有任何读取方，纯为回溯大类铺路：将来若有回溯子类要做
            // 「只还原自己给自己的 buff、别人施加的一律保留」，没有这个戳就无从区分。
            // 不进 validateEffect 的必需字段，缺了也不影响任何既有逻辑
            sourceHeroId: (caster && caster.heroId) || null,
            effectTransferDerived: normalizedEffect.effectTransferDerived === true,
            effectTransferResolved: normalizedEffect.effectTransferResolved === true,
            effectTransferRelationId: normalizedEffect.effectTransferRelationId || null,
            effectTransferSourceId: normalizedEffect.effectTransferSourceId || null,
        };

        const canRoute = typeof EffectTransferManager !== 'undefined'
            && EffectTransferManager.isTransferableEffect(effectInstance, context);
        if (!canRoute) return this.storeResolvedEffect(hero, effectInstance);

        const deliveries = EffectTransferManager.planEffectDeliveries(
            context.battleManager, hero, effectInstance, context);
        let primaryResult = null;
        const transferResults = [];
        deliveries.forEach(delivery => {
            const result = this.storeResolvedEffect(delivery.hero, delivery.effect);
            if (delivery.primary) primaryResult = result;
            else transferResults.push({ delivery, result });
            EffectTransferManager.noteEffectDelivery(
                context.battleManager, hero, delivery, result, context);
        });
        return { ...(primaryResult || { applied: false }), transfers: transferResults };
    }

    /**
     * 处理所有角色的持续效果
     * @param {Array} heroes - 角色数组
     * @param {BattleLogger} battleLogger - 战斗日志记录器
     * @returns {Array} 效果触发结果数组
     */
    processEffects(heroes, battleLogger) {
        const results = [];

        heroes.forEach(hero => {
            if (!hero.effects || hero.effects.length === 0) {
                return;
            }

            // 处理每个效果
            hero.effects.forEach(effect => {
                const result = this.processEffect(hero, effect);
                if (result) {
                    results.push(result);

                    // 记录到战斗日志
                    if (battleLogger) {
                        battleLogger.log(result.message, 'effect');
                    }
                }

                // 减少持续时间
                if (!effect.battlePersistent && effect.duration > 0) {
                    effect.duration--;
                }
            });

            // 移除过期效果（增强：支持六维属性重算）
            const sixDimStats = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
            const hadSixDimEffects = hero.effects.some(e =>
                !e.battlePersistent && e.duration <= 0 && sixDimStats.includes(e.stat)
            );

            hero.effects = hero.effects.filter(e => e.battlePersistent || e.duration > 0);

            // 如果有六维属性的效果过期，重新计算
            if (hadSixDimEffects) {
                AttributeCalculator.recalculateAllSixDimStats(hero);
            }
        });

        return results;
    }

    /**
     * 处理单个效果
     * @param {Hero} hero - 角色
     * @param {Object} effect - 效果对象
     * @returns {Object|null} 效果结果
     */
    processEffect(hero, effect) {
        switch (effect.type) {
            case 'poison':
                return this.processPoisonEffect(hero, effect);

            case 'regen':
                return this.processRegenEffect(hero, effect);

            case 'buff':
                return this.processBuffEffect(hero, effect);

            case 'debuff':
                return this.processDebuffEffect(hero, effect);

            default:
                return null;
        }
    }

    /**
     * 标准化效果配置，应用默认值
     * @param {Object} effect - 原始效果配置
     * @returns {Object} 标准化后的配置
     */
    normalizePoisonEffectConfig(effect) {
        return {
            type: effect.type,
            name: effect.name,
            power: effect.power !== undefined ? effect.power : 0,
            duration: effect.duration || 3,
            valueType: effect.valueType || 'fixed',  // 默认固定伤害
            stat: effect.stat || '当前活力'           // 默认目标活力
        };
    }

    /**
     * 获取上限属性名称（去掉"当前"前缀）
     * @param {string} currentStatName - 当前属性名称（例如 '当前活力'）
     * @returns {string} 上限属性名称（例如 '活力'）
     */
    getMaxStatName(currentStatName) {
        return currentStatName.replace('当前', '');
    }

    /**
     * 计算伤害值
     * @param {Object} effect - 标准化后的效果配置
     * @param {number} maxStatValue - 目标属性的上限值
     * @returns {number} 伤害值（整数）
     */
    calculatePoisonDamage(effect, maxStatValue) {
        if (effect.valueType === 'percentage') {
            // 百分比伤害：向下取整
            return Math.floor(maxStatValue * effect.power / 100);
        } else {
            // 固定伤害
            return effect.power;
        }
    }

    /**
     * 生成效果消息
     * @param {string} heroName - 角色名称
     * @param {string} effectName - 效果名称
     * @param {string} statName - 属性名称
     * @param {number} damage - 伤害值
     * @param {number} oldValue - 旧值
     * @param {number} newValue - 新值
     * @returns {string} 格式化的消息
     */
    formatPoisonMessage(heroName, effectName, statName, damage, oldValue, newValue) {
        // 去掉"当前"前缀用于显示
        const displayStatName = statName.replace('当前', '');
        return `${heroName}的${effectName}生效，${displayStatName}变化${damage}点。${displayStatName}：${oldValue}→${newValue}`;
    }

    /**
     * 处理中毒效果
     * @param {Hero} hero - 角色
     * @param {Object} effect - 效果对象
     * @returns {Object} 效果结果
     */
    processPoisonEffect(hero, effect) {
        // 1. 标准化配置（应用默认值）
        const effectConfig = this.normalizePoisonEffectConfig(effect);

        // 2. 获取目标属性名称
        const statName = effectConfig.stat;  // 例如 '当前活力'
        const maxStatName = this.getMaxStatName(statName);  // 例如 '活力'

        // 3. 获取上限属性值（用于百分比计算）
        const maxStatValue = hero.additionalStats[maxStatName] || 100;

        // 4. 计算伤害值
        const damage = this.calculatePoisonDamage(effectConfig, maxStatValue);

        // 5. 统一扣值。施加阶段已经完成分配的 poison 只正常跳伤，不再递归传递。
        const routed = (this.battleManager && typeof EffectTransferManager !== 'undefined')
            ? EffectTransferManager.applyResolvedLoss(this.battleManager, hero, statName, damage, {
                sourceKind: '持续伤害', sourceLabel: effect.name,
                derived: effect.effectTransferResolved === true,
            })
            : null;
        const oldValue = routed ? routed.oldValue : (hero.additionalStats[statName] || 0);
        const newValue = routed ? routed.newValue : Math.max(0, oldValue - damage);
        const actualDamage = routed ? routed.actualDamage : oldValue - newValue;
        if (!routed) {
            hero.additionalStats[statName] = newValue;
            if (statName === '当前活力') {
                hero.health = newValue;
                hero.currentHealth = newValue;
            }
        }

        // 9. 生成消息
        const message = this.formatPoisonMessage(hero.name, effect.name, statName, actualDamage, oldValue, newValue);

        // 10. 返回结果
        return {
            hero: hero,
            effect: effect,
            type: 'damage',
            amount: actualDamage,
            message: message
        };
    }

    /**
     * 标准化再生效果配置，应用默认值
     * @param {Object} effect - 原始效果配置
     * @returns {Object} 标准化后的配置
     */
    normalizeRegenEffectConfig(effect) {
        return {
            type: effect.type,
            name: effect.name,
            power: effect.power !== undefined ? effect.power : 0,
            duration: effect.duration || 3,
            valueType: effect.valueType || 'fixed',  // 默认固定伤害
            stat: effect.stat || '当前活力'           // 默认目标活力
        };
    }

    /**
     * 计算再生治疗量
     * @param {Object} effect - 标准化后的效果配置
     * @param {number} maxStatValue - 目标属性的上限值
     * @returns {number} 治疗值（整数）
     */
    calculateRegenHealing(effect, maxStatValue) {
        if (effect.valueType === 'percentage') {
            // 百分比治疗：向下取整
            return Math.floor(maxStatValue * effect.power / 100);
        } else {
            // 固定治疗
            return effect.power;
        }
    }

    /**
     * 生成再生效果消息
     * @param {string} heroName - 角色名称
     * @param {string} effectName - 效果名称
     * @param {string} statName - 属性名称
     * @param {number} healing - 治疗值
     * @param {number} oldValue - 旧值
     * @param {number} newValue - 新值
     * @returns {string} 格式化的消息
     */
    formatRegenMessage(heroName, effectName, statName, healing, oldValue, newValue) {
        // 去掉"当前"前缀用于显示
        const displayStatName = statName.replace('当前', '');
        return `${heroName}的${effectName}生效，${displayStatName}恢复${healing}点。${displayStatName}：${oldValue}→${newValue}`;
    }

    /**
     * 处理再生效果
     * @param {Hero} hero - 角色
     * @param {Object} effect - 效果对象
     * @returns {Object} 效果结果
     */
    processRegenEffect(hero, effect) {
        // 1. 标准化配置（应用默认值）
        const effectConfig = this.normalizeRegenEffectConfig(effect);

        // 2. 获取目标属性名称
        const statName = effectConfig.stat;  // 例如 '当前活力'

        // 3. 派生上限属性名称
        const maxStatName = this.getMaxStatName(statName);  // 例如 '活力'

        // 4. 获取上限属性值（用于百分比计算）
        const maxStatValue = hero.additionalStats[maxStatName] || 100;

        // 5. 计算治疗值
        const healing = this.calculateRegenHealing(effectConfig, maxStatValue);

        // 6. 获取旧值
        const oldValue = hero.additionalStats[statName] || 0;

        // 7. 计算新值（边界保护：不超过上限）
        const newValue = Math.min(maxStatValue, oldValue + healing);

        // 8. 更新属性
        hero.additionalStats[statName] = newValue;

        // 9. 同步相关属性（仅当修改活力时）
        if (statName === '当前活力') {
            hero.health = newValue;        // 同步更新（battle-engine标准属性）
            hero.currentHealth = newValue; // 同步更新（battle-engine标准属性）
        }

        // 10. 生成消息
        const message = this.formatRegenMessage(hero.name, effect.name, statName, healing, oldValue, newValue);

        // 11. 返回结果
        return {
            hero: hero,
            effect: effect,
            type: 'heal',
            amount: healing,
            message: message
        };
    }

    /**
     * 处理 Buff 效果
     * @param {Hero} hero - 角色
     * @param {Object} effect - 效果对象
     * @returns {Object} 效果结果
     */
    processBuffEffect(hero, effect) {
        // Buff 效果通常是被动的，在计算时生效
        // 注意：显示的是即将递减后的回合数（当前值-1）
        const remainingDuration = Math.max(0, effect.duration - 1);
        return {
            hero: hero,
            effect: effect,
            type: 'buff',
            message: `${hero.name} 的 ${effect.name} 效果持续中（剩余 ${remainingDuration} 回合）`
        };
    }

    /**
     * 处理 Debuff 效果
     * @param {Hero} hero - 角色
     * @param {Object} effect - 效果对象
     * @returns {Object} 效果结果
     */
    processDebuffEffect(hero, effect) {
        // Debuff 效果通常是被动的，在计算时生效
        // 注意：显示的是即将递减后的回合数（当前值-1）
        const remainingDuration = Math.max(0, effect.duration - 1);
        return {
            hero: hero,
            effect: effect,
            type: 'debuff',
            message: `${hero.name} 受到 ${effect.name} 影响（剩余 ${remainingDuration} 回合）`
        };
    }
}
    return { manager: new EffectManager(), attributes: OriginalAttributes,
      turn: { processCharacterEffects(hero, timing = 'turn_start') {
    const results = [];

    // 🆕 从动格（虚影轮）整段不结算。这里是**唯一**的闸门，turn_start 与 turn_end
    // 两个时机的全部调用点都要经过它——分散到六个调用点各写一次必然漏。
    // 冻结的是「递减」：一个大回合里本体带着两个虚影出手，若每一格都结算一次，
    // 三回合的 debuff 一轮就掉光了。虚影仍然**吃**这些效果的数值（攻防加成照常生效），
    // 它只是不推进时间。
    // 时序依据：executeNextTurn 先取值再自增，所以某人行动全程（含同步执行的
    // turn_end）currentTurnIndex 始终指着他本人；而 processRoundEndEffects 跑在
    // finishRound，那时索引已等于队列长度，currentSlot 为 null，闸门不会误伤。
    if (this.isExtraSlot() && this.currentSlotCfg().freezeDurations) return results;

    // 过滤出活跃的效果（duration > 0）并且匹配触发时机
    const activeEffects = hero.effects.filter(e => {
        if (e.duration <= 0) return false;

        // 如果效果没有指定triggerTiming，默认为turn_start
        const effectTiming = e.triggerTiming || 'turn_start';
        return effectTiming === timing;
    });

    // 🔥 修复：移除提前返回，确保后续的状态效果检查能够执行
    // if (activeEffects.length === 0) {
    //     return results;
    // }

    // 只有当有活跃效果时才处理
    if (activeEffects.length > 0) {
        // 按优先级排序（数值越小优先级越高）
        activeEffects.sort((a, b) => {
        const priorityA = a.priority ?? 0;
        const priorityB = b.priority ?? 0;
            return priorityA - priorityB;
        });

        // 处理每个效果
        for (const effect of activeEffects) {
            try {
                // 🔥 修复：调用 EffectManager 的 processEffect 方法
                const result = this.battleManager.effectManager.processEffect(hero, effect);

                // 🆕 秘偶劣势标记：poison 一类的持续伤害同样算「受到实际扣减」。
                // processPoisonEffect 在 EffectManager 里拿不到 battleManager，所以挂在调用点
                if (result && result.type === 'damage' && (result.amount ?? 0) > 0) {
                    EnemyControlManager.markDamaged(this.battleManager, hero);
                }

                if (result) {
                    results.push({
                        hero: hero.name,
                        effect: effect.name,
                        result: result
                    });

                    // 记录到战斗日志
                    if (this.battleManager && this.battleManager.battleLogger) {
                        this.battleManager.battleLogger.log(
                            `${hero.name} 受到 ${effect.name} 效果: ${result.message || ''}`,
                            'effect'
                        );
                    }

                    // 🔥 新增：记录到战报
                    if (this.battleManager && this.battleManager.battleReporter) {
                        this.battleManager.battleReporter.logEffectTrigger(
                            hero,
                            effect.name || '未知效果',
                            result.message || ''
                        );
                    }
                }

                // 减少持续时间
                if (!effect.battlePersistent) effect.duration--;

            } catch (e) {
                console.error(`[TurnManager] 处理效果 ${effect.name} 时出错:`, e);
            }
        }

        // 移除过期的效果（duration <= 0）之前，先检查是否需要重算六维属性
        const sixDimStats = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
        const hadSixDimEffects = hero.effects.some(e =>
            !e.battlePersistent && e.duration <= 0 &&
            (e.type === 'buff' || e.type === 'debuff') &&
            sixDimStats.includes(e.stat)
        );

        hero.effects = hero.effects.filter(e => e.battlePersistent || e.duration > 0);

        // 如果有六维属性的效果过期，触发重算
        if (hadSixDimEffects && typeof AttributeCalculator !== 'undefined') {
            console.log(`[TurnManager] 检测到六维属性效果过期，触发重算: ${hero.name}`);
            AttributeCalculator.recalculateAllSixDimStats(hero);
        }
    }

    // 🆕 在回合开始时检查并应用状态效果（基于属性百分比）
    if (timing === 'turn_start' && this.battleManager && this.battleManager.statusEffectManager) {
        const appliedEffects = this.battleManager.statusEffectManager.checkAndApplyEffects(hero);

        // 在战斗日志中记录应用的状态效果
        if (appliedEffects.length > 0 && this.battleManager.battleLogger) {
            appliedEffects.forEach(effect => {
                this.battleManager.battleLogger.log(
                    `${hero.name} 受到状态效果: ${effect.name}`,
                    'effect'
                );
            });
        }

        // 🔥 新增：将状态效果添加到返回值，以便触发UI刷新
        if (appliedEffects.length > 0) {
            appliedEffects.forEach(effect => {
                results.push({
                    hero: hero.name,
                    effect: effect.name,
                    result: { message: `受到状态效果: ${effect.name}` }
                });
            });
        }
    }

    return results;
} } };
  }
  const api = { create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY); delete modules[KEY]; } };
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
