(function () {
  const KG_PER_TON = 1000;

  const HYDROGEN_T_TRIPLE = 13.957;
  const HYDROGEN_P_TRIPLE = 7.04e3;
  const HYDROGEN_T_CRIT = 33.19;
  const HYDROGEN_P_CRIT = 1.315e6;
  const HYDROGEN_T_BOILING = 20.39;
  const HYDROGEN_P_BOILING = 101325;
  const HYDROGEN_SUPERCRITICAL_REFERENCE_T = 3000;
  const HYDROGEN_SUPERCRITICAL_REFERENCE_P = 1e10;
  const HYDROGEN_SUPERCRITICAL_PRESSURE_EXPONENT =
    Math.log(HYDROGEN_SUPERCRITICAL_REFERENCE_P / HYDROGEN_P_CRIT) /
    Math.log(HYDROGEN_SUPERCRITICAL_REFERENCE_T / HYDROGEN_T_CRIT);
  const HYDROGEN_REPARTITION_TIMESCALE_SECONDS = 86400;
  const HYDROGEN_PRESSURE_TOLERANCE_FRACTION = 1e-6;

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
      repartitionTimescaleSeconds = HYDROGEN_REPARTITION_TIMESCALE_SECONDS,
    } = {}) {
      this.atmKey = 'hydrogen';
      this.repartitionTimescaleSeconds = repartitionTimescaleSeconds;
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

    runCycle(terraforming, zones, options = {}) {
      const gravity = options.extraParams?.gravity || terraforming?.celestialParameters?.gravity || 0;
      const durationSeconds = options.durationSeconds || 0;
      const atmosphericHydrogen = terraforming?.resources?.atmospheric?.hydrogen?.value || 0;
      const surfaceHydrogen = terraforming?.resources?.surface?.liquidHydrogen?.value || 0;
      const currentPressurePa = options.vaporPressure || 0;
      const targetPressurePa = this.calculateTargetPressurePa(terraforming);

      if (!(durationSeconds > 0) || !(gravity > 0)) {
        return { evaporation: 0, condensation: 0, totalAtmosphericChange: 0 };
      }

      const pressureDelta = targetPressurePa - currentPressurePa;
      const tolerance = Math.max(HYDROGEN_P_CRIT, targetPressurePa) * HYDROGEN_PRESSURE_TOLERANCE_FRACTION;
      if (Math.abs(pressureDelta) <= tolerance) {
        return { evaporation: 0, condensation: 0, totalAtmosphericChange: 0 };
      }

      const targetMassDelta = this.calculateMassForPressure(terraforming, Math.abs(pressureDelta), gravity);
      const relaxationFraction = 1 - Math.exp(-durationSeconds / this.repartitionTimescaleSeconds);

      if (pressureDelta > 0) {
        const requested = Math.min(surfaceHydrogen, targetMassDelta * relaxationFraction);
        const released = this.distributeSurfaceHydrogen(terraforming, zones, requested);
        return {
          evaporation: released,
          condensation: 0,
          totalAtmosphericChange: released,
        };
      }

      const requested = Math.min(atmosphericHydrogen, targetMassDelta * relaxationFraction);
      const absorbed = this.depositSurfaceHydrogen(terraforming, zones, requested);
      return {
        evaporation: 0,
        condensation: absorbed,
        totalAtmosphericChange: -absorbed,
      };
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

      terraforming.totalHydrogenEvaporationRate = evaporationRate;
      terraforming.totalHydrogenCondensationRate = condensationRate;

      if (evaporationRate > 0) {
        resources.atmospheric.hydrogen?.modifyRate(evaporationRate, 'Evaporation', 'terraforming');
        resources.surface.liquidHydrogen?.modifyRate(-evaporationRate, 'Evaporation', 'terraforming');
      }
      if (condensationRate > 0) {
        resources.atmospheric.hydrogen?.modifyRate(-condensationRate, 'Condensation', 'terraforming');
        resources.surface.liquidHydrogen?.modifyRate(condensationRate, 'Condensation', 'terraforming');
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
