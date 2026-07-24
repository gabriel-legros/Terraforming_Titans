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

  let ManufacturingAssignmentTools = {};
  try {
    ManufacturingAssignmentTools = {
      createProjectAssignmentBase,
      normalizeProjectAssignmentInteger,
      serializeProjectAssignmentInteger,
      serializeProjectAssignments
    };
  } catch (error) {}
  try {
    ManufacturingAssignmentTools = require('./ProjectAssignmentBase.js');
  } catch (error) {}

  function normalizeManufacturingInteger(value) {
    return ManufacturingAssignmentTools.normalizeProjectAssignmentInteger(value);
  }

  function serializeManufacturingInteger(value) {
    return ManufacturingAssignmentTools.serializeProjectAssignmentInteger(value);
  }

  function serializeManufacturingAssignments(assignments = {}) {
    return ManufacturingAssignmentTools.serializeProjectAssignments(assignments);
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
  MANUFACTURING_RECIPE_KEYS.forEach((recipeKey) => {
    const recipe = MANUFACTURING_RECIPES[recipeKey];
    recipe.inputEntries = Object.keys(recipe.inputs).map((inputKey) => ({
      inputKey,
      amount: recipe.inputs[inputKey],
    }));
  });

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

  class ManufacturingWorldProject extends ManufacturingAssignmentTools.createProjectAssignmentBase(SpecializationBase) {
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
        otherSpecializationIds: [],
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
      this.assignmentsDirty = true;
      this.assignmentsLastTotal = null;
      this.assignmentsLastKeySignature = '';
      this.cachedManagedAssignmentKeys = null;
      this.cachedAssignmentKeys = null;
      this.cachedAssignedTotal = 0n;
      this.initializeAssignmentState({
        assignmentStateKey: 'manufacturingAssignments',
        assignmentStepMax: MANUFACTURING_ASSIGNMENT_STEP_MAX
      });
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
      const signature = MANUFACTURING_RECIPE_KEYS.map((key) => {
        const recipe = MANUFACTURING_RECIPES[key];
        return !recipe.requiresProjectFlag || this.isBooleanFlagSet(recipe.requiresProjectFlag) ? key : '';
      }).join('|');
      if (this.cachedAssignmentKeys && this.assignmentsLastKeySignature === signature) {
        return this.cachedAssignmentKeys;
      }
      this.cachedAssignmentKeys = MANUFACTURING_RECIPE_KEYS.filter((key) => {
        const recipe = MANUFACTURING_RECIPES[key];
        return !recipe.requiresProjectFlag || this.isBooleanFlagSet(recipe.requiresProjectFlag);
      });
      this.cachedManagedAssignmentKeys = null;
      this.assignmentsLastKeySignature = signature;
      this.markAssignmentsDirty();
      return this.cachedAssignmentKeys;
    }

    getUnassignedAssignmentKey() {
      return MANUFACTURING_UNASSIGNED_KEY;
    }

    getManagedAssignmentKeys() {
      if (!this.cachedManagedAssignmentKeys) {
        this.cachedManagedAssignmentKeys = [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
      }
      return this.cachedManagedAssignmentKeys;
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
      return [
        {
          id: 'terraformed',
          label: getManufacturingText('catalogs.specializations.manufacturing.requirements.terraformed'),
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'otherSpecialization',
          label: getManufacturingText('catalogs.specializations.manufacturing.requirements.otherSpecialization'),
          met: !hasOtherWorldSpecialization(this),
        },
      ];
    }

    getSpecializationLockedText() {
      return super.getSpecializationLockedText();
    }

    canStart() {
      if (!super.canStart()) {
        return false;
      }
      if (!spaceManager.isCurrentWorldTerraformed()) {
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

    getAssignmentTotalCapacity() {
      return normalizeManufacturingInteger(this.getTotalPotentialPopulation());
    }

    getPersistentAssignmentKeys() {
      return [this.getUnassignedAssignmentKey()].concat(MANUFACTURING_RECIPE_KEYS);
    }

    getAvailablePopulation(skipNormalization = false, assignedTotal = null) {
      return this.getAvailableAssignments(skipNormalization, assignedTotal);
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

    createManufacturingAssignmentRow(key, blockABody, blockBBody, blockCBody) {
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

      const assignmentControls = this.createAssignmentControls(key, {
        rolePrefix: 'manufacturing',
        assignmentKeyDataset: 'manufacturingAssignmentKey',
        textProvider: (controlKey, fallback) => {
          const paths = {
            zero: 'catalogs.specializations.manufacturing.ui.common.zero',
            max: 'catalogs.specializations.manufacturing.ui.common.max',
            auto: 'catalogs.specializations.manufacturing.ui.auto'
          };
          return getManufacturingText(paths[controlKey]) || fallback;
        }
      });

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
      rowB.append(amountEl, assignmentControls.controls);

      const rowC = document.createElement('div');
      rowC.dataset.manufacturingRole = 'rowC';
      rowC.dataset.manufacturingAssignmentKey = key;
      rowC.classList.add('manufacturing-block-row', 'manufacturing-block-grid-c');
      if (isUnassigned) {
        rowC.classList.add('assignment-divider-row');
      }
      rowC.append(assignmentControls.weightInput, rateEl);

      blockABody.appendChild(rowA);
      blockBBody.appendChild(rowB);
      blockCBody.appendChild(rowC);

      return {
        rowA,
        rowB,
        rowC,
        unitProduction: unitProductionEl,
        value: amountEl,
        zeroButton: assignmentControls.zeroButton,
        minusButton: assignmentControls.minusButton,
        plusButton: assignmentControls.plusButton,
        maxButton: assignmentControls.maxButton,
        autoAssign: assignmentControls.autoAssign,
        weightInput: assignmentControls.weightInput,
        rate: rateEl,
        recipeTooltip,
        recipeTooltipCache,
      };
    }

    syncManufacturingAssignmentRows(elements) {
      if (!elements || !elements.blockABody || !elements.blockBBody || !elements.blockCBody) {
        return;
      }
      const rowElements = elements.rowElements || {};
      const activeKeys = new Set(this.getManagedAssignmentKeys());
      let changed = false;

      activeKeys.forEach((key) => {
        if (!rowElements[key]) {
          rowElements[key] = this.createManufacturingAssignmentRow(
            key,
            elements.blockABody,
            elements.blockBBody,
            elements.blockCBody
          );
          changed = true;
        }
      });

      Object.keys(rowElements).forEach((key) => {
        if (activeKeys.has(key)) {
          return;
        }
        const row = rowElements[key];
        if (row.rowA) {
          row.rowA.remove();
        }
        if (row.rowB) {
          row.rowB.remove();
        }
        if (row.rowC) {
          row.rowC.remove();
        }
        delete rowElements[key];
        changed = true;
      });

      let previousRowA = null;
      let previousRowB = null;
      let previousRowC = null;
      this.getManagedAssignmentKeys().forEach((key) => {
        const row = rowElements[key];
        if (!row) {
          return;
        }
        if (row.rowA.parentNode !== elements.blockABody || row.rowA.previousSibling !== previousRowA) {
          elements.blockABody.insertBefore(row.rowA, previousRowA ? previousRowA.nextSibling : elements.blockABody.firstChild);
          changed = true;
        }
        previousRowA = row.rowA;
        if (row.rowB.parentNode !== elements.blockBBody || row.rowB.previousSibling !== previousRowB) {
          elements.blockBBody.insertBefore(row.rowB, previousRowB ? previousRowB.nextSibling : elements.blockBBody.firstChild);
          changed = true;
        }
        previousRowB = row.rowB;
        if (row.rowC.parentNode !== elements.blockCBody || row.rowC.previousSibling !== previousRowC) {
          elements.blockCBody.insertBefore(row.rowC, previousRowC ? previousRowC.nextSibling : elements.blockCBody.firstChild);
          changed = true;
        }
        previousRowC = row.rowC;
      });

      elements.rowElements = rowElements;
      if (changed) {
        this.assignmentRowHeightsDirty = true;
      }
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
        blockABody: assignmentLayout.querySelector('[data-manufacturing-ui="blockABody"]'),
        blockBBody: assignmentLayout.querySelector('[data-manufacturing-ui="blockBBody"]'),
        blockCBody: assignmentLayout.querySelector('[data-manufacturing-ui="blockCBody"]'),
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
        recipe.inputEntries.forEach((entry) => {
          const inputKey = entry.inputKey;
          const amount = ((assignedNumber * entry.amount * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
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
        recipe.inputEntries.forEach((entry) => {
          const inputKey = entry.inputKey;
          const amount = ((assignedNumber * entry.amount * consumptionMultiplier) / recipe.complexity) * seconds * recipeProductivity;
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

      const sharedStepButtons = this.createAssignmentStepButtons((key, fallback) => {
        const paths = {
          divideTen: 'catalogs.specializations.manufacturing.ui.common.divideTen',
          timesTen: 'catalogs.specializations.manufacturing.ui.common.timesTen'
        };
        return getManufacturingText(paths[key]) || fallback;
      });
      const stepDownButton = sharedStepButtons.stepDownButton;
      stepDownButton.dataset.manufacturingUi = 'stepDownButton';
      const stepUpButton = sharedStepButtons.stepUpButton;
      stepUpButton.dataset.manufacturingUi = 'stepUpButton';

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
      blockABody.dataset.manufacturingUi = 'blockABody';
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
      blockBBody.dataset.manufacturingUi = 'blockBBody';
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
      blockCBody.dataset.manufacturingUi = 'blockCBody';
      blockC.append(blockCHeader, blockCBody);

      assignmentLayout.append(blockA, blockB, blockC);
      assignmentGrid.appendChild(assignmentLayout);

      const rowElements = {};
      this.getManagedAssignmentKeys().forEach((key) => {
        rowElements[key] = this.createManufacturingAssignmentRow(key, blockABody, blockBBody, blockCBody);
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
        blockABody,
        blockBBody,
        blockCBody,
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
          const display = collapsed ? 'none' : '';
          if (this.shopElements.itemsContainer.style.display !== display) {
            this.shopElements.itemsContainer.style.display = display;
          }
        }
        if (this.shopElements.collapseButton) {
          const collapseText = collapsed
            ? getManufacturingText('catalogs.specializations.manufacturing.ui.showShop')
            : getManufacturingText('catalogs.specializations.manufacturing.ui.hideShop');
          if (this.shopElements.collapseButton.textContent !== collapseText) {
            this.shopElements.collapseButton.textContent = collapseText;
          }
        }
        if (this.shopElements.adaptationValue) {
          const adaptationText = formatNumber(this.getAdaptationPoints(), true);
          if (this.shopElements.adaptationValue.textContent !== adaptationText) {
            this.shopElements.adaptationValue.textContent = adaptationText;
          }
        }
      }

      const elements = this.resolveUIElements();
      if (!elements) {
        return;
      }

      this.syncManufacturingAssignmentRows(elements);
      this.normalizeAssignments();
      this.normalizeAssignmentStep();
      const total = this.getTotalPotentialPopulation();
      const totalBigInt = normalizeManufacturingInteger(total);
      const assigned = this.getAssignedTotal(true);
      const available = totalBigInt > assigned ? (totalBigInt - assigned) : 0n;
      const step = this.assignmentStep;
      const bonus = this.getCylindersHopePopulationBonus();

      const cumulativeText = bonus > 0
        ? `${formatNumber(total, true, 2)} (${formatNumber(this.cumulativePopulation, true, 2)} + ${formatNumber(bonus, true, 2)})`
        : formatNumber(this.cumulativePopulation, true, 2);
      const assignedText = formatNumber(assigned, true, 2);
      const availableText = formatNumber(available, true);
      const statusText = this.statusText || getManufacturingText('catalogs.specializations.manufacturing.status.idle');
      const inputText = MANUFACTURING_INPUT_KEYS.map((inputKey) => {
        const label = MANUFACTURING_INPUT_LABELS[inputKey] || inputKey;
        return `${formatNumber(this.lastInputRates[inputKey] || 0, true, 3)} ${label}/s`;
      }).join(', ');
      if (elements.cumulativeValue.textContent !== cumulativeText) {
        elements.cumulativeValue.textContent = cumulativeText;
      }
      if (elements.assignedValue.textContent !== assignedText) {
        elements.assignedValue.textContent = assignedText;
      }
      if (elements.freeValue.textContent !== availableText) {
        elements.freeValue.textContent = availableText;
      }
      if (elements.statusValue.textContent !== statusText) {
        elements.statusValue.textContent = statusText;
      }
      if (elements.inputValue.textContent !== inputText) {
        elements.inputValue.textContent = inputText;
      }
      if (elements.runCheckbox.checked !== this.isRunning) {
        elements.runCheckbox.checked = this.isRunning;
      }
      const controlsDisabled = totalBigInt <= 0n;
      if (elements.runCheckbox.disabled !== controlsDisabled) {
        elements.runCheckbox.disabled = controlsDisabled;
      }
      if (elements.stepDownButton.disabled !== controlsDisabled) {
        elements.stepDownButton.disabled = controlsDisabled;
      }
      if (elements.stepUpButton.disabled !== controlsDisabled) {
        elements.stepUpButton.disabled = controlsDisabled;
      }
      const productivityByRecipe = this.getOperationProductivityForTick(true);

      this.getManagedAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row) {
          return;
        }
        const storedCurrent = this.getStoredAssignmentAmount(key);
        const displayedCurrent = this.getDisplayedAssignmentAmount(key);
        const maxForKey = this.getAssignmentMaxTarget(key);

        const valueText = formatNumber(displayedCurrent, true, 2);
        if (row.value.textContent !== valueText) {
          row.value.textContent = valueText;
        }
        const recipe = this.isUnassignedAssignmentKey(key) ? null : this.getRecipe(key);
        const unitProduction = recipe
          ? (recipe.baseOutput * this.getRecipeOutputMultiplier(key)) / recipe.complexity
          : 0;
        const unitProductionText = recipe ? `${formatNumber(unitProduction, true, 3)}/s` : '';
        if (row.unitProduction.textContent !== unitProductionText) {
          row.unitProduction.textContent = unitProductionText;
        }
        this.updateAssignmentControls(row, key, totalBigInt, step);
        const rateText = recipe ? `${formatNumber(this.lastOutputRatesByRecipe[key] || 0, true, 3)}/s` : '';
        if (row.rate.textContent !== rateText) {
          row.rate.textContent = rateText;
        }
        const recipeProductivity = recipe ? (productivityByRecipe[key] ?? 1) : 1;
        const productivityLimited = !!recipe && this.isRunning && storedCurrent > 0n && recipeProductivity < 1;
        if (row.rate.classList.contains('project-rate-productivity-limited') !== productivityLimited) {
          row.rate.classList.toggle('project-rate-productivity-limited', productivityLimited);
        }
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
        ...this.saveAssignmentSettings(),
      };
    }

    loadAutomationSettings(settings = {}, options = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
        this.isRunning = settings.isRunning === true;
      }
      this.loadAssignmentSettings(settings, options);
    }

    saveState() {
      return {
        ...super.saveState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        shopRefactorCounts: { ...this.shopRefactorCounts },
        adaptationPoints: this.getAdaptationPoints(),
        ...this.saveAssignmentSettings(),
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
      this.loadAssignmentSettings(state);
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        cumulativePopulation: this.cumulativePopulation,
        isRunning: this.isRunning,
        shopRefactorCounts: { ...this.shopRefactorCounts },
        adaptationPoints: this.getAdaptationPoints(),
        ...this.saveAssignmentSettings(),
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
      this.loadAssignmentSettings(state);
      this.setLastRunStats({ metal: 0, silicon: 0 }, {});
      this.updateStatus(this.isRunning
        ? getManufacturingText('catalogs.specializations.manufacturing.status.idle')
        : getManufacturingText('catalogs.specializations.manufacturing.status.runDisabled'));
    }
  }

  try {
    window.ManufacturingWorldProject = ManufacturingWorldProject;
  } catch (error) {}

  try {
    module.exports = ManufacturingWorldProject;
  } catch (error) {}
})();
