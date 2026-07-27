(function () {
  const HYDROGEN_PHASE_CHANGE_PARAMETERS = terraformingParameters.phaseChange.hydrogen;
  const KG_PER_TON = terraformingParameters.physical.kgPerTon;
  const HYDROGEN_THERMODYNAMICS = {
    latentHeatVaporizationJPerKg: HYDROGEN_PHASE_CHANGE_PARAMETERS.latentHeatVaporizationJPerKg,
    latentHeatSublimationJPerKg: HYDROGEN_PHASE_CHANGE_PARAMETERS.latentHeatSublimationJPerKg,
    latentHeatFusionJPerKg: HYDROGEN_PHASE_CHANGE_PARAMETERS.latentHeatFusionJPerKg,
    solidSpecificHeatJPerKgK: HYDROGEN_PHASE_CHANGE_PARAMETERS.solidSpecificHeatJPerKgK,
    liquidSpecificHeatJPerKgK: HYDROGEN_PHASE_CHANGE_PARAMETERS.liquidSpecificHeatJPerKgK,
    meltingPointK: HYDROGEN_PHASE_CHANGE_PARAMETERS.triplePointTemperatureK,
  };
  let simulateSurfaceHydrogenFlow = null;
  let resolveHydrogenPhaseEnergy = null;

  try {
    simulateSurfaceHydrogenFlow = window.simulateSurfaceHydrogenFlow;
    resolveHydrogenPhaseEnergy = window.resolvePhaseTransitionEnergy;
  } catch (error) {
    simulateSurfaceHydrogenFlow = null;
  }

  try {
    if (!simulateSurfaceHydrogenFlow && typeof require === 'function') {
      simulateSurfaceHydrogenFlow = require('./hydrology.js').simulateSurfaceHydrogenFlow;
      resolveHydrogenPhaseEnergy = require('./phase-change-utils.js').resolvePhaseTransitionEnergy;
    }
  } catch (error) {
    // fall back to browser global if require fails
  }

  const HYDROGEN_T_TRIPLE = HYDROGEN_PHASE_CHANGE_PARAMETERS.triplePointTemperatureK;
  const HYDROGEN_P_TRIPLE = HYDROGEN_PHASE_CHANGE_PARAMETERS.triplePointPressurePa;
  const HYDROGEN_T_CRIT = HYDROGEN_PHASE_CHANGE_PARAMETERS.criticalPointTemperatureK;
  const HYDROGEN_P_CRIT = HYDROGEN_PHASE_CHANGE_PARAMETERS.criticalPointPressurePa;
  const HYDROGEN_T_BOILING = HYDROGEN_PHASE_CHANGE_PARAMETERS.boilingPointTemperatureK;
  const HYDROGEN_P_BOILING = HYDROGEN_PHASE_CHANGE_PARAMETERS.boilingPointPressurePa;
  const HYDROGEN_SUPERCRITICAL_REFERENCE_T = HYDROGEN_PHASE_CHANGE_PARAMETERS.supercriticalReferenceTemperatureK;
  const HYDROGEN_SUPERCRITICAL_REFERENCE_P = HYDROGEN_PHASE_CHANGE_PARAMETERS.supercriticalReferencePressurePa;
  const HYDROGEN_SUPERCRITICAL_PRESSURE_EXPONENT =
    Math.log(HYDROGEN_SUPERCRITICAL_REFERENCE_P / HYDROGEN_P_CRIT) /
    Math.log(HYDROGEN_SUPERCRITICAL_REFERENCE_T / HYDROGEN_T_CRIT);
  const HYDROGEN_REPARTITION_TONS_PER_PA_M2_SECOND = HYDROGEN_PHASE_CHANGE_PARAMETERS.repartitionTonsPerPaM2Second;
  const HYDROGEN_PRESSURE_TOLERANCE_FRACTION = HYDROGEN_PHASE_CHANGE_PARAMETERS.pressureToleranceFraction;
  const HYDROGEN_MIN_PRESSURE_TOLERANCE_PA = HYDROGEN_PHASE_CHANGE_PARAMETERS.minimumPressureTolerancePa;
  const HYDROGEN_MAX_PRESSURE_TOLERANCE_PA = HYDROGEN_PHASE_CHANGE_PARAMETERS.maximumPressureTolerancePa;

  const HYDROGEN_LIQUID_B =
    (Math.log(HYDROGEN_P_BOILING) - Math.log(HYDROGEN_P_TRIPLE)) /
    ((1 / HYDROGEN_T_TRIPLE) - (1 / HYDROGEN_T_BOILING));
  const HYDROGEN_LIQUID_A =
    Math.log(HYDROGEN_P_TRIPLE) + HYDROGEN_LIQUID_B / HYDROGEN_T_TRIPLE;

  function calculateSaturationPressureHydrogen(T) {
    if (!(T > 0)) {
      return 0;
    }
    if (T >= HYDROGEN_T_CRIT) {
      return HYDROGEN_P_CRIT;
    }
    if (T <= HYDROGEN_T_TRIPLE) {
      return HYDROGEN_P_TRIPLE * Math.exp(
        HYDROGEN_LIQUID_B * ((1 / HYDROGEN_T_TRIPLE) - (1 / T))
      );
    }
    return Math.exp(HYDROGEN_LIQUID_A - HYDROGEN_LIQUID_B / T);
  }

  function calculateSupercriticalTransitionPressureHydrogen(T) {
    if (!(T > 0)) {
      return HYDROGEN_P_CRIT;
    }
    if (T <= HYDROGEN_T_CRIT) {
      return HYDROGEN_P_CRIT;
    }
    return HYDROGEN_P_CRIT * Math.pow(
      T / HYDROGEN_T_CRIT,
      HYDROGEN_SUPERCRITICAL_PRESSURE_EXPONENT
    );
  }

  function calculateHydrogenBoundaryPressure(T) {
    if (T <= HYDROGEN_T_CRIT) {
      return calculateSaturationPressureHydrogen(T);
    }
    return calculateSupercriticalTransitionPressureHydrogen(T);
  }

  class HydrogenCycle {
    constructor({
      repartitionTonsPerPaM2Second = HYDROGEN_REPARTITION_TONS_PER_PA_M2_SECOND,
    } = {}) {
      this.atmKey = 'hydrogen';
      this.repartitionTonsPerPaM2Second = repartitionTonsPerPaM2Second;
      this.tripleTemperature = HYDROGEN_T_TRIPLE;
      this.triplePressure = HYDROGEN_P_TRIPLE;
      this.criticalTemperature = HYDROGEN_T_CRIT;
      this.saturationVaporPressureFn = calculateSaturationPressureHydrogen;
    }

    getCoverage(zone, cache = {}) {
      const data = cache[zone] || {};
      return {
        liquidHydrogenCoverage: data.liquidHydrogen ?? 0,
      };
    }

    getExtraParams(terraforming) {
      return {
        gravity: terraforming.celestialParameters.gravity,
      };
    }

    calculateTargetPressurePa(terraforming) {
      const meanTemperatureK = terraforming?.temperature?.value || 0;
      return calculateHydrogenBoundaryPressure(meanTemperatureK);
    }

    calculateMassForPressure(terraforming, pressurePa, gravity) {
      const surfaceArea = terraforming?.celestialParameters?.surfaceArea || 0;
      if (!(surfaceArea > 0) || !(gravity > 0) || !(pressurePa > 0)) {
        return 0;
      }
      return (pressurePa * surfaceArea) / (gravity * KG_PER_TON);
    }

    distributeSurfaceHydrogen(terraforming, zones, amountTons) {
      if (!(amountTons > 0)) {
        return 0;
      }

      let totalLiquid = 0;
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        totalLiquid += terraforming.zonalSurface?.[zone]?.liquidHydrogen || 0;
      }
      if (!(totalLiquid > 0)) {
        return 0;
      }

      let remaining = amountTons;
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        const zoneStore = terraforming.zonalSurface[zone];
        const current = zoneStore?.liquidHydrogen || 0;
        if (!(current > 0)) {
          continue;
        }
        const isLast = index === zones.length - 1;
        const share = isLast ? remaining : amountTons * (current / totalLiquid);
        const removal = Math.min(current, share, remaining);
        if (removal <= 0) {
          continue;
        }
        zoneStore.liquidHydrogen = current - removal;
        remaining -= removal;
      }

      return amountTons - remaining;
    }

    depositSurfaceHydrogen(terraforming, zones, amountTons) {
      if (!(amountTons > 0)) {
        return 0;
      }

      let totalLiquid = 0;
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        totalLiquid += terraforming.zonalSurface?.[zone]?.liquidHydrogen || 0;
      }

      let remaining = amountTons;
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        const zoneStore = terraforming.zonalSurface[zone];
        const zoneWeight = terraforming?.getZoneWeight ? terraforming.getZoneWeight(zone) : 0;
        const current = zoneStore?.liquidHydrogen || 0;
        const basis = totalLiquid > 0 ? current / totalLiquid : zoneWeight;
        const isLast = index === zones.length - 1;
        const deposit = isLast ? remaining : amountTons * basis;
        if (deposit <= 0) {
          continue;
        }
        zoneStore.liquidHydrogen = current + deposit;
        remaining -= deposit;
      }

      return amountTons - remaining;
    }

    transferSurfaceHydrogenWithHeat(terraforming, zones, amountTons, evaporating) {
      const phaseHeat = { netHeatEnergyJ: 0, byZone: {} };
      const heatCapacity = terraforming.getHeatCapacity();
      let totalLiquid = 0;
      for (const zone of zones) {
        totalLiquid += terraforming.zonalSurface[zone].liquidHydrogen || 0;
      }

      let acceptedTotal = 0;
      for (const zone of zones) {
        const zoneStore = terraforming.zonalSurface[zone];
        const current = zoneStore.liquidHydrogen || 0;
        const basis = totalLiquid > 0
          ? current / totalLiquid
          : terraforming.getZoneWeight(zone);
        const requested = Math.min(
          amountTons * basis,
          evaporating ? current : amountTons
        );
        if (!(requested > 0)) continue;

        const zoneCapacity = heatCapacity.zones[zone];
        const transition = {
          fromPhase: evaporating ? 'liquid' : 'gas',
          toPhase: evaporating ? 'gas' : 'liquid',
          amount: requested,
          floorTemperatureK: evaporating ? HYDROGEN_T_BOILING : 0,
          ceilingTemperatureK: Infinity,
          thermodynamics: HYDROGEN_THERMODYNAMICS,
        };
        const result = resolveHydrogenPhaseEnergy(
          terraforming.temperature.zones[zone].value,
          zoneCapacity.capacityPerArea * zoneCapacity.zoneArea,
          [transition]
        );
        const accepted = result.acceptedAmounts[0];
        zoneStore.liquidHydrogen = evaporating
          ? current - accepted
          : current + accepted;
        acceptedTotal += accepted;
        phaseHeat.netHeatEnergyJ += result.netHeatEnergyJ;
        phaseHeat.byZone[zone] = {
          netHeatEnergyJ: result.netHeatEnergyJ,
          finalTemperatureK: result.finalTemperatureK,
          transitions: [{ ...transition, amount: accepted }],
        };
      }

      return { amount: acceptedTotal, phaseHeat };
    }

    runCycle(terraforming, zones, options = {}) {
      const gravity = options.extraParams?.gravity || terraforming?.celestialParameters?.gravity || 0;
      const durationSeconds = options.durationSeconds || 0;
      const atmosphericHydrogen = terraforming?.resources?.atmospheric?.hydrogen?.value || 0;
      const surfaceHydrogen = terraforming?.resources?.surface?.liquidHydrogen?.value || 0;
      const currentPressurePa = options.vaporPressure || 0;
      const targetPressurePa = this.calculateTargetPressurePa(terraforming);
      const surfaceArea = terraforming?.celestialParameters?.surfaceArea || 0;

      if (!(durationSeconds > 0) || !(gravity > 0) || !(surfaceArea > 0)) {
        return { evaporation: 0, condensation: 0, totalAtmosphericChange: 0 };
      }

      const totals = {
        evaporation: 0,
        condensation: 0,
        totalAtmosphericChange: 0,
      };
      const pressureDelta = targetPressurePa - currentPressurePa;
      const pressureScale = Math.max(
        HYDROGEN_P_TRIPLE,
        targetPressurePa,
        currentPressurePa
      );
      const tolerance = Math.min(
        HYDROGEN_MAX_PRESSURE_TOLERANCE_PA,
        Math.max(
          HYDROGEN_MIN_PRESSURE_TOLERANCE_PA,
          pressureScale * HYDROGEN_PRESSURE_TOLERANCE_FRACTION
        )
      );
      if (Math.abs(pressureDelta) <= tolerance) {
        this.applySurfaceFlow(terraforming, zones, durationSeconds, totals);
        return totals;
      }

      const targetMassDelta = this.calculateMassForPressure(terraforming, Math.abs(pressureDelta), gravity);
      const transferCapacity = Math.abs(pressureDelta) *
        surfaceArea *
        this.repartitionTonsPerPaM2Second *
        durationSeconds;
      const requestedAmount = Math.min(targetMassDelta, transferCapacity);

      if (pressureDelta > 0) {
        const requested = Math.min(surfaceHydrogen, requestedAmount);
        const transfer = options.phaseChangeHeatEnabled
          ? this.transferSurfaceHydrogenWithHeat(terraforming, zones, requested, true)
          : { amount: this.distributeSurfaceHydrogen(terraforming, zones, requested), phaseHeat: null };
        const released = transfer.amount;
        totals.evaporation = released;
        totals.totalAtmosphericChange = released;
        Object.defineProperty(totals, 'phaseHeat', {
          value: transfer.phaseHeat,
          enumerable: false,
        });
        this.applySurfaceFlow(terraforming, zones, durationSeconds, totals);
        return totals;
      }

      const requested = Math.min(atmosphericHydrogen, requestedAmount);
      const transfer = options.phaseChangeHeatEnabled
        ? this.transferSurfaceHydrogenWithHeat(terraforming, zones, requested, false)
        : { amount: this.depositSurfaceHydrogen(terraforming, zones, requested), phaseHeat: null };
      const absorbed = transfer.amount;
      totals.condensation = absorbed;
      totals.totalAtmosphericChange = -absorbed;
      Object.defineProperty(totals, 'phaseHeat', {
        value: transfer.phaseHeat,
        enumerable: false,
      });
      this.applySurfaceFlow(terraforming, zones, durationSeconds, totals);
      return totals;
    }

    applySurfaceFlow(terraforming, zones, durationSeconds, totals) {
      if (!simulateSurfaceHydrogenFlow || !(durationSeconds > 0) || !terraforming?.zonalSurface) {
        return;
      }

      const tempMap = {};
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        tempMap[zone] = terraforming.temperature.zones[zone]?.value;
      }

      const flow = simulateSurfaceHydrogenFlow(terraforming, durationSeconds, tempMap) || {};
      const flowChanges = flow.changes || {};
      const zonesList = zones || getZones();
      for (let index = 0; index < zonesList.length; index += 1) {
        const zone = zonesList[index];
        const zoneChange = flowChanges[zone];
        if (!zoneChange || !Number.isFinite(zoneChange.liquidHydrogen)) {
          continue;
        }
        const zoneStore = terraforming.zonalSurface[zone];
        zoneStore.liquidHydrogen = Math.max(
          0,
          (zoneStore.liquidHydrogen || 0) + zoneChange.liquidHydrogen
        );
      }
      totals.flowShift = flow.totalShift || 0;
    }

    updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
      const resources = terraforming?.resources;
      if (!resources || !(durationSeconds > 0)) {
        return;
      }

      const evaporationAmount = totals.evaporation || 0;
      const condensationAmount = totals.condensation || 0;
      const evaporationRate = evaporationAmount / durationSeconds * 86400;
      const condensationRate = condensationAmount / durationSeconds * 86400;
      const flowShiftRate = (totals.flowShift || 0) / durationSeconds * 86400;

      terraforming.totalHydrogenEvaporationRate = evaporationRate;
      terraforming.totalHydrogenCondensationRate = condensationRate;
      terraforming.flowHydrogenShiftRate = flowShiftRate;

      if (evaporationRate > 0) {
        const evaporationSource = getLocalizedRateSource(
          'terraforming:hydrogenEvaporation',
          'ui.resourceRates.sources.evaporation',
          'Evaporation'
        );
        resources.atmospheric.hydrogen?.modifyRate(evaporationRate, evaporationSource, 'terraforming');
        resources.surface.liquidHydrogen?.modifyRate(-evaporationRate, evaporationSource, 'terraforming');
      }
      if (condensationRate > 0) {
        const condensationSource = getLocalizedRateSource(
          'terraforming:hydrogenCondensation',
          'ui.resourceRates.sources.condensation',
          'Condensation'
        );
        resources.atmospheric.hydrogen?.modifyRate(-condensationRate, condensationSource, 'terraforming');
        resources.surface.liquidHydrogen?.modifyRate(condensationRate, condensationSource, 'terraforming');
      }
    }
  }

  const hydrogenCycle = new HydrogenCycle();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      HydrogenCycle,
      hydrogenCycle,
      calculateSaturationPressureHydrogen,
      calculateSupercriticalTransitionPressureHydrogen,
      calculateHydrogenBoundaryPressure,
    };
  } else {
    globalThis.HydrogenCycle = HydrogenCycle;
    globalThis.hydrogenCycle = hydrogenCycle;
    globalThis.calculateSaturationPressureHydrogen = calculateSaturationPressureHydrogen;
    globalThis.calculateSupercriticalTransitionPressureHydrogen = calculateSupercriticalTransitionPressureHydrogen;
    globalThis.calculateHydrogenBoundaryPressure = calculateHydrogenBoundaryPressure;
  }
})();
