const RESOURCE_UPGRADE_AMOUNTS = {
  metal: 100,
  food: 100,
  components: 100,
  electronics: 100,
  glass: 100,
  water: 1000000,
  androids: 100,
  research: 100,
};

const RESEARCH_UPGRADE_ORDER = [
  'launch_pads',
  'colony_sliders',
  'construction_office',
  'space_mirror_oversight',
  'terraforming_bureau',
  'atmospheric_monitoring'
];

class SolisManager extends EffectableEntity {
  constructor(resourceValues = {}) {
    super({ description: 'Solis Manager' });
    this.enabled = false;
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
    this.solisTabAlert = false;

    // Purchasable upgrades for the Solis shop
    this.shopUpgrades = {
      funding: { baseCost: 1, purchases: 0 },
      metal: { baseCost: 1, purchases: 0 },
      food: { baseCost: 1, purchases: 0 },
      components: { baseCost: 1, purchases: 0 },
      electronics: { baseCost: 1, purchases: 0 },
      glass: { baseCost: 1, purchases: 0 },
      water: { baseCost: 1, purchases: 0 },
      androids: { baseCost: 10, purchases: 0 },
      colonistRocket: { baseCost: 1, purchases: 0 },
      startingShips: { baseCost: 100, purchases: 0 },
      research: { baseCost: 10, purchases: 0 },
      advancedOversight: { baseCost: 1000, purchases: 0, max: 1 },
      researchUpgrade: { baseCost: 100, purchases: 0, max: RESEARCH_UPGRADE_ORDER.length }
    };
  }

  getTerraformedWorldBonus() {
    if (
      typeof spaceManager !== 'undefined' &&
      spaceManager &&
      typeof spaceManager.getTerraformedPlanetCount === 'function'
    ) {
      const count = spaceManager.getTerraformedPlanetCount();
      return Math.sqrt(count);
    }
    return 1;
  }

  getCurrentReward() {
    return this.rewardMultiplier * this.getTerraformedWorldBonus();
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

  getResearchUpgradeOrder() {
    return RESEARCH_UPGRADE_ORDER.slice();
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
    this.solisPoints += this.getCurrentReward();
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

  setSolisTabAlert(value) {
    this.solisTabAlert = value;
    if (typeof updateHopeAlert === 'function') {
      updateHopeAlert();
    }
  }

  getUpgradeCost(key) {
    const up = this.shopUpgrades[key];
    if (!up) return 0;
    if (typeof up.max === 'number' && up.purchases >= up.max) return 0;
    return up.baseCost * (up.purchases + 1);
  }

  purchaseUpgrade(key) {
    const up = this.shopUpgrades[key];
    if (!up) return false;
    if (typeof up.max === 'number' && up.purchases >= up.max) {
      return false;
    }
    const cost = this.getUpgradeCost(key);
    if (this.solisPoints < cost) return false;
    const shipsResource = key === 'startingShips'
      ? resources?.special?.spaceships
      : null;
    if (key === 'startingShips' && !shipsResource) {
      return false;
    }
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
    } else if (key === 'colonistRocket' && typeof addEffect === 'function') {
      addEffect({
        target: 'project',
        targetId: 'import_colonists_1',
        type: 'increaseResourceGain',
        resourceCategory: 'colony',
        resourceId: 'colonists',
        value: up.purchases,
        effectId: 'solisColonistRocket',
        sourceId: 'solisShop'
      });
    } else if (key === 'researchUpgrade') {
      this.applyResearchUpgrade();
    } else if (key === 'advancedOversight' && typeof addEffect === 'function') {
      addEffect({
        target: 'project',
        targetId: 'spaceMirrorFacility',
        type: 'booleanFlag',
        flagId: 'advancedOversight',
        value: true,
        effectId: 'solisAdvancedOversight',
        sourceId: 'solisShop'
      });
    } else if (key === 'startingShips') {
      if (!shipsResource.unlocked) {
        if (shipsResource.enable) {
          shipsResource.enable();
        } else {
          shipsResource.unlocked = true;
        }
      }
    } else if (resources && resources.colony && resources.colony[key] &&
               typeof resources.colony[key].increase === 'function') {
      const amount = RESOURCE_UPGRADE_AMOUNTS[key] || 0;
      const res = resources.colony[key];
      if (typeof addEffect === 'function' && res.hasCap) {
        addEffect({
          target: 'resource',
          resourceType: 'colony',
          targetId: key,
          type: 'baseStorageBonus',
          value: up.purchases * amount,
          effectId: `solisStorage-${key}`,
          sourceId: 'solisShop'
        });
      }
      if (key === 'research') {
        res.increase(amount);
      }
    }
    return true;
  }

  applyResearchUpgrade() {
    const upgrade = this.shopUpgrades.researchUpgrade;
    if (!upgrade || upgrade.purchases <= 0) return;
    if (!researchManager || typeof researchManager.completeResearchInstant !== 'function') return;
    for (let i = 0; i < upgrade.purchases && i < RESEARCH_UPGRADE_ORDER.length; i++) {
      researchManager.completeResearchInstant(RESEARCH_UPGRADE_ORDER[i]);
    }
  }

  donateArtifacts(count) {
    if (!resources || !resources.special || !resources.special.alienArtifact) return false;
    const res = resources.special.alienArtifact;
    if (res.value < count || count <= 0) return false;
    if (typeof res.decrease === 'function') {
      res.decrease(count);
    } else {
      res.value -= count;
    }
    this.solisPoints += count * 10 * this.getTerraformedWorldBonus();
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

    const rocketUpgrade = this.shopUpgrades.colonistRocket;
    if (rocketUpgrade && rocketUpgrade.purchases > 0 && typeof addEffect === 'function') {
      addEffect({
        target: 'project',
        targetId: 'import_colonists_1',
        type: 'increaseResourceGain',
        resourceCategory: 'colony',
        resourceId: 'colonists',
        value: rocketUpgrade.purchases,
        effectId: 'solisColonistRocket',
        sourceId: 'solisShop'
      });
    }

    const adv = this.shopUpgrades.advancedOversight;
    if (adv && adv.purchases > 0 && typeof addEffect === 'function') {
      addEffect({
        target: 'project',
        targetId: 'spaceMirrorFacility',
        type: 'booleanFlag',
        flagId: 'advancedOversight',
        value: true,
        effectId: 'solisAdvancedOversight',
        sourceId: 'solisShop'
      });
    }

    this.applyResearchUpgrade();

    const startingShipsUpgrade = this.shopUpgrades.startingShips;
    if (startingShipsUpgrade && startingShipsUpgrade.purchases > 0) {
      const ships = resources?.special?.spaceships;
      if (ships) {
        if (!ships.unlocked) {
          if (ships.enable) {
            ships.enable();
          } else {
            ships.unlocked = true;
          }
        }
        if (!globalGameIsLoadingFromSave) {
          if (ships.increase) {
            ships.increase(startingShipsUpgrade.purchases);
          } else {
            const currentValue = Number.isFinite(ships.value) ? ships.value : 0;
            ships.value = currentValue + startingShipsUpgrade.purchases;
          }
        }
      }
    }

    for (const key in RESOURCE_UPGRADE_AMOUNTS) {
      const upgrade = this.shopUpgrades[key];
      const res = resources && resources.colony && resources.colony[key];
      if (upgrade && upgrade.purchases > 0 && res && typeof res.increase === 'function') {
        const amount = RESOURCE_UPGRADE_AMOUNTS[key] * upgrade.purchases;
        if (typeof addEffect === 'function' && res.hasCap) {
          addEffect({
            target: 'resource',
            resourceType: 'colony',
            targetId: key,
            type: 'baseStorageBonus',
            value: amount,
            effectId: `solisStorage-${key}`,
            sourceId: 'solisShop'
          });
        }
        if (!globalGameIsLoadingFromSave) {
          res.increase(amount);
        }
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
      solisTabAlert: this.solisTabAlert,
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
    this.solisTabAlert = data.solisTabAlert || false;
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.shopUpgrades[k]) {
          this.shopUpgrades[k].purchases = data.upgrades[k];
        } else if (k === 'alienArtifactResearch' && this.shopUpgrades.researchUpgrade) {
          this.shopUpgrades.researchUpgrade.purchases = data.upgrades[k];
        }
      }
    }
  }

  enable() {
    this.enabled = true;
    if (typeof showSolisTab === 'function') {
      showSolisTab();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolisManager };
}
