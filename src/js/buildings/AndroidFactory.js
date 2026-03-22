function getAndroidFactoryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class AndroidFactory extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.automationCustomBasisOptions = (this.automationCustomBasisOptions || []).concat([
      {
        value: 'androidCapacity',
        label: getAndroidFactoryText(
          'ui.buildings.automationBasis.androidCapacity',
          '% android capacity'
        )
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
