const ARTIFICIAL_ECOSYSTEMS_GROWTH_RATE = 0.005;
const ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS = {
  liquidWater: -0.6,
  carbonDioxide: -1.4666666666666666,
  biomass: 1,
  oxygen: 1.0666666666666667,
};

function getArtificialEcosystemsText(path, fallback, vars) {
  try {
    return t(`ui.projects.spaceStorage.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function updateArtificialEcosystems(deltaTime, accumulatedChanges) {
  const project = projectManager.projects.spaceStorage;
  if (!project.unlocked || !project.isBooleanFlagSet('artificialEcosystems') || !project.artificialEcosystemsEnabled) {
    return;
  }

  const biomassCapSetting = project.getResourceCapSetting('biomass');
  if (biomassCapSetting.mode === 'none') {
    return;
  }

  const seconds = deltaTime / 1000;
  if (seconds <= 0) {
    return;
  }

  const biomassCap = project.getResourceCapLimit('biomass');
  if (!Number.isFinite(biomassCap) || biomassCap <= 0) {
    return;
  }

  const getStoredAmountForTick = (resourceKey) => {
    const resource = resources.spaceStorage[resourceKey];
    const pending = accumulatedChanges.spaceStorage[resourceKey] || 0;
    return Math.max(0, resource.value + pending);
  };

  const currentBiomass = getStoredAmountForTick('biomass');
  if (currentBiomass <= 0 || currentBiomass >= biomassCap) {
    return;
  }

  const logisticFactor = Math.max(0, 1 - currentBiomass / biomassCap);
  if (logisticFactor <= 0) {
    return;
  }

  const desiredGrowth = currentBiomass * ARTIFICIAL_ECOSYSTEMS_GROWTH_RATE * logisticFactor * seconds;
  if (desiredGrowth <= 0) {
    return;
  }

  const availableWater = getStoredAmountForTick('liquidWater');
  const availableCarbonDioxide = getStoredAmountForTick('carbonDioxide');
  const growthFromWater = availableWater / -ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS.liquidWater;
  const growthFromCarbonDioxide = availableCarbonDioxide / -ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS.carbonDioxide;
  const remainingBiomassCapacity = Math.max(0, biomassCap - currentBiomass);

  const actualGrowth = Math.min(
    desiredGrowth,
    growthFromWater,
    growthFromCarbonDioxide,
    remainingBiomassCapacity
  );
  if (actualGrowth <= 0) {
    return;
  }

  const source = getArtificialEcosystemsText('artificialEcosystemsSource', 'Artificial Ecosystems');
  const waterDelta = actualGrowth * ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS.liquidWater;
  const carbonDioxideDelta = actualGrowth * ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS.carbonDioxide;
  const oxygenDelta = actualGrowth * ARTIFICIAL_ECOSYSTEMS_PHOTOSYNTHESIS.oxygen;

  accumulatedChanges.spaceStorage.biomass += actualGrowth;
  accumulatedChanges.spaceStorage.liquidWater += waterDelta;
  accumulatedChanges.spaceStorage.carbonDioxide += carbonDioxideDelta;
  accumulatedChanges.spaceStorage.oxygen += oxygenDelta;

  resources.spaceStorage.biomass.modifyRate(actualGrowth / seconds, source, 'project');
  resources.spaceStorage.liquidWater.modifyRate(waterDelta / seconds, source, 'project');
  resources.spaceStorage.carbonDioxide.modifyRate(carbonDioxideDelta / seconds, source, 'project');
  resources.spaceStorage.oxygen.modifyRate(oxygenDelta / seconds, source, 'project');
}
