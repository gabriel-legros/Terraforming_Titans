class Ecumenopolis extends Colony {
  getFreeAndroidStorage(resources) {
    const androidsResource = resources.colony.androids;
    const baseBonus = (androidsResource.activeEffects || [])
      .filter((effect) => effect.type === 'baseStorageBonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    return androidsResource.baseCap + baseBonus;
  }

  getAndroidHousingCapacity() {
    const androidHousing = buildings.androidHousing;
    const perBuilding = androidHousing.storage.colony.androids;
    return androidHousing.active * perBuilding * androidHousing.getEffectiveStorageMultiplier();
  }

  getEcumenopolisCapacity(resourceKey) {
    const perBuilding = this.storage.colony[resourceKey];
    return this.active * perBuilding * this.getEffectiveStorageMultiplier();
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      return;
    }

    const colonistCapacity = this.getEcumenopolisCapacity('colonists');
    const colonistRatio = colonistCapacity > 0
      ? resources.colony.colonists.value / colonistCapacity
      : 0;

    const freeAndroidStorage = this.getFreeAndroidStorage(resources);
    const androidHousingCapacity = this.getAndroidHousingCapacity();
    const androidsInEcumenopolis = Math.max(
      0,
      resources.colony.androids.value - freeAndroidStorage - androidHousingCapacity
    );
    const androidCapacity = this.getEcumenopolisCapacity('androids');
    const androidRatio = androidCapacity > 0 ? androidsInEcumenopolis / androidCapacity : 0;

    const targetProductivity = Math.max(0, Math.min(1, Math.max(colonistRatio, androidRatio)));

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
  module.exports = { Ecumenopolis };
} catch (error) {}
