const DEFAULT_TERRAFORMING_REQUIREMENT_ID = 'human';

const terraformingRequirements = {
  human: {
    id: 'human',
    displayName: 'Human',
    temperatureRangeK: { min: 278.15, max: 298.15 },
    luminosityRange: { min: 600, max: 2000 },
    gasTargetsPa: {
      carbonDioxide: { min: 0, max: 100 },
      oxygen: { min: 15000, max: 25000 },
      inertGas: { min: 50000, max: 100000 }
    },
    waterCoverageTarget: 0.2,
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
      optimalGrowthTemperatureBaseK: 293.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.5,
      photosynthesisRatePerPoint: 0.00008,
      bioworkersPerBiomassPerPoint: 0.00005,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 25,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'photosynthesis',
        processes: {
          photosynthesis: {
            id: 'photosynthesis',
            displayName: 'Photosynthesis',
            growth: {
              usesLuminosity: true,
              perBiomass: {
                surface: { biomass: 1, liquidWater: -0.6 },
                atmospheric: { carbonDioxide: -1.4666666666666666, oxygen: 1.0666666666666667 },
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1 },
                atmospheric: { oxygen: -1.0666666666666667, carbonDioxide: 1.4666666666666666, atmosphericWater: 0.6 },
              },
            },
          },
        },
      },
      attributeMaxUpgrades: {
        minTemperatureTolerance: 60,
        maxTemperatureTolerance: 40,
        optimalGrowthTemperature: 15,
        growthTemperatureTolerance: 40,
        photosynthesisEfficiency: 500,
        radiationTolerance: 25,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
      },
    },
  },
  gabbagian: {
    id: 'gabbagian',
    displayName: 'Gabbagian',
    temperatureRangeK: { min: 328.15, max: 368.15 },
    luminosityRange: { min: 0, max: 2000 },
    gasTargetsPa: {
      carbonDioxide: { min: 5000, max: 50000 },
      oxygen: { min: 0, max: 200 },
      inertGas: { min: 5_000_000, max: 10_000_000 },
      hydrogen: { min: 200, max: 60000 },
      atmosphericMethane: { min: 40_000, max: 60_000 },
    },
    waterCoverageTarget: 0.1,
    lifeCoverageTarget: 0.4,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 258.15, max: 303.15 },
      optimalGrowthTemperatureBaseK: 278.15,
      growthTemperatureToleranceBaseC: 2,
      growthTemperatureTolerancePerPointC: 0.6,
      photosynthesisRatePerPoint: 0.00008,
      bioworkersPerBiomassPerPoint: 0.00005,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 25,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'methanogenesis',
        processes: {
          methanogenesis: {
            id: 'methanogenesis',
            displayName: 'Methanogenesis',
            growth: {
              usesLuminosity: false,
              perBiomass: {
                surface: { biomass: 1, liquidWater: -0.2 },
                atmospheric: {
                  carbonDioxide: -2.641666666666667,
                  hydrogen: -0.38333333333333336,
                  atmosphericMethane: 0.5,
                  atmosphericWater: 1.725,
                },
              },
            },
            decay: {
              perBiomass: {
                surface: { biomass: -1 },
                atmospheric: {
                  atmosphericMethane: 0.2,
                  carbonDioxide: 0.6,
                  atmosphericWater: 0.2,
                },
              },
            },
          },
        },
      },
      attributeMaxUpgrades: {
        minTemperatureTolerance: 60,
        maxTemperatureTolerance: 40,
        optimalGrowthTemperature: 15,
        growthTemperatureTolerance: 40,
        photosynthesisEfficiency: 500,
        radiationTolerance: 25,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
      },
    },
  },
};

function getTerraformingRequirement(id = DEFAULT_TERRAFORMING_REQUIREMENT_ID) {
  return terraformingRequirements[id] || terraformingRequirements[DEFAULT_TERRAFORMING_REQUIREMENT_ID];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_TERRAFORMING_REQUIREMENT_ID,
    terraformingRequirements,
    getTerraformingRequirement
  };
}

if (typeof window !== 'undefined') {
  window.DEFAULT_TERRAFORMING_REQUIREMENT_ID = DEFAULT_TERRAFORMING_REQUIREMENT_ID;
  window.terraformingRequirements = terraformingRequirements;
  window.getTerraformingRequirement = getTerraformingRequirement;
}
