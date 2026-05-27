const ARTIFICIAL_QUASAR_ASSIGNMENT_CAP = 100_000_000n;
const ARTIFICIAL_QUASAR_WARP_GATE_LEVEL_CAP = 1_000_000;

class ArtificialQuasarsProject extends LiftersProject {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = 1000;
  }

  getLifterTextPath() {
    return 'ui.projects.artificialQuasars';
  }

  getExpansionRateSourceLabel() {
    return 'Artificial Quasar expansion';
  }

  getOperationRateSourceLabel() {
    return 'Artificial Quasar';
  }

  shouldKeepRunningOnTravel() {
    return true;
  }

  isAtmosphereStripDisabled() {
    return true;
  }

  renderAutomationUI() {}

  getSpaceStorageProject() {
    return {};
  }

  getAverageWarpGateNetworkLevel() {
    return warpGateNetworkManager.getAverageWarpGateLevelAllSectors();
  }

  getArtificialQuasarCapMultiplier() {
    const averageLevel = this.getAverageWarpGateNetworkLevel();
    return Math.max(1, averageLevel) / ARTIFICIAL_QUASAR_WARP_GATE_LEVEL_CAP;
  }

  getEffectiveArtificialQuasarAssignmentCap() {
    const scaled = Number(ARTIFICIAL_QUASAR_ASSIGNMENT_CAP) * this.getArtificialQuasarCapMultiplier();
    return BigInt(Math.max(0, Math.floor(scaled)));
  }

  getGasGiantMaxAssignmentForRecipe(key, recipe = null) {
    if (this.isUnassignedAssignmentKey(key)) {
      return null;
    }
    const resolved = recipe || this.getRecipe(key);
    if (!resolved) {
      return 0n;
    }
    return this.getEffectiveArtificialQuasarAssignmentCap();
  }

  getGasGiantMaxAssignmentTooltipText() {
    const averageLevel = this.getAverageWarpGateNetworkLevel();
    const networkScale = this.getArtificialQuasarCapMultiplier();
    const cap = this.getEffectiveArtificialQuasarAssignmentCap();
    return this.getProjectText(
      'maxAssignmentTooltip',
      {
        base: formatNumber(ARTIFICIAL_QUASAR_ASSIGNMENT_CAP, true, 2),
        averageLevel: formatNumber(averageLevel, true, 3),
        levelCap: formatNumber(ARTIFICIAL_QUASAR_WARP_GATE_LEVEL_CAP, true),
        networkScale: formatNumber(networkScale, true, 6),
        max: formatNumber(cap, true, 2),
      },
      `Base assignment cap: ${formatNumber(ARTIFICIAL_QUASAR_ASSIGNMENT_CAP, true, 2)}
Warp Gate Network scale: max(1, ${formatNumber(averageLevel, true, 3)}) / ${formatNumber(ARTIFICIAL_QUASAR_WARP_GATE_LEVEL_CAP, true)} = ${formatNumber(networkScale, true, 6)}
Accessible black hole assignment cap: ${formatNumber(cap, true, 2)}`
    );
  }

  storeHarvestOutputsForTick(storage, recipe, units, seconds, accumulatedChanges = null) {
    if (!(units > 0)) {
      return { totalStored: 0, storedByResource: {}, producedRatesByResource: {} };
    }

    const storedByResource = {};
    const producedRatesByResource = {};
    let totalProduced = 0;
    this.getRecipeOutputs(recipe).forEach(({ resourceKey, multiplier }) => {
      const amount = units * multiplier;
      if (!(amount > 0)) {
        return;
      }
      const producedRate = seconds > 0 ? amount / seconds : 0;
      storedByResource[resourceKey] = amount;
      producedRatesByResource[resourceKey] = producedRate;
      totalProduced += amount;

      if (accumulatedChanges) {
        accumulatedChanges.space ||= {};
        accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) + amount;
      } else {
        resources.space.energy.value += amount;
      }

      resources.space.energy.modifyRate(
        producedRate,
        this.getOperationRateSourceLabel(),
        'project'
      );
    });

    return {
      totalStored: totalProduced,
      storedByResource,
      producedRatesByResource,
    };
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastTickStats({});
      if (!this.repeatCount) {
        this.updateStatus(this.getProjectText('status.completeAtLeastOne', null, 'Complete at least one quasar'));
      } else if (!this.isRunning) {
        this.updateStatus(this.getProjectText('status.runDisabled', null, 'Run disabled'));
      } else {
        this.updateStatus(this.getProjectText('status.noAssignments', null, 'No assignments'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastTickStats({});
      this.updateStatus(this.getProjectText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    const plan = this.planOperation(seconds, productivity, accumulatedChanges, { skipEnergyLimit: true });
    const productivityByRecipe = {};
    const outputRatesByRecipe = {};
    const outputBreakdownByRecipe = {};
    const producedOutputBreakdownByRecipe = {};
    this.getRecipeKeys().forEach((key) => {
      productivityByRecipe[key] = 0;
      outputRatesByRecipe[key] = 0;
      outputBreakdownByRecipe[key] = {};
      producedOutputBreakdownByRecipe[key] = {};
    });
    plan.entries.forEach((entry) => {
      productivityByRecipe[entry.key] = entry.productivityRatio;
    });

    if (plan.entries.length === 0) {
      this.setLastTickStats({ productivityByRecipe });
      this.updateStatus(this.getProjectText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = false;
      return;
    }

    if (!(plan.plannedTotalUnits > 0)) {
      this.setLastTickStats({ productivityByRecipe });
      this.updateStatus(this.getBlockedStatusFromPlan(plan));
      this.shortfallLastTick = true;
      return;
    }

    let processedUnits = 0;
    plan.entries.forEach((entry) => {
      const units = entry.finalUnits;
      if (!(units > 0)) {
        return;
      }
      const producedOutputs = this.storeHarvestOutputsForTick(
        null,
        entry.recipe,
        units,
        seconds,
        accumulatedChanges
      );
      processedUnits += units;
      outputRatesByRecipe[entry.key] = seconds > 0 ? producedOutputs.totalStored / seconds : 0;
      outputBreakdownByRecipe[entry.key] = producedOutputs.storedByResource;
      producedOutputBreakdownByRecipe[entry.key] = producedOutputs.producedRatesByResource;
    });

    this.setLastTickStats({
      totalUnitsPerSecond: processedUnits / seconds,
      energyPerSecond: 0,
      storedSpacePerSecond: 0,
      outputRatesByRecipe,
      outputBreakdownByRecipe,
      producedOutputBreakdownByRecipe,
      productivityByRecipe,
      displayRatesByRecipe: outputRatesByRecipe,
      energyLimitedProductivityByRecipe: productivityByRecipe,
    });

    if (processedUnits > 0) {
      this.updateStatus(this.getProjectText('status.running', null, 'Running'));
      this.shortfallLastTick = false;
    } else {
      this.updateStatus(this.getBlockedStatusFromPlan(plan));
      this.shortfallLastTick = true;
    }
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    const plan = this.planOperation(seconds, productivity, accumulatedChanges, { skipEnergyLimit: true });
    if (!(plan.plannedTotalUnits > 0)) {
      return totals;
    }

    plan.entries.forEach((entry) => {
      if (!(entry.finalUnits > 0)) {
        return;
      }
      this.getRecipeOutputs(entry.recipe).forEach(({ multiplier }) => {
        const amount = entry.finalUnits * multiplier;
        if (!(amount > 0)) {
          return;
        }
        if (applyRates) {
          resources.space.energy.modifyRate(
            amount / seconds,
            this.getOperationRateSourceLabel(),
            'project'
          );
        }
        totals.gain.space ||= {};
        totals.gain.space.energy = (totals.gain.space.energy || 0) + amount;
      });
    });

    return totals;
  }

  estimateProductivityCostAndGain(deltaTime = 1000) {
    return this.estimateOperationCostAndGain(deltaTime, false, 1);
  }
}

if (typeof window !== 'undefined') {
  window.ArtificialQuasarsProject = ArtificialQuasarsProject;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArtificialQuasarsProject;
}
