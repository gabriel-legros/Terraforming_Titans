(function () {
  let SpecializationBase;
  try {
    SpecializationBase = SpecializationProject;
  } catch (error) {}
  try {
    ({ SpecializationProject: SpecializationBase } = require('./SpecializationProject.js'));
  } catch (error) {}

  const MANUFACTURING_RECIPE_KEYS = [
    'glass',
    'components',
    'electronics',
    'superconductors',
    'superalloys',
  ];

  const MANUFACTURING_RECIPES = {
    glass: {
      label: 'Glass',
      outputStorageKey: 'glass',
      complexity: 5,
      baseOutput: 1,
      inputs: { silicon: 1 },
      shopId: 'glassEfficiency',
      wgcUpgradeId: null,
    },
    components: {
      label: 'Components',
      outputStorageKey: 'components',
      complexity: 100,
      baseOutput: 1,
      inputs: { metal: 5 },
      shopId: 'componentsEfficiency',
      wgcUpgradeId: 'componentsEfficiency',
    },
    electronics: {
      label: 'Electronics',
      outputStorageKey: 'electronics',
      complexity: 100,
      baseOutput: 1,
      inputs: { metal: 1, silicon: 4 },
      shopId: 'electronicsEfficiency',
      wgcUpgradeId: 'electronicsEfficiency',
    },
    superconductors: {
      label: 'Superconductor',
      outputStorageKey: 'superconductors',
      complexity: 500,
      baseOutput: 1,
      inputs: { metal: 5 },
      shopId: 'superconductorEfficiency',
      wgcUpgradeId: 'superconductorEfficiency',
    },
    superalloys: {
      label: 'Superalloy',
      outputStorageKey: 'superalloys',
      complexity: 100000,
      baseOutput: 1,
      inputs: { metal: 100 },
      shopId: 'superalloyEfficiency',
      wgcUpgradeId: 'superalloyEfficiency',
    },
  };

  const MANUFACTURING_SHOP_ITEMS = [
    {
      id: 'glassEfficiency',
      label: 'Glass Manufacturing +1%',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases both glass production and silica consumption by 1%.',
    },
    {
      id: 'componentsEfficiency',
      label: 'Components Manufacturing +1%',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases both components production and metal consumption by 1%.',
    },
    {
      id: 'electronicsEfficiency',
      label: 'Electronics Manufacturing +1%',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases both electronics production and metal/silica consumption by 1%.',
    },
    {
      id: 'superconductorEfficiency',
      label: 'Superconductor Manufacturing +1%',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases both superconductor production and metal consumption by 1%.',
    },
    {
      id: 'superalloyEfficiency',
      label: 'Superalloy Manufacturing +1%',
      cost: 1,
      maxPurchases: 900,
      description: 'Increases both superalloy production and metal consumption by 1%.',
    },
  ];

  const MANUFACTURING_SHOP_ITEM_MAP = MANUFACTURING_SHOP_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  class ManufacturingWorldProject extends SpecializationBase {
    constructor(config, name) {
      super(config, name, {
        pointsKey: 'manufacturingPoints',
        pointsLabel: 'Manufacturing Points:',
        pointsUnit: 'MP',
        shopTitle: 'MP Shop',
        shopTooltip: 'Gain MP equal to max(1, log10(population)) when travelling from a completed Manufacturing World.',
        emptyShopText: '',
        shopItems: MANUFACTURING_SHOP_ITEMS,
        shopItemMap: MANUFACTURING_SHOP_ITEM_MAP,
        specializationSourceId: 'manufacturingWorld',
        otherSpecializationIds: ['bioworld', 'foundryWorld'],
        ecumenopolisEffectPrefix: 'manufacturingWorld',
      });
      this.cumulativePopulation = 0;
      this.manufacturingAssignments = {};
      this.assignmentStep = 1;
      this.autoAssignFlags = {};
      this.autoAssignWeights = {};
      this.isRunning = false;
      this.statusText = 'Idle';
      this.lastInputRates = { metal: 0, silicon: 0 };
      this.lastOutputRatesByRecipe = {};
      this.uiElements = null;
      this.shopCollapsed = false;
    }

    getCurrentPopulation() {
      return Math.max(0, resources.colony.colonists.value || 0);
    }

    getTravelPointGain() {
      const population = Math.max(1, this.getCurrentPopulation());
      return Math.max(1, Math.log10(population));
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

    getSpecializationRequirements() {
      const foundry = projectManager.projects.foundryWorld;
      const bioworld = projectManager.projects.bioworld;
      const holyWorldBlocked = followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated();
      return [
        {
          id: 'terraformed',
          label: 'World is fully terraformed',
          met: spaceManager.isCurrentWorldTerraformed(),
        },
        {
          id: 'otherSpecialization',
          label: 'No other specialization started or completed',
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
        return 'Blocked by Holy World';
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
      const keys = this.getAssignmentKeys();
      const keySet = new Set(keys);
      const total = this.getTotalPotentialPopulation();

      keys.forEach((key) => {
        this.manufacturingAssignments[key] = Math.max(0, Math.floor(this.manufacturingAssignments[key] || 0));
        this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
        const weight = Number(this.autoAssignWeights[key]);
        this.autoAssignWeights[key] = weight > 0 ? weight : 1;
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

    setAssignmentStep(step) {
      this.assignmentStep = Math.min(1_000_000_000_000, Math.max(1, Math.round(step)));
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
      const keys = this.getAssignmentKeys();
      const total = this.getTotalPotentialPopulation();
      const current = this.manufacturingAssignments[key] || 0;
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key) {
          return sum;
        }
        if (this.autoAssignFlags[otherKey]) {
          return sum;
        }
        return sum + (this.manufacturingAssignments[otherKey] || 0);
      }, 0);
      const maxForKey = Math.max(0, total - usedOther);
      this.manufacturingAssignments[key] = Math.min(maxForKey, Math.max(0, current + delta));
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
        this.updateStatus('Run disabled');
      }
      this.updateUI();
    }

    updateStatus(text) {
      this.statusText = text || 'Idle';
    }

    setLastRunStats(inputRates = {}, outputRates = {}) {
      this.lastInputRates = {
        metal: inputRates.metal || 0,
        silicon: inputRates.silicon || 0,
      };
      this.lastOutputRatesByRecipe = {};
      this.getAssignmentKeys().forEach((key) => {
        this.lastOutputRatesByRecipe[key] = outputRates[key] || 0;
      });
    }

    shouldOperate() {
      return this.isRunning && this.getTotalPotentialPopulation() > 0;
    }

    getSpaceStorageProject() {
      return projectManager.projects.spaceStorage;
    }

    runManufacturing(deltaTime = 1000) {
      if (!this.shouldOperate()) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        if (!this.isRunning) {
          this.updateStatus('Run disabled');
        } else {
          this.updateStatus('No cumulative population');
        }
        this.shortfallLastTick = false;
        return;
      }

      const seconds = deltaTime / 1000;
      if (!(seconds > 0)) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus('Idle');
        this.shortfallLastTick = false;
        return;
      }

      const storage = this.getSpaceStorageProject();
      if (!storage) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus('Build space storage');
        this.shortfallLastTick = true;
        return;
      }

      this.normalizeAssignments();
      const entries = [];
      let desiredMetal = 0;
      let desiredSilicon = 0;

      this.getAssignmentKeys().forEach((key) => {
        const assigned = this.manufacturingAssignments[key] || 0;
        if (assigned <= 0) {
          return;
        }
        const recipe = this.getRecipe(key);
        const outputMultiplier = this.getRecipeOutputMultiplier(key);
        const consumptionMultiplier = this.getRecipeConsumptionMultiplier(key);
        const desiredOutput = ((assigned * recipe.baseOutput * outputMultiplier) / recipe.complexity) * seconds;
        const desiredInputs = {};
        if (recipe.inputs.metal) {
          const amount = ((assigned * recipe.inputs.metal * consumptionMultiplier) / recipe.complexity) * seconds;
          desiredInputs.metal = amount;
          desiredMetal += amount;
        }
        if (recipe.inputs.silicon) {
          const amount = ((assigned * recipe.inputs.silicon * consumptionMultiplier) / recipe.complexity) * seconds;
          desiredInputs.silicon = amount;
          desiredSilicon += amount;
        }
        entries.push({
          key,
          recipe,
          desiredOutput,
          desiredInputs,
        });
      });

      if (entries.length === 0) {
        this.setLastRunStats({ metal: 0, silicon: 0 }, {});
        this.updateStatus('No assignments');
        this.shortfallLastTick = false;
        return;
      }

      const metalAvailable = storage.getAvailableStoredResource('metal');
      const siliconAvailable = storage.getAvailableStoredResource('silicon');
      const metalRatio = desiredMetal > 0 ? Math.min(1, metalAvailable / desiredMetal) : 1;
      const siliconRatio = desiredSilicon > 0 ? Math.min(1, siliconAvailable / desiredSilicon) : 1;

      const inputSpent = { metal: 0, silicon: 0 };
      const outputProduced = {};
      let totalOutput = 0;
      let outputCapBlocked = false;

      entries.forEach((entry) => {
        const wantsMetal = (entry.desiredInputs.metal || 0) > 0;
        const wantsSilicon = (entry.desiredInputs.silicon || 0) > 0;
        let scale = 1;
        if (wantsMetal && wantsSilicon) {
          scale = Math.min(metalRatio, siliconRatio);
        } else if (wantsMetal) {
          scale = metalRatio;
        } else if (wantsSilicon) {
          scale = siliconRatio;
        }

        if (wantsMetal) {
          const desired = (entry.desiredInputs.metal || 0) * scale;
          const spent = storage.spendStoredResource('metal', desired);
          inputSpent.metal += spent;
          if (desired > 0) {
            scale = Math.min(scale, spent / desired);
          }
        }
        if (wantsSilicon) {
          const desired = (entry.desiredInputs.silicon || 0) * scale;
          const spent = storage.spendStoredResource('silicon', desired);
          inputSpent.silicon += spent;
          if (desired > 0) {
            scale = Math.min(scale, spent / desired);
          }
        }

        const desiredProduced = entry.desiredOutput * scale;
        const current = storage.getStoredResourceValue(entry.recipe.outputStorageKey);
        const capLimit = storage.getResourceCapLimit(entry.recipe.outputStorageKey);
        const capRemaining = Math.max(0, capLimit - current);
        const storedProduced = Math.min(desiredProduced, capRemaining);
        if (storedProduced > 0) {
          storage.addStoredResource(entry.recipe.outputStorageKey, storedProduced);
          totalOutput += storedProduced;
        }
        if (desiredProduced > storedProduced) {
          outputCapBlocked = true;
        }
        // Report full production potential even when output is capped.
        outputProduced[entry.key] = desiredProduced;
      });

      const anyStorageMutation = inputSpent.metal > 0 || inputSpent.silicon > 0 || totalOutput > 0;
      if (anyStorageMutation) {
        storage.reconcileUsedStorage();
        try {
          updateSpaceStorageUI(storage);
        } catch (error) {}
      }

      const inputRates = {
        metal: inputSpent.metal / seconds,
        silicon: inputSpent.silicon / seconds,
      };
      const outputRates = {};
      this.getAssignmentKeys().forEach((key) => {
        outputRates[key] = (outputProduced[key] || 0) / seconds;
      });

      if (inputRates.metal > 0) {
        resources.spaceStorage.metal.modifyRate(-inputRates.metal, this.displayName, 'project');
      }
      if (inputRates.silicon > 0) {
        resources.spaceStorage.silicon.modifyRate(-inputRates.silicon, this.displayName, 'project');
      }
      this.getAssignmentKeys().forEach((key) => {
        const rate = outputRates[key] || 0;
        if (rate <= 0) {
          return;
        }
        const recipe = this.getRecipe(key);
        resources.spaceStorage[recipe.outputStorageKey].modifyRate(rate, this.displayName, 'project');
      });

      this.setLastRunStats(inputRates, outputRates);

      const hasInputShortfall = metalRatio < 1 || siliconRatio < 1;
      if (totalOutput > 0) {
        this.updateStatus('Running');
      } else if ((desiredMetal > 0 && metalRatio <= 0) || (desiredSilicon > 0 && siliconRatio <= 0)) {
        this.updateStatus('Insufficient input in space storage');
      } else if (outputCapBlocked) {
        this.updateStatus('Output storage cap reached');
      } else {
        this.updateStatus('Idle');
      }
      this.shortfallLastTick = hasInputShortfall || outputCapBlocked;
    }

    update(deltaTime) {
      super.update(deltaTime);
      this.runManufacturing(deltaTime);
    }

    renderUI(container) {
      super.renderUI(container);

      const card = document.createElement('div');
      card.classList.add('info-card', 'nuclear-alchemy-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = 'Manufacturing Controls';
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(info, 'Assign cumulative manufacturing population to recipes. Output uses (Assigned x Output / Complexity).  WGC bonuses apply.');
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
        box.append(label, value);
        summaryGrid.appendChild(box);
        return value;
      };

      const cumulativeValue = createStatBox('Cumulative Population');
      const assignedValue = createStatBox('Assigned');
      const freeValue = createStatBox('Unassigned');
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
      runLabel.textContent = 'Run manufacturing';
      runField.append(runCheckbox, runLabel);
      controlsGrid.appendChild(runField);

      const statusField = document.createElement('div');
      statusField.classList.add('stat-item');
      const statusLabel = document.createElement('span');
      statusLabel.classList.add('stat-label');
      statusLabel.textContent = 'Status';
      const statusValue = document.createElement('span');
      statusField.append(statusLabel, statusValue);
      controlsGrid.appendChild(statusField);

      const inputField = document.createElement('div');
      inputField.classList.add('stat-item');
      const inputLabel = document.createElement('span');
      inputLabel.classList.add('stat-label');
      inputLabel.textContent = 'Input Use';
      const inputValue = document.createElement('span');
      inputField.append(inputLabel, inputValue);
      controlsGrid.appendChild(inputField);
      body.appendChild(controlsGrid);

      const assignmentGrid = document.createElement('div');
      assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list');

      const stepDownButton = document.createElement('button');
      stepDownButton.textContent = '/10';
      stepDownButton.addEventListener('click', () => {
        this.setAssignmentStep(this.assignmentStep / 10);
        this.updateUI();
      });
      const stepUpButton = document.createElement('button');
      stepUpButton.textContent = 'x10';
      stepUpButton.addEventListener('click', () => {
        this.setAssignmentStep(this.assignmentStep * 10);
        this.updateUI();
      });

      const headerRow = document.createElement('div');
      headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row', 'nuclear-alchemy-assignment-row');
      const headerName = document.createElement('span');
      headerName.classList.add('stat-label');
      headerName.textContent = 'Resource';
      const headerComplexity = document.createElement('span');
      headerComplexity.classList.add('stat-label');
      headerComplexity.textContent = 'Complexity';
      const headerAssigned = document.createElement('span');
      headerAssigned.classList.add('stat-label');
      headerAssigned.textContent = 'Assigned';
      const headerControls = document.createElement('div');
      headerControls.classList.add('hephaestus-assignment-controls');
      const headerButtons = document.createElement('div');
      headerButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
      headerButtons.append(stepDownButton, stepUpButton);
      const weightHeader = document.createElement('span');
      weightHeader.classList.add('stat-label', 'hephaestus-weight-header');
      weightHeader.textContent = 'Weight';
      headerControls.append(headerButtons, weightHeader);
      const headerRate = document.createElement('div');
      headerRate.classList.add('stat-label', 'nuclear-alchemy-rate-cell');
      headerRate.textContent = 'Rate';
      headerRow.append(headerName, headerComplexity, headerAssigned, headerControls, headerRate);
      assignmentGrid.appendChild(headerRow);

      const headerDivider = document.createElement('div');
      headerDivider.classList.add('hephaestus-header-divider');
      assignmentGrid.appendChild(headerDivider);

      const rowElements = {};
      this.getAssignmentKeys().forEach((key) => {
        const recipe = this.getRecipe(key);
        const row = document.createElement('div');
        row.classList.add('hephaestus-assignment-row', 'nuclear-alchemy-assignment-row');

        const nameWrap = document.createElement('div');
        nameWrap.classList.add('stat-label');
        const nameEl = document.createElement('span');
        nameEl.textContent = recipe.label;
        const nameInfo = document.createElement('span');
        nameInfo.classList.add('info-tooltip-icon');
        nameInfo.innerHTML = '&#9432;';
        const inputParts = [];
        if (recipe.inputs.metal) {
          inputParts.push(`${formatNumber(recipe.inputs.metal, true)} metal`);
        }
        if (recipe.inputs.silicon) {
          inputParts.push(`${formatNumber(recipe.inputs.silicon, true)} silica`);
        }
        attachDynamicInfoTooltip(nameInfo, `Recipe: ${inputParts.join(', ')}.`);
        nameWrap.append(nameEl, nameInfo);

        const complexityEl = document.createElement('span');
        complexityEl.classList.add('stat-value');
        complexityEl.textContent = formatNumber(recipe.complexity, true);

        const amountEl = document.createElement('span');
        amountEl.classList.add('stat-value');

        const zeroButton = document.createElement('button');
        zeroButton.textContent = '0';
        zeroButton.addEventListener('click', () => {
          if (this.autoAssignFlags[key]) {
            return;
          }
          this.manufacturingAssignments[key] = 0;
          this.normalizeAssignments();
          this.updateUI();
        });

        const minusButton = document.createElement('button');
        minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));

        const plusButton = document.createElement('button');
        plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

        const maxButton = document.createElement('button');
        maxButton.textContent = 'Max';
        maxButton.addEventListener('click', () => {
          if (this.autoAssignFlags[key]) {
            return;
          }
          this.normalizeAssignments();
          const keys = this.getAssignmentKeys();
          const total = this.getTotalPotentialPopulation();
          const usedOther = keys.reduce((sum, otherKey) => {
            if (otherKey === key) {
              return sum;
            }
            if (this.autoAssignFlags[otherKey]) {
              return sum;
            }
            return sum + (this.manufacturingAssignments[otherKey] || 0);
          }, 0);
          this.manufacturingAssignments[key] = Math.max(0, total - usedOther);
          this.normalizeAssignments();
          this.updateUI();
        });

        const autoAssignContainer = document.createElement('div');
        autoAssignContainer.classList.add('hephaestus-auto-assign');
        const autoAssign = document.createElement('input');
        autoAssign.type = 'checkbox';
        autoAssign.addEventListener('change', () => {
          this.setAutoAssignTarget(key, autoAssign.checked);
        });
        const autoAssignLabel = document.createElement('span');
        autoAssignLabel.textContent = 'Auto';
        autoAssignLabel.addEventListener('click', () => {
          autoAssign.checked = !autoAssign.checked;
          this.setAutoAssignTarget(key, autoAssign.checked);
        });
        autoAssignContainer.append(autoAssign, autoAssignLabel);

        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.step = '0.1';
        weightInput.value = String(this.autoAssignWeights[key] || 1);
        weightInput.classList.add('hephaestus-weight-input');
        weightInput.addEventListener('input', () => {
          const value = Number(weightInput.value);
          this.autoAssignWeights[key] = value > 0 ? value : 1;
          this.normalizeAssignments();
          this.updateUI();
        });

        const controls = document.createElement('div');
        controls.classList.add('hephaestus-assignment-controls');
        const controlButtons = document.createElement('div');
        controlButtons.classList.add('hephaestus-control-buttons');
        controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
        controls.append(controlButtons, weightInput);

        const rateEl = document.createElement('div');
        rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');

        row.append(nameWrap, complexityEl, amountEl, controls, rateEl);
        assignmentGrid.appendChild(row);

        rowElements[key] = {
          value: amountEl,
          zeroButton,
          minusButton,
          plusButton,
          maxButton,
          autoAssign,
          weightInput,
          rate: rateEl,
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
          this.shopElements.collapseButton.textContent = collapsed ? 'Show Shop' : 'Hide Shop';
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
      elements.assignedValue.textContent = formatNumber(assigned, true);
      elements.freeValue.textContent = formatNumber(available, true);
      elements.statusValue.textContent = this.statusText || 'Idle';
      elements.inputValue.textContent = `${formatNumber(this.lastInputRates.metal, true, 3)} metal/s, ${formatNumber(this.lastInputRates.silicon, true, 3)} silica/s`;
      elements.runCheckbox.checked = this.isRunning;
      elements.runCheckbox.disabled = total <= 0;
      elements.stepDownButton.disabled = total <= 0;
      elements.stepUpButton.disabled = total <= 0;

      this.getAssignmentKeys().forEach((key) => {
        const row = elements.rowElements[key];
        if (!row) {
          return;
        }
        const current = this.manufacturingAssignments[key] || 0;
        const keys = this.getAssignmentKeys();
        const usedOther = keys.reduce((sum, otherKey) => {
          if (otherKey === key) {
            return sum;
          }
          if (this.autoAssignFlags[otherKey]) {
            return sum;
          }
          return sum + (this.manufacturingAssignments[otherKey] || 0);
        }, 0);
        const maxForKey = Math.max(0, total - usedOther);

        row.value.textContent = formatNumber(current, true);
        row.minusButton.textContent = `-${formatNumber(step, true)}`;
        row.plusButton.textContent = `+${formatNumber(step, true)}`;
        row.autoAssign.checked = this.autoAssignFlags[key] === true;
        row.autoAssign.disabled = total <= 0;
        row.weightInput.value = String(this.autoAssignWeights[key] || 1);
        row.weightInput.disabled = total <= 0;
        row.zeroButton.disabled = current <= 0 || this.autoAssignFlags[key];
        row.maxButton.disabled = current >= maxForKey || total <= 0 || this.autoAssignFlags[key];
        row.minusButton.disabled = current <= 0 || this.autoAssignFlags[key];
        row.plusButton.disabled = current >= maxForKey || total <= 0 || this.autoAssignFlags[key];
        row.rate.textContent = `${formatNumber(this.lastOutputRatesByRecipe[key] || 0, true, 3)}/s`;
      });
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
      this.updateStatus(this.isRunning ? 'Idle' : 'Run disabled');
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
      this.updateStatus(this.isRunning ? 'Idle' : 'Run disabled');
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
