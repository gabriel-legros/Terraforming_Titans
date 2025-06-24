class SolisManager {
  constructor(resourceValues = {}) {
    this.resourceValues = Object.assign({
      metal: 1,
      components: 10,
      electronics: 20,
      androids: 50,
      superconductors: 100,
    }, resourceValues);
    this.solisPoints = 0;
    this.rewardMultiplier = 1;
    this.currentQuest = null;
    this.lastQuestTime = 0;
    this.lastRefreshTime = 0;
    this.questInterval = 15 * 60 * 1000; // 15 minutes
    this.refreshCooldown = 5 * 60 * 1000; // 5 minutes
  }

  availableResources() {
    const list = [];
    for (const name in this.resourceValues) {
      if (resources.colony && resources.colony[name] && resources.colony[name].unlocked) {
        list.push(name);
      }
    }
    return list;
  }

  generateQuest() {
    const options = this.availableResources();
    if (options.length === 0) {
      this.currentQuest = null;
      return null;
    }
    const resource = options[Math.floor(Math.random() * options.length)];
    const value = Math.floor(Math.random() * 9000) + 1000; // metal value
    const quantity = Math.round(value / this.resourceValues[resource]);
    this.currentQuest = { resource, quantity, value };
    this.lastQuestTime = Date.now();
    return this.currentQuest;
  }

  refreshQuest() {
    const now = Date.now();
    if (now - this.lastRefreshTime >= this.refreshCooldown) {
      this.generateQuest();
      this.lastRefreshTime = now;
    }
  }

  completeQuest() {
    if (!this.currentQuest) return false;
    const res = resources.colony[this.currentQuest.resource];
    if (!res || res.value < this.currentQuest.quantity) return false;
    res.decrease(this.currentQuest.quantity);
    this.solisPoints += this.rewardMultiplier;
    this.currentQuest = null;
    return true;
  }

  multiplyReward() {
    this.rewardMultiplier += 1;
  }

  divideReward() {
    this.rewardMultiplier = Math.max(1, this.rewardMultiplier - 1);
  }

  update(delta) {
    const now = Date.now();
    if (!this.currentQuest && now - this.lastQuestTime >= this.questInterval) {
      this.generateQuest();
    }
  }

  saveState() {
    return {
      solisPoints: this.solisPoints,
      rewardMultiplier: this.rewardMultiplier,
      currentQuest: this.currentQuest,
      lastQuestTime: this.lastQuestTime,
      lastRefreshTime: this.lastRefreshTime
    };
  }

  loadState(data) {
    this.solisPoints = data.solisPoints || 0;
    this.rewardMultiplier = data.rewardMultiplier || 1;
    this.currentQuest = data.currentQuest;
    this.lastQuestTime = data.lastQuestTime || 0;
    this.lastRefreshTime = data.lastRefreshTime || 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolisManager };
}
