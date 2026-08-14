class GalacticMarketProject extends Project {
  getRateSource() {
    return registerRateSource(
      RESOURCE_RATE_SOURCE_IDS.galacticMarket,
      t('ui.resourceRates.sources.galacticMarket', {}, 'Galactic Market')
    );
  }

  getGalacticMarketText(path, fallback, vars) {
    try {
      return t(path, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  constructor(config, name) {
    super(config, name);
    this.spaceshipPriceIncrease = 0;
    this.selectionIncrement = 1;
    this.shortfallLastTick = false;
    this.buySelections = [];
    this.sellSelections = [];
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    this.manualRunRemainingTime = 0;
    this.tradeSaturationMultiplier = 1;
    this.kesslerCapped = false;
    this.purchaseCapped = false;
    this.extraSettingsEnabled = false;
    this.pendingOverflowSales = {};
  }

  isContinuous() {
    return true;
  }

  getResourceExecutionDeltaTime(deltaTime) {
    return this.manualContinuousRun ? 1000 : deltaTime;
  }

  renderUI(container) {
    const topSection = document.createElement('div');
    topSection.classList.add('project-top-section');

    this.createSelectionUI(topSection);

    container.appendChild(topSection);

    const totalCostDisplay = document.createElement('p');
    totalCostDisplay.id = `${this.name}-total-cost-display`;
    totalCostDisplay.classList.add('total-cost-display');
    const totalCostLabel = document.createElement('span');
    totalCostLabel.textContent = this.getGalacticMarketText('ui.projects.galacticMarket.totalCost', 'Total Cost: ');
    const totalCostValue = document.createElement('span');
    totalCostValue.id = `${this.name}-total-cost-display-value`;
    totalCostDisplay.append(totalCostLabel, totalCostValue);
    container.appendChild(totalCostDisplay);

    const purchaseCapWarning = document.createElement('div');
    purchaseCapWarning.classList.add('project-kessler-warning', 'galactic-market-purchase-cap-warning');
    const warningIcon = document.createElement('span');
    warningIcon.classList.add('project-kessler-warning__icon');
    warningIcon.textContent = '!';
    const warningText = document.createElement('span');
    warningText.textContent = this.getGalacticMarketText(
      'ui.projects.galacticMarket.purchaseCapWarning',
      'Galactic Market purchases are limited to 100 per second.'
    );
    const warningIconRight = document.createElement('span');
    warningIconRight.classList.add('project-kessler-warning__icon');
    warningIconRight.textContent = '!';
    purchaseCapWarning.append(warningIcon, warningText, warningIconRight);
    container.appendChild(purchaseCapWarning);

    const elements = projectElements[this.name] = {
      ...(projectElements[this.name] || {}),
      totalCostDisplay,
      totalCostValue,
      totalCostLabel,
      purchaseCapWarning,
      resourceSelectionContainer: container,
      marketProject: this,
    };

    this.applySelectionsToInputs();
    this.updateSelectedResources();
    updateTotalCostDisplay(this);
  }

  createSelectionUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const selectionGridContainer = document.createElement('div');
    selectionGridContainer.classList.add('galactic-market-grid-container');

    const leftGrid = document.createElement('div');
    leftGrid.classList.add('cargo-selection-grid', 'galactic-market-grid', 'galactic-market-left-grid');

    const rightGrid = document.createElement('div');
    rightGrid.classList.add('cargo-selection-grid', 'galactic-market-grid', 'galactic-market-right-grid');

    const leftHeaderRow = document.createElement('div');
    leftHeaderRow.classList.add('cargo-resource-row', 'cargo-grid-header', 'galactic-market-row', 'galactic-market-header', 'galactic-market-left-row', 'galactic-market-left-header');

    const rightHeaderRow = document.createElement('div');
    rightHeaderRow.classList.add('cargo-resource-row', 'cargo-grid-header', 'galactic-market-row', 'galactic-market-header', 'galactic-market-right-row', 'galactic-market-right-header');

    const leftHeaderConfig = [
      { text: this.getGalacticMarketText('ui.projects.galacticMarket.resource', 'Resource') },
      { text: this.getGalacticMarketText('ui.projects.galacticMarket.saturation', 'Saturation') },
      {
        text: this.getGalacticMarketText('ui.projects.galacticMarket.sellPrice', 'Sell Price'),
        tooltip: this.getGalacticMarketText('ui.projects.galacticMarket.sellPriceTooltip', 'Sell prices fall as you approach the saturation amount, so higher sell orders lower the payout per unit.'),
      },
      { text: this.getGalacticMarketText('ui.projects.galacticMarket.sellAmount', 'Sell Amount') },
    ];

    const rightHeaderConfig = [
      { type: 'controls' },
      { text: this.getGalacticMarketText('ui.projects.galacticMarket.buyAmount', 'Buy Amount') },
      { text: this.getGalacticMarketText('ui.projects.galacticMarket.buyPrice', 'Buy Price') },
      { type: 'spacer' },
    ];

    const elements = projectElements[this.name] = {
      ...(projectElements[this.name] || {}),
      selectionInputs: [],
      priceSpans: [],
      buyInputs: [],
      sellInputs: [],
      buyPriceSpans: [],
      sellPriceSpans: [],
      saturationSellSpans: [],
      rowButtons: [],
      extraButtons: [],
      controlContainers: [],
      headerControls: null,
      rowMeta: [],
      leftRows: [],
      rightRows: [],
      marketProject: this,
    };

    const getMarketElements = () => projectElements[this.name] || elements;
    const getMarketProject = () => getMarketElements().marketProject || elements.marketProject || this;

    const syncQuantityFromText = (input) => {
      const parsed = parseSelectionQuantity(input.value);
      input.dataset.quantity = String(parsed);
      return parsed;
    };

    const getResourceNetRate = (category, resourceId) => {
      return getMarketProject().getNetRateWithoutMarket(category, resourceId);
    };

    const getTotalCostFromInputs = () => {
      let totalCost = 0;
      (elements.rowMeta || []).forEach((meta, index) => {
        const project = getMarketProject();
        if (!project.isSelectionResourceUnlocked(meta.category, meta.resource)) {
          return;
        }
        const buyInput = elements.buyInputs?.[index];
        const sellInput = elements.sellInputs?.[index];
        const storedBuy = buyInput ? Number(buyInput.dataset.quantity) : NaN;
        const storedSell = sellInput ? Number(sellInput.dataset.quantity) : NaN;
        const buyQuantity = Number.isFinite(storedBuy) ? storedBuy : (buyInput ? syncQuantityFromText(buyInput) : 0);
        const sellQuantity = Number.isFinite(storedSell) ? storedSell : (sellInput ? syncQuantityFromText(sellInput) : 0);
        const buyPrice = project.getBuyPrice(meta.category, meta.resource);
        const sellPrice = project.getSellPrice(meta.category, meta.resource, sellQuantity);
        totalCost += buyQuantity * buyPrice;
        totalCost -= sellQuantity * sellPrice;
      });
      return totalCost;
    };

    const getInputQuantity = (input) => {
      const stored = Number(input.dataset.quantity);
      return Number.isFinite(stored) ? stored : syncQuantityFromText(input);
    };

    const setInputQuantity = (input, quantity, formatLarge = true) => {
      const normalized = Math.max(0, Math.floor(quantity));
      input.dataset.quantity = String(normalized);
      input.value = (formatLarge && normalized >= 1e6)
        ? formatNumber(normalized, true, 3)
        : String(normalized);
      return normalized;
    };

    const updateIncrement = (newValue) => {
      const currentElements = getMarketElements();
      const nextIncrement = Math.max(1, Math.floor(newValue));
      const project = projectManager.projects[this.name] || getMarketProject();
      currentElements.marketProject = project;
      elements.marketProject = project;
      project.selectionIncrement = nextIncrement;
      elements.updateIncrementButtons?.();
    };

    elements.syncQuantityFromText = syncQuantityFromText;
    elements.getInputQuantity = getInputQuantity;
    elements.setInputQuantity = setInputQuantity;

    const buildHeaderRow = (headerRow, headerConfig) => {
      headerConfig.forEach((config) => {
        if (config.type === 'spacer') {
          const spacer = document.createElement('span');
          spacer.classList.add('galactic-market-spacer');
          headerRow.appendChild(spacer);
          return;
        }
        if (config.type === 'controls') {
          const headerControls = document.createElement('div');
          headerControls.classList.add('cargo-buttons-container', 'galactic-market-controls', 'galactic-market-header-controls');

          const createHeaderButton = (label, onClick) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('increment-button');
            button.textContent = label;
            button.addEventListener('click', () => {
              onClick();
            });
            headerControls.appendChild(button);
            return button;
          };

          createHeaderButton('/10', () => {
            const currentIncrement = getMarketProject().selectionIncrement || 1;
            updateIncrement(Math.max(1, Math.floor(currentIncrement / 10)));
          });

          const multiplyButton = createHeaderButton('x10', () => {
            const currentIncrement = getMarketProject().selectionIncrement || 1;
            updateIncrement(currentIncrement * 10);
          });

          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.innerHTML = '&#9432;';
          attachDynamicInfoTooltip(
            tooltip,
            this.getGalacticMarketText(
              'ui.projects.galacticMarket.stepTooltip',
              'Use -/+ to shift the current step between sell and buy. With extra settings enabled, -Max sells the current surplus (production minus consumption). +Max first cancels this row’s sells, then buys enough to spend a positive funding gain down to zero.'
            )
          );
          headerControls.insertBefore(tooltip, multiplyButton.nextSibling);

          headerRow.appendChild(headerControls);
          elements.headerControls = headerControls;
          return;
        }

        const span = document.createElement('span');
        span.textContent = config.text;
        if (config.tooltip) {
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.innerHTML = '&#9432;';
          attachDynamicInfoTooltip(tooltip, config.tooltip);
          span.appendChild(tooltip);
        }
        headerRow.appendChild(span);
      });
    };

    buildHeaderRow(leftHeaderRow, leftHeaderConfig);
    buildHeaderRow(rightHeaderRow, rightHeaderConfig);

    leftGrid.appendChild(leftHeaderRow);
    rightGrid.appendChild(rightHeaderRow);

    for (const category in this.attributes.resourceChoiceGainCost) {
      const resourcesInCategory = this.attributes.resourceChoiceGainCost[category];
      for (const resourceId in resourcesInCategory) {
        const resourceData = resources[category]?.[resourceId];
        const leftRow = document.createElement('div');
        leftRow.id = `${this.name}-${category}-${resourceId}-row`;
        leftRow.classList.add('cargo-resource-row', 'galactic-market-row', 'galactic-market-left-row');
        leftRow.style.display = resourceData && resourceData.unlocked ? '' : 'none';

        const rightRow = document.createElement('div');
        rightRow.classList.add('cargo-resource-row', 'galactic-market-row', 'galactic-market-right-row');
        rightRow.style.display = resourceData && resourceData.unlocked ? '' : 'none';

        const rowIndex = elements.rowMeta.length;

        const label = document.createElement('span');
        label.classList.add('cargo-resource-label');
        label.textContent = resourceData ? resourceData.displayName : resourceId;
        if (resourceId === 'spaceships') {
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.innerHTML = '&#9432;';
          attachDynamicInfoTooltip(
            tooltip,
            this.getGalacticMarketText(
              'ui.projects.galacticMarket.spaceshipPriceTooltip',
              'Each ship purchase raises funding price by 1 and this decays by 1% per second. This increase can be reduced by progressing further in the game.'
            )
          );
          label.appendChild(tooltip);
        }

        const buyPriceSpan = document.createElement('span');
        buyPriceSpan.classList.add('resource-price-display');
        buyPriceSpan.textContent = `${formatNumber(this.getBuyPrice(category, resourceId), true)}`;

        const buyInput = document.createElement('input');
        buyInput.type = 'text';
        buyInput.inputMode = 'decimal';
        buyInput.classList.add('resource-selection-input', `resource-selection-${this.name}`, `buy-selection-${this.name}`);
        buyInput.dataset.category = category;
        buyInput.dataset.resource = resourceId;
        buyInput.dataset.rowIndex = rowIndex;
        setInputQuantity(buyInput, this.getSelectionQuantity(this.buySelections, category, resourceId), false);

        const sellInput = document.createElement('input');
        sellInput.type = 'text';
        sellInput.inputMode = 'decimal';
        sellInput.classList.add('resource-selection-input', `sell-selection-${this.name}`);
        sellInput.dataset.category = category;
        sellInput.dataset.resource = resourceId;
        sellInput.dataset.rowIndex = rowIndex;
        setInputQuantity(sellInput, this.getSelectionQuantity(this.sellSelections, category, resourceId), false);

        const sellPriceSpan = document.createElement('span');
        sellPriceSpan.classList.add('resource-price-display');
        sellPriceSpan.textContent = `${formatNumber(this.getSellPrice(category, resourceId, getInputQuantity(sellInput)), true)}`;

        const saturationSpan = document.createElement('span');
        saturationSpan.classList.add('resource-price-display');
        saturationSpan.textContent = `${formatNumber(this.getSaturationSellAmount(category, resourceId), true)}`;

        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('cargo-buttons-container', 'galactic-market-controls');

        const refreshRow = () => {
          const project = getMarketProject();
          project.updateSelectedResources();
          project.updateSellPriceSpan(rowIndex);
          updateTotalCostDisplay(project);
        };

        const createButton = (text, onClick) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.classList.add('increment-button');
          button.textContent = text;
          button.addEventListener('click', () => {
            onClick();
            refreshRow();
          });
          controlsContainer.appendChild(button);
          return button;
        };

        const wireQuantityInput = (input) => {
          input.addEventListener('input', () => {
            syncQuantityFromText(input);
            refreshRow();
          });
          input.addEventListener('blur', () => {
            setInputQuantity(input, getInputQuantity(input), true);
          });
        };

        wireQuantityInput(sellInput);
        wireQuantityInput(buyInput);

        const applyShift = (direction) => {
          const incrementValue = getMarketProject().selectionIncrement || 1;
          const step = Number.isFinite(incrementValue) && incrementValue > 0
            ? incrementValue
            : 1;
          const currentBuy = getInputQuantity(buyInput);
          const currentSell = getInputQuantity(sellInput);

          if (direction === 'reset') {
            setInputQuantity(buyInput, 0, true);
            setInputQuantity(sellInput, 0, true);
            return;
          }

          if (direction === 'toSell') {
            let remaining = step;
            let newBuy = currentBuy;
            let newSell = currentSell;
            if (newBuy > 0 && remaining > 0) {
              const taken = Math.min(newBuy, remaining);
              newBuy -= taken;
              remaining -= taken;
            }
            if (remaining > 0) {
              newSell += remaining;
            }
            setInputQuantity(buyInput, newBuy, true);
            setInputQuantity(sellInput, newSell, true);
            return;
          }

          if (direction === 'toBuy') {
            let remaining = step;
            let newBuy = currentBuy;
            let newSell = currentSell;
            if (newSell > 0 && remaining > 0) {
              const taken = Math.min(newSell, remaining);
              newSell -= taken;
              remaining -= taken;
            }
            if (remaining > 0) {
              newBuy += remaining;
            }
            setInputQuantity(buyInput, newBuy, true);
            setInputQuantity(sellInput, newSell, true);
          }
        };

        createButton(this.getGalacticMarketText('ui.projects.galacticMarket.sat', 'Sat'), () => {
          const saturation = getMarketProject().getSaturationSellAmount(category, resourceId);
          setInputQuantity(buyInput, 0, true);
          setInputQuantity(sellInput, saturation, true);
          refreshRow();
        });
        const minusMaxButton = createButton(this.getGalacticMarketText('ui.projects.galacticMarket.minusMax', '-Max'), () => {
          const surplus = Math.max(0, Math.floor(getResourceNetRate(category, resourceId)));
          setInputQuantity(buyInput, 0, true);
          setInputQuantity(sellInput, surplus, true);
        });
        const minusButton = createButton('', () => applyShift('toSell'));
        createButton('0', () => applyShift('reset'));
        const plusButton = createButton('', () => applyShift('toBuy'));
        const plusMaxButton = createButton(this.getGalacticMarketText('ui.projects.galacticMarket.plusMax', '+Max'), () => {
          let totalCost = getTotalCostFromInputs();
          if (totalCost >= 0) return;

          const currentSell = getInputQuantity(sellInput);
          if (currentSell > 0) {
            const sellPrice = getMarketProject().getSellPrice(category, resourceId, currentSell);
            const cancelAmount = sellPrice > 0
              ? Math.min(currentSell, Math.ceil((-totalCost) / sellPrice))
              : currentSell;
            if (cancelAmount > 0) {
              setInputQuantity(sellInput, currentSell - cancelAmount, true);
              totalCost = getTotalCostFromInputs();
              if (totalCost >= 0) return;
            }
          }

          const buyPrice = getMarketProject().getBuyPrice(category, resourceId);
          if (buyPrice <= 0) return;
          const currentBuy = getInputQuantity(buyInput);
          const needed = Math.floor((-totalCost) / buyPrice);
          if (needed > 0) {
            setInputQuantity(buyInput, currentBuy + needed, true);
          }
        });

        leftRow.appendChild(label);
        leftRow.appendChild(saturationSpan);
        leftRow.appendChild(sellPriceSpan);
        leftRow.appendChild(sellInput);
        rightRow.appendChild(controlsContainer);
        rightRow.appendChild(buyInput);
        rightRow.appendChild(buyPriceSpan);
        const rightSpacer = document.createElement('span');
        rightSpacer.classList.add('galactic-market-spacer');
        rightRow.appendChild(rightSpacer);

        elements.selectionInputs.push(buyInput);
        elements.priceSpans.push(buyPriceSpan);
        elements.buyInputs.push(buyInput);
        elements.sellInputs.push(sellInput);
        elements.buyPriceSpans.push(buyPriceSpan);
        elements.sellPriceSpans.push(sellPriceSpan);
        elements.saturationSellSpans.push(saturationSpan);
        elements.rowButtons.push({ minusButton, plusButton });
        elements.extraButtons.push([minusMaxButton, plusMaxButton]);
        elements.controlContainers.push(controlsContainer);
        elements.rowMeta.push({ category, resource: resourceId });
        elements.leftRows.push(leftRow);
        elements.rightRows.push(rightRow);

        leftGrid.appendChild(leftRow);
        rightGrid.appendChild(rightRow);

        // Ensure initial pricing reflects selections
        this.updateSellPriceSpan(rowIndex);
      }
    }

    elements.updateIncrementButtons = () => {
      const currentElements = getMarketElements();
      const label = formatNumber(getMarketProject().selectionIncrement || 1, true);
      (currentElements.rowButtons || elements.rowButtons || []).forEach(({ minusButton, plusButton }) => {
        if (minusButton) minusButton.textContent = `-${label}`;
        if (plusButton) plusButton.textContent = `+${label}`;
      });
    };

    elements.updateIncrementButtons();
    this.updateControlsHeaderWidth();
    this.updateExtraSettingsUI();

    selectionGridContainer.appendChild(leftGrid);
    selectionGridContainer.appendChild(rightGrid);
    sectionContainer.appendChild(selectionGridContainer);
    container.appendChild(sectionContainer);
  }

  getBasePrice(category, resourceId) {
    return this.attributes.resourceChoiceGainCost?.[category]?.[resourceId] || 0;
  }

  getBuyPrice(category, resourceId) {
    const base = this.getBasePrice(category, resourceId);
    if (resourceId === 'spaceships') {
      return base + this.getSpaceshipPriceIncrease();
    }
    return base;
  }

  getSellPrice(category, resourceId, quantity = 0) {
    const base = this.getBasePrice(category, resourceId);
    const multiplier = GalacticMarketProject.SELL_PRICE_MULTIPLIERS[resourceId];
    const factor = typeof multiplier === 'number' ? multiplier : 0.5;
    const baseSell = base * factor;
    if (quantity <= 0) {
      return baseSell;
    }
    const saturation = this.getSaturationSellAmount(category, resourceId);
    if (!saturation) {
      return baseSell;
    }
    const ratio = Math.max(Math.log10(quantity) / Math.log10(saturation), 0.5);
    const satRatio = ratio > 1 ? ratio*ratio : ratio;
    const priceFactor = Math.max(0.1 + 0.9 * (2 - 2*satRatio),0);
    return baseSell * priceFactor;
  }

  getSaturationSellAmount(category, resourceId) {
    const multiplier = GalacticMarketProject.SELL_MULTIPLIERS[resourceId];
    if (!multiplier) return 0;
    const count = spaceManager?.getTerraformedPlanetCountExcludingCurrent?.();
    const worlds = Math.max(Number(count) || 0, 1);
    const flooredWorlds = Math.floor(worlds * 100) / 100;
    const saturationMultiplier = this.tradeSaturationMultiplier || 1;
    return multiplier * flooredWorlds * saturationMultiplier;
  }

  canAutomaticallySellOverflow(category, resourceId) {
    return this.isBooleanFlagSet('automaticSurplusTrading')
      && this.isSelectionResourceUnlocked(category, resourceId)
      && this.getBasePrice(category, resourceId) > 0
      && this.getSaturationSellAmount(category, resourceId) > 0;
  }

  queueOverflowSale(category, resourceId, amount) {
    if (!(amount > 0) || !this.canAutomaticallySellOverflow(category, resourceId)) {
      return;
    }
    if (!this.pendingOverflowSales[category]) {
      this.pendingOverflowSales[category] = {};
    }
    this.pendingOverflowSales[category][resourceId] =
      (this.pendingOverflowSales[category][resourceId] || 0) + amount;
  }

  collectAutomaticOverflowSales(seconds, includeSelectedSales) {
    if (!(seconds > 0)) {
      return [];
    }

    const pendingSales = this.pendingOverflowSales;
    this.pendingOverflowSales = {};
    if (!this.isBooleanFlagSet('automaticSurplusTrading')) {
      return [];
    }

    const transactions = [];
    for (const category in pendingSales) {
      for (const resource in pendingSales[category]) {
        if (!this.canAutomaticallySellOverflow(category, resource)) {
          continue;
        }

        let selectedQuantity = 0;
        if (includeSelectedSales) {
          this.sellSelections.forEach((entry) => {
            if (entry.category === category && entry.resource === resource
              && this.isSelectionResourceUnlocked(category, resource)) {
              selectedQuantity += entry.quantity;
            }
          });
        }

        const saturation = this.getSaturationSellAmount(category, resource);
        const availableRate = Math.max(0, saturation - selectedQuantity);
        const amount = Math.min(pendingSales[category][resource], availableRate * seconds);
        if (amount > 0) {
          transactions.push({ category, resource, quantity: amount / seconds });
        }
      }
    }
    return transactions;
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    elements.marketProject = this;

    const {
      buyInputs = [],
      sellInputs = [],
      buyPriceSpans = [],
      sellPriceSpans = [],
      saturationSellSpans = [],
      rowMeta = [],
      leftRows = [],
      rightRows = [],
    } = elements;

    elements.updateIncrementButtons?.();
    this.updateExtraSettingsUI();
    this.updateControlsHeaderWidth();
    this.updatePurchaseCapWarning();

    rowMeta.forEach((meta, index) => {
      const leftRow = leftRows[index];
      const rightRow = rightRows[index];
      const displayValue = this.isSelectionResourceUnlocked(meta.category, meta.resource) ? 'grid' : 'none';
      if (leftRow) leftRow.style.display = displayValue;
      if (rightRow) rightRow.style.display = displayValue;
      if (buyPriceSpans[index]) {
        buyPriceSpans[index].textContent = `${formatNumber(this.getBuyPrice(meta.category, meta.resource), true)}`;
      }
      if (sellPriceSpans[index]) {
        const sellInput = sellInputs[index];
        const stored = sellInput ? Number(sellInput.dataset.quantity) : NaN;
        const sellQty = Number.isFinite(stored) ? stored : (sellInput ? parseSelectionQuantity(sellInput.value) : 0);
        sellPriceSpans[index].textContent = `${formatNumber(this.getSellPrice(meta.category, meta.resource, sellQty), true)}`;
      }
      if (saturationSellSpans[index]) {
        saturationSellSpans[index].textContent = `${formatNumber(this.getSaturationSellAmount(meta.category, meta.resource), true)}`;
      }
    });

    this.applySelectionsToInputs();
    this.updateSelectedResources();
    updateTotalCostDisplay(this);
  }

  updateSelectedResources() {
    const elements = projectElements[this.name];
    if (!elements) return;
    const { buyInputs = [], sellInputs = [], rowMeta = [] } = elements;

    const buySelections = [];
    const sellSelections = [];
    const getInputQuantity = elements.getInputQuantity || ((input) => parseSelectionQuantity(input.value));
    const setInputQuantity = elements.setInputQuantity || ((input, quantity, formatLarge = true) => {
      const normalized = Math.max(0, Math.floor(quantity));
      input.dataset.quantity = String(normalized);
      input.value = (formatLarge && normalized >= 1e6)
        ? formatNumber(normalized, true, 3)
        : String(normalized);
      return normalized;
    });

    let totalBuys = 0;
    let totalSells = 0;
    const entries = [];

    rowMeta.forEach((meta, index) => {
      const buyInput = buyInputs[index];
      const sellInput = sellInputs[index];
      const isUnlocked = this.isSelectionResourceUnlocked(meta.category, meta.resource);
      const buyQuantity = buyInput ? getInputQuantity(buyInput) : 0;
      const sellQuantity = sellInput ? getInputQuantity(sellInput) : 0;
      if (isUnlocked) {
        totalBuys += buyQuantity;
        totalSells += sellQuantity;
      }
      entries.push({
        meta,
        index,
        buyInput,
        sellInput,
        isUnlocked,
        buyQuantity,
        sellQuantity
      });
    });

    const scales = this.getTradeScalesForTotals(totalBuys, totalSells);
    this.purchaseCapped = scales.purchaseScale < 1;
    this.kesslerCapped = scales.kesslerScale < 1;

    entries.forEach((entry) => {
      let buyQuantity = entry.buyQuantity;
      let sellQuantity = entry.sellQuantity;
      if (entry.isUnlocked && scales.buyScale < 1) {
        buyQuantity = setInputQuantity(entry.buyInput, buyQuantity * scales.buyScale, true);
      }
      if (entry.isUnlocked && scales.sellScale < 1) {
        sellQuantity = setInputQuantity(entry.sellInput, sellQuantity * scales.sellScale, true);
      }
      if (buyQuantity > 0) {
        buySelections.push({ category: entry.meta.category, resource: entry.meta.resource, quantity: buyQuantity });
      }
      if (sellQuantity > 0) {
        sellSelections.push({ category: entry.meta.category, resource: entry.meta.resource, quantity: sellQuantity });
      }
      this.updateSellPriceSpan(entry.index);
    });

    this.buySelections = buySelections;
    this.sellSelections = sellSelections;

    elements.selectionInputs = buyInputs;
    elements.priceSpans = elements.buyPriceSpans;
    this.updateKesslerWarning();
    this.updatePurchaseCapWarning();
  }

  updateSellPriceSpan(index) {
    const elements = projectElements[this.name];
    if (!elements) return;
    const meta = elements.rowMeta?.[index];
    const sellInput = elements.sellInputs?.[index];
    const span = elements.sellPriceSpans?.[index];
    if (!meta || !sellInput || !span) return;
    const stored = Number(sellInput.dataset.quantity);
    const quantity = Number.isFinite(stored) ? stored : parseSelectionQuantity(sellInput.value);
    const price = this.getSellPrice(meta.category, meta.resource, quantity);
    span.textContent = `${formatNumber(price, true)}`;
  }

  getMarketNetRateForResource(category, resourceId) {
    if (!this.isActive || (!this.autoStart && !this.manualContinuousRun)) return 0;
    let net = 0;
    this.buySelections.forEach((entry) => {
      if (entry.category === category && entry.resource === resourceId
        && this.isSelectionResourceUnlocked(entry.category, entry.resource)) {
        net += entry.quantity;
      }
    });
    this.sellSelections.forEach((entry) => {
      if (entry.category === category && entry.resource === resourceId
        && this.isSelectionResourceUnlocked(entry.category, entry.resource)) {
        net -= entry.quantity;
      }
    });
    return net;
  }

  getNetRateWithoutMarket(category, resourceId) {
    const resourceData = resources[category][resourceId];
    const baseNet = resourceData.productionRate - resourceData.consumptionRate;
    return baseNet - this.getMarketNetRateForResource(category, resourceId);
  }

  updateExtraSettingsUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    const showExtras = this.extraSettingsEnabled === true;
    (elements.extraButtons || []).forEach((pair) => {
      pair.forEach((button) => {
        if (button) button.style.display = showExtras ? '' : 'none';
      });
    });
    this.updateControlsHeaderWidth();
  }

  updateControlsHeaderWidth() {
    const elements = projectElements[this.name];
    if (!elements) return;
    const headerControls = elements.headerControls;
    const containers = elements.controlContainers || [];
    if (!headerControls || !containers.length) return;
    let maxWidth = 0;
    containers.forEach((container) => {
      const width = container.offsetWidth || 0;
      if (width > maxWidth) maxWidth = width;
    });
    if (maxWidth > 0) {
      headerControls.style.minWidth = `${maxWidth}px`;
    }
  }

  updateKesslerWarning() {
    const warning = projectElements[this.name].kesslerWarning;
    let hazardActive = false;
    try {
      hazardActive = hazardManager.getKesslerTradeLimitPerSecond() !== Infinity;
    } catch (error) {
      hazardActive = false;
    }
    const elements = projectElements[this.name];
    const isCollapsed = elements?.projectItem?.classList?.contains('collapsed');
    warning.style.display = hazardActive && !isCollapsed ? 'flex' : 'none';
  }

  updatePurchaseCapWarning() {
    const elements = projectElements[this.name];
    const warning = elements?.purchaseCapWarning;
    if (!warning) return;
    const isCollapsed = elements?.projectItem?.classList?.contains('collapsed');
    const capped = this.getMarketPurchaseLimitPerSecond() !== Infinity;
    warning.style.display = capped && !isCollapsed ? 'flex' : 'none';
  }

  applySelectionsToInputs() {
    const elements = projectElements[this.name];
    if (!elements) return;
    const { buyInputs = [], sellInputs = [], rowMeta = [] } = elements;

    const buyMap = this.createSelectionMap(this.buySelections);
    const sellMap = this.createSelectionMap(this.sellSelections);

    rowMeta.forEach((meta, index) => {
      if (buyInputs[index]) {
        if (document.activeElement === buyInputs[index]) return;
        const quantity = buyMap.get(this.getSelectionKey(meta.category, meta.resource)) || 0;
        buyInputs[index].dataset.quantity = String(quantity);
        buyInputs[index].value = quantity >= 1e6 ? formatNumber(quantity, true, 3) : String(quantity);
      }
      if (sellInputs[index]) {
        if (document.activeElement === sellInputs[index]) return;
        const quantity = sellMap.get(this.getSelectionKey(meta.category, meta.resource)) || 0;
        sellInputs[index].dataset.quantity = String(quantity);
        sellInputs[index].value = quantity >= 1e6 ? formatNumber(quantity, true, 3) : String(quantity);
      }
      this.updateSellPriceSpan(index);
    });
  }

  createSelectionMap(selections) {
    const map = new Map();
    selections.forEach((entry) => {
      map.set(this.getSelectionKey(entry.category, entry.resource), entry.quantity);
    });
    return map;
  }

  getSelectionKey(category, resourceId) {
    return `${category}:${resourceId}`;
  }

  getSelectionQuantity(selections, category, resourceId) {
    const entry = selections.find((item) => item.category === category && item.resource === resourceId);
    return entry ? entry.quantity : 0;
  }

  mergePresetSelectionEntries(currentSelections, presetSelections) {
    const merged = new Map();
    normalizeSelectionEntries(currentSelections || []).forEach((entry) => {
      merged.set(this.getSelectionKey(entry.category, entry.resource), entry);
    });
    if (!Array.isArray(presetSelections)) {
      return Array.from(merged.values());
    }
    presetSelections.forEach((entry) => {
      if (!entry || !entry.category || !entry.resource) {
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(entry, 'quantity')) {
        return;
      }
      const key = this.getSelectionKey(entry.category, entry.resource);
      const quantity = parseSelectionQuantity(entry.quantity);
      if (quantity > 0) {
        merged.set(key, { category: entry.category, resource: entry.resource, quantity });
      } else {
        merged.delete(key);
      }
    });
    return Array.from(merged.values());
  }

  isSelectionResourceUnlocked(category, resourceId) {
    const resourceData = resources[category]?.[resourceId];
    return !!(resourceData && resourceData.unlocked);
  }

  getSpaceshipPriceIncrease() {
    return this.spaceshipPriceIncrease;
  }

  getSpaceshipDivisor() {
    const total = spaceManager?.getTerraformedPlanetCount?.() || 0;
    const currentPlanetKey = spaceManager?.getCurrentPlanetKey?.();
    const currentTerraformed = currentPlanetKey
      ? spaceManager?.isPlanetTerraformed?.(currentPlanetKey)
      : false;
    return Math.max(1, total - (currentTerraformed ? 1 : 0));
  }

  applySpaceshipPurchase(count) {
    const divisor = this.getSpaceshipDivisor();
    this.spaceshipPriceIncrease += count / divisor;
  }

  getSpaceshipTotalCost(quantity, basePrice) {
    const divisor = this.getSpaceshipDivisor();
    const delta = 1 / divisor;
    const currentIncrease = this.spaceshipPriceIncrease;
    return basePrice * quantity + currentIncrease * quantity + (delta * quantity * (quantity - 1)) / 2;
  }

  getBuyTransactionCost(transaction, quantity) {
    return transaction.resource === 'spaceships'
      ? this.getSpaceshipTotalCost(quantity, transaction.basePrice)
      : transaction.basePrice * quantity;
  }

  getScaledBuyCost(transactions, scale, seconds, productivity) {
    let total = 0;
    transactions.forEach((transaction) => {
      total += this.getBuyTransactionCost(transaction, transaction.quantity * scale) * seconds * productivity;
    });
    return total;
  }

  getBuyCostCoefficients(transactions, seconds, productivity) {
    const timeScale = seconds * productivity;
    const divisor = this.getSpaceshipDivisor();
    const delta = 1 / divisor;
    let quadratic = 0;
    let linear = 0;

    transactions.forEach((transaction) => {
      const quantity = transaction.quantity;
      if (transaction.resource === 'spaceships') {
        quadratic += (delta * quantity * quantity / 2) * timeScale;
        linear += (transaction.basePrice + this.spaceshipPriceIncrease - delta / 2) * quantity * timeScale;
      } else {
        linear += transaction.basePrice * quantity * timeScale;
      }
    });

    return { quadratic, linear };
  }

  getAffordableBuyScale(transactions, availableFunding, seconds, productivity) {
    if (availableFunding <= 0) {
      return 0;
    }
    const fullCost = this.getScaledBuyCost(transactions, 1, seconds, productivity);
    if (fullCost <= availableFunding) {
      return 1;
    }

    const coefficients = this.getBuyCostCoefficients(transactions, seconds, productivity);
    if (coefficients.quadratic <= 0) {
      return Math.max(0, Math.min(1, availableFunding / coefficients.linear));
    }

    const normalizer = Math.max(coefficients.quadratic, Math.abs(coefficients.linear), availableFunding);
    const quadratic = coefficients.quadratic / normalizer;
    const linear = coefficients.linear / normalizer;
    const funding = availableFunding / normalizer;
    const discriminantRoot = Math.sqrt(linear * linear + 4 * quadratic * funding);
    const scale = linear >= 0
      ? (2 * funding) / (linear + discriminantRoot)
      : (-linear + discriminantRoot) / (2 * quadratic);
    return Math.max(0, Math.min(1, scale));
  }

  static get SELL_MULTIPLIERS() {
    if (!this._SELL_MULTIPLIERS) {
      this._SELL_MULTIPLIERS = {
        metal: 1_000_000_000,
        glass: 10_000_000,
        water: 0,
        food: 100_000_000,
        components: 100_000_000,
        electronics: 100_000_000,
        superconductors: 10_000_000,
        androids: 1_000_000,
        spaceships: 100_000,
      };
    }
    return this._SELL_MULTIPLIERS;
  }

  static get SELL_PRICE_MULTIPLIERS() {
    if (!this._SELL_PRICE_MULTIPLIERS) {
      this._SELL_PRICE_MULTIPLIERS = {
        metal: 0.5,
        glass: 0.5,
        water: 0,
        food: 0.5,
        components: 0.5,
        electronics: 0.5,
        superconductors: 0.5,
        androids: 0.5,
        spaceships: 0.5,
      };
    }
    return this._SELL_PRICE_MULTIPLIERS;
  }

  start(resources) {
    if (!this.canStart(resources)) {
      return false;
    }
    const automationUnlocked = projectManager?.isBooleanFlagSet?.('automateSpecialProjects');
    this.shortfallLastTick = false;
    this.isActive = true;
    this.isPaused = false;
    this.manualRunRemainingTime = automationUnlocked ? 0 : 1000;
    this.autoStart = automationUnlocked ? this.autoStart : true;
    this.startingDuration = this.manualRunRemainingTime || Infinity;
    this.remainingTime = this.startingDuration;
    return true;
  }

  canStart() {
    if (!super.canStart()) return false;
    return this.buySelections.some((entry) => this.isSelectionResourceUnlocked(entry.category, entry.resource))
      || this.sellSelections.some((entry) => this.isSelectionResourceUnlocked(entry.category, entry.resource));
  }

  update(deltaTime) {
    if (this.spaceshipPriceIncrease > 0) {
      const decay = Math.pow(0.99, deltaTime / 1000);
      this.spaceshipPriceIncrease *= decay;
      if (this.spaceshipPriceIncrease < 1e-6) {
        this.spaceshipPriceIncrease = 0;
      }
    }
    super.update(deltaTime);
  }

  getKesslerTradeLimitPerSecond() {
    let limit = Infinity;
    try {
      limit = hazardManager.getKesslerTradeLimitPerSecond();
    } catch (error) {
      limit = Infinity;
    }
    return limit;
  }

  getMarketPurchaseLimitPerSecond() {
    return this.isBooleanFlagSet('galacticMarketPurchaseCap') ? 100 : Infinity;
  }

  getTradeScalesForTotals(totalBuys, totalSells) {
    const purchaseLimit = this.getMarketPurchaseLimitPerSecond();
    const purchaseScale = totalBuys > purchaseLimit ? purchaseLimit / totalBuys : 1;
    const kesslerLimit = this.getKesslerTradeLimitPerSecond();
    const totalAfterPurchaseCap = totalBuys * purchaseScale + totalSells;
    const kesslerScale = totalAfterPurchaseCap > kesslerLimit ? kesslerLimit / totalAfterPurchaseCap : 1;
    return {
      buyScale: purchaseScale * kesslerScale,
      sellScale: kesslerScale,
      purchaseScale,
      kesslerScale
    };
  }

  getTradeScales() {
    let totalBuys = 0;
    let totalSells = 0;
    this.buySelections.forEach(({ category, resource, quantity }) => {
      if (this.isSelectionResourceUnlocked(category, resource)) {
        totalBuys += quantity;
      }
    });
    this.sellSelections.forEach(({ category, resource, quantity }) => {
      if (this.isSelectionResourceUnlocked(category, resource)) {
        totalSells += quantity;
      }
    });
    const scales = this.getTradeScalesForTotals(totalBuys, totalSells);
    this.purchaseCapped = scales.purchaseScale < 1;
    this.kesslerCapped = scales.kesslerScale < 1;
    return scales;
  }

  getKesslerTradeScale() {
    return this.getTradeScales().kesslerScale;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.isActive || (!this.autoStart && !this.manualContinuousRun)) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    const rateMultiplier = 1;
    const tradeScales = this.getTradeScales();

    this.buySelections.forEach(({ category, resource, quantity }) => {
      if (!this.isSelectionResourceUnlocked(category, resource)) {
        return;
      }
      const scaledQuantity = quantity * tradeScales.buyScale;
      const basePrice = this.getBasePrice(category, resource);
      const costPerSecond = resource === 'spaceships'
        ? this.getSpaceshipTotalCost(scaledQuantity, basePrice)
        : basePrice * scaledQuantity;
      if (!totals.cost.colony) totals.cost.colony = {};
      totals.cost.colony.funding = (totals.cost.colony.funding || 0) + costPerSecond * seconds;
      if (!totals.gain[category]) totals.gain[category] = {};
      totals.gain[category][resource] = (totals.gain[category][resource] || 0) + scaledQuantity * seconds;
      if (applyRates) {
        const rateSource = this.getRateSource();
        resources[category][resource].modifyRate(scaledQuantity * rateMultiplier, rateSource, 'project');
        resources.colony.funding.modifyRate(-costPerSecond * rateMultiplier, rateSource, 'project');
      }
    });

    this.sellSelections.forEach(({ category, resource, quantity }) => {
      if (!this.isSelectionResourceUnlocked(category, resource)) {
        return;
      }
      const scaledQuantity = quantity * tradeScales.sellScale;
      const sellPrice = this.getSellPrice(category, resource, scaledQuantity);
      const revenuePerSecond = sellPrice * scaledQuantity;
      if (!totals.cost[category]) totals.cost[category] = {};
      totals.cost[category][resource] = (totals.cost[category][resource] || 0) + scaledQuantity * seconds;
      if (!totals.gain.colony) totals.gain.colony = {};
      totals.gain.colony.funding = (totals.gain.colony.funding || 0) + revenuePerSecond * seconds;
      if (applyRates) {
        const rateSource = this.getRateSource();
        resources[category][resource].modifyRate(-scaledQuantity * rateMultiplier, rateSource, 'project');
        resources.colony.funding.modifyRate(revenuePerSecond * rateMultiplier, rateSource, 'project');
      }
    });

    return totals;
  }

  applyActualProductionRateDisplay(actualProductionRates) {
    const touchedResources = {};
    const rateSource = this.getRateSource();

    this.buySelections.forEach(({ category, resource }) => {
      if (this.isSelectionResourceUnlocked(category, resource)) {
        if (!touchedResources[category]) touchedResources[category] = {};
        touchedResources[category][resource] = true;
      }
    });
    touchedResources.colony = touchedResources.colony || {};
    touchedResources.colony.funding = true;

    for (const category in actualProductionRates) {
      for (const resource in actualProductionRates[category]) {
        if (!touchedResources[category]) touchedResources[category] = {};
        touchedResources[category][resource] = true;
      }
    }

    for (const category in touchedResources) {
      for (const resource in touchedResources[category]) {
        const resourceObject = resources[category][resource];
        const rate = actualProductionRates[category] ? actualProductionRates[category][resource] || 0 : 0;
        if (!resourceObject.productionRateByType.project) {
          resourceObject.productionRateByType.project = {};
        }
        if (rate > 0) {
          resourceObject.productionRateByType.project[rateSource] = rate;
        } else {
          delete resourceObject.productionRateByType.project[rateSource];
        }
        resourceObject.recalculateTotalRates();
      }
    }
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (accumulatedChanges) {
      this._deferredTradeTickDelta = deltaTime;
      return;
    }
    this.applyPostProjectTrade(deltaTime);
  }

  applyPostProjectTrade(deltaTime, accumulatedChanges) {
    if (!accumulatedChanges && this._deferredTradeTickDelta) {
      deltaTime = this._deferredTradeTickDelta;
    }
    this._deferredTradeTickDelta = 0;

    const automationUnlocked = projectManager?.isBooleanFlagSet?.('automateSpecialProjects');
    const manualRunActive = !automationUnlocked && this.manualRunRemainingTime > 0;
    const selectedTradingActive = manualRunActive
      || (this.isActive && (this.autoStart || this.manualContinuousRun));
    this.shortfallLastTick = false;

    const effectiveDeltaTime = manualRunActive ? Math.min(deltaTime, this.manualRunRemainingTime) : deltaTime;
    const seconds = effectiveDeltaTime / 1000;
    const effectiveProductivity = 1;
    const automaticSellTransactions = this.collectAutomaticOverflowSales(seconds, selectedTradingActive);
    if (!selectedTradingActive && automaticSellTransactions.length === 0) return;

    let automaticSellRate = 0;
    automaticSellTransactions.forEach((transaction) => {
      automaticSellRate += transaction.quantity;
    });

    let tradeScales;
    let automaticSellScale;
    if (selectedTradingActive) {
      tradeScales = this.getTradeScales();
      let selectedTradeRate = 0;
      this.buySelections.forEach(({ category, resource, quantity }) => {
        if (this.isSelectionResourceUnlocked(category, resource)) {
          selectedTradeRate += quantity * tradeScales.buyScale;
        }
      });
      this.sellSelections.forEach(({ category, resource, quantity }) => {
        if (this.isSelectionResourceUnlocked(category, resource)) {
          selectedTradeRate += quantity * tradeScales.sellScale;
        }
      });
      const remainingKesslerRate = Math.max(
        0,
        this.getKesslerTradeLimitPerSecond() - selectedTradeRate
      );
      automaticSellScale = automaticSellRate > remainingKesslerRate
        ? remainingKesslerRate / automaticSellRate
        : 1;
      this.kesslerCapped = this.kesslerCapped || automaticSellScale < 1;
    } else {
      tradeScales = this.getTradeScalesForTotals(0, automaticSellRate);
      automaticSellScale = tradeScales.sellScale;
      this.purchaseCapped = tradeScales.purchaseScale < 1;
      this.kesslerCapped = tradeScales.kesslerScale < 1;
    }
    const sellTransactions = [];
    const actualProductionRates = {};

    if (selectedTradingActive) {
      this.sellSelections.forEach(({ category, resource, quantity }) => {
        if (!this.isSelectionResourceUnlocked(category, resource)) {
          return;
        }
        const scaledQuantity = quantity * tradeScales.sellScale;
        sellTransactions.push({ category, resource, quantity: scaledQuantity });
      });
    }
    automaticSellTransactions.forEach((transaction) => {
      transaction.quantity *= automaticSellScale;
    });

    sellTransactions.forEach((transaction) => {
      const resourceObject = resources[transaction.category]?.[transaction.resource];
      const pendingAmount = accumulatedChanges?.[transaction.category]?.[transaction.resource] || 0;
      const availableAmount = resourceObject ? Math.max(0, resourceObject.value + pendingAmount) : 0;
      const requiredAmount = transaction.quantity * seconds * effectiveProductivity;
      if (requiredAmount > availableAmount) {
        this.shortfallLastTick = this.shortfallLastTick || requiredAmount > 0;
        if (availableAmount <= 0) {
          transaction.quantity = 0;
        } else {
          transaction.quantity *= availableAmount / requiredAmount;
        }
      }
    });

    const combinedSellRates = {};
    sellTransactions.forEach((transaction) => {
      if (!combinedSellRates[transaction.category]) {
        combinedSellRates[transaction.category] = {};
      }
      combinedSellRates[transaction.category][transaction.resource] =
        (combinedSellRates[transaction.category][transaction.resource] || 0) + transaction.quantity;
    });
    automaticSellTransactions.forEach((transaction) => {
      if (!combinedSellRates[transaction.category]) {
        combinedSellRates[transaction.category] = {};
      }
      combinedSellRates[transaction.category][transaction.resource] =
        (combinedSellRates[transaction.category][transaction.resource] || 0) + transaction.quantity;
    });

    let totalSellRevenuePerSecond = 0;
    sellTransactions.forEach((transaction) => {
      const price = this.getSellPrice(
        transaction.category,
        transaction.resource,
        combinedSellRates[transaction.category][transaction.resource]
      );
      transaction.perSecondRevenue = price * transaction.quantity;
      totalSellRevenuePerSecond += transaction.perSecondRevenue;
    });
    automaticSellTransactions.forEach((transaction) => {
      const price = this.getSellPrice(
        transaction.category,
        transaction.resource,
        combinedSellRates[transaction.category][transaction.resource]
      );
      transaction.perSecondRevenue = price * transaction.quantity;
      totalSellRevenuePerSecond += transaction.perSecondRevenue;
    });

    const totalSellRevenue = totalSellRevenuePerSecond * seconds * effectiveProductivity;
    actualProductionRates.colony = { funding: totalSellRevenuePerSecond * effectiveProductivity };

    sellTransactions.forEach((transaction) => {
      const amount = transaction.quantity * seconds * effectiveProductivity;
      if (amount <= 0) return;
      const resourceObject = resources[transaction.category]?.[transaction.resource];
      if (accumulatedChanges) {
        if (!accumulatedChanges[transaction.category]) accumulatedChanges[transaction.category] = {};
        accumulatedChanges[transaction.category][transaction.resource] =
          (accumulatedChanges[transaction.category][transaction.resource] || 0) - amount;
      } else if (resourceObject) {
        if (resourceObject.decrease) {
          resourceObject.decrease(amount);
        } else {
          resourceObject.value = Math.max(0, resourceObject.value - amount);
        }
      }
    });

    if (totalSellRevenue !== 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) accumulatedChanges.colony = {};
        accumulatedChanges.colony.funding = (accumulatedChanges.colony.funding || 0) + totalSellRevenue;
      } else {
        resources.colony.funding.increase(totalSellRevenue);
      }
    }

    const buyTransactions = [];
    let buyCostPerSecond = 0;

    if (selectedTradingActive) {
      this.buySelections.forEach(({ category, resource, quantity }) => {
        if (!this.isSelectionResourceUnlocked(category, resource)) {
          return;
        }
        const scaledQuantity = quantity * tradeScales.buyScale;
        const basePrice = this.getBasePrice(category, resource);
        buyTransactions.push({ category, resource, quantity: scaledQuantity, basePrice, perSecondCost: 0 });
      });
    }

    buyTransactions.forEach((transaction) => {
      transaction.perSecondCost = this.getBuyTransactionCost(transaction, transaction.quantity);
      buyCostPerSecond += transaction.perSecondCost;
    });

    let totalBuyCost = buyCostPerSecond * seconds * effectiveProductivity;
    const pendingFunding = accumulatedChanges?.colony?.funding || 0;
    const availableFunding = Math.max(0, resources.colony.funding.value + pendingFunding);

    if (totalBuyCost > availableFunding && totalBuyCost > 0) {
      this.shortfallLastTick = true;
      const scale = this.getAffordableBuyScale(buyTransactions, availableFunding, seconds, effectiveProductivity);
      buyTransactions.forEach((transaction) => {
        transaction.quantity *= scale;
        transaction.perSecondCost = this.getBuyTransactionCost(transaction, transaction.quantity);
      });
      totalBuyCost = this.getScaledBuyCost(buyTransactions, 1, seconds, effectiveProductivity);
    }

    if (totalBuyCost !== 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) accumulatedChanges.colony = {};
        accumulatedChanges.colony.funding = (accumulatedChanges.colony.funding || 0) - totalBuyCost;
      } else {
        resources.colony.funding.decrease(totalBuyCost);
      }
    }

    buyTransactions.forEach((transaction) => {
      const amount = transaction.quantity * seconds * effectiveProductivity;
      if (amount <= 0) return;
      if (accumulatedChanges) {
        if (!accumulatedChanges[transaction.category]) accumulatedChanges[transaction.category] = {};
        accumulatedChanges[transaction.category][transaction.resource] =
          (accumulatedChanges[transaction.category][transaction.resource] || 0) + amount;
      } else {
        resources[transaction.category][transaction.resource].increase(amount);
      }
      if (!actualProductionRates[transaction.category]) actualProductionRates[transaction.category] = {};
      actualProductionRates[transaction.category][transaction.resource] =
        (actualProductionRates[transaction.category][transaction.resource] || 0) + transaction.quantity * effectiveProductivity;
      if (transaction.resource === 'spaceships') {
        this.applySpaceshipPurchase(amount);
      }
    });

    this.applyActualProductionRateDisplay(actualProductionRates);

    if (manualRunActive) {
      this.manualRunRemainingTime = Math.max(0, this.manualRunRemainingTime - effectiveDeltaTime);
      this.remainingTime = this.manualRunRemainingTime;
      if (this.manualRunRemainingTime <= 0) {
        this.autoStart = false;
        this.isActive = false;
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
        updateProjectUI?.(this.name);
      }
    }
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      buySelections: normalizeSelectionEntries(this.buySelections || []),
      sellSelections: normalizeSelectionEntries(this.sellSelections || []),
      selectionIncrement: this.selectionIncrement || 1,
      extraSettingsEnabled: this.extraSettingsEnabled === true
    };
  }

  loadAutomationSettings(settings = {}, options = {}) {
    super.loadAutomationSettings(settings);
    const elements = projectElements[this.name];
    if (elements) {
      elements.marketProject = this;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'buySelections')) {
      this.buySelections = options.isPresetApplication === true
        ? this.mergePresetSelectionEntries(this.buySelections, settings.buySelections)
        : normalizeSelectionEntries(settings.buySelections || []);
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'sellSelections')) {
      this.sellSelections = options.isPresetApplication === true
        ? this.mergePresetSelectionEntries(this.sellSelections, settings.sellSelections)
        : normalizeSelectionEntries(settings.sellSelections || []);
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'selectionIncrement')) {
      this.selectionIncrement = Math.max(1, settings.selectionIncrement || 1);
      if (elements) {
        elements.updateIncrementButtons?.();
      }
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'extraSettingsEnabled')) {
      this.extraSettingsEnabled = settings.extraSettingsEnabled === true;
    }
    this.applySelectionsToInputs();
    this.updateSelectedResources();
    this.updateExtraSettingsUI();
  }

  saveState() {
    const state = super.saveState();
    state.buySelections = this.buySelections;
    state.sellSelections = this.sellSelections;
    state.selectedResources = this.buySelections;
    state.spaceshipPriceIncrease = this.spaceshipPriceIncrease;
    state.selectionIncrement = this.selectionIncrement;
    state.extraSettingsEnabled = this.extraSettingsEnabled === true;
    state.pendingOverflowSales = this.pendingOverflowSales;
    return state;
  }

  loadState(state) {
    super.loadState(state);
    this.selectionIncrement = state.selectionIncrement || 1;
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
    this.extraSettingsEnabled = state.extraSettingsEnabled === true;
    this.pendingOverflowSales = state.pendingOverflowSales || {};
    const savedBuys = state.buySelections || state.selectedResources || [];
    const savedSells = state.sellSelections || [];
    this.buySelections = normalizeSelectionEntries(savedBuys);
    this.sellSelections = normalizeSelectionEntries(savedSells);

    const elements = projectElements[this.name];
    if (elements) {
      elements.marketProject = this;
      elements.updateIncrementButtons?.();
    }
    this.applySelectionsToInputs();
    this.updateSelectedResources();
    this.updateExtraSettingsUI();
    updateTotalCostDisplay(this);
  }

  saveTravelState() {
    return {
      spaceshipPriceIncrease: this.spaceshipPriceIncrease,
      selectionIncrement: this.selectionIncrement || 1,
      extraSettingsEnabled: this.extraSettingsEnabled === true
    };
  }

  loadTravelState(state = {}) {
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
    this.pendingOverflowSales = {};
    if (Object.prototype.hasOwnProperty.call(state, 'selectionIncrement')) {
      this.selectionIncrement = Math.max(1, state.selectionIncrement || 1);
    }
    this.extraSettingsEnabled = state.extraSettingsEnabled === true;
    const elements = projectElements[this.name];
    if (elements) {
      elements.marketProject = this;
      elements.updateIncrementButtons?.();
    }
    this.updateExtraSettingsUI();
  }
}

globalThis.GalacticMarketProject = GalacticMarketProject;
const moduleRef = globalThis.module;
if (moduleRef && moduleRef.exports) {
  moduleRef.exports = GalacticMarketProject;
}
