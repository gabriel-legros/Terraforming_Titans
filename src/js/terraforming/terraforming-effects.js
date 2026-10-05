function applyAerostatProtectedMaintenancePenalty(multiplier, effect, minimumMultiplier = 1) {
  const mitigation = getAerostatMaintenanceMitigation();
  for (const [target, collection] of [['building', buildings], ['colony', colonies]]) {
    for (const [id, structure] of Object.entries(collection)) {
      if (target === 'building' && structure.temperatureMaintenanceImmune) continue;
      const costs = structure.cost.colony;
      if (!costs) continue;
      let penalty = multiplier;
      if (target === 'colony' && id === 'aerostat_colony') {
        penalty = Math.max(1, minimumMultiplier);
      } else if (target === 'building' && multiplier > 1) {
        let remainingFraction = 1;
        if (structure.getTotalWorkerNeed() > 0 && isBuildingEligibleForFactoryMitigation(id)) {
          remainingFraction *= 1 - Math.max(0, Math.min(1, mitigation.workerShare));
        }
        const coverage = mitigation.buildingCoverage.byId[id];
        if (coverage) remainingFraction *= coverage.remainingFraction;
        penalty = Math.max(minimumMultiplier, 1 + (multiplier - 1) * remainingFraction);
      }
      for (const resource of Object.keys(costs)) {
        if (resource === 'research') continue;
        structure.addAndReplace({ ...effect, effectId: `${effect.effectId}-${resource}`,
          target, targetId: id, type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony', resourceId: resource, value: penalty });
      }
    }
  }
}

registerTerraformingMethods('effects', ({
  COMFORTABLE_TEMPERATURE_MAX,
  COMFORTABLE_TEMPERATURE_MIN,
  KPA_PER_ATM,
  calculateAtmosphericHeatProperties,
  calculateInitialAtmosphericPressureForDelta,
  calculateMaintenancePenaltyForTemperature,
  createNoGravityPenalty,
  getFactoryTemperatureMaintenancePenaltyReduction,
  isBuildingEligibleForFactoryMitigation
}) => ({
  unlock(aspect) {
    if (this[aspect]) {
      this[aspect].unlocked = true;
    }
  },
  calculateColonyPressureCostPenalty() {
    const pressureKPa = this.calculateTotalPressure();
    const pressureAtm = pressureKPa / KPA_PER_ATM;
    const multiplier = Math.sqrt(pressureAtm);
    return multiplier > 1.5 ? multiplier : 1;
  },
  calculateColonyEnergyPenalty() {
    const zones = this.temperature.zones;
    const differences = [zones.tropical.value, zones.temperate.value, zones.polar.value].map(temp => {
      if (temp > COMFORTABLE_TEMPERATURE_MAX) {
        return temp - COMFORTABLE_TEMPERATURE_MAX;
      }
      if (temp < COMFORTABLE_TEMPERATURE_MIN) {
        return COMFORTABLE_TEMPERATURE_MIN - temp;
      }
      return 0;
    });
    const smallestDifference = Math.min(...differences);
    return 1 + smallestDifference / 10;
  },
  calculateGravityCostPenalty() {
    const oneAtmContext = this.calculateOneAtmMaintenanceFloor();
    const gravity = oneAtmContext.gravity;
    if (!calculateGravityCostPenalty) {
      return createNoGravityPenalty();
    }
    const equatorialGravity = calculateApparentEquatorialGravity
      ? calculateApparentEquatorialGravity({
          ...this.celestialParameters,
          gravity,
          radius: oneAtmContext.radiusKm
        })
      : gravity;
    return calculateGravityCostPenalty({
      gravity,
      equatorialGravity
    });
  },
  calculateMaintenancePenalty() {
    return calculateMaintenancePenaltyForTemperature(this.temperature.value);
  },
  calculateOneAtmMaintenanceFloor() {
    const surfacePressureKPa = this.calculateTotalPressure();
    const result = {
      pressureKPa: surfacePressureKPa,
      altitudeKm: null,
      radiusKm: this.celestialParameters.radius,
      gravity: this.celestialParameters.gravity,
      temperatureK: null,
      penalty: 1
    };
    if (!Number.isFinite(surfacePressureKPa)) {
      return result;
    }
    if (surfacePressureKPa < KPA_PER_ATM) {
      result.temperatureK = this.temperature.value;
      result.penalty = calculateMaintenancePenaltyForTemperature(this.temperature.value);
      return result;
    }
    const atmospheric = this.resources?.atmospheric;
    const heatProperties = calculateAtmosphericHeatProperties(atmospheric);
    const kappa = heatProperties.kappa;
    const specificHeatCapacity = heatProperties.specificHeatCapacity;
    const gravity = this.celestialParameters.gravity;
    if (!Number.isFinite(kappa) || kappa <= 0 || !Number.isFinite(specificHeatCapacity) || specificHeatCapacity <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
      return result;
    }
    const pressureRatio = KPA_PER_ATM / surfacePressureKPa;
    const temperatureK = this.temperature.value * Math.pow(pressureRatio, kappa);
    const lapseRate = gravity / specificHeatCapacity;
    const altitudeMeters = lapseRate > 0 ? (this.temperature.value - temperatureK) / lapseRate : null;
    result.temperatureK = temperatureK;
    result.altitudeKm = Number.isFinite(altitudeMeters) && altitudeMeters >= 0 ? altitudeMeters / 1000 : null;
    if (result.altitudeKm !== null) {
      result.radiusKm += result.altitudeKm;
      const atmosphericMassKg = this.celestialParameters.currentAtmosphericMassKg;
      const totalMassKg = this.celestialParameters.mass;
      const surfaceRadiusKm = this.celestialParameters.radius;
      if (Number.isFinite(atmosphericMassKg) && atmosphericMassKg >= 0
          && Number.isFinite(totalMassKg) && totalMassKg > atmosphericMassKg
          && Number.isFinite(surfaceRadiusKm) && surfaceRadiusKm > 0) {
        const atmosphereBelowOneAtmKg = atmosphericMassKg * (1 - pressureRatio);
        const nonAtmosphericMassKg = totalMassKg - atmosphericMassKg;
        result.gravity *= (nonAtmosphericMassKg + atmosphereBelowOneAtmKg) / nonAtmosphericMassKg
          * Math.pow(surfaceRadiusKm / result.radiusKm, 2);
      } else if (Number.isFinite(surfaceRadiusKm) && surfaceRadiusKm > 0) {
        result.gravity *= Math.pow(surfaceRadiusKm / result.radiusKm, 2);
      }
    }
    result.penalty = calculateMaintenancePenaltyForTemperature(temperatureK);
    return result;
  },
  getFactoryTemperatureMaintenancePenaltyReduction() {
    return getFactoryTemperatureMaintenancePenaltyReduction();
  },
  calculateTotalPressureDelta() {
    let totalDelta = 0; // Use a local variable, no need to store this.totalDelta

    // Calculate current and initial pressures on the fly
    for (const gas in this.resources.atmospheric) {
      // Iterate through defined atmospheric gases
      const currentAmount = this.resources.atmospheric[gas].value || 0;
      const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;
      const currentPressure = calculateAtmosphericPressure(currentAmount, this.celestialParameters.gravity, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
      const initialPressure = calculateInitialAtmosphericPressureForDelta(this, initialAmount);
      totalDelta += Math.abs(currentPressure - initialPressure);
    }
    return totalDelta; // Return the calculated sum of deltas (in Pa)
  },
  applyTerraformingEffects() {
    const solarPanelMultiplier = this.calculateSolarPanelMultiplier();
    const windTurbineMultiplier = this.calculateWindTurbineMultiplier();
    const solarPanelEffect = {
      effectId: 'luminosity',
      target: 'building',
      targetId: 'solarPanel',
      type: 'productionMultiplier',
      value: solarPanelMultiplier,
      name: t('ui.terraforming.effects.luminosity', {}, 'Luminosity')
    };
    addEffect(solarPanelEffect);
    const windTurbineEffect = {
      effectId: 'atmosphere',
      target: 'building',
      targetId: 'windTurbine',
      type: 'productionMultiplier',
      value: windTurbineMultiplier,
      name: t('ui.terraforming.effects.atmosphericPressure', {}, 'Atmospheric pressure')
    };
    addEffect(windTurbineEffect);
    const colonyEnergyPenalty = this.calculateColonyEnergyPenalty();
    const colonyCostPenalty = this.calculateColonyPressureCostPenalty();
    const maintenancePenalty = this.calculateMaintenancePenalty();
    const maintenanceFloorPenalty = this.calculateOneAtmMaintenanceFloor().penalty;
    const applyTerraformingPenaltyEffect = effect => {
      let targetObject = null;
      if (effect.target === 'building') {
        targetObject = buildings?.[effect.targetId];
      } else if (effect.target === 'colony') {
        targetObject = colonies?.[effect.targetId];
      }
      const existingEffect = targetObject?.activeEffects?.find(activeEffect => activeEffect.effectId === effect.effectId);
      if (existingEffect && effectsAreShallowEqual(existingEffect, effect) && canSkipShallowEqualReapply(effect)) {
        return;
      }
      addEffect(effect);
    };
    for (let i = 1; i <= 7; i++) {
      const energyPenaltyEffect = {
        effectId: 'temperaturePenalty',
        target: 'colony',
        targetId: `t${i}_colony`,
        type: 'resourceConsumptionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'energy',
        value: colonyEnergyPenalty,
        name: t('ui.terraforming.temperature.effects.colonyEnergyPenalty', null, 'Temperature')
      };
      applyTerraformingPenaltyEffect(energyPenaltyEffect);
      const metalCostPenaltyEffect = {
        effectId: 'pressureCostPenalty-metal',
        target: 'colony',
        targetId: `t${i}_colony`,
        type: 'resourceCostMultiplier',
        resourceCategory: 'colony',
        resourceId: 'metal',
        value: colonyCostPenalty,
        name: t('ui.terraforming.effects.highPressure', {}, 'High pressure')
      };
      const glassCostPenaltyEffect = {
        effectId: 'pressureCostPenalty-glass',
        target: 'colony',
        targetId: `t${i}_colony`,
        type: 'resourceCostMultiplier',
        resourceCategory: 'colony',
        resourceId: 'glass',
        value: colonyCostPenalty,
        name: t('ui.terraforming.effects.highPressure', {}, 'High pressure')
      };
      applyTerraformingPenaltyEffect(metalCostPenaltyEffect);
      applyTerraformingPenaltyEffect(glassCostPenaltyEffect);
    }
    if (this.gravityPenaltyEnabled) {
      this.gravityCostPenalty = this.calculateGravityCostPenalty();
      const gravityCostMultiplier = this.gravityCostPenalty.multiplier;
      const combinedStructures = structures;
      for (const id in combinedStructures) {
        const structure = combinedStructures[id];
        if (!structure || !structure.cost || structure.temperatureMaintenanceImmune) continue;
        const isColony = colonies && Object.prototype.hasOwnProperty.call(colonies, id);
        const target = isColony ? 'colony' : 'building';
        for (const category in structure.cost) {
          const categoryCosts = structure.cost[category];
          if (!categoryCosts) continue;
          for (const resource in categoryCosts) {
            if (resource === 'electronics' || resource === 'water' || resource === 'research') continue;
            applyTerraformingPenaltyEffect({
              effectId: `gravityCostPenalty-${category}-${resource}`,
              target,
              targetId: id,
              type: 'resourceCostMultiplier',
              resourceCategory: category,
              resourceId: resource,
              value: gravityCostMultiplier,
              name: t('ui.terraforming.effects.gravity', {}, 'Gravity')
            });
          }
        }
      }
    } else {
      this.gravityCostPenalty = createNoGravityPenalty();
    }
    applyAerostatProtectedMaintenancePenalty(maintenancePenalty, {
      effectId: 'temperatureMaintenancePenalty',
      name: t('ui.terraforming.effects.temperaturePenalty', {}, 'Temperature penalty')
    }, maintenanceFloorPenalty);
    if (typeof hazardManager !== 'undefined' && hazardManager && typeof hazardManager.applyHazardEffects === 'function') {
      hazardManager.applyHazardEffects({
        addEffect,
        structures: typeof structures !== 'undefined' ? structures : {},
        colonies: typeof colonies !== 'undefined' ? colonies : {},
        buildings: typeof buildings !== 'undefined' ? buildings : {},
        populationModule
      });
    }
    // End of applyTerraformingEffects method body
  }
}));
