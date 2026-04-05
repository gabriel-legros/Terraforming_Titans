class Skill {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.baseCost = config.cost; // base cost for rank 1
    this.baseMaxRank = config.maxRank || 1;
    this.maxRank = this.baseMaxRank;
    this.effect = config.effect || null;
    this.effects = config.effects || null;
    this.requires = config.requires || [];
    this.rank = 0;
    this.unlocked = false;
  }

  getCostForRank(rank) {
    const factor = Math.max(1, rank - 1);
    return this.baseCost * factor;
  }
}

class SkillManager {
  constructor(skillData) {
    this.skills = {};
    this.skillPoints = 0;
    if (skillData) {
      for (const key in skillData) {
        this.skills[key] = new Skill(skillData[key]);
      }
    }
  }

  getFeaturedChallengeCompletionCount() {
    if (!atlasManager || typeof atlasManager.getFeaturedCompletionCount !== 'function') {
      return 0;
    }
    return atlasManager.getFeaturedCompletionCount();
  }

  getMaxRank(id) {
    const skill = this.skills[id];
    if (!skill) return 0;
    return (skill.baseMaxRank || skill.maxRank || 1) + this.getFeaturedChallengeCompletionCount();
  }

  refreshMaxRanks() {
    for (const id in this.skills) {
      const skill = this.skills[id];
      skill.maxRank = this.getMaxRank(id);
    }
  }

  getReductionSkillValue(skill, effectConfig) {
    const rank = skill.rank || 0;
    if (rank <= 0) return 0;

    const baseValue = effectConfig.baseValue || 0;
    const baseRankLimit = Math.min(rank, skill.baseMaxRank || 5);
    const baseTotal = baseValue * baseRankLimit;
    if (rank <= (skill.baseMaxRank || 5)) {
      return baseTotal;
    }

    const targetTotal = skill.id === 'project_speed' ? 0.875 : 0.75;
    const originalGap = Math.max(0, targetTotal - baseValue * (skill.baseMaxRank || 5));
    if (originalGap <= 0) {
      return Math.min(targetTotal, baseTotal);
    }

    const extraRanks = rank - (skill.baseMaxRank || 5);
    const quarterStep = originalGap / 4;
    if (extraRanks <= 3) {
      return Math.min(targetTotal, baseTotal + quarterStep * extraRanks);
    }

    const afterQuarterSteps = baseTotal + quarterStep * 3;
    const remainingGap = Math.max(0, targetTotal - afterQuarterSteps);
    return targetTotal - remainingGap / Math.pow(2, extraRanks - 3);
  }

  getEffectValueForRank(skill, effectConfig) {
    if (!effectConfig.perRank) {
      return effectConfig.value;
    }
    if (skill.id === 'scanning_speed' && effectConfig.type === 'scanningSpeedMultiplier') {
      return Math.pow(effectConfig.baseValue, skill.rank);
    }
    if (skill.id === 'android_efficiency' && effectConfig.type === 'productionMultiplier') {
      return 1 + effectConfig.baseValue * skill.rank;
    }
    if (
      (skill.id === 'build_cost' && effectConfig.type === 'globalCostReduction') ||
      (skill.id === 'worker_reduction' && effectConfig.type === 'globalWorkerReduction') ||
      (skill.id === 'maintenance_reduction' && effectConfig.type === 'globalMaintenanceReduction') ||
      (skill.id === 'project_speed' && effectConfig.type === 'projectDurationReduction')
    ) {
      return this.getReductionSkillValue(skill, effectConfig);
    }
    return effectConfig.baseValue * skill.rank;
  }

  unlockSkill(id) {
    const skill = this.skills[id];
    if (skill && !skill.unlocked) {
      this.refreshMaxRanks();
      skill.unlocked = true;
      skill.rank = 1;
      this.applySkillEffect(skill);
    }
  }

  upgradeSkill(id) {
    const skill = this.skills[id];
    this.refreshMaxRanks();
    if (skill && skill.unlocked && skill.rank < skill.maxRank) {
      skill.rank += 1;
      this.applySkillEffect(skill);
    }
  }

  getUpgradeCost(id) {
    const skill = this.skills[id];
    if (!skill) return 0;
    this.refreshMaxRanks();
    const nextRank = skill.rank + 1;
    return skill.getCostForRank(nextRank);
  }

  applySkillEffect(skill) {
    const effects = Array.isArray(skill.effects)
      ? skill.effects
      : (skill.effect ? [skill.effect] : []);
    if (effects.length === 0) return;

    effects.forEach((effectConfig, index) => {
      const effect = Object.assign({}, effectConfig, {
        sourceId: skill.id,
        effectId: effects.length === 1 ? skill.id : `${skill.id}-${index}`,
      });
      effect.value = this.getEffectValueForRank(skill, effectConfig);
      addEffect(effect);
    });
  }

  saveState() {
    const state = { skillPoints: this.skillPoints, skills: {} };
    for (const id in this.skills) {
      const skill = this.skills[id];
      state.skills[id] = { rank: skill.rank, unlocked: skill.unlocked };
    }
    return state;
  }

  loadState(state) {
    if (!state) return;
    this.skillPoints = state.skillPoints || 0;
    this.refreshMaxRanks();
    const skillData = state.skills || {};
    for (const id in skillData) {
      const skill = this.skills[id];
      if (skill) {
        skill.rank = skillData[id].rank || 0;
        skill.unlocked = skillData[id].unlocked || false;
        if (skill.unlocked && skill.rank > 0) {
          this.applySkillEffect(skill);
        }
      }
    }
  }

  reapplyEffects() {
    this.refreshMaxRanks();
    for (const id in this.skills) {
      const skill = this.skills[id];
      if (skill.unlocked && skill.rank > 0) {
        this.applySkillEffect(skill);
      }
    }
  }

  handleAtlasCompletionChange() {
    this.refreshMaxRanks();
    this.reapplyEffects();
    if (typeof updateSkillTreeUI === 'function') {
      updateSkillTreeUI();
    }
  }

  resetSkillTree() {
    for (const id in this.skills) {
      const skill = this.skills[id];
      const effects = Array.isArray(skill.effects)
        ? skill.effects
        : (skill.effect ? [skill.effect] : []);
      if (skill.unlocked && effects.length > 0) {
        effects.forEach((effectConfig) => {
          const effect = { target: effectConfig.target, sourceId: skill.id };
          if (effectConfig.targetId) effect.targetId = effectConfig.targetId;
          if (typeof removeEffect === 'function') {
            removeEffect(effect);
          }
        });
      }
      skill.rank = 0;
      skill.unlocked = false;
    }
    this.skillPoints = 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Skill, SkillManager };
}
