const DEFAULT_TERRAFORMING_REQUIREMENT_ID = 'human';

const terraformingRequirements = {
  human: {
    id: 'human',
    displayName: '',
    lore: '',
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
      photosynthesisRatePerPoint: 0.00005,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'photosynthesis',
        processes: {
          photosynthesis: {
            id: 'photosynthesis',
            displayName: '',
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  gabbagian: {
    id: 'gabbagian',
    displayName: '',
    lore: '',
    temperatureRangeK: { min: 328.15, max: 368.15 },
    luminosityRange: { min: 0, max: 2000 },
    totalPressureRangeKPa: { min: 1000, max: 2000 },
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
      photosynthesisRatePerPoint: 0.00005,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'methanogenesis',
        processes: {
          methanogenesis: {
            id: 'methanogenesis',
            displayName: '',
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  ammonia: {
    id: 'ammonia',
    displayName: '',
    lore: '',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 5 },
    temperatureRangeK: { min: 278.15, max: 293.15 },
    luminosityRange: { min: 800, max: 2000 },
    totalPressureRangeKPa: { min: 200, max: 400 },
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
      photosynthesisRatePerPoint: 0.00005,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'ammoniaPhotosynthesis',
        processes: {
          ammoniaPhotosynthesis: {
            id: 'ammoniaPhotosynthesis',
            displayName: '',
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  oommaa: {
    id: 'oommaa',
    displayName: '',
    lore: '',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 10 },
    temperatureRangeK: { min: 283.15, max: 298.15 },
    luminosityRange: { min: 0, max: 100 },
    totalPressureRangeKPa: { min: 6000, max: 11000 },
    gasTargetsPa: {
      carbonDioxide: { min: 4_000_000, max: 6_000_000 },
      inertGas: { min: 1_000_000, max: 2_000_000 },
      atmosphericAmmonia: { min: 0, max: 10 },
    },
    liquidCoverageTarget: 0.5,
    liquidType: 'water',
    liquidCoverageTargets: [
      { liquidType: 'water', coverageTarget: 0.5 },
      { liquidType: 'carbonDioxide', coverageTarget: 0.5 },
    ],
    lifeCoverageTarget: 0.4,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    lifeDesign: {
      survivalTemperatureRangeK: { min: 273.15, max: 308.15 },
      optimalGrowthTemperatureBaseK: 288.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.5,
      photosynthesisRatePerPoint: 0.0015,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      metabolism: {
        primaryProcessId: 'carbonateShellPhotosynthesis',
        processes: {
          carbonateShellPhotosynthesis: {
            id: 'carbonateShellPhotosynthesis',
            displayName: '',
            growth: {
              usesLuminosity: true,
              perBiomass: {
                surface: { biomass: 1, liquidWater: -0.2903225806451613, liquidCO2: -0.7096774193548387 },
                atmospheric: {},
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1, liquidCO2: 0.7096774193548387 },
                atmospheric: { atmosphericWater: 0.2903225806451613 },
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  klishy: {
    id: 'klishy',
    displayName: '',
    lore: '',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 20 },
    temperatureRangeK: { min: 218.15, max: 228.15 },
    luminosityRange: { min: 0, max: 1_000_000_000 },
    gasTargetsPa: {
      inertGas: { min: 10_000, max: 1_000_000_000 },
      oxygen: { min: 0, max: 100 },
    },
    liquidCoverageTargets: [
      { liquidType: 'water', coverageTarget: 0.05, comparison: 'atMost' },
    ],
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    appliedEffects: [
      { target: 'project', targetId: 'klishyWeb', type: 'enable' },
    ],
    otherRequirements: [
      {
        type: 'projectCompletion',
        projectId: 'klishyWeb',
        label: '',
        targetText: '',
      },
    ],
    lifeDesign: {
      survivalTemperatureRangeK: { min: 193.15, max: 263.15 },
      optimalGrowthTemperatureBaseK: 223.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.5,
      photosynthesisRatePerPoint: 0.00005,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      requiresLiquidWaterForGrowth: false,
      metabolism: {
        primaryProcessId: 'metallotrophy',
        processes: {
          metallotrophy: {
            id: 'metallotrophy',
            displayName: '',
            growth: {
              usesLuminosity: false,
              perBiomass: {
                surface: { biomass: 1 },
                atmospheric: {},
                colony: {
                  metal: -0.7,
                  silicon: -0.3,
                  energy: -1000,
                },
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1 },
                atmospheric: {},
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  kerati: {
    id: 'kerati',
    displayName: '',
    lore: '',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 30 },
    temperatureRangeK: { min: 293.15, max: 308.15 },
    luminosityRange: { min: 0, max: 1_500 },
    totalPressureRangeKPa: { min: 120, max: 320 },
    gasTargetsPa: {
      carbonDioxide: { min: 5_000, max: 30_000 },
      oxygen: { min: 0, max: 100 },
      inertGas: { min: 60_000, max: 240_000 },
      hydrogen: { min: 20_000, max: 100_000 },
    },
    liquidCoverageTarget: 0.2,
    liquidType: 'water',
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    appliedEffects: [
      { target: 'project', targetId: 'keratiHive', type: 'enable' },
    ],
    otherRequirements: [
      {
        type: 'projectCompletion',
        projectId: 'keratiHive',
        label: '',
        targetText: '',
      },
    ],
    lifeDesign: {
      survivalTemperatureRangeK: { min: 278.15, max: 323.15 },
      optimalGrowthTemperatureBaseK: 300.15,
      growthTemperatureToleranceBaseC: 1.5,
      growthTemperatureTolerancePerPointC: 0.6,
      photosynthesisRatePerPoint: 0.00005,
      bioworkersPerBiomassPerPoint: 0.00004,
      baseMaxBiomassDensityTPerM2: 0.12,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      requiresLiquidWaterForGrowth: true,
      metabolism: {
        primaryProcessId: 'hydrogenotrophicBiosynthesis',
        processes: {
          hydrogenotrophicBiosynthesis: {
            id: 'hydrogenotrophicBiosynthesis',
            displayName: '',
            growth: {
              usesLuminosity: false,
              perBiomass: {
                surface: { biomass: 1, liquidWater: -0.5 },
                atmospheric: {
                  carbonDioxide: -0.5,
                  hydrogen: -0.5,
                  atmosphericWater: 0.5,
                },
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1, liquidWater: 1 },
                atmospheric: {
                  carbonDioxide: 2,
                  hydrogen: 5,
                  atmosphericWater: -3,
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
      },
    },
  },
  shrilek: {
    id: 'shrilek',
    displayName: '',
    lore: '',
    dominionUnlock: { type: 'fullyControlledSectors', minimum: 40 },
    temperatureRangeK: { min: 308.15, max: 333.15 },
    luminosityRange: { min: 400, max: 2600 },
    totalPressureRangeKPa: { min: 90, max: 220 },
    gasTargetsPa: {
      carbonDioxide: { min: 0, max: 2_000 },
      oxygen: { min: 0, max: 50 },
      inertGas: { min: 40_000, max: 150_000 },
      atmosphericWater: { min: 0, max: 10 },
      atmosphericMethane: { min: 20_000, max: 70_000 },
      atmosphericAmmonia: { min: 0, max: 20 },
    },
    liquidCoverageTargets: [
      { liquidType: 'water', coverageKey: 'liquidWater', coverageTarget: 0.001, comparison: 'atMost' },
      { liquidType: 'ice', coverageKey: 'ice', coverageTarget: 0.001, comparison: 'atMost' },
      { liquidType: 'fineSand', coverageKey: 'fineSand', coverageTarget: 0.999 },
    ],
    lifeCoverageTarget: 0.01,
    magnetosphereThreshold: 100,
    requireHazardClearance: true,
    appliedEffects: [
      { target: 'project', targetId: 'shrilekHydrocarbonReserves', type: 'enable' },
      { target: 'building', targetId: 'sandSeeder', type: 'enable' },
      { target: 'resource', resourceType: 'surface', targetId: 'fineSand', type: 'enable' },
    ],
    otherRequirements: [
      {
        type: 'rotationPeriodMinimum',
        key: 'dayNight',
        minimumHours: 30 * 24,
        label: '',
        targetText: '',
      },
      {
        type: 'projectCompletion',
        projectId: 'shrilekHydrocarbonReserves',
        label: '',
        targetText: '',
      },
    ],
    lifeDesign: {
      survivalTemperatureRangeK: { min: 293.15, max: 343.15 },
      optimalGrowthTemperatureBaseK: 320.15,
      growthTemperatureToleranceBaseC: 1,
      growthTemperatureTolerancePerPointC: 0.4,
      photosynthesisRatePerPoint: 0.00001,
      bioworkersPerBiomassPerPoint: 0.00001,
      baseMaxBiomassDensityTPerM2: 0.03,
      radiationToleranceThresholdPoints: 100,
      minimumBiomassDecayRateTPerS: 1,
      requiresLiquidWaterForGrowth: false,
      metabolism: {
        primaryProcessId: 'methaneChemotrophy',
        processes: {
          methaneChemotrophy: {
            id: 'methaneChemotrophy',
            displayName: '',
            growth: {
              usesLuminosity: false,
              perBiomass: {
                surface: { biomass: 1 },
                atmospheric: {
                  atmosphericMethane: -0.2,
                },
              },
            },
            decay: {
              allowSterileDecayWithoutOxygen: true,
              perBiomass: {
                surface: { biomass: -1 },
                atmospheric: {
                  atmosphericMethane: 0.2,
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
        radiationTolerance: 100,
        invasiveness: 50,
        spaceEfficiency: 100,
        geologicalBurial: 50,
        bioworkforce: 100,
        bioships: 1000,
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
