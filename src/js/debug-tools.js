(function(){
  const isNode = typeof module !== 'undefined' && module.exports;
  let waterCycleInstance,
      co2CycleInstance,
      rapidSublimationRateCO2,
      methaneCycleInstance,
      calculateWaterEvaporationRate,
      calculateWaterSublimationRate,
      calculateMethaneEvaporationRate,
      calculateMethaneSublimationRate,
      getZonePercentage,
      getZoneRatio,
      estimateCoverage,
      reconstructJournalState,
      calculateAtmosphericPressure,
      boilingPointWater,
      boilingPointMethane;
  if (isNode) {
    const waterMod = require('./terraforming/water-cycle.js');
    waterCycleInstance = waterMod.waterCycle;
    boilingPointWater = waterMod.boilingPointWater;
    calculateWaterEvaporationRate = waterMod.calculateWaterEvaporationRate;
    calculateWaterSublimationRate = waterMod.calculateWaterSublimationRate;
    const dryIceMod = require('./terraforming/dry-ice-cycle.js');
    co2CycleInstance = dryIceMod.co2Cycle;
    rapidSublimationRateCO2 = dryIceMod.rapidSublimationRateCO2;

    const hydrocarbonMod = require('./terraforming/hydrocarbon-cycle.js');
    methaneCycleInstance = hydrocarbonMod.methaneCycle;
    calculateMethaneEvaporationRate = hydrocarbonMod.calculateMethaneEvaporationRate;
    calculateMethaneSublimationRate = hydrocarbonMod.calculateMethaneSublimationRate;
    boilingPointMethane = hydrocarbonMod.boilingPointMethane;

    const physics = require('./terraforming/physics.js');
    calculateAtmosphericPressure = physics.calculateAtmosphericPressure;

    const zonesMod = require('./terraforming/zones.js');
    getZonePercentage = zonesMod.getZonePercentage;
    getZoneRatio = zonesMod.getZoneRatio;
    estimateCoverage = zonesMod.estimateCoverage;
    globalThis.ZONES = zonesMod.ZONES;

    reconstructJournalState = require('./journal-reconstruction.js');
  } else {
    waterCycleInstance = globalThis.waterCycle;
    co2CycleInstance = globalThis.co2Cycle;
    rapidSublimationRateCO2 = globalThis.rapidSublimationRateCO2;
    methaneCycleInstance = globalThis.methaneCycle;
    calculateWaterEvaporationRate = globalThis.calculateWaterEvaporationRate;
    calculateWaterSublimationRate = globalThis.calculateWaterSublimationRate;
    calculateMethaneEvaporationRate = globalThis.calculateMethaneEvaporationRate;
    calculateMethaneSublimationRate = globalThis.calculateMethaneSublimationRate;
    boilingPointWater = globalThis.boilingPointWater;
    boilingPointMethane = globalThis.boilingPointMethane;
    getZonePercentage = globalThis.getZonePercentage;
    getZoneRatio = globalThis.getZoneRatio;
    estimateCoverage = globalThis.estimateCoverage;
    reconstructJournalState = globalThis.reconstructJournalState;
    calculateAtmosphericPressure = globalThis.calculateAtmosphericPressure;
  }
  function captureValues() {
    const globalVals = {
      ice: resources.surface.ice?.value || 0,
      liquidWater: resources.surface.liquidWater?.value || 0,
      dryIce: resources.surface.dryIce?.value || 0,
      liquidCO2: resources.surface.liquidCO2?.value || 0,
      liquidMethane: resources.surface.liquidMethane?.value || 0,
      hydrocarbonIce: resources.surface.hydrocarbonIce?.value || 0,
      co2: resources.atmospheric.carbonDioxide?.value || 0,
      waterVapor: resources.atmospheric.atmosphericWater?.value || 0,
      atmosphericMethane: resources.atmospheric.atmosphericMethane?.value || 0,
      sulfuricAcid: resources.atmospheric.sulfuricAcid?.value || 0,
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
          dryIce: terraforming.zonalCO2[zone]?.ice || 0,
          liquidCO2: terraforming.zonalCO2[zone]?.liquid || 0,
          biomass: terraforming.zonalSurface[zone]?.biomass || 0,
          liquidMethane: terraforming.zonalHydrocarbons[zone]?.liquid || 0,
          hydrocarbonIce: terraforming.zonalHydrocarbons[zone]?.ice || 0,
          buriedHydrocarbonIce: terraforming.zonalHydrocarbons[zone]?.buriedIce || 0
        };
      });
    }
    return { global: globalVals, zones: zonalVals };
  }

  function isStable(prev, cur, threshold) {
    const keys = ['ice','buriedIce','liquidWater','dryIce','liquidCO2','co2','waterVapor','liquidMethane','hydrocarbonIce','atmosphericMethane','sulfuricAcid'];
    for (const k of keys) {
      if (Math.abs(cur.global[k] - prev.global[k]) > threshold) return false;
    }
    for (const zone in cur.zones) {
      for (const k of ['ice','buriedIce','liquidWater','dryIce','liquidCO2','biomass','liquidMethane','hydrocarbonIce','buriedHydrocarbonIce']) {
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
      liquidCO2: { initialValue: values.global.liquidCO2 },
      liquidMethane: { initialValue: values.global.liquidMethane },
      hydrocarbonIce: { initialValue: values.global.hydrocarbonIce }
    };
    const atmospheric = {
      carbonDioxide: { initialValue: values.global.co2 },
      atmosphericWater: { initialValue: values.global.waterVapor },
      atmosphericMethane: { initialValue: values.global.atmosphericMethane },
      sulfuricAcid: { initialValue: values.global.sulfuricAcid }
    };
    const zonalWater = {};
    const zonalSurface = {};
    const zonalHydrocarbons = {};
    const zonalCO2 = {};
    for (const zone in values.zones) {
      zonalWater[zone] = {
        liquid: values.zones[zone].liquidWater,
        ice: values.zones[zone].ice,
        buriedIce: values.zones[zone].buriedIce
      };
      zonalSurface[zone] = {
        biomass: values.zones[zone].biomass
      };
      zonalHydrocarbons[zone] = {
        liquid: values.zones[zone].liquidMethane,
        ice: values.zones[zone].hydrocarbonIce
      };
      zonalCO2[zone] = {
        liquid: values.zones[zone].liquidCO2,
        ice: values.zones[zone].dryIce
      };
    }
    return { resources: { surface, atmospheric }, zonalWater, zonalSurface, zonalHydrocarbons, zonalCO2 };
  }

  function generateOverrideSnippet(values) {
    return JSON.stringify(buildOverrideObject(values), null, 2);
  }

  function logTerraformingOverride() {
    const snippet = generateOverrideSnippet(captureValues());
    console.log('Override snippet:\n' + snippet);
    return snippet;
  }

  function fastForwardToEquilibrium(options = {}) {
    let stepMs = options.stepMs || 1000 * 60 * 60; // The "jump" size, e.g., 1 hour
    const fixedUpdateStep = options.updateStep || 100; // The actual step for updateLogic, hardcoded to 1s
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
            const noisyStepMs = fixedUpdateStep;
            terraforming.updateResources(noisyStepMs, { skipTemperature: true });
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
      const zonalSolarFlux = this.calculateZoneSolarFlux(zone, true);
      const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);

      const liquidWater = this.zonalWater[zone]?.liquid || 0;
      const surfaceIce = this.zonalWater[zone]?.ice || 0;
      const surfaceDryIce = this.zonalCO2[zone]?.ice || 0;
      const liquidWaterCoverage = estimateCoverage(liquidWater, zoneArea);
      const iceCoverage = estimateCoverage(surfaceIce, zoneArea, 0.01);
      const dryIceCoverage = estimateCoverage(surfaceDryIce, zoneArea, 0.01);

      const daySolarFlux = 2 * zonalSolarFlux;
      const nightSolarFlux = 0;

      const evaporationRate = calculateWaterEvaporationRate({
        zoneArea,
        liquidWaterCoverage,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp,
        waterVaporPressure: initialWaterPressurePa,
        avgAtmPressure: initialTotalPressurePa,
        zonalSolarFlux,
      });

      const waterSublimationRate = calculateWaterSublimationRate({
        zoneArea,
        iceCoverage,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp,
        waterVaporPressure: initialWaterPressurePa,
        avgAtmPressure: initialTotalPressurePa,
        zonalSolarFlux,
      });

      let dayCo2Subl = 0, nightCo2Subl = 0;
      const dryIceArea = zoneArea * dryIceCoverage;
      if (dryIceArea > 0 && typeof dayTemp === 'number') {
        const rate = co2CycleInstance.sublimationRate({
          T: dayTemp,
          solarFlux: daySolarFlux,
          atmPressure: initialTotalPressurePa,
          vaporPressure: initialCo2PressurePa,
          r_a: 100,
        });
        dayCo2Subl = rate * dryIceArea / 1000;
      }
      if (dryIceArea > 0 && typeof nightTemp === 'number') {
        const rate = co2CycleInstance.sublimationRate({
          T: nightTemp,
          solarFlux: nightSolarFlux,
          atmPressure: initialTotalPressurePa,
          vaporPressure: initialCo2PressurePa,
          r_a: 100,
        });
        nightCo2Subl = rate * dryIceArea / 1000;
      }

      const co2SublimationRate = (dayCo2Subl + nightCo2Subl) / 2;

      initialTotalWaterEvapSublRate += evaporationRate + waterSublimationRate;
      initialTotalCO2SublRate += co2SublimationRate;

      const availableDryIce = this.zonalCO2[zone]?.ice || 0;
      const rapidCo2Rate = rapidSublimationRateCO2(dayTemp, availableDryIce);
      initialTotalCO2SublRate += rapidCo2Rate;

      const waterBoil = boilingPointWater(initialTotalPressurePa);
      const { liquidRate, iceRate } = waterCycleInstance.condensationRateFactor({
        zoneArea,
        vaporPressure: initialWaterPressurePa,
        gravity,
        dayTemp,
        nightTemp,
        transitionRange: 2,
        maxDiff: 10,
        boilingPoint: waterBoil,
        boilTransitionRange: 5
      });
      potentialPrecipitationRateFactor += liquidRate + iceRate;

      const { iceRate: co2CondRateFactor } = co2CycleInstance.condensationRateFactor({
        zoneArea,
        co2VaporPressure: initialCo2PressurePa,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp
      });
      potentialCondensationRateFactor += co2CondRateFactor;

      const liquidMethane = this.zonalHydrocarbons[zone]?.liquid || 0;
      const liquidMethaneCoverage = estimateCoverage(liquidMethane, zoneArea);
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

      const hydrocarbonIce = this.zonalHydrocarbons[zone]?.ice || 0;
      const hydrocarbonIceCoverage = estimateCoverage(hydrocarbonIce, zoneArea, 0.01);
      const methaneSublimationRateValue = calculateMethaneSublimationRate({
        zoneArea,
        hydrocarbonIceCoverage,
        dayTemperature: dayTemp,
        nightTemperature: nightTemp,
        methaneVaporPressure: initialMethanePressurePa,
        avgAtmPressure: initialTotalPressurePa,
        zonalSolarFlux
      });
      initialTotalMethaneEvapRate += methaneSublimationRateValue;

      const methaneBoil = boilingPointMethane(initialTotalPressurePa);
      const { liquidRate: ch4Liquid, iceRate: ch4Ice } = methaneCycleInstance.condensationRateFactor({
        zoneArea,
        vaporPressure: initialMethanePressurePa,
        gravity: 1,
        dayTemp,
        nightTemp,
        transitionRange: 2,
        maxDiff: 10,
        boilingPoint: methaneBoil,
        boilTransitionRange: 5
      });
      potentialMethaneCondensationRateFactor += ch4Liquid + ch4Ice;
    }

    if (potentialPrecipitationRateFactor > 1e-12) {
      this.equilibriumWaterCondensationParameter =
        initialTotalWaterEvapSublRate / potentialPrecipitationRateFactor;
    } else if (initialTotalWaterEvapSublRate < 1e-12) {
      this.equilibriumWaterCondensationParameter = 0.0001;
    } else {
      console.warn(
        'Initial state has upward water flux but no potential precipitation. Using default multiplier.'
      );
      this.equilibriumWaterCondensationParameter = 0.0001;
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
      `Calculated Equilibrium Water Condensation Parameter (Rate-Based): ${this.equilibriumWaterCondensationParameter}`
    );
    console.log(
      `Calculated Equilibrium Condensation Parameter (Rate-Based): ${this.equilibriumCondensationParameter}`
    );
    console.log(
      `Calculated Equilibrium Methane Condensation Parameter (Rate-Based): ${this.equilibriumMethaneCondensationParameter}`
    );
  }



  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fastForwardToEquilibrium, generateOverrideSnippet, logTerraformingOverride, calculateEquilibriumConstants, reconstructJournalState };
  } else {
    globalThis.fastForwardToEquilibrium = fastForwardToEquilibrium;
    globalThis.generateOverrideSnippet = generateOverrideSnippet;
    globalThis.logTerraformingOverride = logTerraformingOverride;
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

