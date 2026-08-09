class Ecumenopolis extends Colony {
  getEcumenopolisColonistFillRatio() {
    const colonistCapacity = this.getEcumenopolisCapacity('colonists');
    const colonistRatio = colonistCapacity > 0
      ? resources.colony.colonists.value / colonistCapacity
      : 0;
    return Math.max(0, Math.min(1, colonistRatio));
  }

  getEcumenopolisOccupancyRatio() {
    const colonistRatio = this.getEcumenopolisColonistFillRatio();
    const freeAndroidStorage = this.getFreeAndroidStorage(resources);
    const androidHousingCapacity = this.getAndroidHousingCapacity();
    const androidsInEcumenopolis = Math.max(
      0,
      resources.colony.androids.value - freeAndroidStorage - androidHousingCapacity
    );
    const androidCapacity = this.getEcumenopolisCapacity('androids');
    const androidRatio = androidCapacity > 0 ? androidsInEcumenopolis / androidCapacity : 0;

    return Math.max(0, Math.min(1, Math.max(colonistRatio, androidRatio)));
  }

  getConsumptionRatioForResource(category, resource) {
    const consumptionRatio = this.getEcumenopolisOccupancyRatio();
    if (category === 'colony' && (resource === 'food' || resource === 'electronics' || resource === 'androids')) {
      return Math.min(consumptionRatio, super.getConsumptionRatio());
    }
    return consumptionRatio;
  }

  getFreeAndroidStorage(resources) {
    const androidsResource = resources.colony.androids;
    return androidsResource.getEffectiveBaseStorageCap();
  }

  getAndroidHousingCapacity() {
    const androidHousing = buildings.androidHousing;
    const perBuilding = androidHousing.storage.colony.androids;
    return androidHousing.activeNumber * perBuilding * androidHousing.getEffectiveStorageMultiplier();
  }

  getEcumenopolisCapacity(resourceKey) {
    const perBuilding = this.storage.colony[resourceKey];
    return this.activeNumber * perBuilding * this.getEffectiveStorageMultiplier();
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(this.active === 0n ? 0 : 1);
    super.updateProductivity(resources, deltaTime);
  }
}

try {
  registerColonyConstructor(Ecumenopolis);
} catch (error) {}

try {
  module.exports = { Ecumenopolis };
} catch (error) {}
