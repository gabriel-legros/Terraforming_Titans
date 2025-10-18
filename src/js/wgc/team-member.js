class WGCTeamMember {
  constructor({ firstName, lastName = '', classType, level = 1, power = 0, athletics = 0, wit = 0, health, maxHealth, xp = 0, auto, autoSettings }) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.classType = classType;
    this.level = level;
    this.power = power;
    this.athletics = athletics;
    this.wit = wit;
    this.xp = xp;

    // Recalculate max health from level on creation, ignoring saved values.
    this.maxHealth = 100 + (this.level - 1) * 10;
    // Clamp current health to the recalculated maximum.
    this.health = typeof health === 'number' ? Math.min(health, this.maxHealth) : this.maxHealth;

    this.isBeingEdited = false;
    this.autoRatios = { power: 0, athletics: 0, wit: 0 };
    this.autoEnabled = false;
    const autoData = auto || autoSettings || {};
    this.applyAutoSettings(autoData.enabled, autoData);
  }

  static getBaseStats(classType) {
    const map = {
      'Team Leader': { power: 1, athletics: 1, wit: 1 },
      'Soldier': { power: 1, athletics: 1, wit: 0 },
      'Natural Scientist': { power: 0, athletics: 0, wit: 2 },
      'Social Scientist': { power: 0, athletics: 0, wit: 2 }
    };
    return map[classType] || { power: 0, athletics: 0, wit: 0 };
  }

  static create(firstName, lastName, classType, allocation) {
    const base = WGCTeamMember.getBaseStats(classType);
    return new WGCTeamMember({
      firstName,
      lastName,
      classType,
      level: 1,
      power: base.power + (allocation.power || 0),
      athletics: base.athletics + (allocation.athletics || 0),
      wit: base.wit + (allocation.wit || 0)
    });
  }

  getPointsToAllocate() {
    if (this.level < 1) return 0;
    const base = WGCTeamMember.getBaseStats(this.classType);
    const allocated = (this.power - base.power) + (this.athletics - base.athletics) + (this.wit - base.wit);
    const totalPoints = 5 + ((this.level - 1) * 2);
    return totalPoints - allocated;
  }

  allocatePoints(allocation) {
    const toSpend = (allocation.power || 0) + (allocation.athletics || 0) + (allocation.wit || 0);
    if (toSpend > this.getPointsToAllocate()) return false;
    this.power += (allocation.power || 0);
    this.athletics += (allocation.athletics || 0);
    this.wit += (allocation.wit || 0);
    return true;
  }

  respec() {
    const base = WGCTeamMember.getBaseStats(this.classType);
    this.power = base.power;
    this.athletics = base.athletics;
    this.wit = base.wit;
  }

  static sanitizeAutoValue(value) {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    return Math.floor(value);
  }

  applyAutoSettings(enabled, ratios = {}) {
    this.autoEnabled = !!enabled;
    this.autoRatios.power = WGCTeamMember.sanitizeAutoValue(ratios.power);
    this.autoRatios.athletics = WGCTeamMember.sanitizeAutoValue(ratios.athletics);
    this.autoRatios.wit = WGCTeamMember.sanitizeAutoValue(ratios.wit);
  }

  autoAllocate() {
    if (!this.autoEnabled) return false;
    const entries = Object.keys(this.autoRatios).filter(key => this.autoRatios[key] > 0);
    if (!entries.length) return false;
    let points = this.getPointsToAllocate();
    if (points <= 0) return false;
    const ratioSum = entries.reduce((sum, key) => sum + this.autoRatios[key], 0);
    if (ratioSum <= 0) return false;
    const base = WGCTeamMember.getBaseStats(this.classType);
    const current = {
      power: this.power - base.power,
      athletics: this.athletics - base.athletics,
      wit: this.wit - base.wit
    };
    let total = entries.reduce((sum, key) => sum + Math.max(0, current[key]), 0);
    let spent = 0;
    while (points > 0) {
      let bestStat = '';
      let bestError = Number.POSITIVE_INFINITY;
      for (const key of entries) {
        const nextTotal = total + 1;
        let mse = 0;
        for (const candidate of entries) {
          const desired = this.autoRatios[candidate] / ratioSum;
          const actual = (current[candidate] + (candidate === key ? 1 : 0)) / nextTotal;
          const diff = desired - actual;
          mse += diff * diff;
        }
        const error = mse / entries.length;
        if (error + 1e-9 < bestError) {
          bestError = error;
          bestStat = key;
        }
      }
      if (!bestStat) break;
      current[bestStat] += 1;
      total += 1;
      this[bestStat] += 1;
      points -= 1;
      spent += 1;
    }
    return spent > 0;
  }

  getXPForNextLevel() {
    return this.level * 10;
  }

  toJSON() {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      classType: this.classType,
      level: this.level,
      power: this.power,
      athletics: this.athletics,
      wit: this.wit,
      xp: this.xp,
      health: this.health,
      maxHealth: this.maxHealth,
      auto: {
        enabled: this.autoEnabled,
        power: this.autoRatios.power,
        athletics: this.autoRatios.athletics,
        wit: this.autoRatios.wit
      }
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WGCTeamMember };
}
