class CargoRocketProject extends Project {
  renderUI(container) {
    const selectionContainer = createResourceSelectionUI(this);
    container.appendChild(selectionContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      resourceSelectionContainer: selectionContainer,
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
            row.style.display = resource.unlocked ? 'flex' : 'none';
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

  applyOneTimeStart(effect) {
    console.log('Getting one time cargo rocket');
    this.pendingResourceGains = effect.pendingResourceGains;
    this.isActive = true;
    this.remainingTime = 30000;

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
}

if (typeof globalThis !== 'undefined') {
  globalThis.CargoRocketProject = CargoRocketProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CargoRocketProject;
}
