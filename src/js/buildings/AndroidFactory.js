class AndroidFactory extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.automationCustomBasisOptions = (this.automationCustomBasisOptions || []).concat([
      {
        value: 'androidCapacity',
        label: '% android capacity'
      }
    ]);
  }

  getAutoBuildBase(population, workerCap, collection) {
    if (this.autoBuildBasis === 'androidCapacity') {
      return Math.max(0, resources.colony.androids.cap || 0);
    }

    return super.getAutoBuildBase(population, workerCap, collection);
  }
}

try {
  registerBuildingConstructor('androidFactory', AndroidFactory);
} catch (error) {}

try {
  module.exports = { AndroidFactory };
} catch (error) {}
