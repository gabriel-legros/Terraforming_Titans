class SpaceDisposalProject extends SpaceExportBaseProject {
  constructor(config, name) {
    super(config, name);
    this.massDriverEnabled = false;
    this.massDriverShipEquivalency = this.attributes.massDriverShipEquivalency ?? 10;
  }

  getExportRateLabel(baseLabel) {
    return 'Resource Disposal';
  }

  getCostRateLabel() {
    return 'Resource Disposal';
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
      infoContent.classList.add('assigned-ships-container');
      const infoLabel = document.createElement('span');
      infoLabel.textContent = 'Active Mass Drivers:';
      const labelSpacer = document.createTextNode(' ');
      const infoValue = document.createElement('span');
      infoValue.id = `${this.name}-active-mass-drivers`;
      infoContent.append(infoLabel, labelSpacer, infoValue);
      sectionContainer.appendChild(infoContent);

      const infoNote = document.createElement('p');
      infoNote.classList.add('project-description');
      infoNote.classList.add('mass-driver-note');
      infoNote.textContent = 'Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.';
      sectionContainer.appendChild(infoNote);

      container.appendChild(sectionContainer);

      projectElements[this.name] = {
        ...elements,
        massDriverInfoSection: sectionContainer,
        massDriverInfoElement: infoContent,
        massDriverCountElement: infoValue,
        massDriverInfoNoteElement: infoNote,
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
        const { buildings: globalBuildings, formatBuildingCount, formatBigInteger } = globalThis;
        const active = globalBuildings?.massDriver?.active ?? 0;
        const formatter =
          (formatBuildingCount instanceof Function && formatBuildingCount) ||
          (formatBigInteger instanceof Function && formatBigInteger) ||
          ((value) => value);
        if (elements.massDriverCountElement) {
          elements.massDriverCountElement.textContent = formatter(active);
        }
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

