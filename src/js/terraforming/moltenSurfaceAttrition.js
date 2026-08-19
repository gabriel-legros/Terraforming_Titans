const MOLTEN_SURFACE_ATTRITION_PARAMETERS =
  terraformingParameters.gameplay.landReservation.moltenSurfaceAttrition;
const MOLTEN_SURFACE_ATTRITION_START_TEMPERATURE_K =
  terraformingParameters.gameplay.landReservation.moltenWorldFullTemperatureK;

registerTerraformingMethods('moltenSurfaceAttrition', () => ({
  getMoltenSurfaceAttritionRatePerSecond() {
    const heatShares = getGeologicalHeatLandReservationShares(this);
    const moltenLandShare = Math.max(heatShares.coreHeatFlux, heatShares.fusionFlux);
    const temperatureK = this.temperature.value;
    if (moltenLandShare < 1 || !Number.isFinite(temperatureK)) {
      return 0;
    }

    const excessTemperatureK = Math.max(
      0,
      temperatureK - MOLTEN_SURFACE_ATTRITION_START_TEMPERATURE_K
    );
    const rate = MOLTEN_SURFACE_ATTRITION_PARAMETERS.baseRatePerSecond
      * Math.pow(
        2,
        excessTemperatureK / MOLTEN_SURFACE_ATTRITION_PARAMETERS.doublingIntervalK
      );
    return Math.min(MOLTEN_SURFACE_ATTRITION_PARAMETERS.maximumRatePerSecond, rate);
  },

  getMoltenSurfaceAerostatProtection() {
    const aerostat = colonies.aerostat_colony;
    if (!aerostat.isMoltenSurfaceAttritionImmune() || aerostat.active <= 0n) {
      return {
        workerShare: 0,
        buildingCoverage: { byId: {} }
      };
    }
    return getAerostatMaintenanceMitigation({ buildings, colonies });
  },

  getMoltenSurfaceProtectedCount(structure, structureId, isBuilding, aerostatProtection) {
    if (!isBuilding || structure.active <= 0n) {
      return 0;
    }

    const activeCount = structure.activeNumber;
    const directCoverage = aerostatProtection.buildingCoverage.byId[structureId]?.coverage || 0;
    const workerNeed = structure.getTotalWorkerNeed();
    const workerCoverage = workerNeed > 0 && isBuildingEligibleForFactoryMitigation(structureId)
      ? aerostatProtection.workerShare
      : 0;
    const protectedShare = 1 - ((1 - directCoverage) * (1 - workerCoverage));
    return activeCount * Math.max(0, Math.min(1, protectedShare));
  },

  applyMoltenSurfaceAttritionToStructure(
    structure,
    structureKey,
    seconds,
    attritionRate,
    protectedCount
  ) {
    if (structure.count <= 0n || structure.isMoltenSurfaceAttritionImmune()) {
      this.moltenSurfaceAttritionPartialByStructure[structureKey] = 0;
      return 0;
    }

    const vulnerableCount = Math.max(0, structure.countNumber - protectedCount);
    const previousPartial = Number(
      this.moltenSurfaceAttritionPartialByStructure[structureKey]
    );
    const accumulatedLoss = (vulnerableCount * attritionRate * seconds)
      + (Number.isFinite(previousPartial) ? Math.max(0, previousPartial) : 0);
    if (accumulatedLoss < 1) {
      this.moltenSurfaceAttritionPartialByStructure[structureKey] = accumulatedLoss;
      return 0;
    }

    const loss = Number.isFinite(accumulatedLoss)
      ? normalizeBuildingCount(Math.floor(accumulatedLoss))
      : structure.count;
    const lossCount = loss > structure.count ? structure.count : loss;
    if (lossCount <= 0n) {
      return 0;
    }

    const inactiveCount = structure.count - structure.active;
    const inactiveLoss = inactiveCount < lossCount ? inactiveCount : lossCount;
    const activeLoss = lossCount - inactiveLoss;
    if (structure.requiresDeposit) {
      structure.releaseDeposit(resources, Number(lossCount));
    }
    structure.count -= lossCount;
    if (activeLoss > 0n) {
      structure.active = structure.active > activeLoss
        ? structure.active - activeLoss
        : 0n;
      structure.adjustLand(-activeLoss);
    }
    structure.updateResourceStorage();
    if (structure.active <= 0n) {
      structure.productivity = 0;
      structure.displayProductivity = 0;
    }

    this.moltenSurfaceAttritionPartialByStructure[structureKey] =
      Number.isFinite(accumulatedLoss)
        ? accumulatedLoss - Math.floor(accumulatedLoss)
        : 0;
    return Number(lossCount);
  },

  applyMoltenSurfaceAttrition(deltaTime) {
    const seconds = Math.max(0, deltaTime) / 1000;
    const attritionRate = this.getMoltenSurfaceAttritionRatePerSecond();
    if (!(seconds > 0) || !(attritionRate > 0)) {
      this.lastMoltenSurfaceAttritionLosses = 0;
      return;
    }

    const aerostatProtection = this.getMoltenSurfaceAerostatProtection();
    let losses = 0;
    for (const id in buildings) {
      const structure = buildings[id];
      const protectedCount = this.getMoltenSurfaceProtectedCount(
        structure,
        id,
        true,
        aerostatProtection
      );
      losses += this.applyMoltenSurfaceAttritionToStructure(
        structure,
        `building:${id}`,
        seconds,
        attritionRate,
        protectedCount
      );
    }
    for (const id in colonies) {
      losses += this.applyMoltenSurfaceAttritionToStructure(
        colonies[id],
        `colony:${id}`,
        seconds,
        attritionRate,
        0
      );
    }
    this.lastMoltenSurfaceAttritionLosses = losses;
  }
}));
