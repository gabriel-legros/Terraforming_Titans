class FusionPowerPlant extends MultiRecipesBuilding {
  getNextTierName() {
    return 'superalloyFusionReactor';
  }

  getUpgradeCost(upgradeCount = 1) {
    const upgradeCountBigInt = normalizeBuildingCount(upgradeCount);
    const upgradeCountNumber = Number(upgradeCountBigInt);
    const nextName = this.getNextTierName();
    const next = buildings[nextName];
    const nextCost = next.getEffectiveCost(1);
    const cost = {};

    for (const category in nextCost) {
      for (const resource in nextCost[category]) {
        const baseAmount = nextCost[category][resource] * upgradeCountNumber;
        const value = resource === 'superalloys' ? baseAmount : 0;
        if (value <= 0) continue;
        if (!cost[category]) cost[category] = {};
        cost[category][resource] = value;
      }
    }

    return cost;
  }

  canAffordUpgrade(upgradeCount = 1, reservePercent = 0, additionalReserves = null) {
    const upgradeCountBigInt = normalizeBuildingCount(upgradeCount);
    const maxUpgrades = this.count / 10n;
    if (maxUpgrades <= 0n || upgradeCountBigInt > maxUpgrades) return false;
    const cost = this.getUpgradeCost(upgradeCount);

    for (const category in cost) {
      for (const resource in cost[category]) {
        const resObj = resources[category][resource];
        const cap = resObj.cap || 0;
        const resourceReservePercent = this.getStrategicReservePercentForResource(reservePercent, category, resource);
        const strategicReserve = Number.isFinite(cap) ? (resourceReservePercent / 100) * cap : 0;
        const prioritizedReserve = additionalReserves?.[category]?.[resource] || 0;
        if (resObj.value - strategicReserve - prioritizedReserve < cost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  upgrade(upgradeCount = 1, reservePercent = 0, additionalReserves = null) {
    const nextName = this.getNextTierName();
    const next = buildings[nextName];
    if (!next.unlocked) return false;
    if (!this.canAffordUpgrade(upgradeCount, reservePercent, additionalReserves)) return false;
    const cost = this.getUpgradeCost(upgradeCount);
    const upgradeCountBigInt = normalizeBuildingCount(upgradeCount);
    const amount = upgradeCountBigInt * 10n;
    const activeToRemove = this.active < amount ? this.active : amount;

    for (const category in cost) {
      for (const resource in cost[category]) {
        resources[category][resource].decrease(cost[category][resource]);
      }
    }

    this.count -= amount;
    this.active -= activeToRemove;
    if (this.active < 0n) this.active = 0n;
    this.updateResourceStorage();

    next.count += upgradeCountBigInt;
    next.active += upgradeCountBigInt;
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
