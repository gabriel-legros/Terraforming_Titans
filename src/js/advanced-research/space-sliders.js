const CYLINDERS_HOPE_FLAG = 'cylindersHopeCollaborationAgreement';
const CYLINDERS_HOPE_TICK_MAX = 10;
const CYLINDERS_HOPE_BASE_ENERGY_PER_CYLINDER = 1e15;
const CYLINDERS_HOPE_MANUFACTURING_POP_PER_CYLINDER = 1e12;

function clampCylindersHopeTick(value) {
  const numeric = Math.floor(Number(value) || 0);
  if (numeric < 0) {
    return 0;
  }
  if (numeric > CYLINDERS_HOPE_TICK_MAX) {
    return CYLINDERS_HOPE_TICK_MAX;
  }
  return numeric;
}

function getCylindersHopeTick(space) {
  const tick = space?.getSpaceSliderTick?.('cylindersHope');
  return clampCylindersHopeTick(tick);
}

function getCylindersHopeStrength(tick) {
  const normalizedTick = clampCylindersHopeTick(tick);
  return normalizedTick / CYLINDERS_HOPE_TICK_MAX;
}

function getCylindersHopeEnergyPerCylinderPerSecond(tick) {
  const normalizedTick = clampCylindersHopeTick(tick);
  if (normalizedTick <= 0) {
    return 0;
  }
  return CYLINDERS_HOPE_BASE_ENERGY_PER_CYLINDER * (10 ** (normalizedTick - 1));
}

function isCylindersHopeUnlocked(space) {
  return !!space?.isBooleanFlagSet?.(CYLINDERS_HOPE_FLAG);
}

function getAnySpaceSliderEnabled(space) {
  return isCylindersHopeUnlocked(space);
}

function getCylindersHopeTotalDesiredEnergyPerSecond(space) {
  if (!isCylindersHopeUnlocked(space)) {
    return 0;
  }
  const tick = getCylindersHopeTick(space);
  const perCylinder = getCylindersHopeEnergyPerCylinderPerSecond(tick);
  if (!(perCylinder > 0)) {
    return 0;
  }
  const cylinders = Math.max(0, Number(space?.getOneillCylinderCount?.() || 0));
  return cylinders * perCylinder;
}

function getCylindersHopeProductivity(deltaTime, { space, accumulatedChanges } = {}) {
  const desiredPerSecond = getCylindersHopeTotalDesiredEnergyPerSecond(space);
  if (!(desiredPerSecond > 0) || !(deltaTime > 0)) {
    return { desiredPerSecond, productivity: 1, actualPerSecond: 0, desiredTotal: 0, actualTotal: 0 };
  }
  const seconds = deltaTime / 1000;
  const desiredTotal = desiredPerSecond * seconds;
  const pending = Number(accumulatedChanges?.space?.energy || 0);
  const available = Math.max(0, (resources.space.energy.value || 0) + pending);
  const productivity = Math.max(0, Math.min(1, available / desiredTotal));
  const actualTotal = desiredTotal * productivity;
  return {
    desiredPerSecond,
    productivity,
    actualPerSecond: desiredPerSecond * productivity,
    desiredTotal,
    actualTotal
  };
}

function updateSpaceSliders(deltaTime, { space, accumulatedChanges, forcedProductivity } = {}) {
  const desiredPerSecond = getCylindersHopeTotalDesiredEnergyPerSecond(space);
  let runtime;
  if (Number.isFinite(forcedProductivity)) {
    const clampedProductivity = Math.max(0, Math.min(1, forcedProductivity));
    const seconds = deltaTime / 1000;
    const desiredTotal = desiredPerSecond > 0 && seconds > 0 ? desiredPerSecond * seconds : 0;
    const actualTotal = desiredTotal * clampedProductivity;
    runtime = {
      desiredPerSecond,
      productivity: desiredPerSecond > 0 ? clampedProductivity : 1,
      actualPerSecond: desiredPerSecond * clampedProductivity,
      desiredTotal,
      actualTotal
    };
  } else {
    runtime = getCylindersHopeProductivity(deltaTime, { space, accumulatedChanges });
  }
  const tick = getCylindersHopeTick(space);
  if (runtime.actualTotal > 0) {
    accumulatedChanges.space.energy -= runtime.actualTotal;
    resources.space.energy.modifyRate(-runtime.actualPerSecond, "O'Neill Cylinders", 'project');
  }
  if (space?.setSpaceSliderRuntimeData) {
    space.setSpaceSliderRuntimeData('cylindersHope', {
      tick,
      productivity: runtime.productivity,
      desiredPerSecond: runtime.desiredPerSecond,
      actualPerSecond: runtime.actualPerSecond
    });
  }
}

function createCylindersHopeProductivityOperation(space) {
  const desiredPerSecond = getCylindersHopeTotalDesiredEnergyPerSecond(space);
  if (!(desiredPerSecond > 0)) {
    return null;
  }
  return {
    id: 'cylindersHope',
    productivity: 1,
    applyProjectedRates() {
      resources.space.energy.modifyRate(
        -desiredPerSecond,
        "O'Neill cylinders",
        'project'
      );
    },
    updateProductivity() {
      this.productivity = Math.max(0, Math.min(1, getResourceAvailabilityRatio(resources.space.energy)));
    },
    applyOperationCostAndGain(deltaTime, accumulatedChanges) {
      updateSpaceSliders(deltaTime, {
        space,
        accumulatedChanges,
        forcedProductivity: this.productivity
      });
    }
  };
}

function getSpaceSliderProductivityOperations(space) {
  const cylindersHope = createCylindersHopeProductivityOperation(space);
  return cylindersHope ? [cylindersHope] : [];
}

function getCylindersHopeManufacturingPopulationBonus(space) {
  if (!isCylindersHopeUnlocked(space)) {
    return 0;
  }
  const tick = getCylindersHopeTick(space);
  const strength = getCylindersHopeStrength(tick);
  if (!(strength > 0)) {
    return 0;
  }
  const cylinders = Math.max(0, Number(space?.getOneillCylinderCount?.() || 0));
  const productivity = Math.max(0, Math.min(1, Number(space?.getSpaceSliderRuntimeProductivity?.('cylindersHope') || 0)));
  return cylinders * CYLINDERS_HOPE_MANUFACTURING_POP_PER_CYLINDER * strength * productivity;
}

function getCylindersHopeWarpGateWorldBonusPerSector(space, galaxy) {
  if (!isCylindersHopeUnlocked(space) || !galaxy) {
    return 0;
  }
  const sectors = galaxy.getUhfControlledSectors();
  const sectorCount = Array.isArray(sectors) ? sectors.length : 0;
  if (!(sectorCount > 0)) {
    return 0;
  }
  const tick = getCylindersHopeTick(space);
  if (!(tick > 0)) {
    return 0;
  }
  const cylinders = Math.max(0, Number(space?.getOneillCylinderCount?.() || 0));
  return (cylinders / sectorCount) * tick;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampCylindersHopeTick,
    getCylindersHopeTick,
    getCylindersHopeEnergyPerCylinderPerSecond,
    getCylindersHopeManufacturingPopulationBonus,
    getCylindersHopeWarpGateWorldBonusPerSector,
    getCylindersHopeProductivity,
    getCylindersHopeTotalDesiredEnergyPerSecond,
    getSpaceSliderProductivityOperations,
    isCylindersHopeUnlocked,
    getAnySpaceSliderEnabled,
    updateSpaceSliders,
  };
}

if (typeof window !== 'undefined') {
  window.clampCylindersHopeTick = clampCylindersHopeTick;
  window.getCylindersHopeTick = getCylindersHopeTick;
  window.getCylindersHopeEnergyPerCylinderPerSecond = getCylindersHopeEnergyPerCylinderPerSecond;
  window.getCylindersHopeManufacturingPopulationBonus = getCylindersHopeManufacturingPopulationBonus;
  window.getCylindersHopeWarpGateWorldBonusPerSector = getCylindersHopeWarpGateWorldBonusPerSector;
  window.getCylindersHopeProductivity = getCylindersHopeProductivity;
  window.getCylindersHopeTotalDesiredEnergyPerSecond = getCylindersHopeTotalDesiredEnergyPerSecond;
  window.getSpaceSliderProductivityOperations = getSpaceSliderProductivityOperations;
  window.isCylindersHopeUnlocked = isCylindersHopeUnlocked;
  window.getAnySpaceSliderEnabled = getAnySpaceSliderEnabled;
  window.updateSpaceSliders = updateSpaceSliders;
}
