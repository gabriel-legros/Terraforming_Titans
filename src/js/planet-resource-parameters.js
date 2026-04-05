(function () {
  let existingResources;

  try {
    existingResources = window.defaultPlanetResources;
  } catch (error) {
    existingResources = null;
  }

  const defaultPlanetResources = existingResources || {
    colony: {
      funding: { name: '', initialValue: 0, unlocked: false },
      colonists: { name: '', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      workers: { name: '', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false, hideRate: true, marginBottom: 10 },
      energy: { name: '', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: '', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: '', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: '', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton', maintenanceConversion : {surface : 'junk'}, marginBottom: 10 },
      water: { name: '', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'},
      food: { name: '', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'packs', marginBottom: 10 },
      components: { name: '', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: '', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: '', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: '', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: '', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'junk'}},
      research: { name: '', initialValue: 0, hasCap: false, unlocked:false, marginTop: 10 },
      advancedResearch: { name: '', initialValue: 0, hasCap: false, unlocked:false, preserveOnTravel: true },
    },
    surface: {
      land: {name: '', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true},
      ice: {
        name: '',
        initialValue: 8200007980898617,
        unlocked: false,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['ice', 'buriedIce'],
          coverageKeys: ['ice'],
          coverageScale: 0.01,
          distributionKey: 'ice',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      liquidWater: {
        name: '',
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        zonalConfig: {
          keys: ['liquidWater'],
          coverageKeys: ['liquidWater'],
          coverageScale: 0.0001,
          distributionKey: 'liquidWater',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      dryIce: {
        name: '',
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['dryIce', 'buriedDryIce'],
          coverageKeys: ['dryIce'],
          coverageScale: 0.01,
          distributionKey: 'dryIce',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      liquidCO2: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['liquidCO2'],
          coverageKeys: ['liquidCO2'],
          coverageScale: 0.0001,
          distributionKey: 'liquidCO2',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      liquidMethane: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['liquidMethane'],
          coverageKeys: ['liquidMethane'],
          coverageScale: 0.0001,
          distributionKey: 'liquidMethane',
          distribution: { production: 'skip', consumption: 'skip' },
        },
      },
      hydrocarbonIce: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['hydrocarbonIce', 'buriedHydrocarbonIce'],
          coverageKeys: ['hydrocarbonIce'],
          coverageScale: 0.01,
          distributionKey: 'hydrocarbonIce',
          distribution: { production: 'skip', consumption: 'skip' },
        },
      },
      liquidAmmonia: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['liquidAmmonia'],
          coverageKeys: ['liquidAmmonia'],
          coverageScale: 0.0001,
          distributionKey: 'liquidAmmonia',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      ammoniaIce: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['ammoniaIce', 'buriedAmmoniaIce'],
          coverageKeys: ['ammoniaIce'],
          coverageScale: 0.01,
          distributionKey: 'ammoniaIce',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      liquidOxygen: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['liquidOxygen'],
          coverageKeys: ['liquidOxygen'],
          coverageScale: 0.0001,
          distributionKey: 'liquidOxygen',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      oxygenIce: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['oxygenIce', 'buriedOxygenIce'],
          coverageKeys: ['oxygenIce'],
          coverageScale: 0.01,
          distributionKey: 'oxygenIce',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      liquidNitrogen: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['liquidNitrogen'],
          coverageKeys: ['liquidNitrogen'],
          coverageScale: 0.0001,
          distributionKey: 'liquidNitrogen',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      nitrogenIce: {
        name: '',
        initialValue: 0,
        unlocked: true,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['nitrogenIce', 'buriedNitrogenIce'],
          coverageKeys: ['nitrogenIce'],
          coverageScale: 0.01,
          distributionKey: 'nitrogenIce',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      biomass: {
        name: '',
        hasCap: false,
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        zonalConfig: {
          keys: ['biomass'],
          coverageKeys: ['biomass'],
          coverageScale: 10,
          distributionKey: 'biomass',
          distribution: { production: 'biomassGrowth', consumption: 'currentAmount' },
        },
      },
      hazardousBiomass: {
        name: '',
        hasCap: false,
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        hideWhenSmall: true,
        reverseColor: true,
        zonalConfig: {
          keys: ['hazardousBiomass'],
          coverageKeys: ['hazardousBiomass'],
          coverageScale: 10,
          distributionKey: 'hazardousBiomass',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      hazardousMachinery: {
        name: '',
        hasCap: false,
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        hideWhenSmall: true,
        reverseColor: true,
      },
      graphite: { name: '', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      scrapMetal : {name: '', initialValue : 0, unlocked: false, unit: 'ton', marginTop:10, reverseColor: true },
      garbage: { name: '', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      trash: { name: '', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      junk: { name: '', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      radioactiveWaste: { name: '', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
    },
    underground: {
      ore: { name: '', initialValue: 5, maxDeposits: 14400, hasCap: true, areaTotal: 144000, unlocked:false, hideWhenSmall:true },
      geothermal: { name: '', initialValue: 3, maxDeposits: 144, hasCap: true, areaTotal: 144000, unlocked: false, hideWhenSmall:true },
      planetaryMass: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton', showUndergroundRate: true }
    },
    atmospheric: {
      carbonDioxide: { name: '', initialValue: 23998810562847.49, unlocked:false , unit: 'ton' },
      inertGas: { name: '', initialValue: 1.075e12, unlocked:false , unit: 'ton' },
      oxygen: { name: '', initialValue: 3.25e10, unlocked:false , unit: 'ton' },
      atmosphericWater: { name: '', initialValue:  19100402.066922974, unlocked:false , unit: 'ton' },
      greenhouseGas: {name: '', initialValue : 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      atmosphericMethane: { name: '', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      atmosphericAmmonia: { name: '', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      hydrogen: { name: '', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      sulfuricAcid: { name: '', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      calciteAerosol: { name: '', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      // Dust caps derive from land area during resource creation
      albedoUpgrades: {name: '', displayName: '', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true},
      whiteDust: { name: '', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true },
      orbitalDebris: { name: '', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      spaceships: {name: '', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: '', hasCap: false, initialValue: 0, unlocked: false, preserveOnTravel: true },
      crusaders: { name: '', hasCap: false, initialValue: 0, unlocked: false },
      antimatter: { name: '', hasCap: true, baseCap: 0, initialValue: 0, unlocked: false, preserveOnTravel: true, preserveOnTravelFields: ['value', 'unlocked', 'enabled'] }
    },
    space: {
      energy: { name: '', initialValue: 0, hasCap: true, baseCap: 0, unlocked: true, unit: 'Watt-day', preserveOnTravel: true }
    },
    spaceStorage: {
      metal: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      silicon: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      graphite: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      glass: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      components: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton', marginTop: 10 },
      electronics: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      superconductors: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      superalloys: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      liquidWater: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton', marginTop: 10 },
      biomass: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      carbonDioxide: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton', marginTop: 10 },
      inertGas: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      oxygen: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      atmosphericMethane: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      atmosphericAmmonia: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' },
      hydrogen: { name: '', initialValue: 0, hasCap: false, unlocked: false, unit: 'ton' }
    }
  };

  const resourcePhaseGroups = {
    water: {
      name: '',
      surfaceKeys: { liquid: 'liquidWater', ice: 'ice', buriedIce: 'buriedIce' },
      coverageKeys: { liquid: 'liquidWaterCoverage', ice: 'iceCoverage' },
      legacyZonalKey: 'zonalWater',
      options: [
        { category: 'colony', resource: 'water', label: '' },
        { category: 'surface', resource: 'liquidWater', label: '' },
        { category: 'surface', resource: 'ice', label: '' },
        { category: 'atmospheric', resource: 'atmosphericWater', label: '' },
      ],
    },
    carbonDioxide: {
      name: '',
      surfaceKeys: { liquid: 'liquidCO2', ice: 'dryIce', buriedIce: 'buriedDryIce' },
      coverageKeys: { liquid: 'liquidCO2Coverage', ice: 'dryIceCoverage' },
      legacyZonalKey: 'zonalCO2',
      options: [
        { category: 'atmospheric', resource: 'carbonDioxide', label: '' },
        { category: 'surface', resource: 'liquidCO2', label: '' },
        { category: 'surface', resource: 'dryIce', label: '' },
      ],
    },
    methane: {
      name: '',
      surfaceKeys: { liquid: 'liquidMethane', ice: 'hydrocarbonIce', buriedIce: 'buriedHydrocarbonIce' },
      coverageKeys: { liquid: 'liquidMethaneCoverage', ice: 'hydrocarbonIceCoverage' },
      legacyZonalKey: 'zonalHydrocarbons',
      options: [
        { category: 'atmospheric', resource: 'atmosphericMethane', label: '' },
        { category: 'surface', resource: 'liquidMethane', label: '' },
        { category: 'surface', resource: 'hydrocarbonIce', label: '' },
      ],
    },
    ammonia: {
      name: '',
      surfaceKeys: { liquid: 'liquidAmmonia', ice: 'ammoniaIce', buriedIce: 'buriedAmmoniaIce' },
      coverageKeys: { liquid: 'liquidAmmoniaCoverage', ice: 'ammoniaIceCoverage' },
      legacyZonalKey: 'zonalAmmonia',
      options: [
        { category: 'atmospheric', resource: 'atmosphericAmmonia', label: '' },
        { category: 'surface', resource: 'liquidAmmonia', label: '' },
        { category: 'surface', resource: 'ammoniaIce', label: '' },
      ],
    },
    oxygen: {
      name: '',
      surfaceKeys: { liquid: 'liquidOxygen', ice: 'oxygenIce', buriedIce: 'buriedOxygenIce' },
      coverageKeys: { liquid: 'liquidOxygenCoverage', ice: 'oxygenIceCoverage' },
      legacyZonalKey: 'zonalOxygen',
      options: [
        { category: 'atmospheric', resource: 'oxygen', label: '' },
        { category: 'surface', resource: 'liquidOxygen', label: '' },
        { category: 'surface', resource: 'oxygenIce', label: '' },
      ],
    },
    nitrogen: {
      name: '',
      surfaceKeys: { liquid: 'liquidNitrogen', ice: 'nitrogenIce', buriedIce: 'buriedNitrogenIce' },
      coverageKeys: { liquid: 'liquidNitrogenCoverage', ice: 'nitrogenIceCoverage' },
      legacyZonalKey: 'zonalNitrogen',
      options: [
        { category: 'atmospheric', resource: 'inertGas', label: '' },
        { category: 'surface', resource: 'liquidNitrogen', label: '' },
        { category: 'surface', resource: 'nitrogenIce', label: '' },
      ],
    },
  };

  const surfaceLiquidHeatCapacityConfigs = [
    {
      key: 'liquidWater',
      coverageKey: 'liquidWater',
      density: 1000,
      specificHeat: 4200,
      fallbackDepth: 50,
    },
    {
      key: 'liquidCO2',
      coverageKey: 'liquidCO2',
      density: 1100,
      specificHeat: 2100,
      fallbackDepth: 50,
    },
    {
      key: 'liquidMethane',
      coverageKey: 'liquidMethane',
      density: 450,
      specificHeat: 3500,
      fallbackDepth: 50,
    },
    {
      key: 'liquidAmmonia',
      coverageKey: 'liquidAmmonia',
      density: 680,
      specificHeat: 4700,
      fallbackDepth: 50,
    },
    {
      key: 'liquidOxygen',
      coverageKey: 'liquidOxygen',
      density: 1140,
      specificHeat: 1700,
      fallbackDepth: 50,
    },
    {
      key: 'liquidNitrogen',
      coverageKey: 'liquidNitrogen',
      density: 810,
      specificHeat: 2000,
      fallbackDepth: 50,
    },
  ];

  try {
    window.defaultPlanetResources = defaultPlanetResources;
  } catch (error) {
    // Browser-only export.
  }

  try {
    window.resourcePhaseGroups = resourcePhaseGroups;
  } catch (error) {
    // Browser-only export.
  }

  try {
    window.surfaceLiquidHeatCapacityConfigs = surfaceLiquidHeatCapacityConfigs;
  } catch (error) {
    // Browser-only export.
  }

  try {
    global.resourcePhaseGroups = resourcePhaseGroups;
  } catch (error) {
    // Global not available.
  }

  try {
    global.surfaceLiquidHeatCapacityConfigs = surfaceLiquidHeatCapacityConfigs;
  } catch (error) {
    // Global not available.
  }

  try {
    module.exports = defaultPlanetResources;
  } catch (error) {
    // Module export not available in the browser.
  }

  try {
    module.exports.surfaceLiquidHeatCapacityConfigs = surfaceLiquidHeatCapacityConfigs;
  } catch (error) {
    // Module export not available in the browser.
  }
})();
