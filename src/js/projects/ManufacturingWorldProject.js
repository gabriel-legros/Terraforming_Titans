(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  function getManufacturingText(path, vars) {
    try {
      return t(path, vars, '');
    } catch (error) {
      return '';
    }
  }

  const MANUFACTURING_RECIPE_KEYS = [
    'glass',
    'graphene',
    'components',
    'electronics',
    'superconductors',
    'superalloys',
  ];
  const MANUFACTURING_UNASSIGNED_KEY = 'idleUnassigned';

  const MANUFACTURING_RECIPES = {
    glass: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.glass.label'),
      outputStorageKey: 'glass',
      complexity: 5,
      baseOutput: 1,
      inputs: { silicon: 1 },
      shopId: 'glassEfficiency',
      wgcUpgradeId: null,
    },
    graphene: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.graphene.label'),
      outputStorageKey: 'metal',
      complexity: 25,
      baseOutput: 50,
      inputs: { graphite: 50 },
      shopId: 'grapheneEfficiency',
      wgcUpgradeId: null,
    },
    components: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.components.label'),
      outputStorageKey: 'components',
      complexity: 100,
      baseOutput: 1,
      inputs: { metal: 5 },
      shopId: 'componentsEfficiency',
      wgcUpgradeId: 'componentsEfficiency',
    },
    electronics: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.electronics.label'),
      outputStorageKey: 'electronics',
      complexity: 100,
      baseOutput: 1,
      inputs: { metal: 1, silicon: 4 },
      shopId: 'electronicsEfficiency',
      wgcUpgradeId: 'electronicsEfficiency',
    },
    superconductors: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.superconductors.label'),
      outputStorageKey: 'superconductors',
      complexity: 500,
      baseOutput: 1,
      inputs: { metal: 5 },
      shopId: 'superconductorEfficiency',
      wgcUpgradeId: 'superconductorEfficiency',
    },
    superalloys: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.superalloys.label'),
      outputStorageKey: 'superalloys',
      complexity: 100,
      baseOutput: 0.001,
      inputs: { metal: 1 },
      shopId: 'superalloyEfficiency',
      wgcUpgradeId: 'superalloyEfficiency',
    },
  };

  const MANUFACTURING_SHOP_ITEMS = [
    {
      id: 'glassEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.glassEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.glassEfficiency.description'),
    },
    {
      id: 'grapheneEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.grapheneEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.grapheneEfficiency.description'),
    },
    {
      id: 'componentsEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.componentsEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.componentsEfficiency.description'),
    },
    {
      id: 'electronicsEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.electronicsEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.electronicsEfficiency.description'),
    },
    {
      id: 'superconductorEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.superconductorEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.superconductorEfficiency.description'),
    },
    {
      id: 'superalloyEfficiency',
      label: getManufacturingText('catalogs.specializations.manufacturing.shopItems.superalloyEfficiency.label'),
      cost: 1,
      maxPurchases: 900,
      description: getManufacturingText('catalogs.specializations.manufacturing.shopItems.superalloyEfficiency.description'),
    },
  ];

  const MANUFACTURING_SHOP_ITEM_MAP = MANUFACTURING_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const MANUFACTURING_FLAT_HYDROGEN_PER_WORKER = 1e-6;

  const MANUFACTURING_INPUT_KEYS = MANUFACTURING_RECIPE_KEYS.reduce((keys, recipeKey) => {
    const recipe = MANUFACTURING_RECIPES[recipeKey];
    Object.keys(recipe.inputs).forEach((inputKey) => {
      if (!keys.includes(inputKey)) {
        keys.push(inputKey);
      }
    });
    return keys;
  }, []);
  if (!MANUFACTURING_INPUT_KEYS.includes('hydrogen')) {
    MANUFACTURING_INPUT_KEYS.push('hydrogen');
  }

  const MANUFACTURING_INPUT_LABELS = {
    metal: getManufacturingText('catalogs.specializations.manufacturing.inputLabels.metal'),
    silicon: getManufacturingText('catalogs.specializations.manufacturing.inputLabels.silicon'),
    graphite: getManufacturingText('catalogs.specializations.manufacturing.inputLabels.graphite'),
    hydrogen: getManufacturingText('catalogs.specializations.manufacturing.inputLabels.hydrogen'),
  };

  const MANUFACTURING_OUTPUT_LABELS = {
    glass: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.glass'),
    metal: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.metal'),
    components: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.components'),
    electronics: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.electronics'),
    superconductors: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.superconductors'),
    superalloys: getManufacturingText('catalogs.specializations.manufacturing.outputLabels.superalloys'),
  };

  class ManufacturingWorldProject extends SpecializationBase {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'manufacturingPoints',
        pointsLabel: getManufacturingText('catalogs.specializations.manufacturing.pointsLabel'),
        pointsUnit: 'MP',
        shopTitle: getManufacturingText('catalogs.specializations.manufacturing.shopTitle'),
        shopTooltip: getManufacturingText('catalogs.specializations.manufacturing.shopTooltip'),
        emptyShopText: '',
        shopItems: MANUFACTURING_SHOP_ITEMS,
        shopItemMap: MANUFACTURING_SHOP_ITEM_MAP,
        specializationSourceId: 'manufacturingWorld',
        otherSpecializationIds: ['bioworld', 'foundryWorld'],
        ecumenopolisEffectPrefix: 'manufacturingWorld',
        hazardPointBonusPerHazard: 0.1,
      });
      this.cumulativePopulation = 0;
      this.manufacturingAssignments = {};
      this.assignmentStep = 1;
      this.autoAssignFlags = {};
      this.autoAssignWeights = {};
      this.isRunning = false;
      this.statusText = getManufacturingText('catalogs.specializations.manufacturing.status.idle');
      this.lastInputRates = this.createEmptyInputRates();
      this.lastOutputRatesByRecipe = {};
      this.operationPreRunThisTick = false;
      this.uiElements = null;
      this.shopCollapsed = false;
    }

    createEmptyInputRates() {
      const rates = {};
      MANUFACTURING_INPUT_KEYS.forEach((inputKey) => {
        rates[inputKey] = 0;
      });
      return rates;
    }

    getCurrentPopulation() {
      return Math.max(0, resources.colony.colonists.value || 0);
    }

    getTravelPointGain() {
      const population = Math.max(1, this.getCurrentPopulation());
      const basePoints = Math.max(1, Math.log10(population));
      return this.applyHazardPointBonus(basePoints);
    }

    addManufacturingPopulation(value) {
      this.cumulativePopulation += Math.max(0, value || 0);
    }

    getTotalPotentialPopulation() {
      return Math.max(0, Math.floor(this.cumulativePopulation));
    }

    getAssignmentKeys() {
      return MANUFACTURING_RECIPE_KEYS.slice();
    }

    getUnassignedAssignmentKey() {
      return MANUFACTURING_UNASSIGNED_KEY;
    }

    getManagedAssignmentKeys() {
      return [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
    }

    isUnassignedAssignmentKey(key) {
      return key === this.getUnassignedAssignmentKey();
    }

    getUnassignedAssignmentLabel() {
      return getManufacturingText('ui.projects.common.idleUnassigned') || 'Idle/Unassigned';
    }

    getRecipe(key) {
      return MANUFACTURING_RECIPES[key];
    }

    getRecipeConsumptionMultiplier(key) {
      const recipe = this.getRecipe(key);
      if (!recipe) {
        return 1;
      }
      return 1 + (this.getShopPurchaseCount(recipe.shopId) * 0.01);
    }

    getRecipeOutputMultiplier(key) {
      const recipe = this.getRecipe(key);
      if (!recipe) {
        return 1;
      }
      let multiplier = 1 + (this.getShopPurchaseCount(recipe.shopId) * 0.01);
      if (recipe.wgcUpgradeId) {
        try {
          multiplier *= warpGateCommand.getMultiplier(recipe.wgcUpgradeId);
        } catch (error) {}
      }
      return multiplier;
    }

    getRecipeWgcMultiplier(key) {
      const recipe = this.getRecipe(key);
      if (!recipe || !recipe.wgcUpgradeId) {
        return 1;
      }
      try {
        return warpGateCommand.getMultiplier(recipe.wgcUpgradeId);
      } catch (error) {}
      return 1;
    }

    getRecipeTooltipText(key) {
      const recipe = this.getRecipe(key);
      if (!recipe) {
        return '';
      }
      const outputLabel = MANUFACTURING_OUTPUT_LABELS[recipe.outputStorageKey] || recipe.outputStorageKey;
      const inputParts = Object.keys(recipe.inputs).map((inputKey) => {
        const label = MANUFACTURING_INPUT_LABELS[inputKey] || inputKey;
        return `${formatNumber(recipe.inputs[inputKey], true)} ${label}`;
      });
      const lines = [
        getManufacturingText('catalogs.specializations.manufacturing.tooltip.produces', {
          amount: formatNumber(recipe.baseOutput, true),
          label: recipe.label,
          storage: outputLabel,
        }),
        getManufacturingText('catalogs.specializations.manufacturing.tooltip.consumes', {
          inputs: inputParts.join(', '),
        }),
      ];
      if (recipe.wgcUpgradeId) {
        const wgcMultiplier = this.getRecipeWgcMultiplier(key);
        const bonusPercent = Math.max(0, (wgcMultiplier - 1) * 100);
        lines.push(getManufacturingText('catalogs.specializations.manufacturing.tooltip.wgcBonus', {
          multiplier: formatNumber(wgcMultiplier, true, 3),
          percent: formatNumber(bonusPercent, true, 2),
        }));
      }
      return lines.join('\n');
    }

    getSpecializationRequirements() {
      const foundry = projectManager.projects.foundryWorld;
      const bioworld = projectManager.projects.bioworld;
      const holyWorldBlocked = followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated();
      return [
        {
          id: 'terraformed',
          label: getManufacturingText('catalogs.specializations.manufacturing.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'otherSpecialization',
          label: getManufacturingText('catalogs.specializations.manufacturing.requirements.otherSpecialization'),
          met: !holyWorldBlocked
            && !foundry.isActive
            && !foundry.isCompleted
            && !bioworld.isActive
            && !bioworld.isCompleted,
        },
      ];
    }

    getSpecializationLockedText() {
      if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
        return getManufacturingText('catalogs.specializations.manufacturing.lockedByHolyWorld');
      }
      return super.getSpecializationLockedText();
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
        return false;
      }
      if (!spaceManager.isCurrentWorldTerraformed()) {
        return false;
      }
      const foundry = projectManager.projects.foundryWorld;
      const bioworld = projectManager.projects.bioworld;
      if (foundry.isActive || foundry.isCompleted) {
        return false;
      }
      if (bioworld.isActive || bioworld.isCompleted) {
        return false;
      }
      return true;
    }

    prepareTravelState() {
      if (this.isCompleted) {
        this.addManufacturingPopulation(this.getCurrentPopulation());
      }
      super.prepareTravelState();
    }

    applySpecializationEffects() {}

    normalizeAssignments() {
      const keys = this.getManagedAssignmentKeys();
      const keySet = new Set(keys);
      const total = this.getTotalPotentialPopulation();

      keys.forEach((key) => {
        this.manufacturingAssignments[key] = Math.max(0, Math.floor(this.manufacturingAssignments[key] || 0));
        this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
        const weight = Number(this.autoAssignWeights[key]);
        this.autoAssignWeights[key] = Number.isFinite(weight) ? Math.max(0, weight) : 1;
      });

      Object.keys(this.manufacturingAssignments).forEach((key) => {
        if (!keySet.has(key)) {
          this.manufacturingAssignments[key] = 0;
        }
      });

      let usedManual = 0;
      keys.forEach((key) => {
        if (!this.autoAssignFlags[key]) {
          usedManual += this.manufacturingAssignments[key];
        }
      });

      const autoKeys = keys.filter((key) => this.autoAssignFlags[key]);
      const remaining = Math.max(0, total - usedManual);
      if (autoKeys.length > 0) {
        let totalWeight = 0;
        autoKeys.forEach((key) => {
          totalWeight += this.autoAssignWeights[key];
        });

        if (totalWeight <= 0) {
          autoKeys.forEach((key) => {
            this.manufacturingAssignments[key] = 0;
          });
        } else {
        const remainders = [];
        let assigned = 0;
        autoKeys.forEach((key) => {
          const exact = remaining * (this.autoAssignWeights[key] / totalWeight);
          const floorValue = Math.floor(exact);
            this.manufacturingAssignments[key] = floorValue;
            assigned += floorValue;
            remainders.push({ key, value: exact - floorValue });
          });
        let leftover = remaining - assigned;
        remainders.sort((left, right) => right.value - left.value);
        for (let i = 0; i < remainders.length && leftover > 0; i += 1) {
          this.manufacturingAssignments[remainders[i].key] += 1;
          leftover -= 1;
        }
        if (leftover > 0 && autoKeys.length > 0) {
          const idleKey = this.getUnassignedAssignmentKey();
          const targetKey = autoKeys.includes(idleKey) ? idleKey : autoKeys[0];
          this.manufacturingAssignments[targetKey] += leftover;
        }
      }
    }

      let assignedTotal = keys.reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0), 0);
      if (assignedTotal > total) {
        let excess = assignedTotal - total;
        for (let i = keys.length - 1; i >= 0 && excess > 0; i -= 1) {
          const key = keys[i];
          const current = this.manufacturingAssignments[key] || 0;
          const reduction = Math.min(current, excess);
          this.manufacturingAssignments[key] = current - reduction;
          excess -= reduction;
        }
        assignedTotal = keys.reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0), 0);
      }
    }

    getAssignedTotal() {
      this.normalizeAssignments();
      return this.getAssignmentKeys().reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0), 0);
    }

    getAvailablePopulation() {
      return Math.max(0, this.getTotalPotentialPopulation() - this.getAssignedTotal());
    }

    getStoredAssignmentAmount(key) {
      return this.manufacturingAssignments[key] || 0;
    }

    getDisplayedAssignmentAmount(key) {
      if (this.isUnassignedAssignmentKey(key)) {
        return this.getAvailablePopulation();
      }
      return this.getStoredAssignmentAmount(key);
    }

    getAssignmentMaxTarget(key) {
      const keys = this.getManagedAssignmentKeys();
      const total = this.getTotalPotentialPopulation();
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key) {
          return sum;
        }
        if (this.autoAssignFlags[otherKey]) {
          return sum;
        }
        return sum + this.getStoredAssignmentAmount(otherKey);
      }, 0);
      return Math.max(0, total - usedOther);
    }

    setAssignmentStep(step) {
      this.assignmentStep = Math.min(1e50, Math.max(1, Math.round(step)));
    }

    setAutoAssignTarget(key, enabled) {
      this.autoAssignFlags[key] = enabled === true;
      this.normalizeAssignments();
      this.updateUI();
    }

    adjustAssignment(key, delta) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.normalizeAssignments();
      const current = this.getStoredAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);
      this.manufacturingAssignments[key] = Math.min(maxForKey, Math.max(0, current + delta));
      this.normalizeAssignments();
      this.updateUI();
    }

    clearAssignment(key) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.manufacturingAssignments[key] = 0;
      this.normalizeAssignments();
      this.updateUI();
    }

    maximizeAssignment(key) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.normalizeAssignments();
      this.manufacturingAssignments[key] = this.getAssignmentMaxTarget(key);
      this.normalizeAssignments();
      this.updateUI();
    }

    setRunning(enabled) {
      const next = enabled === true;
      if (this.isRunning === next) {
        return;
      }
      this.isRunning = next;
      if (!next) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
      }
      this.updateUI();
    }

    updateStatus(text) {
      this.statusText = text || getManufacturingText('catalogs.specializations.manufacturing.status.idle');
    }

    syncAssignmentRowHeights() {
      const elements = this.uiElements;
      if (!elements || !elements.rowElements) {
        return;
      }
      this.getAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row || !row.rowA || !row.rowB || !row.rowC) {
          return;
        }
        row.rowA.style.minHeight = '';
        row.rowB.style.minHeight = '';
        row.rowC.style.minHeight = '';
      });
      this.getAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row || !row.rowA || !row.rowB || !row.rowC) {
          return;
        }
        const maxHeight = Math.max(row.rowA.offsetHeight, row.rowB.offsetHeight, row.rowC.offsetHeight);
        const heightText = `${maxHeight}px`;
        row.rowA.style.minHeight = heightText;
        row.rowB.style.minHeight = heightText;
        row.rowC.style.minHeight = heightText;
      });
    }

    setLastRunStats(inputRates = {}, outputRates = {}) {
      this.lastInputRates = this.createEmptyInputRates();
      MANUFACTURING_INPUT_KEYS.forEach((inputKey) => {
        this.lastInputRates[inputKey] = inputRates[inputKey] || 0;
      });
      this.lastOutputRatesByRecipe = {};
      this.getAssignmentKeys().forEach((key) => {
        this.lastOutputRatesByRecipe[key] = outputRates[key] || 0;
      });
    }

    shouldOperate() {
      return this.isRunning && this.getTotalPotentialPopulation() > 0;
    }

    getRecipeOperationProductivity(key, productivity = 1) {
      const clamp = (value) => Math.max(0, Math.min(1, value));
      if (Number.isFinite(productivity)) {
        return clamp(productivity);
      }
      const value = productivity?.[key];
      if (Number.isFinite(value)) {
        return clamp(value);
      }
      return 1;
    }

    getOperationProductivityForTick() {
      const productivityByRecipe = {};
      this.normalizeAssignments();
      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0;
        if (assigned <= 0) {
          productivityByRecipe[key] = 0;
          return;
        }
        const recipe = this.getRecipe(key);
        let productivity = 1;
        Object.keys(recipe.inputs).forEach((inputKey) => {
          const ratio = resources.spaceStorage[inputKey].availabilityRatio;
          productivity = Math.min(productivity, ratio);
        });
        productivityByRecipe[key] = Math.max(0, Math.min(1, productivity));
      });
      return productivityByRecipe;
    }

    getSpaceStorageProject() {
      return projectManager.projects.spaceStorage;
    }

    applySpaceStorageDeltaForTick(resourceKey, delta, accumulatedChanges = null) {
      if (!(delta !== 0)) {
        return;
      }
      if (accumulatedChanges) {
        accumulatedChanges.spaceStorage ||= {};
        if (accumulatedChanges.spaceStorage[resourceKey] === undefined) {
          accumulatedChanges.spaceStorage[resourceKey] = 0;
        }
        accumulatedChanges.spaceStorage[resourceKey] += delta;
        return;
      }
      resources.spaceStorage[resourceKey].value += delta;
    }

    getAvailableSpaceStorageForTick(resourceKey, accumulatedChanges = null) {
      const storage = this.getSpaceStorageProject();
      if (!storage) {
        return 0;
      }
      const baseAvailable = storage.getAvailableStoredResource(resourceKey);
      if (!accumulatedChanges || !accumulatedChanges.spaceStorage) {
        return baseAvailable;
      }
      const delta = accumulatedChanges.spaceStorage[resourceKey] || 0;
      return Math.max(0, baseAvailable + delta);
    }

    runManufacturing(deltaTime = 1000, productivity = 1, accumulatedChanges = null) {
      if (!this.shouldOperate()) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        if (!this.isRunning) {
          this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
        } else {
          this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.noCumulativePopulation'));
        }
        this.shortfallLastTick = false;
        return;
      }

      const seconds = deltaTime / 1000;
      if (!(seconds > 0)) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.idle'));
        this.shortfallLastTick = false;
        return;
      }

      const storage = this.getSpaceStorageProject();
      if (!storage) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.buildSpaceStorage'));
        this.shortfallLastTick = true;
        return;
      }

      this.normalizeAssignments();
      const entries = [];
      let hasInputShortfall = false;

      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0;
        if (assigned <= 0) {
          return;
        }
        const recipe = this.getRecipe(key);
        const recipeProductivity = this.getRecipeOperationProductivity(key, productivity);
        const outputMultiplier = this.getRecipeOutputMultiplier(key);
        const consumptionMultiplier = this.getRecipeConsumptionMultiplier(key);
        const desiredOutput = ((assigned * recipe.baseOutput * outputMultiplier) / recipe.complexity) * seconds * recipeProductivity;
        const desiredInputs = {};
        Object.keys(recipe.inputs).forEach((inputKey) => {
          const amount = ((assigned * recipe.inputs[inputKey] * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
          desiredInputs[inputKey] = amount;
          if (!hasInputShortfall && amount > 0 && recipeProductivity < 1) {
            hasInputShortfall = true;
          }
        });
        entries.push({
          key,
          assigned,
          recipe,
          desiredOutput,
          desiredInputs,
        });
      });

      if (entries.length === 0) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.noAssignments'));
        this.shortfallLastTick = false;
        return;
      }

      const inputSpent = this.createEmptyInputRates();
      const outputProduced = {};
      let totalOutput = 0;

      entries.forEach((entry) => {
        Object.keys(entry.desiredInputs).forEach((inputKey) => {
          const consumed = entry.desiredInputs[inputKey] || 0;
          if (consumed > 0) {
            inputSpent[inputKey] += consumed;
            this.applySpaceStorageDeltaForTick(inputKey, -consumed, accumulatedChanges);
          }
        });

        const desiredProduced = entry.desiredOutput;
        if (desiredProduced > 0) {
          this.applySpaceStorageDeltaForTick(entry.recipe.outputStorageKey, desiredProduced, accumulatedChanges);
          totalOutput += desiredProduced;
        }
        outputProduced[entry.key] = desiredProduced;
      });

      if (MANUFACTURING_FLAT_HYDROGEN_PER_WORKER > 0) {
        const assignedTotal = entries.reduce((sum, entry) => sum + (entry.assigned || 0), 0);
        const desiredHydrogen = assignedTotal * MANUFACTURING_FLAT_HYDROGEN_PER_WORKER * seconds;
        if (desiredHydrogen > 0) {
          const hydrogenSpent = Math.min(
            desiredHydrogen,
            this.getAvailableSpaceStorageForTick('hydrogen', accumulatedChanges)
          );
          if (hydrogenSpent > 0) {
            inputSpent.hydrogen += hydrogenSpent;
            this.applySpaceStorageDeltaForTick('hydrogen', -hydrogenSpent, accumulatedChanges);
          }
        }
      }

      const anyInputSpent = MANUFACTURING_INPUT_KEYS.some((inputKey) => inputSpent[inputKey] > 0);
      const anyStorageMutation = anyInputSpent || totalOutput > 0;
      if (anyStorageMutation && !accumulatedChanges) {
        storage.reconcileUsedStorage();
        try {
          updateSpaceStorageUI(storage);
        } catch (error) {}
      }

      const inputRates = this.createEmptyInputRates();
      MANUFACTURING_INPUT_KEYS.forEach((inputKey) => {
        inputRates[inputKey] = inputSpent[inputKey] / seconds;
      });
      const outputRates = {};
      this.getAssignmentKeys().forEach((key) => {
        outputRates[key] = (outputProduced[key] || 0) / seconds;
      });

      MANUFACTURING_INPUT_KEYS.forEach((inputKey) => {
        if (inputRates[inputKey] > 0) {
          resources.spaceStorage[inputKey].modifyRate(-inputRates[inputKey], this.displayName, 'project');
        }
      });
      this.getAssignmentKeys().forEach((key) => {
        const rate = outputRates[key] || 0;
        if (rate <= 0) {
          return;
        }
        const recipe = this.getRecipe(key);
        resources.spaceStorage[recipe.outputStorageKey].modifyRate(rate, this.displayName, 'project');
      });

      this.setLastRunStats(inputRates, outputRates);

      if (totalOutput > 0) {
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.running'));
      } else if (hasInputShortfall) {
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.insufficientInput'));
      } else {
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.idle'));
      }
      this.shortfallLastTick = hasInputShortfall;
    }

    applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
      this.runManufacturing(deltaTime, productivity, accumulatedChanges);
    }

    applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
      this.operationPreRunThisTick = false;
    }

    mergeEstimateTotals(target, source) {
      for (const bucket of ['cost', 'gain']) {
        const sourceBucket = source?.[bucket] || {};
        for (const category in sourceBucket) {
          target[bucket][category] ||= {};
          for (const resource in sourceBucket[category]) {
            target[bucket][category][resource] =
              (target[bucket][category][resource] || 0) + sourceBucket[category][resource];
          }
        }
      }
      return target;
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
      const storage = this.getSpaceStorageProject();
      if (!storage) {
        return totals;
      }

      this.normalizeAssignments();
      const entries = [];

      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0;
        if (assigned <= 0) {
          return;
        }
        const recipe = this.getRecipe(key);
        const recipeProductivity = this.getRecipeOperationProductivity(key, productivity);
        const outputMultiplier = this.getRecipeOutputMultiplier(key);
        const consumptionMultiplier = this.getRecipeConsumptionMultiplier(key);
        const desiredOutput = ((assigned * recipe.baseOutput * outputMultiplier) / recipe.complexity) * seconds * recipeProductivity;
        const desiredInputs = {};
        Object.keys(recipe.inputs).forEach((inputKey) => {
          const amount = ((assigned * recipe.inputs[inputKey] * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
          desiredInputs[inputKey] = amount;
        });
        entries.push({
          key,
          recipe,
          desiredOutput,
          desiredInputs,
        });
      });

      if (entries.length === 0) {
        return totals;
      }

      const estimatedInputs = this.createEmptyInputRates();
      const estimatedOutputs = {};

      entries.forEach((entry) => {
        Object.keys(entry.desiredInputs).forEach((inputKey) => {
          estimatedInputs[inputKey] += entry.desiredInputs[inputKey] || 0;
        });
        estimatedOutputs[entry.key] = entry.desiredOutput || 0;
      });

      MANUFACTURING_INPUT_KEYS.forEach((inputKey) => {
        const amount = estimatedInputs[inputKey] || 0;
        if (!(amount > 0)) {
          return;
        }
        totals.cost.spaceStorage ||= {};
        totals.cost.spaceStorage[inputKey] = (totals.cost.spaceStorage[inputKey] || 0) + amount;
        if (applyRates) {
          resources.spaceStorage[inputKey].modifyRate(-(amount / seconds), this.displayName, 'project');
        }
      });

      this.getAssignmentKeys().forEach((key) => {
        const amount = estimatedOutputs[key] || 0;
        if (!(amount > 0)) {
          return;
        }
        const recipe = this.getRecipe(key);
        totals.gain.spaceStorage ||= {};
        totals.gain.spaceStorage[recipe.outputStorageKey] =
          (totals.gain.spaceStorage[recipe.outputStorageKey] || 0) + amount;
        if (applyRates) {
          resources.spaceStorage[recipe.outputStorageKey].modifyRate(amount / seconds, this.displayName, 'project');
        }
      });

      return totals;
    }

    estimateExpansionCostAndGain() {
      return { cost: {}, gain: {} };
    }

    estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
      const totals = this.estimateExpansionCostAndGain(deltaTime, applyRates, productivity);
      if (this.operationPreRunThisTick === true) {
        return totals;
      }
      const operationTotals = this.estimateOperationCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
      return this.mergeEstimateTotals(totals, operationTotals);
    }

    update(deltaTime) {
      super.update(deltaTime);
    }

    renderUI(container) {
      super.renderUI(container);

      const card = document.createElement('div');
      card.classList.add('info-card', 'nuclear-alchemy-card', 'manufacturing-world-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.controlsTitle');
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        info,
        getManufacturingText('catalogs.specializations.manufacturing.ui.controlsTooltip')
      );
      header.append(title, info);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

      const createStatBox = (labelText) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const value = document.createElement('span');
        value.classList.add('stat-value');
        box.append(label, value);
        summaryGrid.appendChild(box);
        return value;
      };

      const cumulativeValue = createStatBox(getManufacturingText('catalogs.specializations.manufacturing.ui.summary.cumulativePopulation'));
      const assignedValue = createStatBox(getManufacturingText('catalogs.specializations.manufacturing.ui.summary.assigned'));
      const freeValue = createStatBox(getManufacturingText('catalogs.specializations.manufacturing.ui.summary.unassigned'));
      body.appendChild(summaryGrid);

      const controlsGrid = document.createElement('div');
      controlsGrid.classList.add('stats-grid', 'three-col', 'nuclear-alchemy-controls-grid');

      const runField = document.createElement('div');
      runField.classList.add('stat-item');
      const runCheckbox = document.createElement('input');
      runCheckbox.type = 'checkbox';
      runCheckbox.id = `${this.name}-run`;
      const runLabel = document.createElement('label');
      runLabel.htmlFor = runCheckbox.id;
      runLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.runManufacturing');
      runField.append(runCheckbox, runLabel);
      controlsGrid.appendChild(runField);

      const statusField = document.createElement('div');
      statusField.classList.add('stat-item');
      const statusLabel = document.createElement('span');
      statusLabel.classList.add('stat-label');
      statusLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.status');
      const statusValue = document.createElement('span');
      statusValue.classList.add('stat-value');
      statusField.append(statusLabel, statusValue);
      controlsGrid.appendChild(statusField);

      const inputField = document.createElement('div');
      inputField.classList.add('stat-item');
      const inputLabel = document.createElement('span');
      inputLabel.classList.add('stat-label');
      inputLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.inputUse');
      const inputValue = document.createElement('span');
      inputValue.classList.add('stat-value');
      inputField.append(inputLabel, inputValue);
      controlsGrid.appendChild(inputField);
      body.appendChild(controlsGrid);

      const assignmentGrid = document.createElement('div');
      assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list', 'manufacturing-assignment-list');

      const stepDownButton = document.createElement('button');
      stepDownButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.divideTen') || '/10';
      stepDownButton.addEventListener('click', () => {
        this.setAssignmentStep(this.assignmentStep / 10);
        this.updateUI();
      });
      const stepUpButton = document.createElement('button');
      stepUpButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.timesTen') || 'x10';
      stepUpButton.addEventListener('click', () => {
        this.setAssignmentStep(this.assignmentStep * 10);
        this.updateUI();
      });

      const stepButtons = document.createElement('div');
      stepButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
      stepButtons.append(stepDownButton, stepUpButton);

      const assignmentLayout = document.createElement('div');
      assignmentLayout.classList.add('manufacturing-assignment-layout');

      const blockA = document.createElement('div');
      blockA.classList.add('manufacturing-assignment-block', 'manufacturing-block-a');
      const blockAHeader = document.createElement('div');
      blockAHeader.classList.add('manufacturing-block-header', 'manufacturing-block-grid-a');
      const blockAHeaderResource = document.createElement('span');
      blockAHeaderResource.classList.add('stat-label');
      blockAHeaderResource.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.resource');
      const blockAHeaderComplexity = document.createElement('span');
      blockAHeaderComplexity.classList.add('stat-label');
      blockAHeaderComplexity.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.complexity');
      const blockAHeaderUnit = document.createElement('span');
      blockAHeaderUnit.classList.add('stat-label');
      blockAHeaderUnit.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.unitProduction');
      blockAHeader.append(blockAHeaderResource, blockAHeaderComplexity, blockAHeaderUnit);
      const blockABody = document.createElement('div');
      blockABody.classList.add('manufacturing-block-body');
      blockA.append(blockAHeader, blockABody);

      const blockB = document.createElement('div');
      blockB.classList.add('manufacturing-assignment-block', 'manufacturing-block-b');
      const blockBHeader = document.createElement('div');
      blockBHeader.classList.add('manufacturing-block-header', 'manufacturing-block-grid-b');
      const blockBHeaderAssigned = document.createElement('span');
      blockBHeaderAssigned.classList.add('stat-label');
      blockBHeaderAssigned.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.assigned');
      const blockBHeaderControls = document.createElement('div');
      blockBHeaderControls.classList.add('manufacturing-header-step-controls');
      blockBHeaderControls.appendChild(stepButtons);
      blockBHeader.append(blockBHeaderAssigned, blockBHeaderControls);
      const blockBBody = document.createElement('div');
      blockBBody.classList.add('manufacturing-block-body');
      blockB.append(blockBHeader, blockBBody);

      const blockC = document.createElement('div');
      blockC.classList.add('manufacturing-assignment-block', 'manufacturing-block-c');
      const blockCHeader = document.createElement('div');
      blockCHeader.classList.add('manufacturing-block-header', 'manufacturing-block-grid-c');
      const blockCHeaderWeight = document.createElement('span');
      blockCHeaderWeight.classList.add('stat-label');
      blockCHeaderWeight.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.weight');
      const blockCHeaderRate = document.createElement('span');
      blockCHeaderRate.classList.add('stat-label');
      blockCHeaderRate.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.headers.rate');
      blockCHeader.append(blockCHeaderWeight, blockCHeaderRate);
      const blockCBody = document.createElement('div');
      blockCBody.classList.add('manufacturing-block-body');
      blockC.append(blockCHeader, blockCBody);

      assignmentLayout.append(blockA, blockB, blockC);
      assignmentGrid.appendChild(assignmentLayout);

      const rowElements = {};
      this.getManagedAssignmentKeys().forEach((key) => {
        const isUnassigned = this.isUnassignedAssignmentKey(key);
        const recipe = isUnassigned ? null : this.getRecipe(key);
        const rowA = document.createElement('div');
        rowA.classList.add('manufacturing-block-row', 'manufacturing-block-grid-a');
        if (isUnassigned) {
          rowA.classList.add('assignment-divider-row');
        }

        const nameWrap = document.createElement('span');
        nameWrap.classList.add('stat-value', 'manufacturing-resource-name');
        const nameEl = document.createElement('span');
        nameEl.textContent = isUnassigned ? this.getUnassignedAssignmentLabel() : recipe.label;
        let recipeTooltip = null;
        let recipeTooltipCache = null;
        nameWrap.appendChild(nameEl);
        if (!isUnassigned) {
          const nameInfo = document.createElement('span');
          nameInfo.classList.add('info-tooltip-icon');
          nameInfo.innerHTML = '&#9432;';
          recipeTooltip = attachDynamicInfoTooltip(nameInfo, '');
          recipeTooltipCache = {};
          nameWrap.appendChild(nameInfo);
        }

        const complexityEl = document.createElement('span');
        complexityEl.classList.add('stat-value');
        complexityEl.textContent = isUnassigned ? '' : formatNumber(recipe.complexity, true);

        const unitProductionEl = document.createElement('span');
        unitProductionEl.classList.add('stat-value');
        rowA.append(nameWrap, complexityEl, unitProductionEl);

        const amountEl = document.createElement('span');
        amountEl.classList.add('stat-value');

        const zeroButton = document.createElement('button');
        zeroButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.zero') || '0';
        zeroButton.addEventListener('click', () => {
          this.clearAssignment(key);
        });

        const minusButton = document.createElement('button');
        minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));

        const plusButton = document.createElement('button');
        plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

        const maxButton = document.createElement('button');
        maxButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.max') || 'Max';
        maxButton.addEventListener('click', () => {
          this.maximizeAssignment(key);
        });

        const autoAssignContainer = document.createElement('div');
        autoAssignContainer.classList.add('hephaestus-auto-assign');
        const autoAssign = document.createElement('input');
        autoAssign.type = 'checkbox';
        autoAssign.addEventListener('change', () => {
          this.setAutoAssignTarget(key, autoAssign.checked);
        });
        const autoAssignLabel = document.createElement('span');
        autoAssignLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.auto');
        autoAssignLabel.addEventListener('click', () => {
          autoAssign.checked = !autoAssign.checked;
          this.setAutoAssignTarget(key, autoAssign.checked);
        });
        autoAssignContainer.append(autoAssign, autoAssignLabel);

        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.step = '0.1';
        weightInput.value = String(
          Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1
        );
        weightInput.classList.add('hephaestus-weight-input');
        weightInput.addEventListener('input', () => {
          const value = Number(weightInput.value);
          this.autoAssignWeights[key] = Number.isFinite(value) ? Math.max(0, value) : 1;
          this.normalizeAssignments();
          this.updateUI();
        });

        const controls = document.createElement('div');
        controls.classList.add('hephaestus-assignment-controls');
        const controlButtons = document.createElement('div');
        controlButtons.classList.add('hephaestus-control-buttons');
        controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
        controls.append(controlButtons);

        const rateEl = document.createElement('div');
        rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');

        const rowB = document.createElement('div');
        rowB.classList.add('manufacturing-block-row', 'manufacturing-block-grid-b');
        if (isUnassigned) {
          rowB.classList.add('assignment-divider-row');
        }
        rowB.append(amountEl, controls);

        const rowC = document.createElement('div');
        rowC.classList.add('manufacturing-block-row', 'manufacturing-block-grid-c');
        if (isUnassigned) {
          rowC.classList.add('assignment-divider-row');
        }
        rowC.append(weightInput, rateEl);

        blockABody.appendChild(rowA);
        blockBBody.appendChild(rowB);
        blockCBody.appendChild(rowC);

        rowElements[key] = {
          rowA,
          rowB,
          rowC,
          unitProduction: unitProductionEl,
          value: amountEl,
          zeroButton,
          minusButton,
          plusButton,
          maxButton,
          autoAssign,
          weightInput,
          rate: rateEl,
          recipeTooltip,
          recipeTooltipCache,
        };
      });

      body.appendChild(assignmentGrid);

      runCheckbox.addEventListener('change', (event) => {
        this.setRunning(event.target.checked);
      });

      card.appendChild(body);
      container.appendChild(card);

      if (this.shopElements && this.shopElements.wrapper) {
        const shopWrapper = this.shopElements.wrapper;
        const titleGroup = shopWrapper.querySelector('.bioworld-shop-title');
        const itemsContainer = shopWrapper.querySelector('.bioworld-shop-items');
        if (titleGroup && itemsContainer) {
          const collapseButton = document.createElement('button');
          collapseButton.type = 'button';
          collapseButton.classList.add('bioworld-shop-button', 'bioworld-shop-collapse-button');
          collapseButton.addEventListener('click', () => {
            this.shopCollapsed = !this.shopCollapsed;
            this.updateUI();
          });
          titleGroup.appendChild(collapseButton);
          this.shopElements.collapseButton = collapseButton;
          this.shopElements.itemsContainer = itemsContainer;
        }
        // Move the MP shop below manufacturing controls.
        container.appendChild(shopWrapper);
      }

      this.uiElements = {
        cumulativeValue,
        assignedValue,
        freeValue,
        inputValue,
        statusValue,
        runCheckbox,
        stepDownButton,
        stepUpButton,
        rowElements,
      };

      this.updateUI();
    }

    updateUI() {
      super.updateUI();

      if (this.shopElements) {
        const collapsed = this.shopCollapsed === true;
        if (this.shopElements.itemsContainer) {
          this.shopElements.itemsContainer.style.display = collapsed ? 'none' : '';
        }
        if (this.shopElements.collapseButton) {
          this.shopElements.collapseButton.textContent = collapsed
            ? getManufacturingText('catalogs.specializations.manufacturing.ui.showShop')
            : getManufacturingText('catalogs.specializations.manufacturing.ui.hideShop');
        }
      }

      const elements = this.uiElements;
      if (!elements) {
        return;
      }

      this.normalizeAssignments();
      const total = this.getTotalPotentialPopulation();
      const assigned = this.getAssignedTotal();
      const available = Math.max(0, total - assigned);
      const step = this.assignmentStep;

      elements.cumulativeValue.textContent = formatNumber(this.cumulativePopulation, true, 2);
      elements.assignedValue.textContent = formatNumber(assigned, true, 2);
      elements.freeValue.textContent = formatNumber(available, true);
      elements.statusValue.textContent = this.statusText || getManufacturingText('catalogs.specializations.manufacturing.status.idle');
      elements.inputValue.textContent = MANUFACTURING_INPUT_KEYS.map((inputKey) => {
        const label = MANUFACTURING_INPUT_LABELS[inputKey] || inputKey;
        return `${formatNumber(this.lastInputRates[inputKey] || 0, true, 3)} ${label}/s`;
      }).join(', ');
      elements.runCheckbox.checked = this.isRunning;
      elements.runCheckbox.disabled = total <= 0;
      elements.stepDownButton.disabled = total <= 0;
      elements.stepUpButton.disabled = total <= 0;
      const productivityByRecipe = this.getOperationProductivityForTick();

      this.getManagedAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row) {
          return;
        }
        const storedCurrent = this.getStoredAssignmentAmount(key);
        const displayedCurrent = this.getDisplayedAssignmentAmount(key);
        const maxForKey = this.getAssignmentMaxTarget(key);

        row.value.textContent = formatNumber(displayedCurrent, true);
        const recipe = this.isUnassignedAssignmentKey(key) ? null : this.getRecipe(key);
        const unitProduction = recipe
          ? (recipe.baseOutput * this.getRecipeOutputMultiplier(key)) / recipe.complexity
          : 0;
        row.unitProduction.textContent = recipe ? `${formatNumber(unitProduction, true, 3)}/s` : '';
        row.minusButton.textContent = `-${formatNumber(step, true)}`;
        row.plusButton.textContent = `+${formatNumber(step, true)}`;
        row.autoAssign.checked = this.autoAssignFlags[key] === true;
        row.autoAssign.disabled = total <= 0;
        if (document.activeElement !== row.weightInput) {
          row.weightInput.value = String(
            Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1
          );
        }
        row.weightInput.disabled = total <= 0;
        row.zeroButton.disabled = storedCurrent <= 0 || this.autoAssignFlags[key];
        row.maxButton.disabled = storedCurrent >= maxForKey || total <= 0 || this.autoAssignFlags[key];
        row.minusButton.disabled = storedCurrent <= 0 || this.autoAssignFlags[key];
        row.plusButton.disabled = storedCurrent >= maxForKey || total <= 0 || this.autoAssignFlags[key];
        row.rate.textContent = recipe ? `${formatNumber(this.lastOutputRatesByRecipe[key] || 0, true, 3)}/s` : '';
        const recipeProductivity = recipe ? (productivityByRecipe[key] ?? 1) : 1;
        const productivityLimited = !!recipe && this.isRunning && storedCurrent > 0 && recipeProductivity < 1;
        row.rate.classList.toggle('project-rate-productivity-limited', productivityLimited);
        if (row.recipeTooltip) {
          setTooltipText(
            row.recipeTooltip,
            this.getRecipeTooltipText(key),
            row.recipeTooltipCache,
            'text'
          );
        }
      });

      this.syncAssignmentRowHeights();
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        isRunning: this.isRunning === true,
        manufacturingAssignments: { ...this.manufacturingAssignments },
        assignmentStep: this.assignmentStep,
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights },
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
        this.isRunning = settings.isRunning === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'manufacturingAssignments')) {
        this.manufacturingAssignments = { ...(settings.manufacturingAssignments || {}) };
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')) {
        this.assignmentStep = settings.assignmentStep || 1;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags')) {
        this.autoAssignFlags = { ...(settings.autoAssignFlags || {}) };
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights')) {
        this.autoAssignWeights = { ...(settings.autoAssignWeights || {}) };
      }
      this.normalizeAssignments();
    }

    saveState() {
      return {
        ...super.saveState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        manufacturingAssignments: { ...this.manufacturingAssignments },
        assignmentStep: this.assignmentStep,
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights },
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.loadSpecializationState(state);
      this.cumulativePopulation = Math.max(0, state.cumulativePopulation || 0);
      this.isRunning = state.isRunning === true;
      this.manufacturingAssignments = { ...(state.manufacturingAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
      this.normalizeAssignments();
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        manufacturingAssignments: { ...this.manufacturingAssignments },
        assignmentStep: this.assignmentStep,
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights },
      };
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.cumulativePopulation = Math.max(0, state.cumulativePopulation || 0);
      this.isRunning = state.isRunning === true;
      this.manufacturingAssignments = { ...(state.manufacturingAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
      this.normalizeAssignments();
    }
  }

  try {
    window.ManufacturingWorldProject = ManufacturingWorldProject;
  } catch (error) {}

  try {
    module.exports = ManufacturingWorldProject;
  } catch (error) {}
})();
