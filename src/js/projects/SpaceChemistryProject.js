const SPACE_CHEMISTRY_RECIPE_KEYS = [
  'recipe1',
  'recipe2',
  'recipe3',
  'recipe4',
  'haberBosch',
  'ammoniaCombustion'
];

const SPACE_CHEMISTRY_RECIPES = {
  recipe1: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { carbonDioxide: 100, hydrogen: 9.09 }
    },
    outputs: {
      spaceStorage: { liquidWater: 81.82, graphite: 27.27 }
    }
  },
  recipe2: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { oxygen: 72.73, hydrogen: 9.09 }
    },
    outputs: {
      spaceStorage: { liquidWater: 81.82 }
    }
  },
  recipe3: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { carbonDioxide: 100, hydrogen: 18.18 }
    },
    outputs: {
      spaceStorage: { atmosphericMethane: 36.36, liquidWater: 81.82 }
    }
  },
  recipe4: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { graphite: 27.27, oxygen: 72.73 }
    },
    outputs: {
      spaceStorage: { carbonDioxide: 100 }
    }
  },
  haberBosch: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { inertGas: 100, hydrogen: 21.43 }
    },
    outputs: {
      spaceStorage: { atmosphericAmmonia: 121.43 }
    }
  },
  ammoniaCombustion: {
    inputs: {
      space: { energy: 100_000 },
      spaceStorage: { atmosphericAmmonia: 100, oxygen: 141.18 }
    },
    outputs: {
      spaceStorage: { inertGas: 82.35, liquidWater: 158.82 }
    }
  }
};

const SPACE_CHEMISTRY_RATE_ORDER = [
  'energy',
  'hydrogen',
  'carbonDioxide',
  'oxygen',
  'inertGas',
  'atmosphericAmmonia',
  'liquidWater',
  'graphite',
  'atmosphericMethane'
];

const SPACE_CHEMISTRY_RESOURCE_LABELS = {
  energy: { path: 'ui.projects.spaceChemistry.spaceEnergy', fallback: 'Space Energy' },
  hydrogen: { path: 'ui.projects.spaceStorage.resources.hydrogen', fallback: 'Hydrogen' },
  carbonDioxide: { path: 'ui.projects.spaceStorage.resources.carbonDioxide', fallback: 'Carbon Dioxide' },
  oxygen: { path: 'ui.projects.spaceStorage.resources.oxygen', fallback: 'Oxygen' },
  inertGas: { path: 'ui.projects.spaceStorage.resources.nitrogen', fallback: 'Nitrogen' },
  atmosphericAmmonia: { path: 'ui.projects.spaceStorage.resources.ammonia', fallback: 'Ammonia' },
  liquidWater: { path: 'ui.projects.spaceStorage.resources.water', fallback: 'Water' },
  graphite: { path: 'ui.projects.spaceStorage.resources.graphite', fallback: 'Graphite' },
  atmosphericMethane: { path: 'ui.projects.spaceStorage.resources.methane', fallback: 'Methane' }
};

const SPACE_CHEMISTRY_RATE_RESOURCE_LABELS = {
  energy: { path: 'ui.projects.spaceChemistry.rateLabels.energy', fallback: 'E' },
  hydrogen: { path: 'ui.projects.spaceChemistry.rateLabels.hydrogen', fallback: 'H2' },
  carbonDioxide: { path: 'ui.projects.spaceChemistry.rateLabels.carbonDioxide', fallback: 'CO2' },
  oxygen: { path: 'ui.projects.spaceChemistry.rateLabels.oxygen', fallback: 'O2' },
  inertGas: { path: 'ui.projects.spaceChemistry.rateLabels.inertGas', fallback: 'N2' },
  atmosphericAmmonia: { path: 'ui.projects.spaceChemistry.rateLabels.atmosphericAmmonia', fallback: 'NH3' },
  liquidWater: { path: 'ui.projects.spaceChemistry.rateLabels.liquidWater', fallback: 'H2O' },
  graphite: { path: 'ui.projects.spaceChemistry.rateLabels.graphite', fallback: 'C' },
  atmosphericMethane: { path: 'ui.projects.spaceChemistry.rateLabels.atmosphericMethane', fallback: 'CH4' }
};

function getSpaceChemistryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function getSpaceChemistryResourceLabel(resourceKey) {
  const labelDef = SPACE_CHEMISTRY_RESOURCE_LABELS[resourceKey];
  if (!labelDef) {
    return resourceKey;
  }
  return getSpaceChemistryText(labelDef.path, labelDef.fallback);
}

function getSpaceChemistryRateResourceLabel(resourceKey) {
  const labelDef = SPACE_CHEMISTRY_RATE_RESOURCE_LABELS[resourceKey];
  if (!labelDef) {
    return resourceKey;
  }
  return getSpaceChemistryText(labelDef.path, labelDef.fallback);
}

function formatSpaceChemistryRateText(ratesByResource = {}) {
  const segments = [];
  SPACE_CHEMISTRY_RATE_ORDER.forEach((resourceKey) => {
    const rate = ratesByResource[resourceKey] || 0;
    if (!(rate > 0)) {
      return;
    }
    segments.push(`${formatNumber(rate, true, 3)} ${getSpaceChemistryRateResourceLabel(resourceKey)}/s`);
  });
  return segments.length ? segments.join(', ') : '0/s';
}

function getSpaceChemistryRateSegments(ratesByResource = {}) {
  const segments = [];
  SPACE_CHEMISTRY_RATE_ORDER.forEach((resourceKey) => {
    const rate = ratesByResource[resourceKey] || 0;
    if (!(rate > 0)) {
      return;
    }
    segments.push(`${formatNumber(rate, true, 3)} ${getSpaceChemistryRateResourceLabel(resourceKey)}/s`);
  });
  return segments;
}

function formatSpaceChemistryResourceAmount(resourceKey, amount) {
  return getSpaceChemistryText(
    'ui.projects.spaceChemistry.resourceAmount',
    '{amount} {resource}',
    {
      amount: formatNumber(amount, true, 3),
      resource: getSpaceChemistryResourceLabel(resourceKey)
    }
  );
}

function formatSpaceChemistryRecipeBucket(bucket = {}) {
  const parts = [];
  SPACE_CHEMISTRY_RATE_ORDER.forEach((resourceKey) => {
    const amount = bucket[resourceKey] || 0;
    if (!(amount > 0)) {
      return;
    }
    parts.push(formatSpaceChemistryResourceAmount(resourceKey, amount));
  });
  return parts.join(getSpaceChemistryText('ui.projects.spaceChemistry.recipeJoiner', ' + '));
}

class SpaceChemistryProject extends NuclearAlchemyFurnaceProject {
  constructor(config, name) {
    super(config, name);
    this.lastSpaceEnergyPerSecond = 0;
    this.lastInputRatesByResource = {};
    this.lastOutputRateTextsByRecipe = {};
  }

  getText(path, vars, fallback = '') {
    return getSpaceChemistryText(`ui.projects.spaceChemistry.${path}`, fallback, vars);
  }

  getRecipe(key) {
    const recipe = SPACE_CHEMISTRY_RECIPES[key] || {};
    return {
      label: getSpaceChemistryText(
        `catalogs.buildings.boschReactor.recipes.${key}.shortName`,
        key
      ),
      complexity: 1,
      inputs: recipe.inputs || { space: {}, spaceStorage: {} },
      outputs: recipe.outputs || { spaceStorage: {} }
    };
  }

  getRecipeTooltipText(key) {
    const recipe = this.getRecipe(key);
    const inputText = formatSpaceChemistryRecipeBucket(recipe.inputs.spaceStorage || {});
    const energyText = formatSpaceChemistryRecipeBucket(recipe.inputs.space || {});
    const outputText = formatSpaceChemistryRecipeBucket(recipe.outputs.spaceStorage || {});
    return this.getText(
      'recipeTooltip',
      {
        inputs: inputText,
        energy: energyText,
        outputs: outputText
      },
      `${inputText} + ${energyText} -> ${outputText}`
    );
  }

  getAssignmentKeys() {
    return SPACE_CHEMISTRY_RECIPE_KEYS.slice();
  }

  showsComplexityColumn() {
    return false;
  }

  getAssignmentNameHeaderText() {
    return this.getText('recipe', null, 'Recipe');
  }

  getControlTitleText() {
    return this.getText('title', null, 'Space Chemistry Controls');
  }

  getTotalUnitsLabelText() {
    return this.getText('totalArrays', null, 'Total Arrays');
  }

  getRunToggleText() {
    return this.getText('runArrays', null, 'Run arrays');
  }

  getPrimaryRateLabelText() {
    return this.getText('inputUse', null, 'Input Use');
  }

  getPrimaryRateText() {
    const ratesByResource = { ...this.lastInputRatesByResource };
    if (this.lastSpaceEnergyPerSecond > 0) {
      ratesByResource.energy = this.lastSpaceEnergyPerSecond;
    }
    return formatSpaceChemistryRateText(ratesByResource);
  }

  renderPrimaryRateValue() {
    const rateElement = this.uiElements?.hydrogenRateValue;
    if (!rateElement) {
      return;
    }

    const ratesByResource = { ...this.lastInputRatesByResource };
    if (this.lastSpaceEnergyPerSecond > 0) {
      ratesByResource.energy = this.lastSpaceEnergyPerSecond;
    }

    const segments = getSpaceChemistryRateSegments(ratesByResource);
    rateElement.textContent = '';
    if (segments.length === 0) {
      rateElement.textContent = '0/s';
      return;
    }

    for (let i = 0; i < segments.length; i += 2) {
      if (i > 0) {
        rateElement.appendChild(document.createElement('br'));
      }
      const line = segments.slice(i, i + 2).join(', ');
      rateElement.appendChild(document.createTextNode(line));
    }
  }

  getExpansionRateText(rate) {
    return this.getText(
      'expansionRate',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} arrays/s`
    );
  }

  getExpansionRateSourceLabel() {
    return `${this.displayName} expansion`;
  }

  getOperationNoteText() {
    return this.getText(
      'operationNote',
      { value: formatNumber(this.getAlchemyParameter(), true, 3) },
      `Runs Bosch-derived chemistry batches at Assigned x ${formatNumber(this.getAlchemyParameter(), true, 3)}/s using space energy and space-storage reagents.`
    );
  }

  updateStatus(text) {
    this.statusText = text || this.getText('status.idle', null, 'Idle');
  }

  setLastRunStats(spaceEnergyRate = 0, outputRates = {}, inputRates = {}, outputRateTexts = {}) {
    this.lastSpaceEnergyPerSecond = spaceEnergyRate;
    this.lastInputRatesByResource = { ...inputRates };
    this.lastOutputRateTextsByRecipe = { ...outputRateTexts };
    this.lastOutputRatesByResource = {};
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

  applyOperationDelta(category, resourceKey, delta, accumulatedChanges = null) {
    if (category === 'spaceStorage') {
      this.applySpaceStorageDeltaForTick(resourceKey, delta, accumulatedChanges);
      return;
    }
    this.applyResourceDeltaForTick(category, resourceKey, delta, accumulatedChanges);
  }

  applyRate(category, resourceKey, rate) {
    if (!(rate !== 0)) {
      return;
    }
    resources[category][resourceKey].modifyRate(rate, this.displayName, 'project');
  }

  buildOperationTotals(seconds, productivity = 1) {
    const totals = {
      hasAssignments: false,
      inputTotals: { space: {}, spaceStorage: {} },
      outputTotals: { spaceStorage: {} },
      inputRates: {},
      outputRates: {},
      outputRateTexts: {},
      spaceEnergyRate: 0
    };
    const parameter = this.getAlchemyParameter();

    this.getAssignmentKeys().forEach((key) => {
      const assigned = this.furnaceAssignments[key] || 0;
      const recipe = this.getRecipe(key);
      const complexity = recipe.complexity || 1;
      if (!(assigned > 0) || !(complexity > 0)) {
        return;
      }
      const batchCount = (assigned / complexity) * parameter * seconds * productivity;
      if (!(batchCount > 0)) {
        return;
      }
      totals.hasAssignments = true;

      const recipeOutputRates = {};
      let totalRecipeOutputRate = 0;

      for (const category in recipe.inputs) {
        const bucket = recipe.inputs[category] || {};
        for (const resourceKey in bucket) {
          const amount = bucket[resourceKey] * batchCount;
          if (!(amount > 0)) {
            continue;
          }
          totals.inputTotals[category][resourceKey] = (totals.inputTotals[category][resourceKey] || 0) + amount;
        }
      }

      for (const category in recipe.outputs) {
        const bucket = recipe.outputs[category] || {};
        for (const resourceKey in bucket) {
          const amount = bucket[resourceKey] * batchCount;
          if (!(amount > 0)) {
            continue;
          }
          totals.outputTotals[category][resourceKey] = (totals.outputTotals[category][resourceKey] || 0) + amount;
          const rate = amount / seconds;
          recipeOutputRates[resourceKey] = (recipeOutputRates[resourceKey] || 0) + rate;
          totalRecipeOutputRate += rate;
        }
      }

      totals.outputRates[key] = totalRecipeOutputRate;
      totals.outputRateTexts[key] = formatSpaceChemistryRateText(recipeOutputRates);
    });

    for (const resourceKey in totals.inputTotals.spaceStorage) {
      totals.inputRates[resourceKey] = totals.inputTotals.spaceStorage[resourceKey] / seconds;
    }
    totals.spaceEnergyRate = (totals.inputTotals.space.energy || 0) / seconds;

    return totals;
  }

  getOperationShortfallStatus(productivity = 1) {
    let hasAnyInput = false;
    for (const key of this.getAssignmentKeys()) {
      const assigned = this.furnaceAssignments[key] || 0;
      if (!(assigned > 0)) {
        continue;
      }
      const recipe = this.getRecipe(key);
      for (const category in recipe.inputs) {
        const bucket = recipe.inputs[category] || {};
        for (const resourceKey in bucket) {
          if (!(bucket[resourceKey] > 0)) {
            continue;
          }
          hasAnyInput = true;
          const ratio = Number(resources[category][resourceKey].availabilityRatio) || 0;
          if (ratio <= 0) {
            return this.getText('status.noSpaceInput', null, 'No space input');
          }
          if (ratio < 1) {
            return this.getText('status.insufficientSpaceInput', null, 'Insufficient space input');
          }
        }
      }
    }
    if (!hasAnyInput) {
      return this.getText('status.idle', null, 'Idle');
    }
    if (productivity < 1) {
      return this.getText('status.insufficientSpaceInput', null, 'Insufficient space input');
    }
    return this.getText('status.idle', null, 'Idle');
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, {}, {}, {});
      if (!this.repeatCount) {
        this.updateStatus(this.getText('status.completeAtLeastOne', null, 'Complete at least one array'));
      } else if (!this.isRunning) {
        this.updateStatus(this.getText('status.runDisabled', null, 'Run disabled'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, {}, {}, {});
      this.updateStatus(this.getText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      this.setLastRunStats(0, {}, {}, {});
      this.updateStatus(this.getText('status.buildSpaceStorage', null, 'Build space storage'));
      this.shortfallLastTick = true;
      return;
    }

    const totals = this.buildOperationTotals(seconds, productivity);
    if (!totals.hasAssignments) {
      this.setLastRunStats(0, {}, {}, {});
      this.updateStatus(this.getText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }

    let hasOutput = false;
    for (const category in totals.outputTotals) {
      for (const resourceKey in totals.outputTotals[category]) {
        if (totals.outputTotals[category][resourceKey] > 0) {
          hasOutput = true;
        }
      }
    }
    if (!hasOutput) {
      this.setLastRunStats(0, {}, {}, {});
      const status = this.getOperationShortfallStatus(productivity);
      this.updateStatus(status);
      this.shortfallLastTick = status !== this.getText('status.idle', null, 'Idle');
      return;
    }

    for (const category in totals.inputTotals) {
      for (const resourceKey in totals.inputTotals[category]) {
        this.applyOperationDelta(category, resourceKey, -totals.inputTotals[category][resourceKey], accumulatedChanges);
      }
    }
    for (const category in totals.outputTotals) {
      for (const resourceKey in totals.outputTotals[category]) {
        this.applyOperationDelta(category, resourceKey, totals.outputTotals[category][resourceKey], accumulatedChanges);
      }
    }

    if (!accumulatedChanges) {
      storage.reconcileUsedStorage();
      updateSpaceStorageUI(storage);
    }

    for (const resourceKey in totals.inputRates) {
      this.applyRate('spaceStorage', resourceKey, -totals.inputRates[resourceKey]);
    }
    if (totals.spaceEnergyRate > 0) {
      this.applyRate('space', 'energy', -totals.spaceEnergyRate);
    }
    for (const resourceKey in totals.outputTotals.spaceStorage) {
      this.applyRate('spaceStorage', resourceKey, totals.outputTotals.spaceStorage[resourceKey] / seconds);
    }

    this.setLastRunStats(
      totals.spaceEnergyRate,
      totals.outputRates,
      totals.inputRates,
      totals.outputRateTexts
    );
    this.updateStatus(this.getText('status.running', null, 'Running'));
    this.shortfallLastTick = false;
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

    this.normalizeAssignments();
    const operationTotals = this.buildOperationTotals(seconds, productivity);
    if (!operationTotals.hasAssignments) {
      return totals;
    }

    if (applyRates) {
      for (const resourceKey in operationTotals.inputRates) {
        this.applyRate('spaceStorage', resourceKey, -operationTotals.inputRates[resourceKey]);
      }
      if (operationTotals.spaceEnergyRate > 0) {
        this.applyRate('space', 'energy', -operationTotals.spaceEnergyRate);
      }
      for (const resourceKey in operationTotals.outputTotals.spaceStorage) {
        this.applyRate('spaceStorage', resourceKey, operationTotals.outputTotals.spaceStorage[resourceKey] / seconds);
      }
    }

    for (const category in operationTotals.inputTotals) {
      totals.cost[category] ||= {};
      for (const resourceKey in operationTotals.inputTotals[category]) {
        totals.cost[category][resourceKey] =
          (totals.cost[category][resourceKey] || 0) + operationTotals.inputTotals[category][resourceKey];
      }
    }

    for (const category in operationTotals.outputTotals) {
      totals.gain[category] ||= {};
      for (const resourceKey in operationTotals.outputTotals[category]) {
        totals.gain[category][resourceKey] =
          (totals.gain[category][resourceKey] || 0) + operationTotals.outputTotals[category][resourceKey];
      }
    }

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
    const operationTotals = this.buildOperationTotals(seconds, 1);
    if (!operationTotals.hasAssignments) {
      return totals;
    }

    for (const category in operationTotals.inputTotals) {
      totals.cost[category] ||= {};
      for (const resourceKey in operationTotals.inputTotals[category]) {
        totals.cost[category][resourceKey] = operationTotals.inputTotals[category][resourceKey];
      }
    }

    return totals;
  }

  updateUI() {
    super.updateUI();
    if (!this.uiElements || !this.uiElements.rowElements) {
      return;
    }
    this.renderPrimaryRateValue();
    this.getAssignmentKeys().forEach((key) => {
      const row = this.uiElements.rowElements[key];
      if (!row || !row.rate) {
        return;
      }
      row.rate.textContent = this.lastOutputRateTextsByRecipe[key] || '0/s';
    });
  }
}

window.SpaceChemistryProject = SpaceChemistryProject;
