class SpaceDisposalProject extends SpaceExportBaseProject {
  createResourceDisposalUI() {
    const section = super.createResourceDisposalUI();
    const detailsGrid = section.querySelector('.project-details-grid');
    const tempReduction = document.createElement('div');
    tempReduction.id = `${this.name}-temperature-reduction`;
    detailsGrid.appendChild(tempReduction);

    projectElements[this.name] = {
      ...projectElements[this.name],
      temperatureReductionElement: tempReduction,
    };

    return section;
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements || !elements.temperatureReductionElement) return;

    if (
      this.assignedSpaceships > 0 &&
      this.selectedDisposalResource?.resource === 'greenhouseGas'
    ) {
      const reduction = this.calculateTemperatureReduction();
      elements.temperatureReductionElement.textContent =
        `Temperature will reduce by: ${formatNumber(toDisplayTemperatureDelta(reduction), false, 2)}${getTemperatureUnit()}`;
      elements.temperatureReductionElement.style.display = 'block';
    } else {
      elements.temperatureReductionElement.style.display = 'none';
    }
  }

  calculateTemperatureReduction() {
    if (
      typeof terraforming === 'undefined' ||
      typeof resources === 'undefined' ||
      !resources.atmospheric?.greenhouseGas
    ) {
      return 0;
    }

    const totalDisposal = this.calculateSpaceshipTotalDisposal();
    const removed = totalDisposal.atmospheric?.greenhouseGas || 0;
    if (removed <= 0) return 0;

    const ghg = resources.atmospheric.greenhouseGas;
    const originalAmount = ghg.value;
    const removal = Math.min(removed, originalAmount);
    const originalTemp = terraforming.temperature.value;

    ghg.value = originalAmount - removal;
    if (typeof terraforming.updateSurfaceTemperature === 'function') {
      terraforming.updateSurfaceTemperature();
    }
    const newTemp = terraforming.temperature.value;

    ghg.value = originalAmount;
    if (typeof terraforming.updateSurfaceTemperature === 'function') {
      terraforming.updateSurfaceTemperature();
    }

    return originalTemp - newTemp;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceDisposalProject = SpaceDisposalProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceDisposalProject;
}
