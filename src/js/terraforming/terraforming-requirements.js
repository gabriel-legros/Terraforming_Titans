const DEFAULT_TERRAFORMING_REQUIREMENT_ID = 'human';

const terraformingRequirements = {
  human: {
    id: 'human',
    displayName: 'Human',
    lore: 'Baseline human habitat standards modeled on Earth-like comfort and adaptable biospheres.',
    temperatureRangeK: { min: 278.15, max: 298.15 },
    luminosityRange: { min: 600, max: 2000 },
    totalPressureRangeKPa: { min: 80, max: 120 },
    gasTargetsPa: {
      carbonDioxide: { min: 0, max: 100 },
      oxygen: { min: 15000, max: 25000 },
      inertGas: { min: 50000, max: 100000 },
      atmosphericAmmonia: { min: 0, max: 10 },
    },
    liquidCoverageTarget: 0.2,
    liquidType: 'water',
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
      optimalGrowthTemperatureBaseK: 293.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.5,
      photosynthesisRatePerPoint: 0.00008,
      bioworkersPerBiomassPerPoint: 0.00004,
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
    lore: 'Heat-loving methane ecologies shaped by Gabbag survival doctrine and heavy atmosphere tolerance.',
    temperatureRangeK: { min: 328.15, max: 368.15 },
    luminosityRange: { min: 0, max: 2000 },
    gasTargetsPa: {
      carbonDioxide: { min: 5000, max: 50000 },
      oxygen: { min: 0, max: 200 },
      inertGas: { min: 1_000_000, max: 2_000_000 },
      hydrogen: { min: 200, max: 60000 },
      atmosphericMethane: { min: 40_000, max: 60_000 },
    },
    liquidCoverageTarget: 0.1,
    liquidType: 'water',
    lifeCoverageTarget: 0.4,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 338.15, max: 383.15 },
      optimalGrowthTemperatureBaseK: 348.15,
      growthTemperatureToleranceBaseC: 2,
      growthTemperatureTolerancePerPointC: 0.6,
      photosynthesisRatePerPoint: 0.00008,
      bioworkersPerBiomassPerPoint: 0.00004,
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
  ammonia: {
    id: 'ammonia',
    displayName: 'Fritizian',
    lore: 'Cooler ammonia-biased worlds tuned for resilient chemistries and patient, long-form terraforming.',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 5 },
    temperatureRangeK: { min: 278.15, max: 293.15 },
    luminosityRange: { min: 800, max: 2000 },
    gasTargetsPa: {
      carbonDioxide: { min: 4000, max: 20_000 },
      hydrogen: { min: 40_000, max: 120_000 },
      oxygen: { min: 0, max: 10 },
      inertGas: { min: 120_000, max: 320_000 },
      atmosphericAmmonia: { min: 3_000, max: 12_000 },
    },
    liquidCoverageTarget: 0.4,
    liquidType: 'water',
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 273.15, max: 308.15 },
      optimalGrowthTemperatureBaseK: 283.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.5,
      photosynthesisRatePerPoint: 0.00008,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 25,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'ammoniaPhotosynthesis',
        processes: {
          ammoniaPhotosynthesis: {
            id: 'ammoniaPhotosynthesis',
            displayName: 'Ammonia Photosynthesis',
            growth: {
              usesLuminosity: true,
              perBiomass: {
                surface: { biomass: 1, liquidWater: -0.6 },
                atmospheric: {
                  carbonDioxide: -1.946902655,
                  hydrogen: -0.17699115,
                  atmosphericAmmonia: -0.150442478,
                  atmosphericWater: 1.874336283,
                },
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1 },
                atmospheric: {
                  carbonDioxide: 1.946902655,
                  hydrogen: 0.17699115,
                  atmosphericAmmonia: 0.150442478,
                  atmosphericWater: -1.874336283,
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
