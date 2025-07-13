(function(){
  const isNode = typeof module !== 'undefined' && module.exports;
  let calculateEvaporationSublimationRates,
      calculatePrecipitationRateFactor,
      calculateZonalCoverage,
      calculateCO2CondensationRateFactor,
      calculateMethaneCondensationRateFactor,
      calculateMethaneEvaporationRate,
      getZonePercentage,
      getZoneRatio,
      reconstructJournalState,
      calculateAtmosphericPressure;
  if (isNode) {
    const utils = require('./terraforming-utils.js');
    calculateEvaporationSublimationRates = utils.calculateEvaporationSublimationRates;
    calculatePrecipitationRateFactor = utils.calculatePrecipitationRateFactor;
    calculateZonalCoverage = utils.calculateZonalCoverage;

    const dryIceCycle = require('./dry-ice-cycle.js');
    calculateCO2CondensationRateFactor = dryIceCycle.calculateCO2CondensationRateFactor;

    const hydrocarbonCycle = require('./hydrocarbon-cycle.js');
    calculateMethaneCondensationRateFactor = hydrocarbonCycle.calculateMethaneCondensationRateFactor;
    calculateMethaneEvaporationRate = hydrocarbonCycle.calculateMethaneEvaporationRate;

    const physics = require('./physics.js');
    calculateAtmosphericPressure = physics.calculateAtmosphericPressure;

    const zonesMod = require('./zones.js');
    getZonePercentage = zonesMod.getZonePercentage;
    getZoneRatio = zonesMod.getZoneRatio;
    globalThis.ZONES = zonesMod.ZONES;

    reconstructJournalState = require('./journal-reconstruction.js');
  } else {
    calculateEvaporationSublimationRates = globalThis.calculateEvaporationSublimationRates;
    calculatePrecipitationRateFactor = globalThis.calculatePrecipitationRateFactor;
    calculateZonalCoverage = globalThis.calculateZonalCoverage;
    calculateCO2CondensationRateFactor = globalThis.calculateCO2CondensationRateFactor;
    calculateMethaneCondensationRateFactor = globalThis.calculateMethaneCondensationRateFactor;
    calculateMethaneEvaporationRate = globalThis.calculateMethaneEvaporationRate;
    getZonePercentage = globalThis.getZonePercentage;
    getZoneRatio = globalThis.getZoneRatio;
    reconstructJournalState = globalThis.reconstructJournalState;
    calculateAtmosphericPressure = globalThis.calculateAtmosphericPressure;
  }
  function captureValues() {
    const globalVals = {
      ice: resources.surface.ice?.value || 0,
      liquidWater: resources.surface.liquidWater?.value || 0,
      dryIce: resources.surface.dryIce?.value || 0,
      liquidMethane: resources.surface.liquidMethane?.value || 0,
      hydrocarbonIce: resources.surface.hydrocarbonIce?.value || 0,
      co2: resources.atmospheric.carbonDioxide?.value || 0,
      waterVapor: resources.atmospheric.atmosphericWater?.value || 0,
      atmosphericMethane: resources.atmospheric.atmosphericMethane?.value || 0,
      buriedIce: 0
    };
    const zonalVals = {};
    if (typeof ZONES !== 'undefined' && terraforming) {
      ZONES.forEach(zone => {
        const bIce = terraforming.zonalWater[zone]?.buriedIce || 0;
        globalVals.buriedIce += bIce;
        zonalVals[zone] = {
          ice: terraforming.zonalWater[zone]?.ice || 0,
          buriedIce: bIce,
          liquidWater: terraforming.zonalWater[zone]?.liquid || 0,
          dryIce: terraforming.zonalSurface[zone]?.dryIce || 0,
          liquidMethane: terraforming.zonalHydrocarbons[zone]?.liquid || 0,
          hydrocarbonIce: terraforming.zonalHydrocarbons[zone]?.ice || 0
        };
      });
    }
    return { global: globalVals, zones: zonalVals };
  }

  function isStable(prev, cur, threshold) {
    const keys = ['ice','buriedIce','liquidWater','dryIce','co2','waterVapor','liquidMethane','hydrocarbonIce','atmosphericMethane'];
    for (const k of keys) {
      if (Math.abs(cur.global[k] - prev.global[k]) > threshold) return false;
    }
    for (const zone in cur.zones) {
      for (const k of ['ice','buriedIce','liquidWater','dryIce','liquidMethane','hydrocarbonIce']) {
        if (Math.abs(cur.zones[zone][k] - prev.zones[zone][k]) > threshold) return false;
      }
    }
    return true;
  }

  function buildOverrideObject(values) {
    const surface = {
      ice: { initialValue: values.global.ice },
      liquidWater: { initialValue: values.global.liquidWater },
      dryIce: { initialValue: values.global.dryIce },
      liquidMethane: { initialValue: values.global.liquidMethane },
      hydrocarbonIce: { initialValue: values.global.hydrocarbonIce }
    };
    const atmospheric = {
      carbonDioxide: { initialValue: values.global.co2 },
      atmosphericWater: { initialValue: values.global.waterVapor },
      atmosphericMethane: { initialValue: values.global.atmosphericMethane }
    };
    const zonalWater = {};
    const zonalSurface = {};
    const zonalHydrocarbons = {};
    for (const zone in values.zones) {
      zonalWater[zone] = {
        liquid: values.zones[zone].liquidWater,
        ice: values.zones[zone].ice,
        buriedIce: values.zones[zone].buriedIce
      };
      zonalSurface[zone] = {
        dryIce: values.zones[zone].dryIce
      };
      zonalHydrocarbons[zone] = {
        liquid: values.zones[zone].liquidMethane,
        ice: values.zones[zone].hydrocarbonIce
      };
    }
    return { resources: { surface, atmospheric }, zonalWater, zonalSurface, zonalHydrocarbons };
  }

  function generateOverrideSnippet(values) {
    return JSON.stringify(buildOverrideObject(values), null, 2);
  }

  function fastForwardToEquilibrium(options = {}) {
    let stepMs = options.stepMs || 1000 * 60 * 60; // The "jump" size, e.g., 1 hour
    const fixedUpdateStep = 50; // The actual step for updateLogic, hardcoded to 1s
    const maxSteps = options.maxSteps || 1000; // Max number of jumps
    const stableSteps = options.stableSteps || 10;
    const threshold = options.threshold ?? 1;
    const refineFactor = options.refineFactor || 0.5;
    const minStepMs = options.minStepMs || 1000 * 60; // Min jump size, e.g., 1 minute

    let prev = captureValues();
    let stable = 0;
    let step;

    for (step = 0; step < maxSteps; step++) {
        const numUpdates = Math.max(1, Math.floor(stepMs / fixedUpdateStep));
        for (let i = 0; i < numUpdates; i++) {
            updateLogic(fixedUpdateStep);
        }
        const cur = captureValues();

        if (isStable(prev, cur, threshold)) {
            stable++;
        } else {
            stable = 0;
        }

        if (stable >= stableSteps) {
            if (stepMs > minStepMs) {
                stepMs = Math.max(minStepMs, stepMs * refineFactor);
                stable = 0;
            } else {
                console.log('Equilibrium reached after', step + 1, 'steps');
                console.log('Global values:', cur.global);
                console.log('Zonal values:', cur.zones);
                console.log('Override snippet:\n' + generateOverrideSnippet(cur));
                return cur;
            }
        }

        prev = cur;
    }

    console.log('Max steps reached without clear equilibrium');
    console.log('Global values:', prev.global);
    console.log('Zonal values:', prev.zones);
    console.log('Override snippet:\n' + generateOverrideSnippet(prev));
    return prev;
  }

  function calculateEquilibriumConstants() {
    if (!this.initialValuesCalculated) {
      console.error("Cannot calculate equilibrium constants before initial values are set.");
      return;
    }

    const gravity = this.celestialParameters.gravity;
    let initialTotalPressurePa = 0;
    let initialWaterPressurePa = 0;
    let initialCo2PressurePa = 0;
    let initialMethanePressurePa = 0;
    for (const gas in resources.atmospheric) {
      const amount = resources.atmospheric[gas]?.value || 0;
      const pressure = calculateAtmosphericPressure(amount, gravity, this.celestialParameters.radius);
      initialTotalPressurePa += pressure;
      if (gas === 'atmosphericWater') initialWaterPressurePa = pressure;
      if (gas === 'carbonDioxide') initialCo2PressurePa = pressure;
      if (gas === 'atmosphericMethane') initialMethanePressurePa = pressure;
    }
    const solarFlux = this.luminosity.modifiedSolarFlux;

    let initialTotalWaterEvapSublRate = 0;
    let initialTotalCO2SublRate = 0;
    let initialTotalMethaneEvapRate = 0;
    let potentialPrecipitationRateFactor = 0;
    let potentialCondensationRateFactor = 0;
    let potentialMethaneCondensationRateFactor = 0;

    const zones = ZONES;
    for (const zone of zones) {
      const dayTemp = this.temperature.zones[zone].day;
      const nightTemp = this.temperature.zones[zone].night;
      const zonalSolarFlux = solarFlux * getZoneRatio(zone);
      const evapSublRates = calculateEvaporationSublimationRates(
        this,
        zone,
        dayTemp,
        nightTemp,
        initialWaterPressurePa,
        initialCo2PressurePa,
        initialTotalPressurePa,
        zonalSolarFlux
      );
      initialTotalWaterEvapSublRate +=
        evapSublRates.evaporationRate + evapSublRates.waterSublimationRate;
      initialTotalCO2SublRate += evapSublRates.co2SublimationRate;

      const precipRateFactors = calculatePrecipitationRateFactor(
        this,
        zone,
        initialWaterPressurePa,
        gravity,
        dayTemp,
        nightTemp
      );
      potentialPrecipitationRateFactor +=
        precipRateFactors.rainfallRateFactor + precipRateFactors.snowfallRateFactor;

      const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
      const co2CondRateFactor = calculateCO2CondensationRateFactor({
        zoneArea,
        co2VaporPressure: initialCo2PressurePa,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp
      });
      potentialCondensationRateFactor += co2CondRateFactor;

      const liquidMethaneCoverage = calculateZonalCoverage(this, zone, 'liquidMethane');
      const methaneEvaporationRateValue = calculateMethaneEvaporationRate({
        zoneArea,
        liquidMethaneCoverage,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp,
        methaneVaporPressure: initialMethanePressurePa,
        avgAtmPressure: initialTotalPressurePa,
        zonalSolarFlux
      });
      initialTotalMethaneEvapRate += methaneEvaporationRateValue;

      const methaneCondRateFactors = calculateMethaneCondensationRateFactor({
        zoneArea,
        methaneVaporPressure: initialMethanePressurePa,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp
      });
      potentialMethaneCondensationRateFactor +=
        methaneCondRateFactors.liquidRateFactor + methaneCondRateFactors.iceRateFactor;
    }

    if (potentialPrecipitationRateFactor > 1e-12) {
      this.equilibriumPrecipitationMultiplier =
        initialTotalWaterEvapSublRate / potentialPrecipitationRateFactor;
    } else if (initialTotalWaterEvapSublRate < 1e-12) {
      this.equilibriumPrecipitationMultiplier = 0.0001;
    } else {
      console.warn(
        'Initial state has upward water flux but no potential precipitation. Using default multiplier.'
      );
      this.equilibriumPrecipitationMultiplier = 0.0001;
    }

    const defaultCondensationParameter = 1.7699e-7;
    if (potentialCondensationRateFactor > 1e-12) {
      this.equilibriumCondensationParameter =
        initialTotalCO2SublRate / potentialCondensationRateFactor;
    } else if (initialTotalCO2SublRate < 1e-12) {
      this.equilibriumCondensationParameter = defaultCondensationParameter;
    } else {
      console.warn(
        'Initial state has upward CO2 flux but no potential condensation. Using default parameter.'
      );
      this.equilibriumCondensationParameter = defaultCondensationParameter;
    }

    const defaultMethaneCondensationParameter = 0.1;
    if (potentialMethaneCondensationRateFactor > 1e-12) {
      this.equilibriumMethaneCondensationParameter =
        initialTotalMethaneEvapRate / potentialMethaneCondensationRateFactor;
    } else if (initialTotalMethaneEvapRate < 1e-12) {
      this.equilibriumMethaneCondensationParameter =
        defaultMethaneCondensationParameter;
    } else {
      console.warn(
        'Initial state has upward Methane flux but no potential condensation. Using default parameter.'
      );
      this.equilibriumMethaneCondensationParameter =
        defaultMethaneCondensationParameter;
    }

    console.log(
      `Calculated Equilibrium Precipitation Multiplier (Rate-Based): ${this.equilibriumPrecipitationMultiplier}`
    );
    console.log(
      `Calculated Equilibrium Condensation Parameter (Rate-Based): ${this.equilibriumCondensationParameter}`
    );
    console.log(
      `Calculated Equilibrium Methane Condensation Parameter (Rate-Based): ${this.equilibriumMethaneCondensationParameter}`
    );
  }



  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fastForwardToEquilibrium, generateOverrideSnippet, calculateEquilibriumConstants, reconstructJournalState };
  } else {
    globalThis.fastForwardToEquilibrium = fastForwardToEquilibrium;
    globalThis.generateOverrideSnippet = generateOverrideSnippet;
    globalThis.reconstructJournalState = reconstructJournalState;
    globalThis.runEquilibriumCalculation = function(terraformingInstance) {
      if (terraformingInstance && typeof terraformingInstance.calculateInitialValues === 'function') {
        console.log('Calling calculateEquilibriumConstants. initialValuesCalculated =', terraformingInstance.initialValuesCalculated);
        calculateEquilibriumConstants.call(terraformingInstance);
      } else {
        console.error("Please pass the terraforming game object, e.g., runEquilibriumCalculation(terraforming)");
      }
    };
  }
})();