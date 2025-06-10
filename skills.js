class Skill {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.baseCost = config.cost; // base cost for rank 1
    this.maxRank = config.maxRank || 1;
    this.effect = config.effect || null;
    this.unlocks = config.unlocks || [];
    this.rank = 0;
    this.unlocked = false;
  }

  getCostForRank(rank) {
    return this.baseCost * rank;
  }
}

class SkillManager {
  constructor(skillData) {
    this.skills = {};
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
    if (!skill.effect) return;
    const effect = Object.assign({}, skill.effect, {
      sourceId: skill.id,
      effectId: skill.id,
    });
    if (skill.effect.perRank) {
      effect.value = skill.effect.baseValue * skill.rank;
    }
    addEffect(effect);
  }

  saveState() {
    const state = {};
    for (const id in this.skills) {
      const skill = this.skills[id];
      state[id] = { rank: skill.rank, unlocked: skill.unlocked };
    }
    return state;
  }

  loadState(state) {
    if (!state) return;
    for (const id in state) {
      const skill = this.skills[id];
      if (skill) {
        skill.rank = state[id].rank || 0;
        skill.unlocked = state[id].unlocked || false;
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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Skill, SkillManager };
}
