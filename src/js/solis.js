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
    this.questCooldownRemaining = 0;
    this.refreshCooldownRemaining = 0;
    this.hasGeneratedQuest = false;
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
      terraformingMeasurements: { baseCost: 300, purchases: 0, max: 1 },
      advancedOversight: { baseCost: 1000, purchases: 0, max: 1 },
      researchUpgrade: { baseCost: 100, purchases: 0, max: RESEARCH_UPGRADE_ORDER.length },
      autoResearch: { baseCost: 1000, purchases: 0, max: 1, enabled: false },
      shipAssignment: { baseCost: 500, purchases: 0, max: 1, enabled: false },
      lifeAutomation: { baseCost: 750, purchases: 0, max: 1, enabled: false }
    };
  }

  isUpgradeEnabled(key) {
    const upgrade = this.shopUpgrades[key];
    if (!upgrade) {
      return false;
    }
    if (typeof upgrade.enabled === 'boolean') {
      return upgrade.enabled;
    }
    return true;
  }

  setUpgradeEnabled(key, enabled) {
    const upgrade = this.shopUpgrades[key];
    if (!upgrade) {
      return false;
    }
    upgrade.enabled = Boolean(enabled);
    return true;
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    if (effect.flagId === 'solisAutoResearch') {
      this.setUpgradeEnabled('autoResearch', !!effect.value);
    } else if (effect.flagId === 'solisShipAssignment') {
      this.setUpgradeEnabled('shipAssignment', !!effect.value);
    } else if (effect.flagId === 'solisLifeAutomation') {
      this.setUpgradeEnabled('lifeAutomation', !!effect.value);
    }
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
    this.lastQuestTime = 0;
    this.questCooldownRemaining = 0;
    this.refreshCooldownRemaining = 0;
    this.hasGeneratedQuest = true;
    return this.currentQuest;
  }

  refreshQuest() {
    if (this.questCooldownRemaining > 0) {
      return;
    }
    if (this.refreshCooldownRemaining > 0) {
      return;
    }
    this.generateQuest();
    this.refreshCooldownRemaining = this.refreshCooldown;
  }

  completeQuest() {
    if (!this.currentQuest) return false;
    const res = resources.colony[this.currentQuest.resource];
    if (!res || res.value < this.currentQuest.quantity) return false;
    res.decrease(this.currentQuest.quantity);
    this.solisPoints += this.getCurrentReward();
    this.currentQuest = null;
    this.lastQuestTime = 0;
    this.lastRefreshTime = 0;
    this.postCompletionCooldownUntil = 0;
    this.questCooldownRemaining = this.questInterval;
    this.refreshCooldownRemaining = this.refreshCooldown;
    this.hasGeneratedQuest = true;
    return true;
  }

  multiplyReward() {
    const baseQuantity = this.getBaseQuestQuantity();
    this.applyMultiplier(this.rewardMultiplier + 1, baseQuantity);
  }

  divideReward() {
    const baseQuantity = this.getBaseQuestQuantity();
    const nextMultiplier = Math.max(1, this.rewardMultiplier - 1);
    this.applyMultiplier(nextMultiplier, baseQuantity);
  }

  getBaseQuestQuantity() {
    if (!this.currentQuest) return 0;
    const factor = Math.pow(10, Math.max(0, this.rewardMultiplier - 1));
    return Math.ceil(this.currentQuest.quantity / factor);
  }

  applyMultiplier(multiplier, baseQuantity) {
    const qty = Math.max(0, baseQuantity);
    this.rewardMultiplier = Math.max(1, Math.floor(multiplier));
    if (this.currentQuest && qty > 0) {
      this.currentQuest.quantity = qty * Math.pow(10, this.rewardMultiplier - 1);
    }
  }

  setMinimumRewardMultiplier() {
    const baseQuantity = this.getBaseQuestQuantity();
    this.applyMultiplier(1, baseQuantity);
  }

  setMaximumAffordableRewardMultiplier() {
    const quest = this.currentQuest;
    if (!quest) {
      this.applyMultiplier(1, 0);
      return;
    }
    const baseQuantity = this.getBaseQuestQuantity();
    const available = resources?.colony?.[quest.resource]?.value ?? 0;
    if (baseQuantity <= 0 || available <= 0) {
      this.applyMultiplier(1, baseQuantity);
      return;
    }
    let multiplier = 1;
    let required = baseQuantity;
    while (required * 10 <= available) {
      multiplier += 1;
      required *= 10;
    }
    this.applyMultiplier(multiplier, baseQuantity);
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
    if (!this.isUpgradeEnabled(key)) return 0;
    return up.baseCost * (up.purchases + 1);
  }

  getUpgradeTotalCost(key, count) {
    const up = this.shopUpgrades[key];
    const purchaseCount = Math.max(1, Math.floor(count));
    const totalSteps = purchaseCount * (2 * up.purchases + purchaseCount + 1) / 2;
    return up.baseCost * totalSteps;
  }

  purchaseUpgrade(key) {
    const up = this.shopUpgrades[key];
    if (!up || !this.isUpgradeEnabled(key)) return false;
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
    } else if (key === 'terraformingMeasurements') {
      this.applyTerraformingMeasurementUpgrade();
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
    } else if (key === 'autoResearch' && typeof addEffect === 'function') {
      addEffect({
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'autoResearchEnabled',
        value: true,
        effectId: 'solisAutoResearch',
        sourceId: 'solisShop'
      });
    } else if (key === 'shipAssignment' && typeof addEffect === 'function') {
      addEffect({
        target: 'automationManager',
        type: 'enable',
        effectId: 'solisAutomationEnable',
        sourceId: 'solisShop'
      });
      addEffect({
        target: 'automationManager',
        type: 'booleanFlag',
        flagId: 'automationShipAssignment',
        value: true,
        effectId: 'solisAutomationShipAssignment',
        sourceId: 'solisShop'
      });
    } else if (key === 'lifeAutomation') {
      addEffect({
        target: 'automationManager',
        type: 'enable',
        effectId: 'solisAutomationEnable',
        sourceId: 'solisShop'
      });
      addEffect({
        target: 'automationManager',
        type: 'booleanFlag',
        flagId: 'automationLifeDesign',
        value: true,
        effectId: 'solisAutomationLifeDesign',
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

  purchaseUpgradeMultiple(key, count) {
    const purchaseCount = Math.max(1, Math.floor(count));
    let purchased = 0;
    for (let i = 0; i < purchaseCount; i += 1) {
      if (!this.purchaseUpgrade(key)) {
        break;
      }
      purchased += 1;
    }
    return purchased;
  }

  applyResearchUpgrade() {
    const upgrade = this.shopUpgrades.researchUpgrade;
    if (!upgrade || upgrade.purchases <= 0) return;
    if (!researchManager || typeof researchManager.completeResearchInstant !== 'function') return;
    for (let i = 0; i < upgrade.purchases && i < RESEARCH_UPGRADE_ORDER.length; i++) {
      researchManager.completeResearchInstant(RESEARCH_UPGRADE_ORDER[i]);
    }
  }

  applyTerraformingMeasurementUpgrade() {
    const upgrade = this.shopUpgrades.terraformingMeasurements;
    if (!upgrade || upgrade.purchases <= 0) {
      return;
    }
    if (!researchManager || typeof researchManager.completeResearchInstant !== 'function') {
      return;
    }
    researchManager.completeResearchInstant('terraforming_sensor');
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
    this.solisPoints += count * 50;
    return true;
  }

  reapplyEffects() {
    this.setUpgradeEnabled('autoResearch', this.isBooleanFlagSet('solisAutoResearch'));
    this.setUpgradeEnabled('shipAssignment', this.isBooleanFlagSet('solisShipAssignment'));
    this.setUpgradeEnabled('lifeAutomation', this.isBooleanFlagSet('solisLifeAutomation'));

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
    this.applyTerraformingMeasurementUpgrade();

    const autoResearchUpgrade = this.shopUpgrades.autoResearch;
    if (autoResearchUpgrade && autoResearchUpgrade.purchases > 0 && typeof addEffect === 'function') {
      addEffect({
        target: 'researchManager',
        type: 'booleanFlag',
        flagId: 'autoResearchEnabled',
        value: true,
        effectId: 'solisAutoResearch',
        sourceId: 'solisShop'
      });
    }
    const shipAssignmentUpgrade = this.shopUpgrades.shipAssignment;
    if (shipAssignmentUpgrade && shipAssignmentUpgrade.purchases > 0 && typeof addEffect === 'function') {
      addEffect({
        target: 'automationManager',
        type: 'enable',
        effectId: 'solisAutomationEnable',
        sourceId: 'solisShop'
      });
      addEffect({
        target: 'automationManager',
        type: 'booleanFlag',
        flagId: 'automationShipAssignment',
        value: true,
        effectId: 'solisAutomationShipAssignment',
        sourceId: 'solisShop'
      });
    }
    const lifeAutomationUpgrade = this.shopUpgrades.lifeAutomation;
    if (lifeAutomationUpgrade.purchases > 0) {
      addEffect({
        target: 'automationManager',
        type: 'enable',
        effectId: 'solisAutomationEnable',
        sourceId: 'solisShop'
      });
      addEffect({
        target: 'automationManager',
        type: 'booleanFlag',
        flagId: 'automationLifeDesign',
        value: true,
        effectId: 'solisAutomationLifeDesign',
        sourceId: 'solisShop'
      });
    }

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
    const elapsed = Math.max(0, delta);
    if (this.questCooldownRemaining > 0) {
      this.questCooldownRemaining = Math.max(0, this.questCooldownRemaining - elapsed);
    }
    if (this.refreshCooldownRemaining > 0) {
      this.refreshCooldownRemaining = Math.max(0, this.refreshCooldownRemaining - elapsed);
    }
    if (!this.currentQuest) {
      if (!this.hasGeneratedQuest) {
        this.generateQuest();
      } else if (this.questCooldownRemaining <= 0) {
        this.generateQuest();
      }
    }
  }

  saveState() {
    const now = Date.now();
    return {
      solisPoints: this.solisPoints,
      rewardMultiplier: this.rewardMultiplier,
      currentQuest: this.currentQuest,
      lastQuestTime: this.hasGeneratedQuest ? now : 0,
      lastRefreshTime: now - (this.refreshCooldown - this.refreshCooldownRemaining),
      postCompletionCooldownUntil: this.questCooldownRemaining > 0 ? now + this.questCooldownRemaining : 0,
      questCooldownRemaining: this.questCooldownRemaining,
      refreshCooldownRemaining: this.refreshCooldownRemaining,
      hasGeneratedQuest: this.hasGeneratedQuest,
      solisTabAlert: this.solisTabAlert,
      upgrades: Object.keys(this.shopUpgrades).reduce((o, k) => {
        o[k] = this.shopUpgrades[k].purchases;
        return o;
      }, {}),
      enabledUpgrades: Object.keys(this.shopUpgrades).reduce((o, k) => {
        const upgrade = this.shopUpgrades[k];
        if (typeof upgrade.enabled === 'boolean') {
          o[k] = upgrade.enabled;
        }
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
    this.questCooldownRemaining = data.questCooldownRemaining || 0;
    this.refreshCooldownRemaining = data.refreshCooldownRemaining || 0;
    this.hasGeneratedQuest = data.hasGeneratedQuest || false;
    this.solisTabAlert = data.solisTabAlert || false;
    const legacyNow = Date.now();
    const legacyCooldownUntil = data.postCompletionCooldownUntil || 0;
    const legacyCooldownRemaining = legacyCooldownUntil - legacyNow;
    if (legacyCooldownUntil > this.questInterval * 5 && legacyCooldownRemaining > this.questCooldownRemaining) {
      this.questCooldownRemaining = legacyCooldownRemaining;
    }
    const legacyRefreshTime = data.lastRefreshTime || 0;
    const legacyRefreshRemaining = legacyRefreshTime + this.refreshCooldown - legacyNow;
    if (legacyRefreshTime > this.refreshCooldown * 5 && legacyRefreshRemaining > this.refreshCooldownRemaining) {
      this.refreshCooldownRemaining = legacyRefreshRemaining;
    }
    if (data.lastQuestTime > 0 || this.currentQuest || this.questCooldownRemaining > 0) {
      this.hasGeneratedQuest = true;
    }
    this.questCooldownRemaining = Math.max(0, this.questCooldownRemaining);
    this.refreshCooldownRemaining = Math.max(0, this.refreshCooldownRemaining);
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.shopUpgrades[k]) {
          this.shopUpgrades[k].purchases = data.upgrades[k];
        } else if (k === 'alienArtifactResearch' && this.shopUpgrades.researchUpgrade) {
          this.shopUpgrades.researchUpgrade.purchases = data.upgrades[k];
        }
      }
    }
    if (data.enabledUpgrades) {
      for (const key in data.enabledUpgrades) {
        if (this.shopUpgrades[key]) {
          this.shopUpgrades[key].enabled = Boolean(data.enabledUpgrades[key]);
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
