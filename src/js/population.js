const BIOWORKER_MAX_BIOMASS_DENSITY = 10000;

class PopulationModule extends EffectableEntity {
    constructor(resources, populationParameters) {
      super({config : 'population module'})

      this.populationResource = resources.colony.colonists; // Reference to the population resource
      this.workerResource = resources.colony.workers; // Reference to the worker resource
      this.baseWorkerRatio = populationParameters.workerRatio;
      this.workerRatio = this.baseWorkerRatio; // Current ratio of colonists that become workers
      this.growthRate = 0; // Population growth rate, e.g., 0.01 for 1% per second
      this.totalWorkersRequired = 0;
      this.totalWorkersRequiredHigh = 0;
      this.totalWorkersRequiredNormal = 0;
      this.totalWorkersRequiredLow = 0;
      this.lastGrowthPerSecond = 0; // Tracks actual population change per second
      this.starvationShortage = 0;
      this.energyShortage = 0;
      this.componentsCoverage = 1;
      this.starvationDecayRate = 0;
      this.energyDecayRate = 0;
      this.gravityDecayRate = 0;
      this.overpopulationDecayRate = 0;
      this.gravityMitigation = 0;
      this.currentWorldOverpopulationLossTotal = 0;
      this.currentWorldPeakPopulation = 0;
      this.lastNaturalGrowthPerSecond = 0;
      this.lastImmigrationPerSecond = 0;
    }

  getEffectiveGrowthMultiplier(){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'growthMultiplier') {
        multiplier *= effect.value;
      }
    });
    if (isManagerEffectivelyEnabled(followersManager, 'followersManager')) {
      multiplier *= (1 + followersManager.getPilgrimGrowthBonus());
    }
    return multiplier;
  }

  getEffectiveWorkerRatio(){
    let ratio = this.baseWorkerRatio;
    this.activeEffects.forEach(effect => {
      if(effect.type === 'workerRatio'){
        ratio = effect.value;
      }
    });
    return ratio;
  }

  getWorkerEfficiencyMultipliers() {
    let zealMultiplier = 1;
    let artMultiplier = 1;
    let resortMultiplier = 1;
    let colonistMultiplier = 1;
    this.activeEffects.forEach(effect => {
      if (effect.type !== 'colonistWorkerEfficiencyMultiplier') {
        return;
      }
      const multiplier = effect.value;
      colonistMultiplier *= multiplier;
      if (effect.effectId === 'followers-zeal-worker-efficiency') {
        zealMultiplier = multiplier;
      } else if (effect.effectId === 'followers-art-worker-efficiency') {
        artMultiplier = multiplier;
      } else if (effect.effectId === 'resort-vacation-worker-efficiency') {
        resortMultiplier = multiplier;
      }
    });
    return {
      zealMultiplier,
      artMultiplier,
      resortMultiplier,
      colonistMultiplier
    };
  }

  getAndroidWorkerState(enforceAssignmentCap = false) {
    const storedAndroids = resources.colony.androids.value;
    const androidCap = resources.colony.androids.cap;
    const effectiveAndroids = Math.min(storedAndroids, androidCap);

    let assignedAndroids = projectManager.getAssignedAndroids();
    if (enforceAssignmentCap && assignedAndroids > effectiveAndroids) {
      const toUnassign = Math.ceil(assignedAndroids - effectiveAndroids);
      projectManager.forceUnassignAndroids(toUnassign);
      assignedAndroids = projectManager.getAssignedAndroids();
    }

    return {
      effectiveAndroids,
      assignedAndroids,
      availableAndroids: Math.max(0, effectiveAndroids - assignedAndroids)
    };
  }

  getWorkerCapacityBreakdown(enforceAssignmentCap = false) {
    const ratio = this.getEffectiveWorkerRatio();
    const multipliers = this.getWorkerEfficiencyMultipliers();
    const androidState = this.getAndroidWorkerState(enforceAssignmentCap);
    const bioworkers = this.getBioworkerContribution();
    const keratiHiveWorkers = this.getKeratiHiveWorkerContribution();
    const colonistWorkers = Math.floor(
      ratio * this.populationResource.value * multipliers.colonistMultiplier
    );
    const uncappedTotalWorkers =
      colonistWorkers +
      androidState.availableAndroids +
      bioworkers +
      keratiHiveWorkers;
    const aerostat = colonies?.aerostat_colony || null;
    const aerostatWorkerCapEnabled =
      !!(aerostat && aerostat.shouldCapWorkersToAerostatCapacity());
    const aerostatWorkerCap = aerostatWorkerCapEnabled
      ? Math.max(0, aerostat.getWorkerCapacityCap())
      : null;
    const totalWorkers = aerostatWorkerCapEnabled
      ? Math.min(uncappedTotalWorkers, aerostatWorkerCap)
      : uncappedTotalWorkers;
    return {
      ratio,
      zealMultiplier: multipliers.zealMultiplier,
      artMultiplier: multipliers.artMultiplier,
      colonistMultiplier: multipliers.colonistMultiplier,
      colonistWorkers,
      androidWorkers: androidState.availableAndroids,
      bioworkers,
      keratiHiveWorkers,
      uncappedTotalWorkers,
      aerostatWorkerCapEnabled,
      aerostatWorkerCap,
      aerostatWorkerCapApplied:
        aerostatWorkerCapEnabled && totalWorkers < uncappedTotalWorkers,
      totalWorkers
    };
  }

  getCurrentGrowthPerSecond(){
    return this.lastGrowthPerSecond;
  }

  getCurrentGrowthPercent(){
    const currentPopulation = this.populationResource.value;
    if(currentPopulation === 0) return 0;
    return (this.lastGrowthPerSecond / currentPopulation) * 100;
  }

  getWeightedNeedFulfillment(needKey) {
    let weightedFulfillment = 0;
    let totalCapacity = 0;

    for (const colonyName in colonies) {
      const colony = colonies[colonyName];
      const capacity = colony.getStorageContribution('colony', 'colonists');
      if (capacity <= 0) {
        continue;
      }

      const filledNeeds = colony.filledNeeds || {};
      const fulfillment = filledNeeds[needKey] ?? 0;

      weightedFulfillment += fulfillment * capacity;
      totalCapacity += capacity;
    }

    if (totalCapacity === 0) {
      return this.populationResource.value > 0 ? 0 : 1;
    }

    const averageFulfillment = weightedFulfillment / totalCapacity;
    return Math.min(1, Math.max(0, averageFulfillment));
  }

  calculateCapacityFactor(population, populationCap) {
    if (populationCap <= 0) {
      return 0;
    }
    const ratio = population / populationCap;
    if (ratio >= 1) {
      return 0;
    }
    return 1 - ratio;
  }

  getImmigrationBaseRateSplit(baseGrowthRate) {
    const threshold = spaceManager.galacticPopulationGrowthRate;
    if (
      !gameSettings.immigrationPool ||
      spaceManager.currentPlanetKey === 'mars' ||
      baseGrowthRate <= threshold
    ) {
      return {
        naturalBaseRate: baseGrowthRate,
        immigrationBaseRate: 0
      };
    }

    return {
      naturalBaseRate: threshold,
      immigrationBaseRate: baseGrowthRate - threshold
    };
  }

  calculateImmigrationForTick(potentialImmigration, currentPopulation, populationCap) {
    if (!(potentialImmigration > 0) || !(populationCap > 0)) {
      return 0;
    }

    const galacticPopulation = Math.max(0, spaceManager.galacticPopulation || 0);
    const galacticCapacity = Math.max(0, spaceManager.galacticPopulationCapacity || 0);
    if (!(galacticPopulation > 0) || !(galacticCapacity > 0)) {
      return 0;
    }

    const worldFill = currentPopulation / populationCap;
    const galacticFill = galacticPopulation / galacticCapacity;
    if (worldFill >= galacticFill) {
      return 0;
    }

    const equalizingImmigration =
      (populationCap * galacticPopulation - galacticCapacity * currentPopulation) /
      (populationCap + galacticCapacity);
    return Math.max(0, Math.min(potentialImmigration, galacticPopulation, equalizingImmigration));
  }
  
    calculateGrowthRate() {
      let totalWeightedHappiness = 0;
      let totalCapacity = 0;
      let growthRateDivider = 300;
    
      // Iterate through all colonies and sum their weighted happiness based on capacity
      for (const colonyName in colonies) {
        const colony = colonies[colonyName];
        const capacity = colony.getStorageContribution('colony', 'colonists');

        // Only consider colonies with a valid capacity
        if (capacity > 0) {
          totalWeightedHappiness += colony.happiness * capacity;
          totalCapacity += capacity;
        }
      }
    
      // Calculate the weighted average happiness
      const weightedAverageHappiness = totalCapacity > 0 ? totalWeightedHappiness / totalCapacity : 0;
    
      // Calculate growth rate by subtracting 0.5 from the weighted average happiness
      const growthRate = (weightedAverageHappiness - 0.5) / growthRateDivider;
    
      return growthRate;
    }
  
    updatePopulation(deltaTime) {
      // Get the current population and population cap
      let currentPopulation = this.populationResource.value;
      const populationCap = this.populationResource.cap;
      this.currentWorldPeakPopulation = Math.max(this.currentWorldPeakPopulation, currentPopulation);

      // Crop tiny overages to the cap to avoid unnecessary decay
      if (
        currentPopulation > populationCap &&
        currentPopulation - populationCap < 0.01
      ) {
        this.populationResource.value = populationCap;
        currentPopulation = populationCap;
      }

      this.growthRate = Math.max(0, this.calculateGrowthRate());
      const seconds = deltaTime > 0 ? deltaTime / 1000 : 0;

      // Calculate logistic growth/decay
      const growthMultiplier = this.getEffectiveGrowthMultiplier();
      const capacityFactor = this.calculateCapacityFactor(currentPopulation, populationCap);
      const baseGrowthRate = Math.max(0, this.growthRate);
      const growthSplit = this.getImmigrationBaseRateSplit(baseGrowthRate);
      const naturalGrowthPerSecond =
        growthSplit.naturalBaseRate * currentPopulation * capacityFactor * growthMultiplier;
      const potentialImmigrationPerSecond =
        growthSplit.immigrationBaseRate * currentPopulation * capacityFactor * growthMultiplier;
      const potentialImmigration = potentialImmigrationPerSecond * seconds;
      const immigration = this.calculateImmigrationForTick(
        potentialImmigration,
        currentPopulation,
        populationCap
      );
      const immigrationPerSecond = seconds > 0 ? immigration / seconds : 0;
      const growthPerSecond = naturalGrowthPerSecond + immigrationPerSecond;
      this.lastNaturalGrowthPerSecond = naturalGrowthPerSecond;
      this.lastImmigrationPerSecond = immigrationPerSecond;

      // Calculate decay from shortages
      const starvationCoverage = this.getWeightedNeedFulfillment('food');
      const energyCoverage = this.getWeightedNeedFulfillment('energy');
      const componentsCoverage = this.getWeightedNeedFulfillment('components');

      this.starvationShortage = 1 - starvationCoverage;
      this.energyShortage = 1 - energyCoverage;
      this.componentsCoverage = componentsCoverage;

      const colonistDecayDisabled = gameSettings.disableColonistDecay;
      this.starvationDecayRate = colonistDecayDisabled ? 0 : this.starvationShortage / 360;
      this.energyDecayRate = colonistDecayDisabled ? 0 : this.energyShortage / 90;

      const starvationDecayPerSecond = this.starvationDecayRate * currentPopulation;
      const energyDecayPerSecond = this.energyDecayRate * currentPopulation;

      const gravityValue = terraforming?.celestialParameters?.gravity ?? 0;
      const gravityExcess = Math.max(0, gravityValue - 20);
      const gravityRatePerSecond = gravityExcess === 0 ? 0 : (0.0001 * gravityExcess);
      const mechanicalAssistance = colonySliderSettings.getEffectiveMechanicalAssistance();
      const adaptationMitigation = this.isBooleanFlagSet?.('highGravityAdaptation') ? 0.5 : 0;
      const sliderMitigation = Math.min(0.5, mechanicalAssistance * componentsCoverage * 0.25);
      const totalMitigation = Math.min(1, adaptationMitigation + sliderMitigation);
      this.gravityMitigation = totalMitigation;
      this.gravityDecayRate = colonistDecayDisabled ? 0 : gravityRatePerSecond * (1 - totalMitigation);
      const gravityDecayPerSecond = this.gravityDecayRate * currentPopulation;

      let overpopulationDecayPerSecond = 0;
      if (!colonistDecayDisabled && currentPopulation > populationCap) {
        const populationExcess = currentPopulation - populationCap;
        overpopulationDecayPerSecond = populationExcess * 0.01;
      }
      this.currentWorldOverpopulationLossTotal = Math.max(0, this.currentWorldPeakPopulation - currentPopulation);
      this.overpopulationDecayRate = currentPopulation > 0 ? overpopulationDecayPerSecond / currentPopulation : 0;

      const totalDecayPerSecond =
        starvationDecayPerSecond + energyDecayPerSecond + gravityDecayPerSecond + overpopulationDecayPerSecond;
      const netPerSecond = growthPerSecond - totalDecayPerSecond;

      this.lastGrowthPerSecond = netPerSecond;
      const populationChange = netPerSecond * seconds;

      if (growthPerSecond > 0) {
        if (naturalGrowthPerSecond > 0) {
          this.populationResource.modifyRate(
            naturalGrowthPerSecond,
            getLocalizedRateSource('population:naturalGrowth', 'ui.colony.growthRate.naturalGrowth', 'Natural growth'),
            'population'
          );
        }
        if (immigrationPerSecond > 0) {
          this.populationResource.modifyRate(
            immigrationPerSecond,
            getLocalizedRateSource('population:immigration', 'ui.colony.growthRate.immigration', 'Immigration'),
            'population'
          );
        }
      }
      if (starvationDecayPerSecond > 0) {
        this.populationResource.modifyRate(
          -starvationDecayPerSecond,
          getLocalizedRateSource('population:starvation', 'ui.resourceRates.sources.starvation', 'Starvation'),
          'population'
        );
      }
      if (energyDecayPerSecond > 0) {
        this.populationResource.modifyRate(
          -energyDecayPerSecond,
          getLocalizedRateSource('population:energyShortage', 'ui.resourceRates.sources.energyShortage', 'Energy Shortage'),
          'population'
        );
      }
      if (gravityDecayPerSecond > 0) {
        this.populationResource.modifyRate(
          -gravityDecayPerSecond,
          getLocalizedRateSource('population:gravityStrain', 'ui.resourceRates.sources.gravityStrain', 'Gravity Strain'),
          'population'
        );
      }
      if (overpopulationDecayPerSecond > 0) {
        this.populationResource.modifyRate(
          -overpopulationDecayPerSecond,
          getLocalizedRateSource('population:overpopulation', 'ui.resourceRates.sources.overpopulation', 'Overpopulation'),
          'population'
        );
      }

      // Apply the population change and update production/consumption rates
      if (populationChange > 0) {
        this.populationResource.increase(populationChange);
      } else if (populationChange < 0) {
        this.populationResource.decrease(-populationChange);
      }
      if (immigration > 0) {
        resources.special.galacticPopulation.modifyRate(
          -immigrationPerSecond,
          getLocalizedRateSource('population:galacticImmigration', 'ui.resourceRates.sources.galacticImmigration', 'Immigration'),
          'population'
        );
        spaceManager.withdrawGalacticPopulation(immigration);
      }

      currentPopulation = this.populationResource.value;
      this.currentWorldPeakPopulation = Math.max(this.currentWorldPeakPopulation, currentPopulation);
      this.currentWorldOverpopulationLossTotal = Math.max(0, this.currentWorldPeakPopulation - currentPopulation);

      if(currentPopulation < 1)
      {
        this.populationResource.value = 0;
      }
    // Update worker requirements based on active buildings
    this.updateWorkerRequirements();

    // Update worker cap based on current population and worker ratio
    this.updateWorkerCap();

    this.workerResource.value = this.workerResource.cap - this.totalWorkersRequired;
  }

  updateWorkerCap() {
    const breakdown = this.getWorkerCapacityBreakdown(true);
    const workerCap = breakdown.totalWorkers;
    const workerPotential = breakdown.uncappedTotalWorkers;
    this.workerResource.cap = workerCap;
    this.workerResource.potential = workerPotential;

    // Adjust the worker value if it exceeds the cap
    if (this.workerResource.value > workerCap) {
      this.workerResource.value = workerCap;
    }

  }

  getWorkerRequirementBreakdown() {
    const totals = { high: 0, normal: 0, low: 0 };

    // Calculate total workers required based on active buildings
    for (const buildingName in buildings) {
      const building = buildings[buildingName];
      if (building.active > 0n && building.getTotalWorkerNeed() > 0) {
        const req = building.activeNumber * (building.getTotalWorkerNeed()) * building.getEffectiveWorkerMultiplier();
        const level = building.workerPriority > 0 ? 'high' : building.workerPriority < 0 ? 'low' : 'normal';
        totals[level] += req;
      }
    }

    let hazardWorkerRequirements = null;
    try {
      hazardWorkerRequirements = hazardManager?.getAdditionalWorkerRequirements?.();
    } catch (error) {
      hazardWorkerRequirements = null;
    }

    if (hazardWorkerRequirements) {
      const high = Math.max(0, hazardWorkerRequirements.high || 0);
      const normal = Math.max(0, hazardWorkerRequirements.normal || 0);
      const low = Math.max(0, hazardWorkerRequirements.low || 0);
      totals.high += high;
      totals.normal += normal;
      totals.low += low;
    }

    return {
      high: totals.high,
      normal: totals.normal,
      low: totals.low,
      total: totals.high + totals.normal + totals.low,
    };
  }

  updateWorkerRequirements() {
    const totals = this.getWorkerRequirementBreakdown();
    this.totalWorkersRequired = totals.total;
    this.totalWorkersRequiredHigh = totals.high;
    this.totalWorkersRequiredNormal = totals.normal;
    this.totalWorkersRequiredLow = totals.low;
  }

  getWorkerAvailabilityRatios(workerCap = this.workerResource.cap, requirements = null) {
    const totals = requirements || {
      high: this.totalWorkersRequiredHigh,
      normal: this.totalWorkersRequiredNormal,
      low: this.totalWorkersRequiredLow,
    };
    let remaining = Math.max(0, workerCap);
    const high = totals.high === 0 ? 1 : Math.min(1, remaining / totals.high);
    remaining = Math.max(0, remaining - totals.high);
    const normal = totals.normal === 0 ? 1 : Math.min(1, remaining / totals.normal);
    remaining = Math.max(0, remaining - totals.normal);
    const low = totals.low === 0 ? 1 : Math.min(1, remaining / totals.low);
    return { high, normal, low };
  }

  // Method to return the ratio of available workers to required workers
  getWorkerAvailabilityRatio(priority) {
    const ratios = this.getWorkerAvailabilityRatios();
    return priority > 0 ? ratios.high : priority < 0 ? ratios.low : ratios.normal;
  }

  applyWorkerRatio(effect){
    this.workerRatio = effect.value;
  }

  getBioworkerContribution() {
    try {
      const design = lifeDesigner.currentDesign;
      if (!design || !design.bioworkforce) {
        return 0;
      }
      const points = design.bioworkforce.getEffectiveValue();
      if (points <= 0) {
        return 0;
      }
      const bioworkersPerBiomassPerPoint = terraforming?.requirements?.lifeDesign?.bioworkersPerBiomassPerPoint ?? 0.00001;
      let activeBiomass = 0;
      const zones = getZones();
      zones.forEach((zoneName) => {
        if (terraforming.biomassUnsurvivableZones && terraforming.biomassUnsurvivableZones[zoneName]) {
          return;
        }
        const zonalBiomass = terraforming.zonalSurface.biomass[zoneName] || 0;
        if (zonalBiomass > 0) {
          activeBiomass += zonalBiomass;
        }
      });
      if (activeBiomass <= 0) {
        return 0;
      }
      const maxBiomassDensity = Math.min(design.getMaxBiomassDensity(), BIOWORKER_MAX_BIOMASS_DENSITY);
      const landAreaM2 = resolveWorldGeometricLand(terraforming, resources.surface.land) * 10000;
      const maxBiomass = landAreaM2 > 0 ? landAreaM2 * maxBiomassDensity : 0;
      const cappedBiomass = Math.min(activeBiomass, maxBiomass);
      return Math.floor(cappedBiomass * points * bioworkersPerBiomassPerPoint);
    } catch (error) {
      return 0;
    }
  }

  getKeratiHiveWorkerContribution() {
    try {
      const keratiHiveProject = projectManager?.projects?.keratiHive;
      if (!keratiHiveProject || !keratiHiveProject.getCompletedWorkerContribution) {
        return 0;
      }
      return keratiHiveProject.getCompletedWorkerContribution();
    } catch (error) {
      return 0;
    }
  }

  saveState() {
    return {
      currentWorldOverpopulationLossTotal: this.currentWorldOverpopulationLossTotal,
      currentWorldPeakPopulation: this.currentWorldPeakPopulation
    };
  }

  loadState(state = {}) {
    const savedPeak = Math.max(0, state.currentWorldPeakPopulation || 0);
    const currentPopulation = Math.max(0, this.populationResource.value || 0);
    const legacyLostPopulation = Math.max(0, state.currentWorldOverpopulationLossTotal || 0);
    this.currentWorldPeakPopulation = Math.max(savedPeak, currentPopulation + legacyLostPopulation);
    this.currentWorldOverpopulationLossTotal = Math.max(0, this.currentWorldPeakPopulation - currentPopulation);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PopulationModule,
  };
}

if (typeof window !== 'undefined') {
  window.PopulationModule = PopulationModule;
}
