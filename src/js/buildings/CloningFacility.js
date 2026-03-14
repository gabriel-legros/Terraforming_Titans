class CloningFacility extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.automationCustomBasisOptions = (this.automationCustomBasisOptions || []).concat([
      {
        value: 'colonistCapacity',
        label: '% colonist capacity'
      }
    ]);
  }

  getAutoBuildBase(population, workerCap, collection) {
    if (this.autoBuildBasis === 'colonistCapacity') {
      return Math.max(0, resources.colony.colonists.cap || 0);
    }

    return super.getAutoBuildBase(population, workerCap, collection);
  }
}

try {
  registerBuildingConstructor('cloningFacility', CloningFacility);
} catch (error) {}

try {
  module.exports = { CloningFacility };
} catch (error) {}
