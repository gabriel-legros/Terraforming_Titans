class WGCTeamMember {
  constructor({ name, classType, level = 1, power = 0, stamina = 0, wit = 0 }) {
    this.name = name;
    this.classType = classType;
    this.level = level;
    this.power = power;
    this.stamina = stamina;
    this.wit = wit;
  }

  static getBaseStats(classType) {
    const map = {
      'Team Leader': { power: 1, stamina: 1, wit: 1 },
      'Soldier': { power: 1, stamina: 1, wit: 0 },
      'Natural Scientist': { power: 0, stamina: 0, wit: 2 },
      'Social Scientist': { power: 0, stamina: 0, wit: 2 }
    };
    return map[classType] || { power: 0, stamina: 0, wit: 0 };
  }

  static create(name, classType, allocation) {
    const base = WGCTeamMember.getBaseStats(classType);
    return new WGCTeamMember({
      name,
      classType,
      level: 1,
      power: base.power + (allocation.power || 0),
      stamina: base.stamina + (allocation.stamina || 0),
      wit: base.wit + (allocation.wit || 0)
    });
  }

  toJSON() {
    return {
      name: this.name,
      classType: this.classType,
      level: this.level,
      power: this.power,
      stamina: this.stamina,
      wit: this.wit
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WGCTeamMember };
}
