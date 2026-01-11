class Biodome extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.baseBiomassRate = this.production.surface.biomass;
    this.baseEnergyConsumption = this.consumption.colony.energy;
    this.workerProductivity = 1;
    this.refreshMetabolismRates();
  }

  refreshMetabolismRates() {
    const process = getActiveLifeMetabolismProcess();
    const perBiomass = process.growth.perBiomass;
    const baseBiomass = this.baseBiomassRate;
    const consumption = {
      colony: {
        energy: this.baseEnergyConsumption,
      },
    };
    const production = {
      surface: {
        biomass: baseBiomass,
      },
    };

    this.applyMetabolismMap(perBiomass.surface, 'surface', consumption, production);
    this.applyMetabolismMap(perBiomass.atmospheric, 'atmospheric', consumption, production);

    this.consumption = consumption;
    this.production = production;
  }

  applyMetabolismMap(map, category, consumption, production) {
    for (const [resourceKey, value] of Object.entries(map)) {
      if (resourceKey === 'biomass') {
        continue;
      }

      const { category: targetCategory, resource: targetResource } =
        this.resolveMetabolismTarget(category, resourceKey);
      const amount = Math.abs(value) * this.baseBiomassRate;

      if (value < 0) {
        const bucket = consumption[targetCategory] ?? (consumption[targetCategory] = {});
        bucket[targetResource] = amount;
        continue;
      }

      if (value > 0) {
        const bucket = production[targetCategory] ?? (production[targetCategory] = {});
        bucket[targetResource] = amount;
      }
    }
  }

  resolveMetabolismTarget(category, resourceKey) {
    if (category === 'surface' && resourceKey === 'liquidWater') {
      return { category: 'colony', resource: 'water' };
    }
    return { category, resource: resourceKey };
  }

  updateWorkerProductivity() {
    if (this.active === 0) {
      this.workerProductivity = 0;
      return;
    }
    if (this.getTotalWorkerNeed() <= 0) {
      this.workerProductivity = 1;
      return;
    }
    this.workerProductivity = Math.max(
      0,
      Math.min(1, populationModule.getWorkerAvailabilityRatio(this.workerPriority))
    );
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);
    this.refreshMetabolismRates();
    this.updateWorkerProductivity();

    if (!lifeDesigner.currentDesign.canSurviveAnywhere()) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }
    super.updateProductivity(resources, deltaTime);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Biodome };
} else {
  window.Biodome = Biodome;
}
