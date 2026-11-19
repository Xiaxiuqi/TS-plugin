(() => {
  'use strict';
  const KEY = 'cryptLord.battleTags';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  // BEGIN ORIGINAL TAG RULES
  function originalTags(logger, worldbooks) {
    const console = { log() {}, warn() {}, error() {} };
class TagManager {
    constructor(battleLogger, worldbookManager) {
        this.battleLogger = battleLogger;
        this.worldbookManager = worldbookManager;

        // 配置缓存
        this.tagMappingConfig = null;      // 标签映射配置
        this.tagDamageRelations = null;    // 标签伤害修正配置
        this.tagHealingRelations = null;   // 标签治疗修正配置

        console.log('[TagManager] 标签管理器已初始化');
    }

    /**
     * 添加标签到角色
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {number} duration - 持续回合数（0-99）
     * @param {number} stacks - 叠加层数（默认1）
     * @param {number} maxStacks - 最大层数（默认99）
     * @param {string} source - 来源标识（'inherent' | 'skill' | 'applied'）
     */
    addTag(hero, tagName, duration, stacks = 1, maxStacks = 99, source = 'applied') {
        hero.tags = hero.tags || [];

        const existingTag = hero.tags.find(t => t.name === tagName);

        if (existingTag) {
            // 叠加逻辑
            const beforeStacks = Number(existingTag.stacks) || 0;
            const newStacks = existingTag.stacks + stacks;
            const effectiveMaxStacks = existingTag.maxStacks || maxStacks;

            if (newStacks > effectiveMaxStacks) {
                // 超过上限：只刷新持续时间
                existingTag.duration = Math.max(existingTag.duration, duration);
                this.battleLogger.log(
                    `${hero.name} 的 ${tagName} 已达上限 x${effectiveMaxStacks}，仅刷新持续时间为 ${existingTag.duration} 回合`,
                    'info'
                );
            } else {
                // 未超过上限：叠加层数 + 刷新持续时间
                existingTag.stacks = newStacks;
                existingTag.duration = Math.max(existingTag.duration, duration);
                this.battleLogger.log(
                    `${hero.name} 的 ${tagName} 叠加至 x${existingTag.stacks}，持续时间刷新为 ${existingTag.duration} 回合`,
                    'info'
                );
            }
            if (source === 'inherent') {
                const added = Math.max(0, (Number(existingTag.stacks) || 0) - beforeStacks);
                existingTag.$inherentStacks = (Number(existingTag.$inherentStacks) || 0) + added;
            }
        } else {
            // 新标签
            hero.tags.push({
                name: tagName,
                duration: Math.max(0, duration),      // 边界保护
                stacks: Math.max(1, stacks),          // 边界保护
                maxStacks: maxStacks,
                source: source,
                $inherentStacks: source === 'inherent' ? Math.max(1, stacks) : 0,
                appliedAt: Date.now()
            });

            this.battleLogger.log(
                `${hero.name} 获得标签 ${tagName} x${stacks}，持续 ${duration} 回合，上限 ${maxStacks} 层`,
                'info'
            );
        }
    }

    /**
     * 完全移除指定标签
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     */
    removeTag(hero, tagName) {
        if (!hero.tags) return;

        const initialLength = hero.tags.length;
        hero.tags = hero.tags.filter(t => t.name !== tagName);

        if (hero.tags.length < initialLength) {
            this.battleLogger.log(
                `${hero.name} 的 ${tagName} 已完全移除`,
                'info'
            );
        }
    }

    /**
     * 移除标签层数
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {number} stacksToRemove - 要移除的层数（默认1）
     */
    removeTagStacks(hero, tagName, stacksToRemove = 1) {
        const tag = hero.tags.find(t => t.name === tagName);

        if (tag) {
            tag.stacks -= stacksToRemove;
            tag.$inherentStacks = Math.min(Number(tag.$inherentStacks) || 0, Math.max(0, tag.stacks));

            if (tag.stacks <= 0) {
                // 边界保护：层数归0或负数，移除整个标签
                this.removeTag(hero, tagName);
            } else {
                this.battleLogger.log(
                    `${hero.name} 的 ${tagName} 减少至 x${tag.stacks}`,
                    'info'
                );
            }
        }
    }

    /**
     * 获取角色所有标签（包含技能自带标签）
     * @param {Hero} hero - 目标角色
     * @param {Move} currentSkill - 当前使用的技能（可选）
     * @returns {Array} 标签数组
     */
    getTags(hero, currentSkill = null) {
        const tags = [...(hero.tags || [])];  // 复制持久化标签

        // 如果正在使用技能，添加技能自带标签
        if (currentSkill && currentSkill.skillTags && currentSkill.skillTags.length > 0) {
            currentSkill.skillTags.forEach(tagName => {
                tags.push({
                    name: tagName,
                    duration: 1,
                    stacks: 1,
                    source: 'skill',
                    appliedAt: Date.now()
                });
            });
        }

        return tags;
    }

    /**
     * 快速检查是否拥有指定标签
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {Move} currentSkill - 当前使用的技能（可选）
     * @returns {boolean}
     */
    hasTag(hero, tagName, currentSkill = null) {
        // 检查持久化标签
        if (hero.tags && hero.tags.some(t => t.name === tagName)) {
            return true;
        }

        // 检查技能自带标签
        if (currentSkill && currentSkill.skillTags) {
            if (currentSkill.skillTags.includes(tagName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 获取指定标签对象
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {Move} currentSkill - 当前使用的技能（可选）
     * @returns {Object|null} 标签对象或null
     */
    getTag(hero, tagName, currentSkill = null) {
        // 先检查持久化标签
        if (hero.tags) {
            const tag = hero.tags.find(t => t.name === tagName);
            if (tag) return tag;
        }

        // 再检查技能自带标签
        if (currentSkill && currentSkill.skillTags && currentSkill.skillTags.includes(tagName)) {
            return {
                name: tagName,
                duration: 1,
                stacks: 1,
                source: 'skill',
                appliedAt: Date.now()
            };
        }

        return null;
    }

    /**
     * 获取标签层数
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {Move} currentSkill - 当前使用的技能（可选）
     * @returns {number} 层数（如果没有标签返回0）
     */
    getTagStacks(hero, tagName, currentSkill = null) {
        const tag = this.getTag(hero, tagName, currentSkill);
        return tag ? tag.stacks : 0;
    }

    /**
     * 递减所有角色的标签持续时间，清理过期标签
     * @param {Array} heroes - 角色数组
     */
    decrementTagDurations(heroes) {
        heroes.forEach(hero => {
            if (!hero.tags || hero.tags.length === 0) return;

            // 递减持续时间
            hero.tags.forEach(tag => {
                if (tag.duration > 0) {
                    tag.duration--;
                }
            });

            // 清理过期标签
            const beforeCount = hero.tags.length;
            hero.tags = hero.tags.filter(tag => tag.duration > 0);
            const afterCount = hero.tags.length;

            // 记录日志
            if (beforeCount > afterCount) {
                this.battleLogger.log(
                    `${hero.name} 移除了 ${beforeCount - afterCount} 个过期标签`,
                    'info'
                );
            }

            if (hero.tags.length > 0) {
                this.battleLogger.log(
                    `${hero.name} 当前标签: ${hero.tags.map(t => `${t.name}x${t.stacks}(${t.duration}回合)`).join(', ')}`,
                    'info'
                );
            }
        });
    }

    /**
     * 修改标签持续时间
     * @param {Hero} hero - 目标角色
     * @param {string} tagName - 标签名称
     * @param {number} durationChange - 持续时间变化量（可以为负数）
     */
    modifyTagDuration(hero, tagName, durationChange) {
        const tag = hero.tags.find(t => t.name === tagName);

        if (tag) {
            tag.duration = Math.max(0, tag.duration + durationChange);  // 边界保护：最小为0
            this.battleLogger.log(
                `${hero.name} 的 ${tagName} 持续时间变更为 ${tag.duration} 回合`,
                'info'
            );
        }
    }

    /**
     * 加载标签映射配置
     * @returns {Promise<Object>} 标签映射配置对象
     */
    async loadTagMappingConfig() {
        if (this.tagMappingConfig) {
            return this.tagMappingConfig;  // 返回缓存
        }

        try {
            const entries = await this.worldbookManager.fetchEntries(
                "【配置】标签映射",
                { strategy: 'merge', exactMatch: true }
            );

            if (!entries || entries.length === 0) {
                console.warn('[TagManager] 标签映射配置不存在，使用空配置');
                this.tagMappingConfig = {};
                return this.tagMappingConfig;
            }

            this.tagMappingConfig = JSON.parse(entries[0].content);
            console.log('[TagManager] 标签映射配置已加载:', Object.keys(this.tagMappingConfig).length, '个关键词');
            return this.tagMappingConfig;

        } catch (error) {
            console.error('[TagManager] 加载标签映射配置失败:', error);
            this.tagMappingConfig = {};
            return this.tagMappingConfig;
        }
    }

    /**
     * 加载标签伤害修正配置
     * @returns {Promise<Object>} 标签伤害修正配置对象
     */
    async loadTagDamageRelations() {
        if (this.tagDamageRelations) {
            return this.tagDamageRelations;  // 返回缓存
        }

        try {
            const entries = await this.worldbookManager.fetchEntries(
                "【配置】标签伤害修正",
                { strategy: 'merge', exactMatch: true }
            );

            if (!entries || entries.length === 0) {
                console.warn('[TagManager] 标签伤害修正配置不存在，使用空配置');
                this.tagDamageRelations = {};
                return this.tagDamageRelations;
            }

            this.tagDamageRelations = JSON.parse(entries[0].content);
            console.log('[TagManager] 标签伤害修正配置已加载');
            return this.tagDamageRelations;

        } catch (error) {
            console.error('[TagManager] 加载标签伤害修正配置失败:', error);
            this.tagDamageRelations = {};
            return this.tagDamageRelations;
        }
    }

    /**
     * 加载标签治疗修正配置
     * @returns {Promise<Object>} 标签治疗修正配置对象
     */
    async loadTagHealingRelations() {
        if (this.tagHealingRelations) {
            return this.tagHealingRelations;  // 返回缓存
        }

        try {
            const entries = await this.worldbookManager.fetchEntries(
                "【配置】标签治疗修正",
                { strategy: 'merge', exactMatch: true }
            );

            if (!entries || entries.length === 0) {
                console.warn('[TagManager] 标签治疗修正配置不存在，使用空配置');
                this.tagHealingRelations = {};
                return this.tagHealingRelations;
            }

            this.tagHealingRelations = JSON.parse(entries[0].content);
            console.log('[TagManager] 标签治疗修正配置已加载');
            return this.tagHealingRelations;

        } catch (error) {
            console.error('[TagManager] 加载标签治疗修正配置失败:', error);
            this.tagHealingRelations = {};
            return this.tagHealingRelations;
        }
    }

    /**
     * 初始化固有标签
     * @param {Array} heroes - 角色数组
     */
    async initializeInherentTags(heroes) {
        // 1. 预加载所有配置（确保后续同步调用可用）
        await this.loadTagMappingConfig();
        await this.loadTagDamageRelations();
        await this.loadTagHealingRelations();

        if (!this.tagMappingConfig || Object.keys(this.tagMappingConfig).length === 0) {
            console.warn('[TagManager] 标签映射配置为空，跳过固有标签初始化');
            return;
        }

        // 2. 为每个角色添加固有标签
        heroes.forEach(hero => this.applyInherentTagsTo(hero));
    }

    /**
     * 🆕 给单个角色打固有标签。**同步**，只读已缓存的 tagMappingConfig。
     * 从 initializeInherentTags 里原样抽出来的，行为逐字不变。
     * 抽出的理由：那个方法是 async（开头要 await 三份世界书配置），而战术回合的
     * 纯前端管线整条是同步的，中途入场的召唤物没法在那里 await。
     * 开战时配置已经加载并缓存过，所以这里直接读缓存就够；配置没加载时静默跳过，
     * 与原方法「配置为空就不打标签」的兜底一致。
     * @param {Hero} hero - 角色
     */
    applyInherentTagsTo(hero) {
        if (!hero) return;
        if (!this.tagMappingConfig || Object.keys(this.tagMappingConfig).length === 0) return;

        hero.tags = hero.tags || [];
        const sequenceString = hero.sequenceString || '普通人';
        const displaySequenceString = hero.baseSequenceString || sequenceString;
        const matchedTags = [];

        // 遍历配置中的关键词
        for (const [keyword, config] of Object.entries(this.tagMappingConfig)) {
            if (sequenceString.includes(keyword)) {
                // 匹配成功，添加标签
                if (config.tags && Array.isArray(config.tags)) {
                    config.tags.forEach(tagName => {
                        this.addTag(
                            hero,
                            tagName,
                            config.duration || 99,
                            1,
                            config.maxStacks || 99,
                            'inherent'
                        );
                        matchedTags.push(tagName);
                    });
                }
            }
        }

        // 记录日志
        if (matchedTags.length > 0) {
            this.battleLogger.log(
                `${hero.name} (${displaySequenceString}) 固有标签: ${matchedTags.join(', ')}`,
                'info'
            );
        } else {
            this.battleLogger.log(
                `${hero.name} (${displaySequenceString}) 无匹配的固有标签`,
                'info'
            );
        }
    }

    /** 移除旧的固有贡献后，按新有效序列精确重建；其他来源的同名层数保留。 */
    syncInherentTagsTo(hero, sequenceString) {
        if (!hero) return;
        hero.tags = hero.tags || [];
        hero.tags.forEach(tag => {
            const inherent = Math.min(Number(tag.$inherentStacks) || 0, Number(tag.stacks) || 0);
            if (inherent > 0) tag.stacks = Math.max(0, (Number(tag.stacks) || 0) - inherent);
            tag.$inherentStacks = 0;
        });
        hero.tags = hero.tags.filter(tag => (Number(tag.stacks) || 0) > 0);
        const previous = hero.sequenceString;
        hero.sequenceString = String(sequenceString || previous || '普通人');
        this.applyInherentTagsTo(hero);
        hero.sequenceString = String(sequenceString || previous || '普通人');
    }

    /**
     * 计算标签伤害修正
     * @param {Hero} attacker - 攻击者
     * @param {Hero} defender - 防御者
     * @param {Move} skill - 使用的技能
     * @returns {number} 伤害修正值（0.5表示+50%，-0.3表示-30%）
     */
    calculateTagDamageModifier(attacker, defender, skill) {
        // 1. 检查配置（已在initializeInherentTags中预加载）
        if (!this.tagDamageRelations || Object.keys(this.tagDamageRelations).length === 0) {
            return 0;  // 无配置，返回0修正
        }

        // 2. 获取标签
        const attackerTags = this.getTags(attacker, skill);
        const defenderTags = this.getTags(defender);

        // 3. 记录标签信息
        this.battleLogger.log(
            `${attacker.name} 使用技能: ${skill.name}`,
            'info'
        );
        this.battleLogger.log(
            `攻击者标签: [${attackerTags.map(t => t.name).join(', ')}]`,
            'info'
        );
        this.battleLogger.log(
            `防御者标签: [${defenderTags.map(t => t.name).join(', ')}]`,
            'info'
        );

        // 4. 计算修正
        let totalModifier = 0;
        const matchedRelations = [];

        attackerTags.forEach(attackerTag => {
            defenderTags.forEach(defenderTag => {
                const modifier = this.tagDamageRelations[attackerTag.name]?.[defenderTag.name];

                if (modifier !== undefined) {
                    totalModifier += modifier;
                    matchedRelations.push({
                        attacker: attackerTag.name,
                        defender: defenderTag.name,
                        modifier: modifier
                    });
                }
            });
        });

        // 5. 记录匹配结果
        if (matchedRelations.length > 0) {
            this.battleLogger.log('匹配克制关系:', 'info');
            matchedRelations.forEach(rel => {
                const sign = rel.modifier > 0 ? '+' : '';
                this.battleLogger.log(
                    `  ${rel.attacker} → ${rel.defender}: ${sign}${(rel.modifier * 100).toFixed(0)}%`,
                    'info'
                );
            });
            this.battleLogger.log(
                `总标签修正: ${totalModifier > 0 ? '+' : ''}${(totalModifier * 100).toFixed(0)}%`,
                'info'
            );
        } else {
            this.battleLogger.log('无匹配的克制关系', 'info');
        }

        // 🌟 防爆封顶：最多 +150% / 最低 -75%（持续伤害每跳都用此公式）
        const clampedModifier = Math.max(-0.75, Math.min(1.5, totalModifier));
        if (clampedModifier !== totalModifier) {
            this.battleLogger.log(
                `[封顶] 总标签修正从 ${(totalModifier * 100).toFixed(0)}% 限制为 ${(clampedModifier * 100).toFixed(0)}%`,
                'info'
            );
        }
        return clampedModifier;
    }

    /**
     * 计算标签治疗修正
     * @param {Hero} healer - 治疗者
     * @param {Hero} target - 目标
     * @param {Move} skill - 使用的技能
     * @returns {number} 治疗修正值（0.5表示+50%，-0.3表示-30%）
     */
    calculateTagHealingModifier(healer, target, skill) {
        // 1. 检查配置（已在initializeInherentTags中预加载）
        if (!this.tagHealingRelations || Object.keys(this.tagHealingRelations).length === 0) {
            return 0;  // 无配置，返回0修正
        }

        // 2. 获取标签
        const healerTags = this.getTags(healer, skill);
        const targetTags = this.getTags(target);

        // 3. 记录标签信息
        this.battleLogger.log(
            `${healer.name} 使用技能: ${skill.name}`,
            'info'
        );
        this.battleLogger.log(
            `治疗者标签: [${healerTags.map(t => t.name).join(', ')}]`,
            'info'
        );
        this.battleLogger.log(
            `目标标签: [${targetTags.map(t => t.name).join(', ')}]`,
            'info'
        );

        // 4. 计算修正
        let totalModifier = 0;
        const matchedRelations = [];

        healerTags.forEach(healerTag => {
            targetTags.forEach(targetTag => {
                const modifier = this.tagHealingRelations[healerTag.name]?.[targetTag.name];

                if (modifier !== undefined) {
                    totalModifier += modifier;
                    matchedRelations.push({
                        healer: healerTag.name,
                        target: targetTag.name,
                        modifier: modifier
                    });
                }
            });
        });

        // 5. 记录匹配结果
        if (matchedRelations.length > 0) {
            this.battleLogger.log('匹配治疗关系:', 'info');
            matchedRelations.forEach(rel => {
                const sign = rel.modifier > 0 ? '+' : '';
                this.battleLogger.log(
                    `  ${rel.healer} → ${rel.target}: ${sign}${(rel.modifier * 100).toFixed(0)}%`,
                    'info'
                );
            });
            this.battleLogger.log(
                `总标签修正: ${totalModifier > 0 ? '+' : ''}${(totalModifier * 100).toFixed(0)}%`,
                'info'
            );
        } else {
            this.battleLogger.log('无匹配的治疗关系', 'info');
        }

        // 🌟 防爆封顶：最多 +150% / 最低 -75%（持续治疗每跳都用此公式）
        const clampedModifier = Math.max(-0.75, Math.min(1.5, totalModifier));
        if (clampedModifier !== totalModifier) {
            this.battleLogger.log(
                `[封顶] 总治疗修正从 ${(totalModifier * 100).toFixed(0)}% 限制为 ${(clampedModifier * 100).toFixed(0)}%`,
                'info'
            );
        }
        return clampedModifier;
    }
}
class TagChecker {
    /**
     * 检查角色是否拥有指定标签
     * @param {Hero} hero - 角色对象
     * @param {string} tagName - 标签名称
     * @returns {boolean} 是否拥有该标签
     */
    hasTag(hero, tagName) {
        if (!hero || !hero.tags || !Array.isArray(hero.tags)) {
            return false;
        }
        return hero.tags.some(tag => tag.name === tagName);
    }

    /**
     * 获取指定标签的层数
     * @param {Hero} hero - 角色对象
     * @param {string} tagName - 标签名称
     * @returns {number} 标签层数（不存在返回0）
     */
    getTagStacks(hero, tagName) {
        if (!hero || !hero.tags || !Array.isArray(hero.tags)) {
            return 0;
        }
        const tag = hero.tags.find(tag => tag.name === tagName);
        return tag ? (tag.stacks || 0) : 0;
    }

    /**
     * 获取指定标签的剩余持续时间
     * @param {Hero} hero - 角色对象
     * @param {string} tagName - 标签名称
     * @returns {number} 剩余回合数（不存在返回0）
     */
    getTagDuration(hero, tagName) {
        if (!hero || !hero.tags || !Array.isArray(hero.tags)) {
            return 0;
        }
        const tag = hero.tags.find(tag => tag.name === tagName);
        return tag ? (tag.duration || 0) : 0;
    }
}
    return { manager: new TagManager(logger, worldbooks), checker: new TagChecker(),
      turn: { applySkillTags(attacker, circleSkill, centerHero, aoeContext) {
        const tagManager = this.battleManager?.tagManager;
        if (!tagManager) return;

        const hasApply = circleSkill.applyTags && circleSkill.applyTags.length > 0;
        const hasRemove = circleSkill.removeTags && circleSkill.removeTags.length > 0;
        if (!hasApply && !hasRemove) return;

        // 范围：跟第一个 effect 走；没有 effects 就跟 targetType 走
        let tagTargets;
        const effects = circleSkill.effects || [];
        if (effects.length > 0) {
            tagTargets = this.selectEffectTargets(effects[0], attacker, centerHero, aoeContext);
        } else {
            tagTargets = this.resolveHitList(attacker, centerHero, circleSkill, aoeContext);
        }

        tagTargets.forEach(target => {
            if (!target) return;

            if (hasApply) {
                circleSkill.applyTags.forEach(tagConfig => {
                    // 🔥 兼容中英文字段名
                    const tagName = tagConfig.name || tagConfig.名称;
                    if (!tagName) return;

                    if (tagConfig.duration !== undefined || tagConfig.stacks !== undefined) {
                        tagManager.addTag(
                            target,
                            tagName,
                            tagConfig.duration || 1,
                            tagConfig.stacks || 1,
                            tagConfig.maxStacks || 99,
                            'applied'
                        );
                    } else if (tagConfig.durationChange !== undefined) {
                        tagManager.modifyTagDuration(target, tagName, tagConfig.durationChange);
                    } else if (tagConfig.stacksChange !== undefined) {
                        if (tagConfig.stacksChange < 0) {
                            tagManager.removeTagStacks(target, tagName, Math.abs(tagConfig.stacksChange));
                        } else {
                            tagManager.addTag(target, tagName, 0, tagConfig.stacksChange, 99, 'applied');
                        }
                    }
                });
            }

            if (hasRemove) {
                circleSkill.removeTags.forEach(tagName => {
                    if (tagName === '*') {
                        if (target.tags) {
                            target.tags.map(t => t.name).forEach(name => tagManager.removeTag(target, name));
                        }
                    } else {
                        tagManager.removeTag(target, tagName);
                    }
                });
            }
        });
    } } };
  }
  // END ORIGINAL TAG RULES
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const safeName = value => typeof value === 'string' && value.trim() &&
    !['__proto__', 'constructor', 'prototype'].includes(value) && !value.startsWith('$');
  const names = ['【配置】标签映射', '【配置】标签伤害修正', '【配置】标签治疗修正'];
  const empty = () => ({ mapping: {}, damage: {}, healing: {}, sources: {}, warnings: [] });
  function mappingOf(value) {
    const out = {};
    if (!record(value)) return out;
    for (const [key, row] of Object.entries(value)) {
      if (!safeName(key) || !record(row) || !Array.isArray(row.tags)) continue;
      if (row.duration !== undefined && !Number.isFinite(Number(row.duration)) ||
        row.maxStacks !== undefined && !Number.isFinite(Number(row.maxStacks))) continue;
      out[key] = { tags: row.tags.filter(safeName),
        duration: row.duration === undefined ? 99 : Number(row.duration),
        maxStacks: row.maxStacks === undefined ? 99 : Number(row.maxStacks) };
    }
    return out;
  }
  function relationsOf(value) {
    const out = {};
    if (!record(value)) return out;
    for (const [from, row] of Object.entries(value)) {
      if (!safeName(from) || !record(row)) continue;
      const pairs = Object.entries(row).filter(([to, amount]) =>
        safeName(to) && typeof amount === 'number' && Number.isFinite(amount));
      if (pairs.length) out[from] = Object.fromEntries(pairs);
    }
    return out;
  }
  function normalizeActor(actor) {
    if (!actor) return null;
    actor.tags = (Array.isArray(actor.tags) ? actor.tags : []).map(tag => typeof tag === 'string'
      ? { name: tag, duration: 99, stacks: 1, maxStacks: 99, source: 'applied', $inherentStacks: 0 }
      : tag).filter(tag => record(tag) && safeName(tag.name) &&
        (tag.duration === undefined || Number.isFinite(Number(tag.duration))) &&
        (tag.stacks === undefined || Number.isFinite(Number(tag.stacks))) &&
        Number(tag.stacks ?? 1) > 0);
    for (const tag of actor.tags) {
      tag.duration = Math.max(0, Number(tag.duration ?? 99)); tag.stacks = Number(tag.stacks ?? 1);
      if (!Number.isFinite(Number(tag.maxStacks))) tag.maxStacks = 99;
      tag.maxStacks = Number(tag.maxStacks || 99);
      tag.$inherentStacks = Math.max(0, Math.min(tag.stacks, Number(tag.$inherentStacks) || 0));
    }
    return actor;
  }
  function logger(battle) {
    return { log(message) {
      if (!battle) return;
      battle.log ||= [];
      battle.log.push({ at: Date.now(), round: battle.round, tagEvent: true, message: String(message) });
      if (battle.log.length > 160) battle.log.shift();
    } };
  }
  const instance = battle => originalTags(logger(battle), null);
  async function load() {
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const result = empty();
    if (typeof host.getWorldbookNames !== 'function' || typeof host.getWorldbook !== 'function') return result;
    const available = await host.getWorldbookNames();
    const books = Array.isArray(available) ? available : [];
    // Original merge priority is primary > library; unrelated/custom books cannot override either.
    const selected = ['1源堡', '2历史孔隙'].some(book => books.includes(book))
      ? ['1源堡', '2历史孔隙'].filter(book => books.includes(book)) : books;
    const entries = new Map();
    for (const book of selected) {
      try {
        const rows = await host.getWorldbook(book);
        const local = new Map();
        for (const row of Array.isArray(rows) ? rows : []) {
          const label = String(row?.name || row?.comment || '').trim();
          if (names.includes(label)) local.set(label, row);
        }
        for (const [label, row] of local) {
          if (entries.has(label)) continue;
          entries.set(label, row); result.sources[label] = book;
        }
      } catch (error) { result.warnings.push(`${book}：${error?.message || error}`); }
    }
    const rules = originalTags({ log() {} }, { async fetchEntries(label) {
      const row = entries.get(label);
      if (!row) return [];
      try { if (!record(JSON.parse(row.content))) throw Error('配置必须为对象'); }
      catch (error) { result.warnings.push(`${label}：${error.message}`); return []; }
      return [row];
    } }).manager;
    await rules.initializeInherentTags([]);
    result.mapping = mappingOf(rules.tagMappingConfig);
    result.damage = relationsOf(rules.tagDamageRelations);
    result.healing = relationsOf(rules.tagHealingRelations);
    return result;
  }
  function add(actor, tagName, duration = 1, stacks = 1, maxStacks = 99, source = 'applied', battle) {
    if (!normalizeActor(actor) || !safeName(tagName) ||
      ![duration, stacks, maxStacks].every(value => Number.isFinite(Number(value)))) return false;
    instance(battle).manager.addTag(actor, tagName, Number(duration), Number(stacks), Number(maxStacks), source);
    return true;
  }
  function remove(actor, tagName, stacks = Infinity, battle) {
    if (!normalizeActor(actor) || !safeName(tagName)) return false;
    const found = actor.tags.some(tag => tag.name === tagName);
    const manager = instance(battle).manager;
    if (Number.isFinite(stacks) && stacks > 0) manager.removeTagStacks(actor, tagName, stacks);
    else manager.removeTag(actor, tagName);
    return found;
  }
  function sync(actor, sequence, mapping, battle) {
    if (!normalizeActor(actor)) return;
    const manager = instance(battle).manager;
    manager.tagMappingConfig = mappingOf(mapping);
    const hero = { name: actor.name, tags: actor.tags, sequenceString: actor.sequenceString || actor.sequence,
      baseSequenceString: actor.baseSequenceString };
    manager.syncInherentTagsTo(hero, sequence);
    actor.tags = hero.tags;
  }
  function tick(actors, battle) {
    if (battle?.tagLifecycle?.version !== undefined && battle.tagLifecycle.version !== 1)
      throw Error('不支持此战斗标签版本');
    if (battle?.tagLifecycle && battle.tagLifecycle.lastTickRound === battle.round) return;
    const present = [...new Set(actors || [])].filter(normalizeActor);
    instance(battle).manager.decrementTagDurations(present);
    if (battle) battle.tagLifecycle = { version: 1, lastTickRound: battle.round };
  }
  const describe = actor => (actor?.tags || []).map(tag => typeof tag === 'string' ? tag :
    `${tag.name} ×${tag.stacks} · ${tag.duration} 回合`);
  const describeSources = actor => (actor?.tags || []).map(tag => typeof tag === 'string' ? tag :
    `${tag.name}：${tag.source === 'inherent' ? '固有' : tag.source === 'skill' ? '技能' : '施加'}来源，` +
    `固有贡献 ${Number(tag.$inherentStacks) || 0} 层`).join('\n');
  function query(actor, method, tagName, skill) {
    const rules = instance();
    const copy = { ...actor, tags: structuredClone(actor?.tags || []) };
    normalizeActor(copy);
    if (method === 'getTags') return rules.manager.getTags(copy, skill);
    if (method === 'getTag') return rules.manager.getTag(copy, tagName, skill);
    if (method === 'hasTag') return rules.manager.hasTag(copy, tagName, skill);
    return rules.checker[method](copy, tagName);
  }
  function analyze(attacker, defender, skill, relations, family = 'damage') {
    const rules = instance(), manager = rules.manager;
    const left = { ...attacker, tags: structuredClone(attacker?.tags || []) };
    const right = { ...defender, tags: structuredClone(defender?.tags || []) };
    normalizeActor(left); normalizeActor(right);
    const move = { ...skill, name: skill?.name || skill?.名称 || '',
      skillTags: (Array.isArray(skill?.skillTags || skill?.技能标签) ? skill.skillTags || skill.技能标签 : []).filter(safeName) };
    const matrix = relationsOf(relations);
    manager.tagDamageRelations = manager.tagHealingRelations = matrix;
    const modifier = family === 'healing' ? manager.calculateTagHealingModifier(left, right, move)
      : manager.calculateTagDamageModifier(left, right, move);
    const matchedRelations = [];
    for (const attackerTag of manager.getTags(left, move)) for (const defenderTag of manager.getTags(right)) {
      const amount = matrix[attackerTag.name]?.[defenderTag.name];
      if (amount !== undefined) matchedRelations.push({
        attackerTag: structuredClone(attackerTag), defenderTag: structuredClone(defenderTag), modifier: amount });
    }
    return { modifier, rawModifier: matchedRelations.reduce((sum, row) => sum + row.modifier, 0), matchedRelations };
  }
  const modifier = (attacker, defender, skill, relations) => analyze(attacker, defender, skill, relations).modifier;
  function applySkill(actor, target, skill, hit, options = {}) {
    if (!hit || !skill) return;
    const recipients = [...new Set(options.targets || [skill.targetType === 'self' ? actor : target])]
      .filter(normalizeActor);
    if (!recipients.length) return;
    const rules = instance(options.battle);
    const move = { ...skill, applyTags: skill.applyTags || skill.施加标签 || [],
      removeTags: skill.removeTags || skill.移除标签 || [] };
    move.applyTags = (Array.isArray(move.applyTags) ? move.applyTags : []).filter(row =>
      record(row) && safeName(row.name || row.名称) &&
      ['duration', 'stacks', 'maxStacks', 'durationChange', 'stacksChange'].every(key =>
        row[key] === undefined || typeof row[key] === 'number' && Number.isFinite(row[key])));
    move.removeTags = (Array.isArray(move.removeTags) ? move.removeTags : []).filter(name =>
      name === '*' || safeName(name));
    rules.turn.battleManager = { tagManager: rules.manager };
    rules.turn.selectEffectTargets = rules.turn.resolveHitList = () => recipients;
    rules.turn.applySkillTags(actor, move, target, null);
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    load, add, remove, sync, tick, modifier, analyze, applySkill, describe, describeSources,
    getTags: (actor, skill) => query(actor, 'getTags', null, skill),
    getTag: (actor, name, skill) => query(actor, 'getTag', name, skill),
    hasTag: (actor, name, skill) => query(actor, 'hasTag', name, skill),
    getTagStacks: (actor, name) => query(actor, 'getTagStacks', name),
    getTagDuration: (actor, name) => query(actor, 'getTagDuration', name),
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
