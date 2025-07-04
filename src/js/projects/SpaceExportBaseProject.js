class SpaceExportBaseProject extends SpaceshipProject {
  renderUI(container) {
    super.renderUI(container);
    if (this.attributes.disposable) {
      const topSection = container.querySelector('.project-top-section');
      if (topSection) {
        topSection.appendChild(this.createResourceDisposalUI());
      } else {
        container.appendChild(this.createResourceDisposalUI());
      }
    }
  }

  createWaitForCapacityCheckbox() {
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
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      waitCapacityCheckbox: waitCheckbox,
      waitCapacityCheckboxContainer: waitCheckboxContainer,
    };
  
    return waitCheckboxContainer;
  }

  createResourceDisposalUI() {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = 'Export';
    sectionContainer.appendChild(title);

    const disposalContainer = document.createElement('div');
    disposalContainer.classList.add('disposal-container');
  
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('disposal-select-container');
    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = 'Export:';
    const disposalSelect = document.createElement('select');
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
    selectContainer.append(disposalLabel, disposalSelect);
  
    const detailsGrid = document.createElement('div');
    detailsGrid.classList.add('project-details-grid');
    const disposalPerShip = document.createElement('div');
    disposalPerShip.id = `${this.name}-disposal-per-ship`;
    const totalDisposal = document.createElement('div');
    totalDisposal.id = `${this.name}-total-disposal`;
    const gainPerResource = document.createElement('div');
    gainPerResource.id = `${this.name}-gain-per-ship`;
    detailsGrid.append(selectContainer, disposalPerShip, totalDisposal, gainPerResource);
  
    disposalContainer.append(detailsGrid);
    sectionContainer.appendChild(disposalContainer);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      disposalSelect,
      disposalPerShipElement: disposalPerShip,
      totalDisposalElement: totalDisposal,
      gainPerResourceElement: gainPerResource,
    };
  
    return sectionContainer;
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.waitCapacityCheckbox) {
      elements.waitCapacityCheckbox.checked = this.waitForCapacity !== false;
    }
    if (elements.waitCapacityCheckboxContainer) {
      elements.waitCapacityCheckboxContainer.style.display =
          projectManager.isBooleanFlagSet('automateSpecialProjects') ? 'flex' : 'none';
    }

    if (elements.disposalPerShipElement) {
      const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
      const perShip = this.attributes.disposalAmount * efficiency;
      elements.disposalPerShipElement.textContent = `Max Export/Ship: ${formatNumber(perShip, true)}`;
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
    
    if (elements.gainPerResourceElement && this.attributes.fundingGainAmount) {
        elements.gainPerResourceElement.textContent = `Gain/Resource: ${formatNumber(this.attributes.fundingGainAmount, true)}`;
    }

    if (elements.disposalSelect && this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      elements.disposalSelect.value = `${category}:${resource}`;
    }
  }

  calculateSpaceshipTotalResourceGain() {
    if (!this.attributes.fundingGainAmount) {
      return {};
    }
    const totalDisposal = this.calculateSpaceshipTotalDisposal();
    let totalDisposalAmount = 0;
    for (const category in totalDisposal) {
      for (const resource in totalDisposal[category]) {
        totalDisposalAmount += totalDisposal[category][resource];
      }
    }
    return {
      colony: {
        funding: totalDisposalAmount * this.attributes.fundingGainAmount,
      },
    };
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportBaseProject = SpaceExportBaseProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportBaseProject;
}
