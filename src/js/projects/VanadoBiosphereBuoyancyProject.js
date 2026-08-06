class VanadoBiosphereBuoyancyProject extends Project {
  shouldHideStartBar() {
    return true;
  }

  canStart() {
    return false;
  }

  isRelevantToCurrentPlanet() {
    return terraforming.requirementId === 'vanadophore';
  }

  getAerostatSupport() {
    if (!this.isRelevantToCurrentPlanet()) {
      return 0;
    }

    const biomassSupport = Math.floor(
      Math.max(0, resources.surface.biomass.value) /
      this.attributes.biomassPerAerostat
    );
    return Math.min(
      this.attributes.maximumSupport,
      Math.max(this.attributes.minimumSupport, biomassSupport)
    );
  }

  renderUI(container) {
    const support = document.createElement('p');
    support.classList.add('project-resource-gain');
    const label = document.createElement('strong');
    label.textContent = t(
      'ui.projects.vanadoBiosphereBuoyancy.supportLabel',
      null,
      'Aerostat support:'
    );
    const value = document.createElement('span');
    support.append(label, ' ', value);
    container.appendChild(support);
    this.supportValueElement = value;
    this.updateUI();
  }

  updateUI() {
    if (!this.supportValueElement) {
      return;
    }
    this.supportValueElement.textContent = formatNumber(
      this.getAerostatSupport(),
      true
    );
  }
}

window.VanadoBiosphereBuoyancyProject = VanadoBiosphereBuoyancyProject;
