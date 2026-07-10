class AutomationEncounterManager {
  constructor() {
    this.targets = {
      ships: new Set(),
      buildings: new Set(),
      projects: new Set(),
      colony: new Set(),
      research: new Set()
    };
  }

  record(type, targetId) {
    if (!targetId || !this.targets[type]) {
      return false;
    }
    this.targets[type].add(String(targetId));
    return true;
  }

  recordAll(type, targetIds) {
    const ids = Array.isArray(targetIds) ? targetIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      this.record(type, ids[index]);
    }
  }

  has(type, targetId) {
    return !!targetId && !!this.targets[type] && this.targets[type].has(String(targetId));
  }

  getIds(type) {
    return this.targets[type] ? Array.from(this.targets[type]) : [];
  }

  saveState() {
    return {
      ships: this.getIds('ships'),
      buildings: this.getIds('buildings'),
      projects: this.getIds('projects'),
      colony: this.getIds('colony'),
      research: this.getIds('research')
    };
  }

  loadState(data = {}) {
    const types = ['ships', 'buildings', 'projects', 'colony', 'research'];
    for (let index = 0; index < types.length; index += 1) {
      const type = types[index];
      this.targets[type] = new Set();
      this.recordAll(type, data[type]);
    }
  }
}

try {
  module.exports = { AutomationEncounterManager };
} catch (error) {}
