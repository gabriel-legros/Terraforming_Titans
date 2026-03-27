function getAndroidHousingText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class AndroidHousing extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.automationCustomBasisOptions = (this.automationCustomBasisOptions || []).concat([
      {
        value: 'androidCount',
        label: getAndroidHousingText(
          'ui.buildings.automationBasis.androidCount',
          '% of androids'
        )
      }
    ]);
  }

  normalizeAutoBuildBasis() {
    if (this.autoBuildBasis === 'androidCapacityShare') {
      this.autoBuildBasis = 'androidCount';
    }
  }

  loadState(state = {}) {
    super.loadState(state);
    this.normalizeAutoBuildBasis();
  }

  getAndroidCapacityShareTarget(totalAndroidCapacity) {
    const perBuildingCapacity = this.getStorageAmount('colony', 'androids');
    if (perBuildingCapacity <= 0) {
      return 0;
    }

    const capacityBudget = Math.max(0, (this.autoBuildPercent || 0) * totalAndroidCapacity / 100);
    return Math.floor(capacityBudget / perBuildingCapacity);
  }

  getAndroidCountTarget(totalAndroidCount) {
    const perBuildingCapacity = this.getStorageAmount('colony', 'androids');
    if (perBuildingCapacity <= 0) {
      return 0;
    }

    const androidBudget = Math.max(0, (this.autoBuildPercent || 0) * totalAndroidCount / 100);
    return Math.floor(androidBudget / perBuildingCapacity);
  }

  getConsumptionRatio() {
    return this.getUsageProductivity(resources);
  }

  getUsageProductivity(resources) {
    const androidsResource = resources.colony.androids;
    const freeStorage = androidsResource.getEffectiveBaseStorageCap();
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
