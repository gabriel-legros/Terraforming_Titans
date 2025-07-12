const RESOURCE_UPGRADE_AMOUNTS = {
  metal: 100,
  components: 100,
  electronics: 100,
  glass: 100,
  water: 1000000,
  androids: 100,
  food: 100
};

class SolisManager extends EffectableEntity {
  constructor(resourceValues = {}) {
    super({ description: 'Solis Manager' });
    this.resourceValues = Object.assign({
      metal: 1,
      components: 10,
      electronics: 20,
      androids: 50,
      superconductors: 100,
      food: 5,
    }, resourceValues);
    this.solisPoints = 0;
    this.rewardMultiplier = 1;
    this.currentQuest = null;
    this.lastQuestTime = 0;
    this.lastRefreshTime = 0;
    this.postCompletionCooldownUntil = 0;
    this.questInterval = 15 * 60 * 1000; // 15 minutes
    this.refreshCooldown = 5 * 60 * 1000; // 5 minutes

    // Purchasable upgrades for the Solis shop
    this.shopUpgrades = {
      funding: { baseCost: 1, purchases: 0 },
      metal: { baseCost: 1, purchases: 0 },
      components: { baseCost: 1, purchases: 0 },
      electronics: { baseCost: 1, purchases: 0 },
      glass: { baseCost: 1, purchases: 0 },
      water: { baseCost: 1, purchases: 0 },
      androids: { baseCost: 10, purchases: 0 },
      food: { baseCost: 1, purchases: 0 }
    };
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
    const baseQuantity = Math.round(value / this.resourceValues[resource]);
    const quantity = baseQuantity * Math.pow(10, this.rewardMultiplier - 1);
    this.currentQuest = { resource, quantity, value };
    this.postCompletionCooldownUntil = 0;
    this.lastQuestTime = Date.now();
    return this.currentQuest;
  }

  refreshQuest() {
    const now = Date.now();
    if (now < this.postCompletionCooldownUntil) {
      return;
    }
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
    this.lastQuestTime = Date.now();
    this.postCompletionCooldownUntil = this.lastQuestTime + this.questInterval;
    this.lastRefreshTime = this.lastQuestTime;
    return true;
  }

  multiplyReward() {
    this.rewardMultiplier += 1;
    if (this.currentQuest) {
      this.currentQuest.quantity *= 10;
    }
  }

  divideReward() {
    if (this.rewardMultiplier > 1) {
      this.rewardMultiplier -= 1;
      if (this.currentQuest) {
        this.currentQuest.quantity = Math.ceil(this.currentQuest.quantity / 10);
      }
    } else {
      this.rewardMultiplier = 1;
    }
  }

  getUpgradeCost(key) {
    const up = this.shopUpgrades[key];
    return up ? up.baseCost * (up.purchases + 1) : 0;
  }

  purchaseUpgrade(key) {
    const up = this.shopUpgrades[key];
    if (!up) return false;
    const cost = this.getUpgradeCost(key);
    if (this.solisPoints < cost) return false;
    this.solisPoints -= cost;
    up.purchases += 1;
    if (key === 'funding' && typeof addEffect === 'function') {
      addEffect({
        target: 'fundingModule',
        type: 'fundingBonus',
        value: up.purchases,
        effectId: 'solisFunding',
        sourceId: 'solisShop'
      });
    } else if (resources && resources.colony && resources.colony[key] &&
               typeof resources.colony[key].increase === 'function') {
      const amount = RESOURCE_UPGRADE_AMOUNTS[key] || 0;
      resources.colony[key].increase(amount);
    }
    return true;
  }

  reapplyEffects() {
    const count = this.shopUpgrades.funding.purchases;
    if (count > 0 && typeof addEffect === 'function') {
      addEffect({
        target: 'fundingModule',
        type: 'fundingBonus',
        value: count,
        effectId: 'solisFunding',
        sourceId: 'solisShop'
      });
    }

    for (const key in RESOURCE_UPGRADE_AMOUNTS) {
      const upgrade = this.shopUpgrades[key];
      if (upgrade && upgrade.purchases > 0 && resources && resources.colony &&
          resources.colony[key] && typeof resources.colony[key].increase === 'function') {
        resources.colony[key].increase(RESOURCE_UPGRADE_AMOUNTS[key] * upgrade.purchases);
      }
    }
  }

  update(delta) {
    const now = Date.now();
    if (!this.currentQuest) {
      if (this.postCompletionCooldownUntil > 0) {
        if (now >= this.postCompletionCooldownUntil) {
          this.generateQuest();
        }
      } else if (this.lastQuestTime === 0) {
        // No quest has ever been generated; provide one immediately
        this.generateQuest();
      }
    }
  }

  saveState() {
    return {
      solisPoints: this.solisPoints,
      rewardMultiplier: this.rewardMultiplier,
      currentQuest: this.currentQuest,
      lastQuestTime: this.lastQuestTime,
      lastRefreshTime: this.lastRefreshTime,
      postCompletionCooldownUntil: this.postCompletionCooldownUntil,
      upgrades: Object.keys(this.shopUpgrades).reduce((o, k) => {
        o[k] = this.shopUpgrades[k].purchases;
        return o;
      }, {})
    };
  }

  loadState(data) {
    this.solisPoints = data.solisPoints || 0;
    this.rewardMultiplier = data.rewardMultiplier || 1;
    this.currentQuest = data.currentQuest;
    this.lastQuestTime = data.lastQuestTime || 0;
    this.lastRefreshTime = data.lastRefreshTime || 0;
    this.postCompletionCooldownUntil = data.postCompletionCooldownUntil || 0;
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.shopUpgrades[k]) {
          this.shopUpgrades[k].purchases = data.upgrades[k];
        }
      }
    }
  }

  enable() {
    if (typeof showSolisTab === 'function') {
      showSolisTab();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolisManager };
}
