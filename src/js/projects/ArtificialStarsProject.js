const ARTIFICIAL_STAR_RECIPE = {
  label: '',
  outputCategory: 'space',
  outputKey: 'energy',
  baseOutput: 25_000_000_000_000_000_000_000,
  inputs: {
    spaceStorage: {
      hydrogen: 50_000_000_000
    }
  },
  wgcUpgradeId: 'superalloyFusionEfficiency'
};

class ArtificialStarsProject extends NuclearAlchemyFurnaceProject {
  constructor(config, name) {
    super(config, name);
    this.lastHydrogenPerSecond = 0;
    this.lastSpaceEnergyPerSecond = 0;
  }

  getText(path, vars, fallback = '') {
    return t(`ui.projects.artificialStars.${path}`, vars, fallback);
  }

  getAssignmentKeys() {
    return ['energy'];
  }

  getRecipe() {
    ARTIFICIAL_STAR_RECIPE.label = this.getText('recipeLabel', null, 'Space Energy');
    return ARTIFICIAL_STAR_RECIPE;
  }

  showsComplexityColumn() {
    return false;
  }

  getAssignmentNameHeaderText() {
    return this.getText('output', null, 'Output');
  }

  getControlTitleText() {
    return this.getText('title', null, 'Artificial Star Controls');
  }

  getTotalUnitsLabelText() {
    return this.getText('totalStars', null, 'Total Artificial Stars');
  }

  getRunToggleText() {
    return this.getText('runStars', null, 'Run artificial stars');
  }

  getPrimaryRateLabelText() {
    return this.getText('inputUse', null, 'Input Use');
  }

  getPrimaryRateText() {
    return this.getText(
      'hydrogenRate',
      { value: formatNumber(this.lastHydrogenPerSecond, true, 3) },
      `${formatNumber(this.lastHydrogenPerSecond, true, 3)} hydrogen/s`
    );
  }

  getExpansionRateText(rate) {
    return this.getText(
      'expansionRate',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} stars/s`
    );
  }

  getRecipeWgcMultiplier() {
    return warpGateCommand.getMultiplier(ARTIFICIAL_STAR_RECIPE.wgcUpgradeId);
  }

  getOperationNoteText() {
    const parameter = formatNumber(this.getAlchemyParameter(), true, 3);
    const wgcMultiplier = this.getRecipeWgcMultiplier();
    return this.getText(
      'operationNote',
      {
        parameter,
        hydrogen: formatNumber(ARTIFICIAL_STAR_RECIPE.inputs.spaceStorage.hydrogen, true),
        output: formatNumber(ARTIFICIAL_STAR_RECIPE.baseOutput, true),
        wgcMultiplier: formatNumber(wgcMultiplier, true, 3)
      },
      `Runs artificial stars at Assigned x ${parameter}/s. Each assignment consumes ${formatNumber(ARTIFICIAL_STAR_RECIPE.inputs.spaceStorage.hydrogen, true)} hydrogen and produces ${formatNumber(ARTIFICIAL_STAR_RECIPE.baseOutput, true)} space energy, with both throughput and output multiplied by WGC superalloy fusion bonuses (x${formatNumber(wgcMultiplier, true, 3)}).`
    );
  }

  setLastRunStats(spaceEnergyRate = 0, outputRates = {}, hydrogenRate = 0) {
    this.lastSpaceEnergyPerSecond = spaceEnergyRate;
    this.lastHydrogenPerSecond = hydrogenRate;
    this.lastOutputRatesByResource = { ...outputRates };
    this.lastTotalOutputPerSecond = 0;
    this.getAssignmentKeys().forEach((key) => {
      const value = outputRates[key] || 0;
      this.lastOutputRatesByResource[key] = value;
      this.lastTotalOutputPerSecond += value;
    });
  }

  applyResourceDeltaForTick(category, resourceKey, delta, accumulatedChanges = null) {
    if (!(delta !== 0)) {
      return;
    }
    if (accumulatedChanges) {
      accumulatedChanges[category] ||= {};
      accumulatedChanges[category][resourceKey] = (accumulatedChanges[category][resourceKey] || 0) + delta;
      return;
    }
    resources[category][resourceKey].value = Math.max(0, (resources[category][resourceKey].value || 0) + delta);
  }

  buildOperationPlan(seconds, productivity = 1) {
    const plan = {
      finalHydrogen: 0,
      finalOutput: 0,
      hasAssignments: false,
      reasons: {
        noStorage: false
      }
    };

    const assigned = this.furnaceAssignments.energy || 0;
    if (!(assigned > 0)) {
      return plan;
    }

    if (!this.getSpaceStorageProject()) {
      plan.hasAssignments = true;
      plan.reasons.noStorage = true;
      return plan;
    }

    const desiredBatches = assigned * this.getAlchemyParameter() * seconds * productivity;
    if (!(desiredBatches > 0)) {
      plan.hasAssignments = true;
      return plan;
    }

    const recipe = this.getRecipe();
    const wgcMultiplier = this.getRecipeWgcMultiplier();

    plan.hasAssignments = true;
    plan.finalHydrogen = desiredBatches * recipe.inputs.spaceStorage.hydrogen * wgcMultiplier;
    plan.finalOutput = desiredBatches * recipe.baseOutput * wgcMultiplier;
    return plan;
  }

  getOperationShortfallStatus(productivity = 1) {
    const hydrogenRatio = Math.max(
      0,
      Math.min(1, Number(resources.spaceStorage.hydrogen.availabilityRatio) || 0)
    );
    if (hydrogenRatio <= 0) {
      return this.getText('status.noHydrogen', null, 'No hydrogen in space storage');
    }
    if (hydrogenRatio < 1 || productivity < 1) {
      return this.getText('status.insufficientHydrogen', null, 'Insufficient hydrogen in space storage');
    }
    return this.getText('status.idle', null, 'Idle');
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, {}, 0);
      if (!this.repeatCount) {
        this.updateStatus(this.getText('status.completeAtLeastOne', null, 'Complete at least one artificial star'));
      } else if (!this.isRunning) {
        this.updateStatus(this.getText('status.runDisabled', null, 'Run disabled'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity);
    if (!plan.hasAssignments) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }
    if (plan.reasons.noStorage) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.buildSpaceStorage', null, 'Build space storage'));
      this.shortfallLastTick = true;
      return;
    }
    if (!(plan.finalOutput > 0)) {
      this.setLastRunStats(0, {}, 0);
      const status = this.getOperationShortfallStatus(productivity);
      this.updateStatus(status);
      this.shortfallLastTick = status !== this.getText('status.idle', null, 'Idle');
      return;
    }

    const storage = this.getSpaceStorageProject();
    this.applySpaceStorageDeltaForTick('hydrogen', -plan.finalHydrogen, accumulatedChanges);
    this.applyResourceDeltaForTick('space', 'energy', plan.finalOutput, accumulatedChanges);

    if (!accumulatedChanges) {
      storage.reconcileUsedStorage();
      updateSpaceStorageUI(storage);
    }

    const hydrogenRate = plan.finalHydrogen / seconds;
    const outputRate = plan.finalOutput / seconds;

    resources.spaceStorage.hydrogen.modifyRate(-hydrogenRate, this.displayName, 'project');
    resources.space.energy.modifyRate(outputRate, this.displayName, 'project');

    this.setLastRunStats(outputRate, { energy: outputRate }, hydrogenRate);
    this.updateStatus(this.getText('status.running', null, 'Running'));
    this.shortfallLastTick = false;
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity);
    if (!(plan.finalOutput > 0)) {
      return totals;
    }

    if (applyRates) {
      resources.spaceStorage.hydrogen.modifyRate(-(plan.finalHydrogen / seconds), this.displayName, 'project');
      resources.space.energy.modifyRate(plan.finalOutput / seconds, this.displayName, 'project');
    }

    totals.cost.spaceStorage ||= {};
    totals.cost.spaceStorage.hydrogen = (totals.cost.spaceStorage.hydrogen || 0) + plan.finalHydrogen;

    totals.gain.space ||= {};
    totals.gain.space.energy = (totals.gain.space.energy || 0) + plan.finalOutput;

    return totals;
  }

  estimateProductivityCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();
    const assigned = this.furnaceAssignments.energy || 0;
    if (!(assigned > 0)) {
      return totals;
    }

    const desiredBatches = assigned * this.getAlchemyParameter() * seconds;
    if (!(desiredBatches > 0)) {
      return totals;
    }

    totals.cost.spaceStorage = {
      hydrogen: desiredBatches * ARTIFICIAL_STAR_RECIPE.inputs.spaceStorage.hydrogen * this.getRecipeWgcMultiplier()
    };

    return totals;
  }
}

window.ArtificialStarsProject = ArtificialStarsProject;
