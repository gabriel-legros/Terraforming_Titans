class SpaceExportBaseProject extends Project {
  renderUI(container) {
    if (typeof createResourceDisposalUI === 'function') {
      createResourceDisposalUI(this, container);
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
