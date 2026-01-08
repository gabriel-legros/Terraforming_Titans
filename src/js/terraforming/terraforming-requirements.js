const DEFAULT_TERRAFORMING_REQUIREMENT_ID = 'human';

const terraformingRequirements = {
  human: {
    id: 'human',
    displayName: 'Ribosa (Human)',
    lore: [
      'The Ribosa are a carbon-water dominion that originated on Earth. Their name comes from a shared biological root: the ribosome and the ribose backbone at the heart of genetic chemistry.',
      'Ribosan metabolism is built around light-driven chemistry, including photosynthesis and its descendants. Across deep time, repeated oxygenation crises and mass extinctions pushed Earth life toward increasingly oxygen-tolerant and often oxygen-dependent biochemistry. As a result, Ribosan ecosystems thrive in high-oxygen atmospheres and treat oxygen as a stable baseline condition their biology assumes, to the horror of most of the galactic community.',
      'Humans are the dominant sapient lineage of Ribosa. In the era immediately preceding the Great Imperial Civil War, the dominion underwent sweeping genetic refactoring. This purity movement did not mean simplicity; it meant control: genomes scrubbed of inherited disease, aging mechanisms rewritten, and redundant repair pathways layered into every organ system.',
      'Modern humans are exceptionally resilient: they resist infection, do not meaningfully senesce, and can regenerate from injuries that would kill most species. Not long before the Civil War, Ribosa lost Earth. From this catastrophe, the dominion became a people without a cradle, biologically engineered for survival yet culturally defined by a homeworld they can no longer return to.',
    ].join('\n\n'),
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
    lore: [
      'The Gabbagians are a carbon-water dominion that evolved on Gabbag, a dim world rich in hydrogen and carbon dioxide where light is scarce and photosynthesis is unreliable. Their biosphere solved the energy problem by leaning into chemistry instead of sunlight.',
      'Hydrogen is their primary fuel, and much of their metabolism resembles planet-scale fermentation: they reduce carbon compounds and exhale vast quantities of methane as waste. For most of their history, Gabbag\'s atmosphere could heal this methane. Photochemistry in the upper layers broke methane down over time, slowly returning it toward hydrogen and maintaining a fragile equilibrium.',
      'In effect, the planet ran on a recycling loop: life produced methane; the sky dismantled it again. Then the loop failed. Excessive growth, aggressive industrialization, and other choices the Gabbagians prefer not to celebrate pushed production beyond what the atmosphere could process.',
      'Methane and related byproducts accumulated faster than they could be broken down. Climate, chemistry, and ecology tipped into a new steady state: a polluted, devastated world where the old balance could not be restored quickly enough.',
      'They tried to reverse it and failed. In the end, evacuation became the only option. The Gabbagians are a diaspora not because their planet exploded, but because the systems that made it livable were overrun and could not be rebuilt in time.',
    ].join('\n\n'),
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
    lore: [
      'The Fritizians arose on the moon Fritiz, shaped by an environment unusually rich in ammonia. Over evolutionary time, ammonia ceased to be merely a background chemical and became a direct pillar of Fritizian metabolism.',
      'They still rely on carbon dioxide and water, but their core biochemical pathways assume ammonia-derived chemistry in ways that are deeply integrated and difficult to substitute. This specialization comes with a severe constraint: oxygen is lethally toxic to them. Even modest oxygen levels can damage their proteins, destabilize membranes, and crash key metabolic reactions.',
      'They prefer aquatic or sealed habitats where chemistry can be buffered and tightly regulated, keeping oxygen extremely low while maintaining the precise mix of dissolved compounds their bodies require.',
      'Fritizian civilization is defined by environmental mastery. Their technology focuses on stability: controlled oceans, sealed atmospheres, and habitat systems designed to hold narrow conditions for centuries. That same precision makes expansion difficult; few worlds naturally match their requirements, and transforming a world to fit them demands vast, careful engineering.',
      'So the Fritizians remain mostly bound to Fritiz—safe, technologically advanced, and strategically vulnerable. Their dependence on a narrow ecological niche leaves them “protected” by the Empire in the way a cage protects a rare animal: kept stable, kept useful, and kept contained.',
    ].join('\n\n'),
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
