class CargoRocketProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.spaceshipPriceIncrease = 0;
  }

  createCargoSelectionUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const selectionGrid = document.createElement('div');
    selectionGrid.classList.add('cargo-selection-grid');

    const headerRow = document.createElement('div');
    headerRow.classList.add('cargo-resource-row', 'cargo-grid-header');
    headerRow.innerHTML = `
        <span>Resource</span>
        <span>Amount</span>
        <span>Price (Funding)</span>
        <span></span>
    `;
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
          label.innerHTML = `${resource.displayName} <span class="info-tooltip-icon" title="Each ship purchase raises prices based on terraformed planets and the increase decays by 1% per second.">&#9432;</span>`;
        } else {
          label.textContent = `${resource.displayName}`;
        }
        resourceRow.appendChild(label);

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = 0;
        quantityInput.value = 0;
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

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('cargo-buttons-container');
        const buttonValues = [0, 1, 10, 100, 1000, 10000, 100000, 1000000];
        buttonValues.forEach((value) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.classList.add('increment-button');
          button.textContent = value === 0 ? 'Clear' : `+${formatNumber(value, true)}`;
          button.addEventListener('click', () => {
            quantityInput.value = (value === 0) ? 0 : (parseInt(quantityInput.value, 10) || 0) + value;
            updateTotalCostDisplay(this);
          });
          buttonsContainer.appendChild(button);
        });
        resourceRow.appendChild(buttonsContainer);
        selectionGrid.appendChild(resourceRow);
      }
    }
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
      resourceSelectionContainer: container,
    };
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;

    if (this.attributes.resourceChoiceGainCost) {
      updateTotalCostDisplay(this);
      for (const category in this.attributes.resourceChoiceGainCost) {
        for (const resourceId in this.attributes.resourceChoiceGainCost[category]) {
          const resource = resources[category][resourceId];
          const row = document.getElementById(`${this.name}-${category}-${resourceId}-row`);
          if (row) {
            row.style.display = resource.unlocked ? 'grid' : 'none';
            const priceElement = row.querySelector('.resource-price-display');
            if (priceElement) {
              let price = this.attributes.resourceChoiceGainCost[category][resourceId];
              if (resourceId === 'spaceships') {
                price *= this.getSpaceshipPriceMultiplier();
              }
              priceElement.textContent = `${formatNumber(price, true)}`;
            }
          }
        }
      }

      if (this.oneTimeResourceGainsDisplay) {
        this.oneTimeResourceGainsDisplay.forEach(({ resource, quantity }) => {
          const inputElement = document.querySelector(`.resource-selection-${this.name}[data-resource="${resource}"]`);
          if (inputElement) {
            inputElement.value = quantity;
          }
        });
        this.oneTimeResourceGainsDisplay = null;
      }

      const selectedResources = [];
      document.querySelectorAll(`.resource-selection-${this.name}`).forEach((element) => {
        const category = element.dataset.category;
        const resource = element.dataset.resource;
        const quantity = parseInt(element.value, 10);
        if (quantity > 0) {
          selectedResources.push({ category, resource, quantity });
        }
      });
      this.selectedResources = selectedResources;
    }
  }

  getSpaceshipPriceMultiplier() {
    return 1 + this.spaceshipPriceIncrease;
  }

  applySpaceshipPurchase(count) {
    const planetCount = Math.max(
      1,
      typeof spaceManager !== 'undefined' && typeof spaceManager.getTerraformedPlanetCount === 'function'
        ? spaceManager.getTerraformedPlanetCount()
        : 0
    );
    this.spaceshipPriceIncrease += count / planetCount;
  }

  getSpaceshipTotalCost(quantity, basePrice) {
    const planetCount = Math.max(
      1,
      typeof spaceManager !== 'undefined' && typeof spaceManager.getTerraformedPlanetCount === 'function'
        ? spaceManager.getTerraformedPlanetCount()
        : 0
    );
    const delta = 1 / planetCount;
    const current = this.spaceshipPriceIncrease;
    const totalMultiplier = quantity * (1 + current) + delta * quantity * (quantity - 1) / 2;
    return basePrice * totalMultiplier;
  }

  update(delta) {
    if (this.spaceshipPriceIncrease > 0) {
      const decay = Math.pow(0.99, delta / 1000);
      this.spaceshipPriceIncrease *= decay;
      if (this.spaceshipPriceIncrease < 1e-6) {
        this.spaceshipPriceIncrease = 0;
      }
    }
    super.update(delta);
  }

  applyOneTimeStart(effect) {
    console.log('Getting one time cargo rocket');
    this.pendingResourceGains = effect.pendingResourceGains;
    this.isActive = true;
    this.remainingTime = 20000;

    // Update the visible entered amount in the resource selection UI
    this.pendingResourceGains.forEach(({ resource, quantity }) => {
      const inputElement = document.querySelector(`.resource-selection-${this.name}[data-resource="${resource}"]`);
      if (inputElement) {
        inputElement.value = quantity;
      }
    });

    // Update the total cost display
    updateTotalCostDisplay(this);
  }

  canStart() {
    if (!super.canStart()) return false;

    if (this.selectedResources && this.selectedResources.length > 0) {
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
    }

    return true;
  }

  deductResources(resources) {
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

  getResourceChoiceGainCost() {
    // Deduct funding for selected resources if applicable
    if (this.selectedResources && this.selectedResources.length > 0) {
      let totalFundingCost = 0;
      this.pendingResourceGains = []; // Track resources that will be gained later
      this.selectedResources.forEach(({ category, resource, quantity }) => {
        const basePrice = this.attributes.resourceChoiceGainCost[category][resource];
        const cost = resource === 'spaceships'
          ? this.getSpaceshipTotalCost(quantity, basePrice)
          : basePrice * quantity;
        totalFundingCost += cost;
        this.pendingResourceGains.push({ category, resource, quantity });
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

  estimateProjectCostAndGain() {
    if (this.isActive && this.autoStart) {
      const totalGain = this.pendingResourceGains;
      if (totalGain) {
        totalGain.forEach((gain) => {
          resources[gain.category][gain.resource].modifyRate(
            1000 * gain.quantity / this.getEffectiveDuration(),
            'Cargo Rockets',
            'project'
          );
        });
      }

      const fundingCost = 1000 * this.getResourceChoiceGainCost() / this.getEffectiveDuration();
      resources.colony.funding.modifyRate(
        -fundingCost,
        'Cargo Rockets',
        'project'
      );
    }
  }

  estimateCostAndGain() {
    this.estimateProjectCostAndGain();
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.CargoRocketProject = CargoRocketProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CargoRocketProject;
}
