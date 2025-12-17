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
      baseMaxBiomassDensityTPerM2: 0.1,
      radiationToleranceThresholdPoints: 25,
      minimumBiomassDecayRateTPerS: 1,
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
  }
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
