class FusionPowerPlant extends Building {
  getNextTierName() {
    return 'superalloyFusionReactor';
  }

  getUpgradeCost(upgradeCount = 1) {
    const nextName = this.getNextTierName();
    const next = buildings[nextName];
    const nextCost = next.getEffectiveCost(1);
    const cost = {};

    for (const category in nextCost) {
      for (const resource in nextCost[category]) {
        const baseAmount = nextCost[category][resource] * upgradeCount;
        const value = resource === 'superalloys' ? baseAmount : 0;
        if (value <= 0) continue;
        if (!cost[category]) cost[category] = {};
        cost[category][resource] = value;
      }
    }

    return cost;
  }

  canAffordUpgrade(upgradeCount = 1) {
    const maxUpgrades = Math.floor(this.count / 10);
    if (maxUpgrades <= 0 || upgradeCount > maxUpgrades) return false;
    const cost = this.getUpgradeCost(upgradeCount);

    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resources[category][resource].value < cost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  upgrade(upgradeCount = 1) {
    const nextName = this.getNextTierName();
    const next = buildings[nextName];
    if (!next.unlocked) return false;
    if (!this.canAffordUpgrade(upgradeCount)) return false;
    const cost = this.getUpgradeCost(upgradeCount);
    const amount = upgradeCount * 10;
    const activeToRemove = Math.min(amount, this.active);

    for (const category in cost) {
      for (const resource in cost[category]) {
        resources[category][resource].decrease(cost[category][resource]);
      }
    }

    this.count -= amount;
    this.active -= activeToRemove;
    if (this.active < 0) this.active = 0;
    this.updateResourceStorage();

    next.count += upgradeCount;
    next.active += upgradeCount;
    next.updateResourceStorage();
    return true;
  }
}

try {
  registerBuildingConstructor('fusionPowerPlant', FusionPowerPlant);
} catch (error) {}

try {
  module.exports = { FusionPowerPlant };
} catch (error) {}
