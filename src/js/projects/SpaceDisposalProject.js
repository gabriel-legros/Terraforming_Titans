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

    if (this.selectedDisposalResource?.resource === 'greenhouseGas') {
      const reduction = this.calculateTemperatureReduction();
      const suffix = this.isContinuous() ? `${getTemperatureUnit()}/s` : getTemperatureUnit();
      elements.temperatureReductionElement.textContent =
        `Temperature will reduce by: ${formatNumber(toDisplayTemperatureDelta(reduction), false, 2)}${suffix}`;
      elements.temperatureReductionElement.style.display = 'block';
    } else {
      elements.temperatureReductionElement.style.display = 'none';
    }
  }

  calculateTemperatureReduction() {
    if (
      this.assignedSpaceships <= 0 ||
      typeof terraforming === 'undefined' ||
      typeof resources === 'undefined' ||
      !resources.atmospheric?.greenhouseGas
    ) {
      return 0;
    }

    let removed = 0;
    if (this.isContinuous()) {
      removed =
        this.getShipCapacity() *
        this.assignedSpaceships *
        (1000 / this.getEffectiveDuration());
    } else {
      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      removed = totalDisposal.atmospheric?.greenhouseGas || 0;
    }

    if (removed <= 0) return 0;

    const ghg = resources.atmospheric.greenhouseGas;
    const originalAmount = ghg.value;
    const removal = Math.min(removed, originalAmount);
    const originalTemp = terraforming.temperature.value;

    const saveTempState = terraforming.saveTemperatureState?.bind(terraforming);
    const restoreTempState = terraforming.restoreTemperatureState?.bind(terraforming);
    const snapshot = saveTempState ? saveTempState() : null;

    ghg.value = originalAmount - removal;
    if (typeof terraforming.updateSurfaceTemperature === 'function') {
      terraforming.updateSurfaceTemperature();
    }
    const newTemp = terraforming.temperature.value;

    ghg.value = originalAmount;
    if (snapshot && restoreTempState) {
      restoreTempState(snapshot);
    } else if (typeof terraforming.updateSurfaceTemperature === 'function') {
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
