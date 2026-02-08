class AndroidHousing extends Building {
  getConsumptionRatio() {
    return this.getUsageProductivity(resources);
  }

  getUsageProductivity(resources) {
    const androidsResource = resources.colony.androids;
    const baseBonus = (androidsResource.activeEffects || [])
      .filter((effect) => effect.type === 'baseStorageBonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    const freeStorage = androidsResource.baseCap + baseBonus;
    const usedStorage = Math.max(0, androidsResource.value - freeStorage);
    const perBuilding = this.storage.colony.androids;
    const capacity = this.active * perBuilding * this.getEffectiveStorageMultiplier();
    const rawProductivity = capacity > 0 ? usedStorage / capacity : 0;

    return Math.max(0, Math.min(1, rawProductivity));
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);
    const targetProductivity = this.getUsageProductivity(resources);

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      return;
    }

    if (this.snapProductivity) {
      this.productivity = targetProductivity;
      this.displayProductivity = targetProductivity;
      return;
    }

    this.productivity = this.applyProductivityDamping(this.productivity, targetProductivity);
    this.displayProductivity = this.applyProductivityDamping(
      this.displayProductivity,
      targetProductivity
    );
  }
}

try {
  registerBuildingConstructor('androidHousing', AndroidHousing);
} catch (error) {}

try {
  module.exports = { AndroidHousing };
} catch (error) {}
