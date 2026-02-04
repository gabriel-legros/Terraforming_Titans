(function () {
  let existingResources;

  try {
    existingResources = window.defaultPlanetResources;
  } catch (error) {
    existingResources = null;
  }

  const defaultPlanetResources = existingResources || {
    colony: {
      funding: { name: 'Funding', initialValue: 0, unlocked: false },
      colonists: { name: 'Colonists', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false },
      workers: { name: 'Workers', initialValue: 0, hasCap: true, baseCap: 0, unlocked:false, hideRate: true, marginBottom: 10 },
      energy: { name: 'Energy', initialValue: 0, hasCap: true, baseCap: 50000000, unlocked:false , unit: 'Watt-day' },
      metal: { name: 'Metal', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton'},
      silicon: { name: 'Silica', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton' },
      glass: { name: 'Glass', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'ton', maintenanceConversion : {surface : 'junk'}, marginBottom: 10 },
      water: { name: 'Water', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false, maintenanceConversion : {atmospheric : 'atmosphericWater'}, unit: 'ton'},
      food: { name: 'Food', initialValue: 0, hasCap: true, baseCap: 5000, unlocked:false , unit: 'packs', marginBottom: 10 },
      components: { name: 'Components', initialValue: 0, hasCap: true, baseCap: 500, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton' },
      electronics: { name: 'Electronics', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, unit: 'ton', conversionValue : 0.2},
      superconductors: { name: 'Supercond.', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: 'Superalloys', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'junk'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false, marginTop: 10 },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true},
      ice: {
        name: 'Ice',
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
        name: 'Water',
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
        name: 'Dry Ice',
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
        name: 'Liquid CO2',
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
        name: 'Liquid Methane',
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
        name: 'Methane Ice',
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
        name: 'Liquid Ammonia',
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
        name: 'Ammonia Ice',
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
      biomass: {
        name: 'Biomass',
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
        name: 'Hazardous Biomass',
        hasCap: false,
        initialValue: 0,
        unlocked: false,
        unit: 'ton',
        hideWhenSmall: true,
        zonalConfig: {
          keys: ['hazardousBiomass'],
          coverageKeys: ['hazardousBiomass'],
          coverageScale: 10,
          distributionKey: 'hazardousBiomass',
          distribution: { production: 'area', consumption: 'currentAmount' },
        },
      },
      graphite: { name: 'Graphite', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      scrapMetal : {name : 'Scrap Metal', initialValue : 0, unlocked: false, unit: 'ton', marginTop:10, reverseColor: true },
      garbage: { name: 'Garbage', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      trash: { name: 'Trash', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      junk: { name: 'Junk', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      radioactiveWaste: { name: 'Radioactive Waste', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
    },
    underground: {
      ore: { name: 'Ore deposits', initialValue: 5, maxDeposits: 14400, hasCap: true, areaTotal: 144000, unlocked:false },
      geothermal: { name: 'Geo. vent', initialValue: 3, maxDeposits: 144, hasCap: true, areaTotal: 144000, unlocked: false }
    },
    atmospheric: {
      carbonDioxide: { name: 'CO2', initialValue: 23998810562847.49, unlocked:false , unit: 'ton' },
      inertGas: { name: 'Inert Gas', initialValue: 1.075e12, unlocked:false , unit: 'ton' },
      oxygen: { name: 'Oxygen', initialValue: 3.25e10, unlocked:false , unit: 'ton' },
      atmosphericWater: { name: 'Water Vap.', initialValue:  19100402.066922974, unlocked:false , unit: 'ton' },
      greenhouseGas: {name: 'Safe GHG', initialValue : 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      atmosphericMethane: { name: 'Methane', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      atmosphericAmmonia: { name: 'Ammonia', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      hydrogen: { name: 'Hydrogen', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      sulfuricAcid: { name: 'Sulfuric Acid', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      calciteAerosol: { name: 'Calcite Aerosol', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      // Dust caps derive from land area during resource creation
      albedoUpgrades: {name : 'Black Dust', displayName: 'Black Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true},
      whiteDust: { name: 'White Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true },
      orbitalDebris: { name: 'Orbital Debris', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true, reverseColor: true },
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false },
      crusaders: { name: 'Crusaders', hasCap: false, initialValue: 0, unlocked: false },
      antimatter: { name: 'Antimatter', hasCap: true, baseCap: 0, initialValue: 0, unlocked: false }
    }
  };

  const resourcePhaseGroups = {
    water: {
      name: 'Water',
      surfaceKeys: { liquid: 'liquidWater', ice: 'ice', buriedIce: 'buriedIce' },
      coverageKeys: { liquid: 'liquidWaterCoverage', ice: 'iceCoverage' },
      legacyZonalKey: 'zonalWater',
      options: [
        { category: 'colony', resource: 'water', label: 'Colony Water' },
        { category: 'surface', resource: 'liquidWater', label: 'Surface Liquid Water' },
        { category: 'surface', resource: 'ice', label: 'Surface Ice' },
        { category: 'atmospheric', resource: 'atmosphericWater', label: 'Atmospheric Water' },
      ],
    },
    carbonDioxide: {
      name: 'Carbon Dioxide',
      surfaceKeys: { liquid: 'liquidCO2', ice: 'dryIce', buriedIce: 'buriedDryIce' },
      coverageKeys: { liquid: 'liquidCO2Coverage', ice: 'dryIceCoverage' },
      legacyZonalKey: 'zonalCO2',
      options: [
        { category: 'atmospheric', resource: 'carbonDioxide', label: 'Atmospheric CO2' },
        { category: 'surface', resource: 'liquidCO2', label: 'Liquid CO2' },
        { category: 'surface', resource: 'dryIce', label: 'Dry Ice' },
      ],
    },
    methane: {
      name: 'Methane',
      surfaceKeys: { liquid: 'liquidMethane', ice: 'hydrocarbonIce', buriedIce: 'buriedHydrocarbonIce' },
      coverageKeys: { liquid: 'liquidMethaneCoverage', ice: 'hydrocarbonIceCoverage' },
      legacyZonalKey: 'zonalHydrocarbons',
      options: [
        { category: 'atmospheric', resource: 'atmosphericMethane', label: 'Atmospheric Methane' },
        { category: 'surface', resource: 'liquidMethane', label: 'Liquid Methane' },
        { category: 'surface', resource: 'hydrocarbonIce', label: 'Methane Ice' },
      ],
    },
    ammonia: {
      name: 'Ammonia',
      surfaceKeys: { liquid: 'liquidAmmonia', ice: 'ammoniaIce', buriedIce: 'buriedAmmoniaIce' },
      coverageKeys: { liquid: 'liquidAmmoniaCoverage', ice: 'ammoniaIceCoverage' },
      legacyZonalKey: 'zonalAmmonia',
      options: [
        { category: 'atmospheric', resource: 'atmosphericAmmonia', label: 'Atmospheric Ammonia' },
        { category: 'surface', resource: 'liquidAmmonia', label: 'Liquid Ammonia' },
        { category: 'surface', resource: 'ammoniaIce', label: 'Ammonia Ice' },
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
