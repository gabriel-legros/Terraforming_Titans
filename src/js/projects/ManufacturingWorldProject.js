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
    'graphiteGlass',
    'graphene',
    'components',
    'electronics',
    'graphiteElectronics',
    'superconductors',
    'superalloys',
  ];
  const MANUFACTURING_UNASSIGNED_KEY = 'idleUnassigned';
  const MANUFACTURING_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;

  function normalizeManufacturingInteger(value) {
    if (value === undefined || value === null || value === '') {
      return 0n;
    }
    const valueType = Object.prototype.toString.call(value);
    if (valueType === '[object BigInt]') {
      return value < 0n ? 0n : value;
    }
    if (valueType === '[object String]') {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        return BigInt(trimmed);
      }
      const parsed = parseFlexibleNumber(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) {
        return BigInt(Math.floor(parsed));
      }
    }
    const numeric = Number(value) || 0;
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0n;
    }
    return BigInt(Math.floor(numeric));
  }

  function serializeManufacturingInteger(value) {
    const normalized = normalizeManufacturingInteger(value);
    return normalized <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(normalized)
      : normalized.toString();
  }

  function serializeManufacturingAssignments(assignments = {}) {
    const serialized = {};
    Object.keys(assignments).forEach((key) => {
      serialized[key] = serializeManufacturingInteger(assignments[key]);
    });
    return serialized;
  }

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
    graphiteGlass: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.graphiteGlass.label'),
      outputStorageKey: 'glass',
      complexity: 5,
      baseOutput: 0.5,
      inputs: { graphite: 0.5 },
      shopId: 'glassEfficiency',
      wgcUpgradeId: null,
      requiresProjectFlag: 'silicaPhaseOutRecipe',
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
    graphiteElectronics: {
      label: getManufacturingText('catalogs.specializations.manufacturing.recipes.graphiteElectronics.label'),
      outputStorageKey: 'electronics',
      complexity: 100,
      baseOutput: 0.5,
      inputs: { metal: 0.5, graphite: 2 },
      shopId: 'electronicsEfficiency',
      wgcUpgradeId: 'electronicsEfficiency',
      requiresProjectFlag: 'silicaPhaseOutRecipe',
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
      this.assignmentStep = 1n;
      this.autoAssignFlags = {};
      this.autoAssignWeights = {};
      this.isRunning = false;
      this.statusText = getManufacturingText('catalogs.specializations.manufacturing.status.idle');
      this.lastInputRates = this.createEmptyInputRates();
      this.lastOutputRatesByRecipe = {};
      this.operationPreRunThisTick = false;
      this.uiElements = null;
      this.shopCollapsed = false;
      this.shopRefactorCounts = {};
      this.adaptationPoints = 0;
      this.assignmentLayoutWidth = 0;
      this.assignmentRowHeightsDirty = true;
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

    getCylindersHopePopulationBonus() {
      if (typeof getCylindersHopeManufacturingPopulationBonus === 'function') {
        return Math.max(0, getCylindersHopeManufacturingPopulationBonus(spaceManager));
      }
      return 0;
    }

    getTotalPotentialPopulation() {
      const bonus = this.getCylindersHopePopulationBonus();
      return Math.max(0, Math.floor(this.cumulativePopulation + bonus));
    }

    getAssignmentKeys() {
      return MANUFACTURING_RECIPE_KEYS.filter((key) => {
        const recipe = MANUFACTURING_RECIPES[key];
        return !recipe.requiresProjectFlag || this.isBooleanFlagSet(recipe.requiresProjectFlag);
      });
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
      return (1 + (this.getShopPurchaseCount(recipe.shopId) * 0.01))
        * this.getEffectiveThroughputMultiplier();
    }

    getRecipeOutputMultiplier(key) {
      const recipe = this.getRecipe(key);
      if (!recipe) {
        return 1;
      }
      let multiplier = (1 + (this.getShopPurchaseCount(recipe.shopId) * 0.01))
        * this.getEffectiveThroughputMultiplier();
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
            && !bioworld.isCompleted
            && !(projectManager.projects.birchWorld.isCurrentSmbhShellworld() && projectManager.projects.birchWorld.unlocked),
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
      if (projectManager.projects.birchWorld.isCurrentSmbhShellworld() && projectManager.projects.birchWorld.unlocked) {
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

    createEmptyShopRefactorCounts() {
      return this.shopItems.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {});
    }

    getShopRefactorCount(id) {
      return Math.max(0, Math.floor(this.shopRefactorCounts[id] || 0));
    }

    canUseWarpAssembly() {
      return this.isBooleanFlagSet('warpAssembly');
    }

    getAdaptationPoints() {
      return Math.max(0, this.adaptationPoints || 0);
    }

    addSpecializationPoints(value) {
      if (!(value > 0)) {
        super.addSpecializationPoints(value);
        return;
      }
      if (!this.canUseWarpAssembly()) {
        super.addSpecializationPoints(value);
        return;
      }
      const adaptationPoints = this.getAdaptationPoints();
      if (!(adaptationPoints > 0)) {
        super.addSpecializationPoints(value);
        return;
      }
      const bonus = Math.min(value, adaptationPoints);
      this.adaptationPoints = adaptationPoints - bonus;
      super.addSpecializationPoints(value + bonus);
    }

    getShopItemCost(item) {
      return item.cost + this.getShopRefactorCount(item.id);
    }

    getShopItemMaxPurchases(item) {
      return item.maxPurchases + (this.getShopRefactorCount(item.id) * 1000);
    }

    canRefactorShopItem(item) {
      if (!this.canUseWarpAssembly()) {
        return false;
      }
      return this.getShopPurchaseCount(item.id) >= this.getShopItemMaxPurchases(item);
    }

    getShopMaxButtonText(item) {
      if (this.canRefactorShopItem(item)) {
        return getManufacturingText('catalogs.specializations.manufacturing.ui.refactorButton') || 'Refactor';
      }
      return super.getShopMaxButtonText(item);
    }

    shouldDisableShopMaxButton(item, canBuy) {
      if (this.canRefactorShopItem(item)) {
        return false;
      }
      return super.shouldDisableShopMaxButton(item, canBuy);
    }

    handleShopMaxButtonClick(item) {
      if (this.canRefactorShopItem(item)) {
        this.refactorShopItem(item);
        return;
      }
      super.handleShopMaxButtonClick(item);
    }

    refactorShopItem(item) {
      const currentPurchases = this.getShopPurchaseCount(item.id);
      const halvedPurchases = Math.floor(currentPurchases / 2);
      const nextMax = this.getShopItemMaxPurchases(item) + 1000;
      const nextCost = this.getShopItemCost(item) + 1;
      const message = getManufacturingText('catalogs.specializations.manufacturing.ui.refactorConfirm', {
        label: item.label,
        purchases: formatNumber(currentPurchases, true),
        halved: formatNumber(halvedPurchases, true),
        max: formatNumber(nextMax, true),
        cost: formatNumber(nextCost, true),
      }) || '';
      createSystemChoicePopup(
        getManufacturingText('catalogs.specializations.manufacturing.ui.refactorTitle') || 'Refactor',
        message,
        getManufacturingText('catalogs.specializations.manufacturing.ui.refactorConfirmButton') || 'Confirm',
        getManufacturingText('catalogs.specializations.manufacturing.ui.refactorCancelButton') || 'Cancel',
        () => {
          const pointsBeforeRefactor = Math.max(0, this.getSpecializationPoints());
          if (this.canUseWarpAssembly() && pointsBeforeRefactor > 0) {
            this.adaptationPoints = this.getAdaptationPoints() + pointsBeforeRefactor;
          }
          this[this.pointsKey] = 0;
          this.shopPurchases[item.id] = halvedPurchases;
          this.shopRefactorCounts[item.id] = this.getShopRefactorCount(item.id) + 1;
          this.applySpecializationEffects();
          this.updateUI();
        },
        null
      );
    }

    normalizeAssignments() {
      const keys = this.getManagedAssignmentKeys();
      const total = normalizeManufacturingInteger(this.getTotalPotentialPopulation());

      keys.forEach((key) => {
        this.manufacturingAssignments[key] = normalizeManufacturingInteger(this.manufacturingAssignments[key]);
        this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
        const weight = Number(this.autoAssignWeights[key]);
        this.autoAssignWeights[key] = Number.isFinite(weight) ? Math.max(0, weight) : 1;
      });

      const persistentKeys = new Set([this.getUnassignedAssignmentKey(), ...MANUFACTURING_RECIPE_KEYS]);
      Object.keys(this.manufacturingAssignments).forEach((key) => {
        if (!persistentKeys.has(key)) {
          delete this.manufacturingAssignments[key];
        }
      });

      // Save loading restores projects before all space, galaxy, and research
      // effects are available. Do not permanently trim cylinder-backed
      // assignments against that incomplete capacity snapshot.
      if (globalGameIsLoadingFromSave) {
        return;
      }

      let usedManual = 0n;
      keys.forEach((key) => {
        if (!this.autoAssignFlags[key]) {
          usedManual += this.manufacturingAssignments[key];
        }
      });

      const autoKeys = keys.filter((key) => this.autoAssignFlags[key]);
      const remaining = total > usedManual ? (total - usedManual) : 0n;
      if (autoKeys.length > 0) {
        let totalWeight = 0;
        autoKeys.forEach((key) => {
          totalWeight += this.autoAssignWeights[key];
        });

        if (totalWeight <= 0) {
          autoKeys.forEach((key) => {
            this.manufacturingAssignments[key] = 0n;
          });
        } else {
        const remainders = [];
        let assigned = 0n;
        autoKeys.forEach((key) => {
          const exact = Number(remaining) * (this.autoAssignWeights[key] / totalWeight);
          const floorValue = Math.floor(exact);
            const floorBigInt = normalizeManufacturingInteger(floorValue);
            this.manufacturingAssignments[key] = floorBigInt;
            assigned += floorBigInt;
            remainders.push({ key, value: exact - floorValue });
          });
        let leftover = remaining - assigned;
        remainders.sort((left, right) => right.value - left.value);
        if (leftover > 0n && remainders.length > 0) {
          this.manufacturingAssignments[remainders[0].key] += leftover;
          leftover = 0n;
        }
        if (leftover > 0n && autoKeys.length > 0) {
          const idleKey = this.getUnassignedAssignmentKey();
          const targetKey = autoKeys.includes(idleKey) ? idleKey : autoKeys[0];
          this.manufacturingAssignments[targetKey] += leftover;
        }
      }
    }

      let assignedTotal = keys.reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0n), 0n);
      if (assignedTotal > total) {
        let excess = assignedTotal - total;
        for (let i = keys.length - 1; i >= 0 && excess > 0n; i -= 1) {
          const key = keys[i];
          const current = this.manufacturingAssignments[key] || 0n;
          const reduction = current < excess ? current : excess;
          this.manufacturingAssignments[key] = current - reduction;
          excess -= reduction;
        }
        assignedTotal = keys.reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0n), 0n);
      }
    }

    getAssignedTotal(skipNormalization = false) {
      if (!skipNormalization) {
        this.normalizeAssignments();
      }
      return this.getAssignmentKeys().reduce((sum, key) => sum + (this.manufacturingAssignments[key] || 0n), 0n);
    }

    getAvailablePopulation(skipNormalization = false, assignedTotal = null) {
      const total = normalizeManufacturingInteger(this.getTotalPotentialPopulation());
      const assigned = assignedTotal === null ? this.getAssignedTotal(skipNormalization) : assignedTotal;
      return total > assigned ? (total - assigned) : 0n;
    }

    getStoredAssignmentAmount(key) {
      return this.manufacturingAssignments[key] || 0n;
    }

    getDisplayedAssignmentAmount(key) {
      if (this.isUnassignedAssignmentKey(key)) {
        return this.getAvailablePopulation();
      }
      return this.getStoredAssignmentAmount(key);
    }

    getAssignmentMaxTarget(key) {
      const keys = this.getManagedAssignmentKeys();
      const total = normalizeManufacturingInteger(this.getTotalPotentialPopulation());
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key) {
          return sum;
        }
        if (this.autoAssignFlags[otherKey]) {
          return sum;
        }
        return sum + this.getStoredAssignmentAmount(otherKey);
      }, 0n);
      return total > usedOther ? (total - usedOther) : 0n;
    }

    setAssignmentStep(step) {
      const next = normalizeManufacturingInteger(step);
      this.assignmentStep = next < 1n ? 1n : (next > MANUFACTURING_ASSIGNMENT_STEP_MAX ? MANUFACTURING_ASSIGNMENT_STEP_MAX : next);
    }

    normalizeAssignmentStep() {
      this.assignmentStep = normalizeManufacturingInteger(this.assignmentStep);
      if (this.assignmentStep < 1n) {
        this.assignmentStep = 1n;
      }
    }

    getSignedAssignmentDelta(delta) {
      const valueType = Object.prototype.toString.call(delta);
      if (valueType === '[object BigInt]') {
        return delta;
      }
      if (valueType === '[object String]') {
        const trimmed = delta.trim();
        if (!trimmed || trimmed === '-') {
          return 0n;
        }
        const isNegative = trimmed.startsWith('-');
        const digits = isNegative || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
        if (!/^\d+$/.test(digits)) {
          return 0n;
        }
        const magnitude = BigInt(digits);
        return isNegative ? -magnitude : magnitude;
      }
      const numeric = Number(delta);
      if (!Number.isFinite(numeric) || numeric === 0) {
        return 0n;
      }
      const magnitude = normalizeManufacturingInteger(Math.abs(numeric));
      return numeric < 0 ? -magnitude : magnitude;
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
      const signedDelta = this.getSignedAssignmentDelta(delta);
      if (signedDelta === 0n) {
        return;
      }
      const current = this.getStoredAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);
      let next = current + signedDelta;
      if (next < 0n) {
        next = 0n;
      }
      if (next > maxForKey) {
        next = maxForKey;
      }
      this.manufacturingAssignments[key] = next;
      this.normalizeAssignments();
      this.updateUI();
    }

    clearAssignment(key) {
      if (this.autoAssignFlags[key]) {
        return;
      }
      this.manufacturingAssignments[key] = 0n;
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
      const elements = this.resolveUIElements();
      if (!elements || !elements.rowElements || !elements.assignmentLayout) {
        return;
      }
      const layoutWidth = elements.assignmentLayout.clientWidth || 0;
      const shouldResync = this.assignmentRowHeightsDirty || this.assignmentLayoutWidth !== layoutWidth;
      if (!shouldResync) {
        return;
      }
      this.assignmentLayoutWidth = layoutWidth;
      this.assignmentRowHeightsDirty = false;
      this.getManagedAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row || !row.rowA || !row.rowB || !row.rowC) {
          return;
        }
        row.rowA.style.minHeight = '';
        row.rowB.style.minHeight = '';
        row.rowC.style.minHeight = '';
      });
      this.getManagedAssignmentKeys().forEach((key) => {
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

    syncShopLayout() {
      const shopElements = this.shopElements || this.resolveShopElements();
      if (!shopElements || !shopElements.wrapper) {
        return;
      }

      const projectCard = projectElements?.[this.name]?.projectItem;
      const controlsCard = this.uiElements?.controlsCard?.isConnected
        ? this.uiElements.controlsCard
        : projectCard?.querySelector('[data-manufacturing-ui="controlsCard"]');
      if (controlsCard && shopElements.wrapper.previousElementSibling !== controlsCard) {
        controlsCard.insertAdjacentElement('afterend', shopElements.wrapper);
      }

      const titleGroup = shopElements.wrapper.querySelector('.bioworld-shop-title');
      const itemsContainer = shopElements.wrapper.querySelector('.bioworld-shop-items');
      if (!titleGroup || !itemsContainer) {
        shopElements.collapseButton = null;
        shopElements.itemsContainer = null;
        return;
      }

      let collapseButton = titleGroup.querySelector('[data-manufacturing-ui="shopCollapseButton"]');
      if (!collapseButton) {
        collapseButton = document.createElement('button');
        collapseButton.type = 'button';
        collapseButton.classList.add('bioworld-shop-button', 'bioworld-shop-collapse-button');
        collapseButton.dataset.manufacturingUi = 'shopCollapseButton';
        collapseButton.addEventListener('click', () => {
          this.shopCollapsed = !this.shopCollapsed;
          this.updateUI();
        });
        titleGroup.appendChild(collapseButton);
      }

      shopElements.collapseButton = collapseButton;
      shopElements.itemsContainer = itemsContainer;

      let adaptationGroup = shopElements.wrapper.querySelector('[data-manufacturing-ui="adaptationGroup"]');
      if (this.canUseWarpAssembly()) {
        if (!adaptationGroup) {
          adaptationGroup = document.createElement('div');
          adaptationGroup.classList.add('bioworld-shop-adaptation');
          adaptationGroup.dataset.manufacturingUi = 'adaptationGroup';

          const adaptationLabel = document.createElement('span');
          adaptationLabel.classList.add('bioworld-shop-adaptation-label');
          adaptationLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.adaptationPointsLabel');
          const adaptationInfo = document.createElement('span');
          adaptationInfo.classList.add('info-tooltip-icon');
          adaptationInfo.classList.add('bioworld-shop-adaptation-info');
          adaptationInfo.innerHTML = '&#9432;';
          attachDynamicInfoTooltip(
            adaptationInfo,
            getManufacturingText('catalogs.specializations.manufacturing.ui.adaptationPointsTooltip')
          );
          const adaptationValue = document.createElement('span');
          adaptationValue.classList.add('bioworld-shop-points');
          adaptationValue.dataset.manufacturingUi = 'adaptationValue';
          adaptationGroup.append(adaptationLabel, adaptationValue, adaptationInfo);
          itemsContainer.insertAdjacentElement('afterend', adaptationGroup);
        }
      } else if (adaptationGroup) {
        adaptationGroup.remove();
      }

      shopElements.adaptationValue = shopElements.wrapper.querySelector('[data-manufacturing-ui="adaptationValue"]');
      this.shopElements = shopElements;
    }

    resolveUIElements() {
      if (this.uiElements?.runCheckbox?.isConnected) {
        return this.uiElements;
      }
      const card = projectElements?.[this.name]?.projectItem;
      if (!card || !card.isConnected) {
        return null;
      }
      const assignmentLayout = card.querySelector('[data-manufacturing-ui="assignmentLayout"]');
      if (!assignmentLayout) {
        return null;
      }
      const rowElements = {};
      const rowNodes = assignmentLayout.querySelectorAll('[data-manufacturing-role="rowA"][data-manufacturing-assignment-key]');
      rowNodes.forEach((rowNode) => {
        const key = rowNode.dataset.manufacturingAssignmentKey;
        rowElements[key] = {
          rowA: rowNode,
          rowB: assignmentLayout.querySelector(`[data-manufacturing-role="rowB"][data-manufacturing-assignment-key="${key}"]`),
          rowC: assignmentLayout.querySelector(`[data-manufacturing-role="rowC"][data-manufacturing-assignment-key="${key}"]`),
          unitProduction: rowNode.querySelector('[data-manufacturing-role="unitProduction"]'),
          value: assignmentLayout.querySelector(`[data-manufacturing-role="value"][data-manufacturing-assignment-key="${key}"]`),
          zeroButton: assignmentLayout.querySelector(`[data-manufacturing-role="zeroButton"][data-manufacturing-assignment-key="${key}"]`),
          minusButton: assignmentLayout.querySelector(`[data-manufacturing-role="minusButton"][data-manufacturing-assignment-key="${key}"]`),
          plusButton: assignmentLayout.querySelector(`[data-manufacturing-role="plusButton"][data-manufacturing-assignment-key="${key}"]`),
          maxButton: assignmentLayout.querySelector(`[data-manufacturing-role="maxButton"][data-manufacturing-assignment-key="${key}"]`),
          autoAssign: assignmentLayout.querySelector(`[data-manufacturing-role="autoAssign"][data-manufacturing-assignment-key="${key}"]`),
          weightInput: assignmentLayout.querySelector(`[data-manufacturing-role="weightInput"][data-manufacturing-assignment-key="${key}"]`),
          rate: assignmentLayout.querySelector(`[data-manufacturing-role="rate"][data-manufacturing-assignment-key="${key}"]`),
          recipeTooltip: null,
          recipeTooltipCache: null
        };
      });
      this.uiElements = {
        controlsCard: card.querySelector('[data-manufacturing-ui="controlsCard"]'),
        assignmentLayout,
        cumulativeValue: card.querySelector('[data-manufacturing-ui="cumulativeValue"]'),
        assignedValue: card.querySelector('[data-manufacturing-ui="assignedValue"]'),
        freeValue: card.querySelector('[data-manufacturing-ui="freeValue"]'),
        inputValue: card.querySelector('[data-manufacturing-ui="inputValue"]'),
        statusValue: card.querySelector('[data-manufacturing-ui="statusValue"]'),
        runCheckbox: card.querySelector('[data-manufacturing-ui="runCheckbox"]'),
        stepDownButton: card.querySelector('[data-manufacturing-ui="stepDownButton"]'),
        stepUpButton: card.querySelector('[data-manufacturing-ui="stepUpButton"]'),
        rowElements
      };
      return this.uiElements;
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
      return this.isRunning && this.getTotalPotentialPopulation() > 0 && this.getAssignedTotal() > 0n;
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

    getOperationProductivityForTick(skipNormalization = false) {
      const productivityByRecipe = {};
      if (!skipNormalization) {
        this.normalizeAssignments();
      }
      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0n;
        if (assigned <= 0n) {
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
      if (!this.isRunning || this.getTotalPotentialPopulation() <= 0) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        if (!this.isRunning) {
          this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
        } else {
          this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.noCumulativePopulation'));
        }
        this.shortfallLastTick = false;
        return;
      }

      this.normalizeAssignments();
      if (this.getAssignedTotal(true) <= 0n) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus(getManufacturingText('catalogs.specializations.manufacturing.status.noCumulativePopulation'));
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

      const entries = [];
      let hasInputShortfall = false;

      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0n;
        if (assigned <= 0n) {
          return;
        }
        const assignedNumber = Number(assigned);
        const recipe = this.getRecipe(key);
        const recipeProductivity = this.getRecipeOperationProductivity(key, productivity);
        const outputMultiplier = this.getRecipeOutputMultiplier(key);
        const consumptionMultiplier = this.getRecipeConsumptionMultiplier(key);
        const desiredOutput = ((assignedNumber * recipe.baseOutput * outputMultiplier) / recipe.complexity) * seconds * recipeProductivity;
        const desiredInputs = {};
        Object.keys(recipe.inputs).forEach((inputKey) => {
          const amount = ((assignedNumber * recipe.inputs[inputKey] * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
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
        const assignedTotal = entries.reduce((sum, entry) => sum + (entry.assigned || 0n), 0n);
        const assignedTotalNumber = Number(assignedTotal);
        const desiredHydrogen = assignedTotalNumber * MANUFACTURING_FLAT_HYDROGEN_PER_WORKER * seconds;
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
      if (!this.isRunning || this.getTotalPotentialPopulation() <= 0) {
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
      if (this.getAssignedTotal(true) <= 0n) {
        return totals;
      }
      const entries = [];

      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0n;
        if (assigned <= 0n) {
          return;
        }
        const assignedNumber = Number(assigned);
        const recipe = this.getRecipe(key);
        const recipeProductivity = this.getRecipeOperationProductivity(key, productivity);
        const outputMultiplier = this.getRecipeOutputMultiplier(key);
        const consumptionMultiplier = this.getRecipeConsumptionMultiplier(key);
        const desiredOutput = ((assignedNumber * recipe.baseOutput * outputMultiplier) / recipe.complexity) * seconds * recipeProductivity;
        const desiredInputs = {};
        Object.keys(recipe.inputs).forEach((inputKey) => {
          const amount = ((assignedNumber * recipe.inputs[inputKey] * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
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
      card.dataset.manufacturingUi = 'controlsCard';

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
      cumulativeValue.dataset.manufacturingUi = 'cumulativeValue';
      assignedValue.dataset.manufacturingUi = 'assignedValue';
      freeValue.dataset.manufacturingUi = 'freeValue';
      body.appendChild(summaryGrid);

      const controlsGrid = document.createElement('div');
      controlsGrid.classList.add('stats-grid', 'three-col', 'nuclear-alchemy-controls-grid');

      const runField = document.createElement('div');
      runField.classList.add('stat-item');
      const runCheckbox = document.createElement('input');
      runCheckbox.type = 'checkbox';
      runCheckbox.dataset.manufacturingUi = 'runCheckbox';
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
      statusValue.dataset.manufacturingUi = 'statusValue';
      statusField.append(statusLabel, statusValue);
      controlsGrid.appendChild(statusField);

      const inputField = document.createElement('div');
      inputField.classList.add('stat-item');
      const inputLabel = document.createElement('span');
      inputLabel.classList.add('stat-label');
      inputLabel.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.inputUse');
      const inputValue = document.createElement('span');
      inputValue.classList.add('stat-value');
      inputValue.dataset.manufacturingUi = 'inputValue';
      inputField.append(inputLabel, inputValue);
      controlsGrid.appendChild(inputField);
      body.appendChild(controlsGrid);

      const assignmentGrid = document.createElement('div');
      assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list', 'manufacturing-assignment-list');

      const stepDownButton = document.createElement('button');
      stepDownButton.dataset.manufacturingUi = 'stepDownButton';
      stepDownButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.divideTen') || '/10';
      stepDownButton.addEventListener('click', () => {
        this.normalizeAssignmentStep();
        this.assignmentStep = this.assignmentStep > 1n ? (this.assignmentStep / 10n) : 1n;
        this.updateUI();
      });
      const stepUpButton = document.createElement('button');
      stepUpButton.dataset.manufacturingUi = 'stepUpButton';
      stepUpButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.timesTen') || 'x10';
      stepUpButton.addEventListener('click', () => {
        this.normalizeAssignmentStep();
        this.assignmentStep = this.assignmentStep * 10n;
        if (this.assignmentStep > MANUFACTURING_ASSIGNMENT_STEP_MAX) {
          this.assignmentStep = MANUFACTURING_ASSIGNMENT_STEP_MAX;
        }
        this.updateUI();
      });

      const stepButtons = document.createElement('div');
      stepButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
      stepButtons.append(stepDownButton, stepUpButton);

      const assignmentLayout = document.createElement('div');
      assignmentLayout.classList.add('manufacturing-assignment-layout');
      assignmentLayout.dataset.manufacturingUi = 'assignmentLayout';

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
        rowA.dataset.manufacturingRole = 'rowA';
        rowA.dataset.manufacturingAssignmentKey = key;
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
        unitProductionEl.dataset.manufacturingRole = 'unitProduction';
        rowA.append(nameWrap, complexityEl, unitProductionEl);

        const amountEl = document.createElement('span');
        amountEl.classList.add('stat-value');
        amountEl.dataset.manufacturingRole = 'value';
        amountEl.dataset.manufacturingAssignmentKey = key;

        const zeroButton = document.createElement('button');
        zeroButton.dataset.manufacturingRole = 'zeroButton';
        zeroButton.dataset.manufacturingAssignmentKey = key;
        zeroButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.zero') || '0';
        zeroButton.addEventListener('click', () => {
          this.clearAssignment(key);
        });

        const minusButton = document.createElement('button');
        minusButton.dataset.manufacturingRole = 'minusButton';
        minusButton.dataset.manufacturingAssignmentKey = key;
        minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));

        const plusButton = document.createElement('button');
        plusButton.dataset.manufacturingRole = 'plusButton';
        plusButton.dataset.manufacturingAssignmentKey = key;
        plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

        const maxButton = document.createElement('button');
        maxButton.dataset.manufacturingRole = 'maxButton';
        maxButton.dataset.manufacturingAssignmentKey = key;
        maxButton.textContent = getManufacturingText('catalogs.specializations.manufacturing.ui.common.max') || 'Max';
        maxButton.addEventListener('click', () => {
          this.maximizeAssignment(key);
        });

        const autoAssignContainer = document.createElement('div');
        autoAssignContainer.classList.add('hephaestus-auto-assign');
        const autoAssign = document.createElement('input');
        autoAssign.type = 'checkbox';
        autoAssign.dataset.manufacturingRole = 'autoAssign';
        autoAssign.dataset.manufacturingAssignmentKey = key;
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
        weightInput.dataset.manufacturingRole = 'weightInput';
        weightInput.dataset.manufacturingAssignmentKey = key;
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
        rateEl.dataset.manufacturingRole = 'rate';
        rateEl.dataset.manufacturingAssignmentKey = key;

        const rowB = document.createElement('div');
        rowB.dataset.manufacturingRole = 'rowB';
        rowB.dataset.manufacturingAssignmentKey = key;
        rowB.classList.add('manufacturing-block-row', 'manufacturing-block-grid-b');
        if (isUnassigned) {
          rowB.classList.add('assignment-divider-row');
        }
        rowB.append(amountEl, controls);

        const rowC = document.createElement('div');
        rowC.dataset.manufacturingRole = 'rowC';
        rowC.dataset.manufacturingAssignmentKey = key;
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

      this.uiElements = {
        controlsCard: card,
        assignmentLayout,
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
      this.syncShopLayout();

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
        if (this.shopElements.adaptationValue) {
          this.shopElements.adaptationValue.textContent = formatNumber(this.getAdaptationPoints(), true);
        }
      }

      const elements = this.resolveUIElements();
      if (!elements) {
        return;
      }

      this.normalizeAssignments();
      this.normalizeAssignmentStep();
      const total = this.getTotalPotentialPopulation();
      const totalBigInt = normalizeManufacturingInteger(total);
      const assigned = this.getAssignedTotal(true);
      const available = totalBigInt > assigned ? (totalBigInt - assigned) : 0n;
      const step = this.assignmentStep;
      const bonus = this.getCylindersHopePopulationBonus();

      if (bonus > 0) {
        elements.cumulativeValue.textContent = `${formatNumber(total, true, 2)} (${formatNumber(this.cumulativePopulation, true, 2)} + ${formatNumber(bonus, true, 2)})`;
      } else {
        elements.cumulativeValue.textContent = formatNumber(this.cumulativePopulation, true, 2);
      }
      elements.assignedValue.textContent = formatNumber(assigned, true, 2);
      elements.freeValue.textContent = formatNumber(available, true);
      elements.statusValue.textContent = this.statusText || getManufacturingText('catalogs.specializations.manufacturing.status.idle');
      elements.inputValue.textContent = MANUFACTURING_INPUT_KEYS.map((inputKey) => {
        const label = MANUFACTURING_INPUT_LABELS[inputKey] || inputKey;
        return `${formatNumber(this.lastInputRates[inputKey] || 0, true, 3)} ${label}/s`;
      }).join(', ');
      elements.runCheckbox.checked = this.isRunning;
      elements.runCheckbox.disabled = totalBigInt <= 0n;
      elements.stepDownButton.disabled = totalBigInt <= 0n;
      elements.stepUpButton.disabled = totalBigInt <= 0n;
      const productivityByRecipe = this.getOperationProductivityForTick(true);

      this.getManagedAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row) {
          return;
        }
        const storedCurrent = this.getStoredAssignmentAmount(key);
        const displayedCurrent = this.isUnassignedAssignmentKey(key) ? available : storedCurrent;
        const maxForKey = this.getAssignmentMaxTarget(key);

        row.value.textContent = formatNumber(displayedCurrent, true, 2);
        const recipe = this.isUnassignedAssignmentKey(key) ? null : this.getRecipe(key);
        const unitProduction = recipe
          ? (recipe.baseOutput * this.getRecipeOutputMultiplier(key)) / recipe.complexity
          : 0;
        row.unitProduction.textContent = recipe ? `${formatNumber(unitProduction, true, 3)}/s` : '';
        row.minusButton.textContent = `-${formatNumber(step, true)}`;
        row.plusButton.textContent = `+${formatNumber(step, true)}`;
        row.autoAssign.checked = this.autoAssignFlags[key] === true;
        row.autoAssign.disabled = totalBigInt <= 0n;
        if (document.activeElement !== row.weightInput) {
          row.weightInput.value = String(
            Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1
          );
        }
        row.weightInput.disabled = totalBigInt <= 0n;
        row.zeroButton.disabled = storedCurrent <= 0n || this.autoAssignFlags[key];
        row.maxButton.disabled = storedCurrent >= maxForKey || totalBigInt <= 0n || this.autoAssignFlags[key];
        row.minusButton.disabled = storedCurrent <= 0n || this.autoAssignFlags[key];
        row.plusButton.disabled = storedCurrent >= maxForKey || totalBigInt <= 0n || this.autoAssignFlags[key];
        row.rate.textContent = recipe ? `${formatNumber(this.lastOutputRatesByRecipe[key] || 0, true, 3)}/s` : '';
        const recipeProductivity = recipe ? (productivityByRecipe[key] ?? 1) : 1;
        const productivityLimited = !!recipe && this.isRunning && storedCurrent > 0n && recipeProductivity < 1;
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
        manufacturingAssignments: serializeManufacturingAssignments(this.manufacturingAssignments),
        assignmentStep: serializeManufacturingInteger(this.assignmentStep),
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
      this.normalizeAssignmentStep();
    }

    saveState() {
      return {
        ...super.saveState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        shopRefactorCounts: { ...this.shopRefactorCounts },
        adaptationPoints: this.getAdaptationPoints(),
        manufacturingAssignments: serializeManufacturingAssignments(this.manufacturingAssignments),
        assignmentStep: serializeManufacturingInteger(this.assignmentStep),
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights },
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.loadSpecializationState(state);
      this.cumulativePopulation = Math.max(0, state.cumulativePopulation || 0);
      this.isRunning = state.isRunning === true;
      this.shopRefactorCounts = {
        ...this.createEmptyShopRefactorCounts(),
        ...(state.shopRefactorCounts || {}),
      };
      this.adaptationPoints = Math.max(0, state.adaptationPoints || 0);
      this.manufacturingAssignments = { ...(state.manufacturingAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
      this.normalizeAssignments();
      this.normalizeAssignmentStep();
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        shopRefactorCounts: { ...this.shopRefactorCounts },
        adaptationPoints: this.getAdaptationPoints(),
        manufacturingAssignments: serializeManufacturingAssignments(this.manufacturingAssignments),
        assignmentStep: serializeManufacturingInteger(this.assignmentStep),
        autoAssignFlags: { ...this.autoAssignFlags },
        autoAssignWeights: { ...this.autoAssignWeights },
      };
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.cumulativePopulation = Math.max(0, state.cumulativePopulation || 0);
      this.isRunning = state.isRunning === true;
      this.shopRefactorCounts = {
        ...this.createEmptyShopRefactorCounts(),
        ...(state.shopRefactorCounts || {}),
      };
      this.adaptationPoints = Math.max(0, state.adaptationPoints || 0);
      this.manufacturingAssignments = { ...(state.manufacturingAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
      this.normalizeAssignments();
      this.normalizeAssignmentStep();
    }
  }

  try {
    window.ManufacturingWorldProject = ManufacturingWorldProject;
  } catch (error) {}

  try {
    module.exports = ManufacturingWorldProject;
  } catch (error) {}
})();
