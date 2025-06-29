class SpaceExportBaseProject extends SpaceshipProject {
  renderUI(container) {
    if (this.attributes.disposable) {
      this.createResourceDisposalUI(container);
    }

    const elements = projectElements[this.name] || {};
    const row = elements.checkboxRowContainer;
    if (row) {
      const waitCheckboxContainer = document.createElement('div');
      waitCheckboxContainer.classList.add('checkbox-container');

      const waitCheckbox = document.createElement('input');
      waitCheckbox.type = 'checkbox';
      waitCheckbox.checked = this.waitForCapacity !== false;
      waitCheckbox.id = `${this.name}-wait-capacity`;
      waitCheckbox.classList.add('wait-capacity-checkbox');
      waitCheckbox.addEventListener('change', (e) => {
        this.waitForCapacity = e.target.checked;
      });

      const waitLabel = document.createElement('label');
      waitLabel.htmlFor = `${this.name}-wait-capacity`;
      waitLabel.textContent = 'Wait for full capacity';

      waitCheckboxContainer.appendChild(waitCheckbox);
      waitCheckboxContainer.appendChild(waitLabel);
      row.appendChild(waitCheckboxContainer);

      projectElements[this.name] = {
        ...projectElements[this.name],
        waitCapacityCheckbox: waitCheckbox,
        waitCapacityCheckboxContainer: waitCheckboxContainer,
      };
    }
  }

  createResourceDisposalUI(projectItem) {
    const disposalContainer = document.createElement('div');
    disposalContainer.classList.add('disposal-container');

    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = 'Select Resource to Export:';
    disposalContainer.appendChild(disposalLabel);

    const disposalSelect = document.createElement('select');
    disposalSelect.classList.add('disposal-select');
    disposalSelect.id = `${this.name}-disposal-select`;

    for (const [category, resourceList] of Object.entries(this.attributes.disposable)) {
      resourceList.forEach(resource => {
        const option = document.createElement('option');
        option.value = `${category}:${resource}`;
        option.textContent = resources[category][resource].displayName || resource;
        disposalSelect.appendChild(option);
      });
    }

    disposalSelect.addEventListener('change', (event) => {
      const [category, resource] = event.target.value.split(':');
      this.selectedDisposalResource = { category, resource };
    });

    disposalContainer.appendChild(disposalSelect);
    projectItem.appendChild(disposalContainer);

    const disposalPerShipElement = document.createElement('p');
    disposalPerShipElement.id = `${this.name}-disposal-per-ship`;
    disposalPerShipElement.classList.add('project-disposal-per-ship');
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    const disposalPerShipAmount = this.attributes.disposalAmount * efficiency;
    disposalPerShipElement.textContent = `Maximum Export per Ship: ${formatNumber(disposalPerShipAmount, true)}`;
    disposalContainer.appendChild(disposalPerShipElement);

    if (this.attributes.fundingGainAmount) {
      const gainElement = document.createElement('span');
      gainElement.id = `${this.name}-gain-per-ship`;
      gainElement.classList.add('project-disposal-per-ship');
      gainElement.textContent = `Gain per Resource: ${formatNumber(this.attributes.fundingGainAmount, true)}`;
      disposalContainer.appendChild(gainElement);
    }

    const totalDisposalElement = document.createElement('span');
    totalDisposalElement.id = `${this.name}-total-disposal`;
    totalDisposalElement.classList.add('project-total-disposal');
    totalDisposalElement.textContent = 'Total Export: 0';
    disposalContainer.appendChild(totalDisposalElement);

    projectElements[this.name] = {
      ...projectElements[this.name],
      disposalSelect,
      disposalPerShipElement,
      totalDisposalElement,
    };
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.waitCapacityCheckbox) {
      elements.waitCapacityCheckbox.checked = this.waitForCapacity !== false;
    }
    if (elements.waitCapacityCheckboxContainer) {
      if (typeof projectManager !== 'undefined' &&
          projectManager.isBooleanFlagSet('automateSpecialProjects')) {
        elements.waitCapacityCheckboxContainer.style.display = 'block';
      } else {
        elements.waitCapacityCheckboxContainer.style.display = 'none';
      }
    }

    if (elements.disposalPerShipElement) {
      const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
      const perShip = this.attributes.disposalAmount * efficiency;
      elements.disposalPerShipElement.textContent = `Maximum Export per Ship: ${formatNumber(perShip, true)}`;
    }

    if (elements.totalDisposalElement) {
      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      let total = 0;
      for (const category in totalDisposal) {
        for (const resource in totalDisposal[category]) {
          total += totalDisposal[category][resource];
        }
      }
      elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(total, true)}`;
    }

    if (elements.disposalSelect && this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      elements.disposalSelect.value = `${category}:${resource}`;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportBaseProject = SpaceExportBaseProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportBaseProject;
}
