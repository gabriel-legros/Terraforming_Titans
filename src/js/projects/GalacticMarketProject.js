class GalacticMarketProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.spaceshipPriceIncrease = 0;
    this.selectionIncrement = 1;
    this.shortfallLastTick = false;
    this.buySelections = [];
    this.sellSelections = [];
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
  }

  isContinuous() {
    return true;
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
    totalCostLabel.textContent = 'Total Cost: ';
    const totalCostValue = document.createElement('span');
    totalCostValue.id = `${this.name}-total-cost-display-value`;
    totalCostDisplay.append(totalCostLabel, totalCostValue);
    container.appendChild(totalCostDisplay);

    const elements = projectElements[this.name] = {
      ...(projectElements[this.name] || {}),
      totalCostDisplay,
      totalCostValue,
      totalCostLabel,
      resourceSelectionContainer: container,
    };

    this.applySelectionsToInputs();
    this.updateSelectedResources();
    updateTotalCostDisplay(this);
  }

  createSelectionUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const selectionGrid = document.createElement('div');
    selectionGrid.classList.add('cargo-selection-grid', 'galactic-market-grid');

    const headerRow = document.createElement('div');
    headerRow.classList.add('cargo-resource-row', 'cargo-grid-header', 'galactic-market-row', 'galactic-market-header');

    const headerConfig = [
      { text: 'Resource' },
      { text: 'Buy Price' },
      { text: 'Buy Amount' },
      { type: 'controls' },
      { text: 'Sell Amount' },
      {
        text: 'Sell Price',
        tooltip: 'Sell prices fall as you approach the saturation amount, so higher sell orders lower the payout per unit.',
      },
      { text: 'Saturation Amount' },
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
      rowMeta: [],
      increment: this.selectionIncrement,
    };

    const updateIncrement = (newValue) => {
      elements.increment = Math.max(1, Math.floor(newValue));
      this.selectionIncrement = elements.increment;
      elements.updateIncrementButtons?.();
    };

    headerConfig.forEach((config) => {
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
          updateIncrement(Math.max(1, Math.floor(elements.increment / 10)));
        });

        const multiplyButton = createHeaderButton('x10', () => {
          updateIncrement(elements.increment * 10);
        });

        const tooltip = document.createElement('span');
        tooltip.className = 'info-tooltip-icon';
        tooltip.title = 'Press the - button to shift the increment from buying to selling, increasing the sell amount.';
        tooltip.innerHTML = '&#9432;';
        headerControls.insertBefore(tooltip, multiplyButton.nextSibling);

        headerRow.appendChild(headerControls);
      } else {
        const span = document.createElement('span');
        span.textContent = config.text;
        if (config.tooltip) {
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.title = config.tooltip;
          tooltip.innerHTML = '&#9432;';
          span.appendChild(tooltip);
        }
        headerRow.appendChild(span);
      }
    });

    selectionGrid.appendChild(headerRow);

    for (const category in this.attributes.resourceChoiceGainCost) {
      const resourcesInCategory = this.attributes.resourceChoiceGainCost[category];
      for (const resourceId in resourcesInCategory) {
        const resourceData = resources[category]?.[resourceId];
        const resourceRow = document.createElement('div');
        resourceRow.id = `${this.name}-${category}-${resourceId}-row`;
        resourceRow.classList.add('cargo-resource-row', 'galactic-market-row');
        resourceRow.style.display = resourceData && resourceData.unlocked ? '' : 'none';

        const rowIndex = elements.rowMeta.length;

        const label = document.createElement('span');
        label.classList.add('cargo-resource-label');
        label.textContent = resourceData ? resourceData.displayName : resourceId;
        if (resourceId === 'spaceships') {
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.title = 'Each ship purchase raises funding price by 1 and this decays by 1% per second.  This increase can be reduced by progressing further in the game.';
          tooltip.innerHTML = '&#9432;';
          label.appendChild(tooltip);
        }
        resourceRow.appendChild(label);

        const buyPriceSpan = document.createElement('span');
        buyPriceSpan.classList.add('resource-price-display');
        buyPriceSpan.textContent = `${formatNumber(this.getBuyPrice(category, resourceId), true)}`;
        resourceRow.appendChild(buyPriceSpan);

        const buyInput = document.createElement('input');
        buyInput.type = 'number';
        buyInput.min = 0;
        buyInput.value = this.getSelectionQuantity(this.buySelections, category, resourceId);
        buyInput.classList.add('resource-selection-input', `resource-selection-${this.name}`, `buy-selection-${this.name}`);
        buyInput.dataset.category = category;
        buyInput.dataset.resource = resourceId;
        buyInput.dataset.rowIndex = rowIndex;
        resourceRow.appendChild(buyInput);

        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('cargo-buttons-container', 'galactic-market-controls');

        const refreshRow = () => {
          this.updateSelectedResources();
          this.updateSellPriceSpan(rowIndex);
          updateTotalCostDisplay(this);
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

        const sellInput = document.createElement('input');
        sellInput.type = 'number';
        sellInput.min = 0;
        sellInput.value = this.getSelectionQuantity(this.sellSelections, category, resourceId);
        sellInput.classList.add('resource-selection-input', `sell-selection-${this.name}`);
        sellInput.dataset.category = category;
        sellInput.dataset.resource = resourceId;
        sellInput.dataset.rowIndex = rowIndex;
        sellInput.addEventListener('input', refreshRow);
        buyInput.addEventListener('input', refreshRow);

        const applyShift = (direction) => {
          const incrementValue = this.selectionIncrement;
          const step = Number.isFinite(incrementValue) && incrementValue > 0
            ? incrementValue
            : 1;
          const currentBuy = parseSelectionQuantity(buyInput.value);
          const currentSell = parseSelectionQuantity(sellInput.value);

          if (direction === 'reset') {
            buyInput.value = 0;
            sellInput.value = 0;
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
            buyInput.value = newBuy;
            sellInput.value = newSell;
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
            buyInput.value = newBuy;
            sellInput.value = newSell;
          }
        };

        createButton('0', () => applyShift('reset'));
        const minusButton = createButton('', () => applyShift('toSell'));
        const plusButton = createButton('', () => applyShift('toBuy'));
        createButton('Sat', () => {
          const saturation = this.getSaturationSellAmount(category, resourceId);
          buyInput.value = 0;
          sellInput.value = saturation;
          refreshRow();
        });

        resourceRow.appendChild(controlsContainer);

        resourceRow.appendChild(sellInput);

        const sellPriceSpan = document.createElement('span');
        sellPriceSpan.classList.add('resource-price-display');
        sellPriceSpan.textContent = `${formatNumber(this.getSellPrice(category, resourceId, parseSelectionQuantity(sellInput.value)), true)}`;
        resourceRow.appendChild(sellPriceSpan);

        const saturationSpan = document.createElement('span');
        saturationSpan.classList.add('resource-price-display');
        saturationSpan.textContent = `${formatNumber(this.getSaturationSellAmount(category, resourceId), true)}`;
        resourceRow.appendChild(saturationSpan);

        elements.selectionInputs.push(buyInput);
        elements.priceSpans.push(buyPriceSpan);
        elements.buyInputs.push(buyInput);
        elements.sellInputs.push(sellInput);
        elements.buyPriceSpans.push(buyPriceSpan);
        elements.sellPriceSpans.push(sellPriceSpan);
        elements.saturationSellSpans.push(saturationSpan);
        elements.rowButtons.push({ minusButton, plusButton });
        elements.rowMeta.push({ category, resource: resourceId });

        selectionGrid.appendChild(resourceRow);

        // Ensure initial pricing reflects selections
        this.updateSellPriceSpan(rowIndex);
      }
    }

    elements.updateIncrementButtons = () => {
      const label = formatNumber(elements.increment, true);
      (elements.rowButtons || []).forEach(({ minusButton, plusButton }) => {
        if (minusButton) minusButton.textContent = `-${label}`;
        if (plusButton) plusButton.textContent = `+${label}`;
      });
    };

    elements.updateIncrementButtons();

    sectionContainer.appendChild(selectionGrid);
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
    const worlds = typeof count === 'number' ? Math.max(count, 1) : 1;
    return multiplier * worlds;
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;

    const { buyInputs = [], sellInputs = [], buyPriceSpans = [], sellPriceSpans = [], saturationSellSpans = [], rowMeta = [] } = elements;

    elements.updateIncrementButtons?.();

    rowMeta.forEach((meta, index) => {
      const resourceData = resources[meta.category]?.[meta.resource];
      const row = buyInputs[index]?.closest('.cargo-resource-row');
      if (row && resourceData) {
        row.style.display = resourceData.unlocked ? 'grid' : 'none';
      }
      if (buyPriceSpans[index]) {
        buyPriceSpans[index].textContent = `${formatNumber(this.getBuyPrice(meta.category, meta.resource), true)}`;
      }
      if (sellPriceSpans[index]) {
        const sellQty = sellInputs[index]
          ? parseSelectionQuantity(sellInputs[index].value)
          : 0;
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

    rowMeta.forEach((meta, index) => {
      const buyInput = buyInputs[index];
      const sellInput = sellInputs[index];
      const buyQuantity = buyInput ? parseSelectionQuantity(buyInput.value) : 0;
      const sellQuantity = sellInput ? parseSelectionQuantity(sellInput.value) : 0;
      if (buyQuantity > 0) {
        buySelections.push({ category: meta.category, resource: meta.resource, quantity: buyQuantity });
      }
      if (sellQuantity > 0) {
        sellSelections.push({ category: meta.category, resource: meta.resource, quantity: sellQuantity });
      }
      this.updateSellPriceSpan(index);
    });

    this.buySelections = buySelections;
    this.sellSelections = sellSelections;

    elements.selectionInputs = buyInputs;
    elements.priceSpans = elements.buyPriceSpans;
  }

  updateSellPriceSpan(index) {
    const elements = projectElements[this.name];
    if (!elements) return;
    const meta = elements.rowMeta?.[index];
    const sellInput = elements.sellInputs?.[index];
    const span = elements.sellPriceSpans?.[index];
    if (!meta || !sellInput || !span) return;
    const quantity = parseSelectionQuantity(sellInput.value);
    const price = this.getSellPrice(meta.category, meta.resource, quantity);
    span.textContent = `${formatNumber(price, true)}`;
  }

  applySelectionsToInputs() {
    const elements = projectElements[this.name];
    if (!elements) return;
    const { buyInputs = [], sellInputs = [], rowMeta = [] } = elements;

    const buyMap = this.createSelectionMap(this.buySelections);
    const sellMap = this.createSelectionMap(this.sellSelections);

    rowMeta.forEach((meta, index) => {
      if (buyInputs[index]) {
        buyInputs[index].value = buyMap.get(this.getSelectionKey(meta.category, meta.resource)) || 0;
      }
      if (sellInputs[index]) {
        sellInputs[index].value = sellMap.get(this.getSelectionKey(meta.category, meta.resource)) || 0;
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

  static get SELL_MULTIPLIERS() {
    if (!this._SELL_MULTIPLIERS) {
      this._SELL_MULTIPLIERS = {
        metal: 1_000_000_000,
        glass: 10_000_000,
        water: 0,
        food: 100_000_000,
        components: 100_000_000,
        electronics: 100_000_000,
        androids: 10_000_000,
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
    this.shortfallLastTick = false;
    this.isActive = true;
    this.isPaused = false;
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    return true;
  }

  canStart() {
    if (!super.canStart()) return false;
    return this.buySelections.length > 0 || this.sellSelections.length > 0;
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

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.isActive || !this.autoStart) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    const rateMultiplier = applyRates ? productivity : 1;

    this.buySelections.forEach(({ category, resource, quantity }) => {
      const basePrice = this.getBasePrice(category, resource);
      const costPerSecond = resource === 'spaceships'
        ? this.getSpaceshipTotalCost(quantity, basePrice)
        : basePrice * quantity;
      if (!totals.cost.colony) totals.cost.colony = {};
      totals.cost.colony.funding = (totals.cost.colony.funding || 0) + costPerSecond * seconds;
      if (!totals.gain[category]) totals.gain[category] = {};
      totals.gain[category][resource] = (totals.gain[category][resource] || 0) + quantity * seconds;
      if (applyRates) {
        resources[category][resource].modifyRate(quantity * rateMultiplier, 'Galactic Market', 'project');
        resources.colony.funding.modifyRate(-costPerSecond * rateMultiplier, 'Galactic Market', 'project');
      }
    });

    this.sellSelections.forEach(({ category, resource, quantity }) => {
      const sellPrice = this.getSellPrice(category, resource, quantity);
      const revenuePerSecond = sellPrice * quantity;
      if (!totals.cost[category]) totals.cost[category] = {};
      totals.cost[category][resource] = (totals.cost[category][resource] || 0) + quantity * seconds;
      if (!totals.gain.colony) totals.gain.colony = {};
      totals.gain.colony.funding = (totals.gain.colony.funding || 0) + revenuePerSecond * seconds;
      if (applyRates) {
        resources[category][resource].modifyRate(-quantity * rateMultiplier, 'Galactic Market', 'project');
        resources.colony.funding.modifyRate(revenuePerSecond * rateMultiplier, 'Galactic Market', 'project');
      }
    });

    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.shortfallLastTick = false;
    if (!this.isActive || !this.autoStart) return;

    const seconds = deltaTime / 1000;
    const buyTransactions = [];
    let buyCostPerSecond = 0;

    this.buySelections.forEach(({ category, resource, quantity }) => {
      const basePrice = this.getBasePrice(category, resource);
      const perSecondCost = resource === 'spaceships'
        ? this.getSpaceshipTotalCost(quantity, basePrice)
        : basePrice * quantity;
      buyTransactions.push({ category, resource, quantity, perSecondCost });
      buyCostPerSecond += perSecondCost;
    });

    const sellTransactions = [];

    this.sellSelections.forEach(({ category, resource, quantity }) => {
      sellTransactions.push({ category, resource, quantity });
    });

    let totalBuyCost = buyCostPerSecond * seconds * productivity;
    const availableFunding = resources.colony.funding.value;

    if (totalBuyCost > availableFunding && totalBuyCost > 0) {
      this.shortfallLastTick = true;
      if (availableFunding <= 0) {
        buyTransactions.forEach((transaction) => {
          transaction.quantity = 0;
          transaction.perSecondCost = 0;
        });
        totalBuyCost = 0;
      } else {
        const scale = availableFunding / totalBuyCost;
        buyTransactions.forEach((transaction) => {
          transaction.quantity *= scale;
          transaction.perSecondCost *= scale;
        });
        totalBuyCost = availableFunding;
      }
    }

    let sellScale = 1;
    sellTransactions.forEach((transaction) => {
      const resourceObject = resources[transaction.category]?.[transaction.resource];
      const availableAmount = resourceObject ? resourceObject.value : 0;
      const requiredAmount = transaction.quantity * seconds * productivity;
      if (requiredAmount > availableAmount) {
        this.shortfallLastTick = this.shortfallLastTick || requiredAmount > 0;
        if (availableAmount <= 0) {
          sellScale = 0;
        } else {
          sellScale = Math.min(sellScale, availableAmount / requiredAmount);
        }
      }
    });

    if (sellScale < 1) {
      sellTransactions.forEach((transaction) => {
        transaction.quantity *= sellScale;
      });
    }

    let totalSellRevenuePerSecond = 0;
    sellTransactions.forEach((transaction) => {
      const price = this.getSellPrice(transaction.category, transaction.resource, transaction.quantity);
      transaction.perSecondRevenue = price * transaction.quantity;
      totalSellRevenuePerSecond += transaction.perSecondRevenue;
    });

    const totalSellRevenue = totalSellRevenuePerSecond * seconds * productivity;

    const netFundingChange = totalSellRevenue - totalBuyCost;

    if (netFundingChange !== 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) accumulatedChanges.colony = {};
        accumulatedChanges.colony.funding = (accumulatedChanges.colony.funding || 0) + netFundingChange;
      } else if (netFundingChange > 0) {
        resources.colony.funding.increase(netFundingChange);
      } else {
        resources.colony.funding.decrease(-netFundingChange);
      }
    }

    buyTransactions.forEach((transaction) => {
      const amount = transaction.quantity * seconds * productivity;
      if (amount <= 0) return;
      if (accumulatedChanges) {
        if (!accumulatedChanges[transaction.category]) accumulatedChanges[transaction.category] = {};
        accumulatedChanges[transaction.category][transaction.resource] =
          (accumulatedChanges[transaction.category][transaction.resource] || 0) + amount;
      } else {
        resources[transaction.category][transaction.resource].increase(amount);
      }
      if (transaction.resource === 'spaceships') {
        this.applySpaceshipPurchase(amount);
      }
    });

    sellTransactions.forEach((transaction) => {
      const amount = transaction.quantity * seconds * productivity;
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
  }

  saveState() {
    const state = super.saveState();
    state.buySelections = this.buySelections;
    state.sellSelections = this.sellSelections;
    state.selectedResources = this.buySelections;
    state.spaceshipPriceIncrease = this.spaceshipPriceIncrease;
    state.selectionIncrement = this.selectionIncrement;
    return state;
  }

  loadState(state) {
    super.loadState(state);
    this.selectionIncrement = state.selectionIncrement || 1;
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
    const savedBuys = state.buySelections || state.selectedResources || [];
    const savedSells = state.sellSelections || [];
    this.buySelections = normalizeSelectionEntries(savedBuys);
    this.sellSelections = normalizeSelectionEntries(savedSells);

    const elements = projectElements[this.name];
    if (elements) {
      elements.increment = this.selectionIncrement;
      elements.updateIncrementButtons?.();
    }
    this.applySelectionsToInputs();
    this.updateSelectedResources();
    updateTotalCostDisplay(this);
  }

  saveTravelState() {
    return { spaceshipPriceIncrease: this.spaceshipPriceIncrease };
  }

  loadTravelState(state = {}) {
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
  }
}

globalThis.GalacticMarketProject = GalacticMarketProject;
const moduleRef = globalThis.module;
if (moduleRef && moduleRef.exports) {
  moduleRef.exports = GalacticMarketProject;
}
