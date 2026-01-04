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
      superconductors: { name: 'Superconductors', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'} , unit: 'ton' },
      superalloys: { name: 'Superalloys', initialValue: 0, hasCap: true, baseCap: 200, unlocked:false, maintenanceConversion : {surface : 'scrapMetal'}, maintenanceMultiplier: 0 , unit: 'ton' },
      androids: {name: 'Android', initialValue: 0, hasCap: true, baseCap: 1000, unlocked: false, maintenanceConversion : {surface : 'junk'}},
      research: { name: 'Research', initialValue: 0, hasCap: false, unlocked:false, marginTop: 10 },
      advancedResearch: { name: 'Adv. Research', initialValue: 0, hasCap: false, unlocked:false },
    },
    surface: {
      land: {name : 'Land', initialValue : 14_400_000_000, hasCap: true, unlocked: false, land:true},
      ice: { name: 'Ice', initialValue: 8200007980898617, unlocked:false , unit: 'ton', hideWhenSmall: true },
      liquidWater: { name: 'Water', initialValue: 0, unlocked:false , unit: 'ton' },
      dryIce : {name : 'Dry Ice', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      liquidCO2: { name: 'Liquid CO2', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      liquidMethane: { name: 'Liquid Methane', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      hydrocarbonIce: { name: 'Methane Ice', initialValue: 0, unlocked: true , unit: 'ton', hideWhenSmall: true },
      biomass: {name : 'Biomass', hasCap : false, initialValue: 0, unlocked: false, unit: 'ton' },
      hazardousBiomass: { name: 'Hazardous Biomass', hasCap: false, initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true},
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
      carbonDioxide: { name: 'Carbon Dioxide', initialValue: 23998810562847.49, unlocked:false , unit: 'ton' },
      inertGas: { name: 'Inert Gas', initialValue: 1.075e12, unlocked:false , unit: 'ton' },
      oxygen: { name: 'Oxygen', initialValue: 3.25e10, unlocked:false , unit: 'ton' },
      atmosphericWater: { name: 'Water Vap.', initialValue:  19100402.066922974, unlocked:false , unit: 'ton' },
      greenhouseGas: {name: 'Safe GHG', initialValue : 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      atmosphericMethane: { name: 'Methane', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      hydrogen: { name: 'Hydrogen', initialValue: 0, unlocked: true, unit: 'ton', hideWhenSmall: true },
      sulfuricAcid: { name: 'Sulfuric Acid', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true },
      calciteAerosol: { name: 'Calcite Aerosol', initialValue: 0, unlocked: false, unit: 'ton', hideWhenSmall: true }
    },
    special: {
      // Dust caps derive from land area during resource creation
      albedoUpgrades: {name : 'Black Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true},
      whiteDust: { name: 'White Dust', hasCap: true, initialValue: 0, unlocked: false, hideWhenSmall: true },
      spaceships: {name : 'Spaceships', hasCap: false, initialValue: 0, unlocked: false},
      alienArtifact: { name: 'Alien artifact', hasCap: false, initialValue: 0, unlocked: false },
      crusaders: { name: 'Crusaders', hasCap: false, initialValue: 0, unlocked: false },
      antimatter: { name: 'Antimatter', hasCap: true, baseCap: 0, initialValue: 0, unlocked: false }
    }
  };

  const resourcePhaseGroups = {
    water: {
      name: 'Water',
      options: [
        { category: 'colony', resource: 'water', label: 'Colony Water' },
        { category: 'surface', resource: 'liquidWater', label: 'Surface Liquid Water' },
        { category: 'surface', resource: 'ice', label: 'Surface Ice' },
        { category: 'atmospheric', resource: 'atmosphericWater', label: 'Atmospheric Water' },
      ],
    },
    carbonDioxide: {
      name: 'Carbon Dioxide',
      options: [
        { category: 'atmospheric', resource: 'carbonDioxide', label: 'Atmospheric CO2' },
        { category: 'surface', resource: 'liquidCO2', label: 'Liquid CO2' },
        { category: 'surface', resource: 'dryIce', label: 'Dry Ice' },
      ],
    },
    methane: {
      name: 'Methane',
      options: [
        { category: 'atmospheric', resource: 'atmosphericMethane', label: 'Atmospheric Methane' },
        { category: 'surface', resource: 'liquidMethane', label: 'Liquid Methane' },
        { category: 'surface', resource: 'hydrocarbonIce', label: 'Methane Ice' },
      ],
    },
  };

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
    global.resourcePhaseGroups = resourcePhaseGroups;
  } catch (error) {
    // Global not available.
  }

  try {
    module.exports = defaultPlanetResources;
  } catch (error) {
    // Module export not available in the browser.
  }
})();
