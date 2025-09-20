class SpaceDisposalProject extends SpaceExportBaseProject {
  constructor(config, name) {
    super(config, name);
    this.massDriverEnabled = false;
    this.massDriverShipEquivalency = this.attributes.massDriverShipEquivalency ?? 10;
  }

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

  renderUI(container) {
    super.renderUI(container);

    const elements = projectElements[this.name] || {};
    if (!elements.massDriverInfoSection) {
      const sectionContainer = document.createElement('div');
      sectionContainer.classList.add('project-section-container');
      sectionContainer.style.display = 'none';

      const title = document.createElement('h4');
      title.classList.add('section-title');
      title.textContent = 'Mass Drivers';
      sectionContainer.appendChild(title);

      const infoContent = document.createElement('div');
      infoContent.id = `${this.name}-mass-driver-info`;
      sectionContainer.appendChild(infoContent);

      container.appendChild(sectionContainer);

      projectElements[this.name] = {
        ...elements,
        massDriverInfoSection: sectionContainer,
        massDriverInfoElement: infoContent,
      };
    }
  }

  getMassDriverContribution() {
    if (!this.isBooleanFlagSet('massDriverEnabled')) {
      return 0;
    }
    const activeMassDrivers = buildings?.massDriver?.active ?? 0;
    return activeMassDrivers * this.massDriverShipEquivalency;
  }

  getActiveShipCount() {
    return super.getActiveShipCount() + this.getMassDriverContribution();
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.massDriverInfoSection && elements.massDriverInfoElement) {
      const enabled = this.isBooleanFlagSet('massDriverEnabled');
      if (enabled) {
        const buildingData = typeof buildings !== 'undefined' ? buildings?.massDriver : null;
        const active = buildingData?.active ?? 0;
        const formatter =
          typeof formatBuildingCount === 'function'
            ? formatBuildingCount
            : (typeof formatBigInteger === 'function'
              ? formatBigInteger
              : (value) => value);
        elements.massDriverInfoElement.textContent =
          `Active Mass Drivers: ${formatter(active)}`;
        elements.massDriverInfoSection.style.display = 'block';
      } else {
        elements.massDriverInfoSection.style.display = 'none';
      }
    }

    if (!elements.temperatureReductionElement) return;

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
    const activeShips = this.getActiveShipCount();
    if (
      activeShips <= 0 ||
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
        activeShips *
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

    const saveTempState =
      typeof terraforming.saveTemperatureState === 'function'
        ? terraforming.saveTemperatureState.bind(terraforming)
        : null;
    const restoreTempState =
      typeof terraforming.restoreTemperatureState === 'function'
        ? terraforming.restoreTemperatureState.bind(terraforming)
        : null;
    const snapshot = saveTempState ? saveTempState() : null;
    const canUpdateSurfaceTemperature = typeof terraforming.updateSurfaceTemperature === 'function';

    let newTemp = originalTemp;

    try {
      ghg.value = originalAmount - removal;
      if (canUpdateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      }
      newTemp = terraforming.temperature?.value ?? newTemp;
    } finally {
      ghg.value = originalAmount;
      if (snapshot && restoreTempState) {
        restoreTempState(snapshot);
      } else if (canUpdateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      }
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
