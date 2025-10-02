class WGCTeamMember {
  constructor({ firstName, lastName = '', classType, level = 1, power = 0, athletics = 0, wit = 0, health, maxHealth, xp = 0 }) {
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
      maxHealth: this.maxHealth
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WGCTeamMember };
}
