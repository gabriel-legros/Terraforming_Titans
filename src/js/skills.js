class Skill {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.baseCost = config.cost; // base cost for rank 1
    this.maxRank = config.maxRank || 1;
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

  unlockSkill(id) {
    const skill = this.skills[id];
    if (skill && !skill.unlocked) {
      skill.unlocked = true;
      skill.rank = 1;
      this.applySkillEffect(skill);
    }
  }

  upgradeSkill(id) {
    const skill = this.skills[id];
    if (skill && skill.unlocked && skill.rank < skill.maxRank) {
      skill.rank += 1;
      this.applySkillEffect(skill);
    }
  }

  getUpgradeCost(id) {
    const skill = this.skills[id];
    if (!skill) return 0;
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
      if (effectConfig.perRank) {
        if (skill.id === 'scanning_speed' && effectConfig.type === 'scanningSpeedMultiplier') {
          effect.value = Math.pow(effectConfig.baseValue, skill.rank);
        } else if (skill.id === 'android_efficiency' && effectConfig.type === 'productionMultiplier') {
          effect.value = 1 + effectConfig.baseValue * skill.rank;
        } else {
          effect.value = effectConfig.baseValue * skill.rank;
        }
      }
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
    for (const id in this.skills) {
      const skill = this.skills[id];
      if (skill.unlocked && skill.rank > 0) {
        this.applySkillEffect(skill);
      }
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
