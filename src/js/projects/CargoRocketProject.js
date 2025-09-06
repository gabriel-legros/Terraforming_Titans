class CargoRocketProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.spaceshipPriceIncrease = 0;
    this.convertedToContinuous = false;
    this.selectedResources = [];
  }

  isContinuous() {
    return this.isBooleanFlagSet && this.isBooleanFlagSet('continuousTrading');
  }

  createCargoSelectionUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const selectionGrid = document.createElement('div');
    selectionGrid.classList.add('cargo-selection-grid');

    const elements = projectElements[this.name] = {
      ...projectElements[this.name],
      selectionInputs: [],
      priceSpans: [],
      minusButtons: [],
      plusButtons: [],
      increment: 1,
    };

    const updateIncrementButtons = () => {
      elements.minusButtons.forEach((btn) => {
        btn.textContent = `-${formatNumber(elements.increment, true)}`;
      });
      elements.plusButtons.forEach((btn) => {
        btn.textContent = `+${formatNumber(elements.increment, true)}`;
      });
    };

    const headerRow = document.createElement('div');
    headerRow.classList.add('cargo-resource-row', 'cargo-grid-header');

    const resourceHeader = document.createElement('span');
    resourceHeader.textContent = 'Resource';
    headerRow.appendChild(resourceHeader);

    const amountHeader = document.createElement('span');
    amountHeader.textContent = 'Amount';
    headerRow.appendChild(amountHeader);

    const priceHeader = document.createElement('span');
    priceHeader.textContent = 'Price (Funding)';
    headerRow.appendChild(priceHeader);

    const headerButtons = document.createElement('div');
    headerButtons.classList.add('cargo-buttons-container');
    headerRow.appendChild(headerButtons);

    const createHeaderButton = (text, onClick) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('increment-button');
      button.textContent = text;
      button.addEventListener('click', () => {
        onClick();
        updateIncrementButtons();
      });
      headerButtons.appendChild(button);
      return button;
    };

    createHeaderButton('/10', () => {
      elements.increment = Math.max(1, Math.floor(elements.increment / 10));
    });

    createHeaderButton('x10', () => {
      elements.increment *= 10;
    });

    selectionGrid.appendChild(headerRow);

    for (const category in this.attributes.resourceChoiceGainCost) {
      for (const resourceId in this.attributes.resourceChoiceGainCost[category]) {
        const resource = resources[category][resourceId];
        const resourceRow = document.createElement('div');
        resourceRow.id = `${this.name}-${category}-${resourceId}-row`;
        resourceRow.classList.add('cargo-resource-row');
        resourceRow.style.display = resource.unlocked ? '' : 'none';

        const label = document.createElement('span');
        label.classList.add('cargo-resource-label');
        if (resourceId === 'spaceships') {
          label.textContent = resource.displayName;
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip-icon';
          tooltip.title = 'Each ship purchase raises funding price by 1 and this decays by 1% per second.  This increase can be reduced by progressing further in the game.';
          tooltip.innerHTML = '&#9432;';
          label.appendChild(tooltip);
        } else {
          label.textContent = resource.displayName;
        }
        resourceRow.appendChild(label);

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = 0;
        const selected = this.selectedResources.find(
          (sr) => sr.category === category && sr.resource === resourceId
        );
        quantityInput.value = selected ? selected.quantity : 0;
        quantityInput.classList.add('resource-selection-input', `resource-selection-${this.name}`);
        quantityInput.dataset.category = category;
        quantityInput.dataset.resource = resourceId;
        resourceRow.appendChild(quantityInput);

        const pricePerUnit = this.attributes.resourceChoiceGainCost[category][resourceId];
        const priceDisplay = document.createElement('span');
        priceDisplay.classList.add('resource-price-display');
        priceDisplay.dataset.resource = resourceId;
        priceDisplay.textContent = `${formatNumber(pricePerUnit, true)}`;
        resourceRow.appendChild(priceDisplay);

        elements.selectionInputs.push(quantityInput);
        elements.priceSpans.push(priceDisplay);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('cargo-buttons-container');

        const createButton = (text, onClick) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.classList.add('increment-button');
          button.textContent = text;
          button.addEventListener('click', () => {
            onClick();
            updateTotalCostDisplay(this);
          });
          buttonsContainer.appendChild(button);
          return button;
        };

        createButton('0', () => {
          quantityInput.value = 0;
        });

        const minusButton = createButton(`-${formatNumber(elements.increment, true)}`, () => {
          const current = parseInt(quantityInput.value, 10) || 0;
          quantityInput.value = Math.max(0, current - elements.increment);
        });

        const plusButton = createButton(`+${formatNumber(elements.increment, true)}`, () => {
          quantityInput.value = (parseInt(quantityInput.value, 10) || 0) + elements.increment;
        });

        elements.minusButtons.push(minusButton);
        elements.plusButtons.push(plusButton);

        resourceRow.appendChild(buttonsContainer);
        selectionGrid.appendChild(resourceRow);
      }
    }
    updateIncrementButtons();
    sectionContainer.appendChild(selectionGrid);
    container.appendChild(sectionContainer);
  }

  renderUI(container) {
    const topSection = document.createElement('div');
    topSection.classList.add('project-top-section');

    this.createCargoSelectionUI(topSection);

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

    projectElements[this.name] = {
      ...projectElements[this.name],
      totalCostDisplay: totalCostDisplay,
      totalCostValue: totalCostValue,
      resourceSelectionContainer: container,
    };
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;

    if (this.attributes.resourceChoiceGainCost) {
      updateTotalCostDisplay(this);

      const inputs = elements.selectionInputs || [];
      const prices = elements.priceSpans || [];
      inputs.forEach((input, index) => {
        const category = input?.dataset?.category;
        const resourceId = input?.dataset?.resource;
        if (typeof category !== 'string' || typeof resourceId !== 'string') {
          return;
        }
        const resource = resources[category]?.[resourceId];
        const row = input.closest('.cargo-resource-row');
        if (row && resource) {
          row.style.display = resource.unlocked ? 'grid' : 'none';
        }
        const priceSpan = prices[index];
        if (priceSpan) {
          let price = this.attributes.resourceChoiceGainCost?.[category]?.[resourceId];
          if (typeof price !== 'number') return;
          if (resourceId === 'spaceships') {
            price += this.getSpaceshipPriceIncrease();
          }
          priceSpan.textContent = `${formatNumber(price, true)}`;
        }
      });

      if (this.oneTimeResourceGainsDisplay) {
        inputs.forEach((input) => {
          const match = this.oneTimeResourceGainsDisplay.find(
            (r) => r.resource === input.dataset.resource
          );
          if (match) {
            input.value = match.quantity;
          }
        });
        this.oneTimeResourceGainsDisplay = null;
      }

      const selectedResources = [];
      inputs.forEach((input) => {
        const category = input?.dataset?.category;
        const resource = input?.dataset?.resource;
        if (typeof category !== 'string' || typeof resource !== 'string') {
          return;
        }
        const raw = input.value;
        const quantity = typeof raw === 'string' ? parseInt(raw, 10) : 0;
        if (quantity > 0) {
          selectedResources.push({ category, resource, quantity });
        }
      });
      this.selectedResources = selectedResources;
    }
  }

  getSpaceshipPriceIncrease() {
    return this.spaceshipPriceIncrease;
  }

  applySpaceshipPurchase(count) {
    const total = typeof spaceManager !== 'undefined' && typeof spaceManager.getTerraformedPlanetCount === 'function'
      ? spaceManager.getTerraformedPlanetCount()
      : 0;
    const currentTerraformed = typeof spaceManager !== 'undefined' && typeof spaceManager.isPlanetTerraformed === 'function' && typeof spaceManager.getCurrentPlanetKey === 'function'
      ? spaceManager.isPlanetTerraformed(spaceManager.getCurrentPlanetKey())
      : false;
    const divisor = Math.max(1, total - (currentTerraformed ? 1 : 0));
    this.spaceshipPriceIncrease += count / divisor;
  }

  getSpaceshipTotalCost(quantity, basePrice) {
    const total = typeof spaceManager !== 'undefined' && typeof spaceManager.getTerraformedPlanetCount === 'function'
      ? spaceManager.getTerraformedPlanetCount()
      : 0;
    const currentTerraformed = typeof spaceManager !== 'undefined' && typeof spaceManager.isPlanetTerraformed === 'function' && typeof spaceManager.getCurrentPlanetKey === 'function'
      ? spaceManager.isPlanetTerraformed(spaceManager.getCurrentPlanetKey())
      : false;
    const divisor = Math.max(1, total - (currentTerraformed ? 1 : 0));
    const delta = 1 / divisor;
    const current = this.spaceshipPriceIncrease;
    return basePrice * quantity + current * quantity + delta * quantity * (quantity - 1) / 2;
  }

  update(delta) {
    if (this.spaceshipPriceIncrease > 0) {
      const decay = Math.pow(0.99, delta / 1000);
      this.spaceshipPriceIncrease *= decay;
      if (this.spaceshipPriceIncrease < 1e-6) {
        this.spaceshipPriceIncrease = 0;
      }
    }
    if (this.isContinuous() && !this.convertedToContinuous) {
      if (this.pendingResourceGains && this.pendingResourceGains.length) {
        this.applyResourceChoiceGain();
      }
      this.pendingResourceGains = null;
      this.convertedToContinuous = true;
      if (this.isActive) {
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
      }
    }
    super.update(delta);
  }

  start(resources) {
    if (this.isContinuous()) {
      if (!this.canStart()) return false;
      this.isActive = true;
      this.isPaused = false;
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      return true;
    }
    return super.start(resources);
  }

  applyOneTimeStart(effect) {
    console.log('Getting one time cargo rocket');
    this.pendingResourceGains = effect.pendingResourceGains;
    this.isActive = true;
    this.remainingTime = 20000;

    // Update the visible entered amount in the resource selection UI
    const elements = projectElements[this.name];
    const inputs = elements?.selectionInputs || [];
    this.pendingResourceGains.forEach(({ resource, quantity }) => {
      const inputElement = inputs.find(
        (input) => input.dataset.resource === resource
      );
      if (inputElement) {
        inputElement.value = quantity;
      }
    });

    // Update the total cost display
    updateTotalCostDisplay(this);
  }

  canStart() {
    if (!super.canStart()) return false;
    if (!this.selectedResources || this.selectedResources.length === 0) {
      return false;
    }

    if (this.isContinuous()) {
      return true;
    }

    let totalFundingCost = 0;
    this.selectedResources.forEach(({ category, resource, quantity }) => {
      const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
      if (resource === 'spaceships') {
        totalFundingCost += this.getSpaceshipTotalCost(quantity, basePrice);
      } else {
        totalFundingCost += basePrice * quantity;
      }
    });

    if (resources.colony.funding.value < totalFundingCost) {
      return false;
    }

    return true;
  }

  deductResources(resources) {
    if (this.isContinuous()) return;
    super.deductResources(resources);
    const cost = this.getResourceChoiceGainCost();
    resources.colony.funding.decrease(cost);
    if (this.selectedResources) {
      this.selectedResources.forEach(({ category, resource, quantity }) => {
        if (category === 'special' && resource === 'spaceships') {
          this.applySpaceshipPurchase(quantity);
        }
      });
    }
  }

  getResourceChoiceGainCost(useSelected = true) {
    if (this.isContinuous()) {
      const source = this.selectedResources;
      if (source && source.length > 0) {
        let totalFundingCost = 0;
        source.forEach(({ category, resource, quantity }) => {
          const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
          const cost = resource === 'spaceships'
            ? this.getSpaceshipTotalCost(quantity, basePrice)
            : basePrice * quantity;
          totalFundingCost += cost;
        });
        return totalFundingCost;
      }
      return 0;
    }

    // Calculate funding cost for selected resources. When useSelected is true,
    // this also updates pendingResourceGains which are applied on completion.
    const source = useSelected ? this.selectedResources : this.pendingResourceGains;
    if (source && source.length > 0) {
      let totalFundingCost = 0;
      if (useSelected) {
        this.pendingResourceGains = [];
      }
      source.forEach(({ category, resource, quantity }) => {
        const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
        const cost = resource === 'spaceships'
          ? this.getSpaceshipTotalCost(quantity, basePrice)
          : basePrice * quantity;
        totalFundingCost += cost;
        if (useSelected) {
          this.pendingResourceGains.push({ category, resource, quantity });
        }
      });
      return totalFundingCost;
    }
    return 0;
  }

  applyResourceChoiceGain() {
    // Apply resource gain based on the selected resources and their quantities
    this.pendingResourceGains.forEach(({ category, resource, quantity }) => {
      resources[category][resource].increase(quantity);
      console.log(`Increased ${resource} by ${quantity}`);
    });
    this.pendingResourceGains = false;
  }

  complete() {
    super.complete();
    if (this.pendingResourceGains && this.attributes.resourceChoiceGainCost) {
      this.applyResourceChoiceGain();
    }
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.isActive) return totals;
    if (this.isContinuous()) {
      if (!this.autoStart) return totals;
      const seconds = deltaTime / 1000;
      if (this.selectedResources && this.selectedResources.length > 0) {
        let costPerSecond = 0;
        this.selectedResources.forEach(({ category, resource, quantity }) => {
          const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
          const perSecCost = resource === 'spaceships'
            ? this.getSpaceshipTotalCost(quantity, basePrice)
            : basePrice * quantity;
          costPerSecond += perSecCost;
          if (!totals.gain[category]) totals.gain[category] = {};
          totals.gain[category][resource] =
            (totals.gain[category][resource] || 0) + quantity * seconds;
          if (applyRates) {
            resources[category][resource].modifyRate(
              quantity * (applyRates ? productivity : 1),
              'Cargo Rockets',
              'project'
            );
          }
        });
        if (costPerSecond) {
          if (!totals.cost.colony) totals.cost.colony = {};
          totals.cost.colony.funding =
            (totals.cost.colony.funding || 0) + costPerSecond * seconds;
          if (applyRates) {
            resources.colony.funding.modifyRate(
              -costPerSecond * (applyRates ? productivity : 1),
              'Cargo Rockets',
              'project'
            );
          }
        }
      }
      return totals;
    }

    if (this.autoStart) {
      const duration = this.getEffectiveDuration();
      const rate = 1000 / duration;
      const timeFraction = deltaTime / duration;

      const totalGain = this.pendingResourceGains;
      if (totalGain) {
        totalGain.forEach((gain) => {
          const rateValue = gain.quantity * rate * (applyRates ? productivity : 1);
          if (applyRates) {
            resources[gain.category][gain.resource].modifyRate(
              rateValue,
              'Cargo Rockets',
              'project'
            );
          }
          if (!totals.gain[gain.category]) totals.gain[gain.category] = {};
          totals.gain[gain.category][gain.resource] =
            (totals.gain[gain.category][gain.resource] || 0) + gain.quantity * timeFraction;
        });
      }

      const fundingCost = this.getResourceChoiceGainCost(false);
      if (fundingCost) {
        const rateValue = fundingCost * rate * (applyRates ? productivity : 1);
        if (applyRates) {
          resources.colony.funding.modifyRate(
            -rateValue,
            'Cargo Rockets',
            'project'
          );
        }
        if (!totals.cost.colony) totals.cost.colony = {};
        totals.cost.colony.funding =
          (totals.cost.colony.funding || 0) + fundingCost * timeFraction;
      }
    }
    return totals;
  }

  saveState() {
    const state = super.saveState();
    if (this.autoStart) {
      state.selectedResources = this.selectedResources;
    }
    state.spaceshipPriceIncrease = this.spaceshipPriceIncrease;
    return state;
  }

  loadState(state) {
    super.loadState(state);
    this.selectedResources = this.autoStart && state.selectedResources
      ? state.selectedResources
      : [];
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
  }

  saveTravelState() {
    return { spaceshipPriceIncrease: this.spaceshipPriceIncrease };
  }

  loadTravelState(state = {}) {
    this.spaceshipPriceIncrease = state.spaceshipPriceIncrease || 0;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.shortfallLastTick = false;
    if (!this.isActive || !this.isContinuous() || !this.autoStart) return;
    if (!this.selectedResources || this.selectedResources.length === 0) return;
    const seconds = deltaTime / 1000;
    const purchases = [];
    let costPerSecond = 0;
    this.selectedResources.forEach(({ category, resource, quantity }) => {
      const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
      const perSecCost = resource === 'spaceships'
        ? this.getSpaceshipTotalCost(quantity, basePrice)
        : basePrice * quantity;
      purchases.push({ category, resource, quantity, perSecCost });
      costPerSecond += perSecCost;
    });
    let totalCost = costPerSecond * seconds * productivity;
    let available = resources.colony.funding.value;
    if (totalCost > available) {
      this.shortfallLastTick = totalCost > 0;
      if (available <= 0) return;
      const scale = available / totalCost;
      purchases.forEach(p => { p.quantity *= scale; p.perSecCost *= scale; });
      totalCost = available;
    }
    if (totalCost > 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) accumulatedChanges.colony = {};
        accumulatedChanges.colony.funding = (accumulatedChanges.colony.funding || 0) - totalCost;
      } else {
        resources.colony.funding.decrease(totalCost);
      }
    }
    purchases.forEach(({ category, resource, quantity }) => {
      const amount = quantity * seconds * productivity;
      if (accumulatedChanges) {
        if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
        accumulatedChanges[category][resource] = (accumulatedChanges[category][resource] || 0) + amount;
      } else {
        resources[category][resource].increase(amount);
      }
      if (resource === 'spaceships') {
        this.applySpaceshipPurchase(amount);
      }
    });
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    return this.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
  }
}

function invalidateCargoSelectionCache(project) {
  const elements = projectElements[project.name];
  if (!elements || !elements.resourceSelectionContainer) return;
  const inputs = Array.from(
    elements.resourceSelectionContainer.querySelectorAll(
      `.resource-selection-${project.name}`
    )
  );
  elements.selectionInputs = inputs;
  elements.priceSpans = inputs.map((input) =>
    input.parentElement.querySelector('.resource-price-display')
  );
}

if (typeof globalThis !== 'undefined') {
  globalThis.CargoRocketProject = CargoRocketProject;
  globalThis.invalidateCargoSelectionCache = invalidateCargoSelectionCache;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CargoRocketProject;
  module.exports.invalidateCargoSelectionCache = invalidateCargoSelectionCache;
}
