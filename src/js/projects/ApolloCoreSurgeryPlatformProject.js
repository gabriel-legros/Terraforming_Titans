(function () {
  const CORE_SURGERY_ACTION_COST = 1e28;
  const CORE_SURGERY_BASE_DURATION = 60000;

  class ApolloCoreSurgeryPlatformProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.coreSurgeryActive = false;
      this.coreSurgeryRemainingTime = 0;
      this.coreSurgeryStartingDuration = this.getCoreSurgeryDuration();
      this.coreSurgeryAutoStart = false;
      this.uiElements = null;
    }

    isArtificialWorld() {
      return spaceManager.isArtificialWorld();
    }

    hasNaturalMagnetosphere() {
      return terraforming.celestialParameters.hasNaturalMagnetosphere === true;
    }

    isKesslerCleared() {
      return !hazardManager.parameters.kessler || hazardManager.kesslerHazard.isCleared();
    }

    isPulsarCleared() {
      return !hazardManager.parameters.pulsar
        || hazardManager.pulsarHazard.isCleared(terraforming, hazardManager.parameters.pulsar);
    }

    getSpecializationLockedText() {
      return '';
    }

    getCoreSurgeryDuration() {
      return Math.max(1, this.applyDurationEffects(CORE_SURGERY_BASE_DURATION));
    }

    getActivationBlockedReason() {
      if (!this.isCompleted) {
        return 'Complete the platform first';
      }
      if (this.coreSurgeryActive) {
        return 'Core surgery already in progress';
      }
      if (this.isArtificialWorld()) {
        return 'Only available on story and random worlds';
      }
      if (this.hasNaturalMagnetosphere()) {
        return 'World already has a natural magnetosphere';
      }
      if (!this.isKesslerCleared()) {
        return 'Clear Kessler Skies first';
      }
      if (!this.isPulsarCleared()) {
        return 'Clear Pulsar first';
      }
      if (resources.space.energy.value < CORE_SURGERY_ACTION_COST) {
        return 'Not enough space energy';
      }
      return '';
    }

    canStartCoreSurgery() {
      return !this.getActivationBlockedReason();
    }

    startCoreSurgery() {
      if (!this.canStartCoreSurgery()) {
        return false;
      }

      resources.space.energy.decrease(CORE_SURGERY_ACTION_COST);
      this.coreSurgeryActive = true;
      this.coreSurgeryStartingDuration = this.getCoreSurgeryDuration();
      this.coreSurgeryRemainingTime = this.coreSurgeryStartingDuration;
      return true;
    }

    applyNaturalMagnetosphere() {
      currentPlanetParameters.celestialParameters.hasNaturalMagnetosphere = true;
      terraforming.celestialParameters.hasNaturalMagnetosphere = true;
      terraforming.initialCelestialParameters.hasNaturalMagnetosphere = true;
      terraforming.magnetosphere.value = terraforming.magnetosphere.target;
      terraforming.booleanFlags.add('magneticShield');
      spaceManager.setCurrentWorldNaturalMagnetosphere(true);
    }

    completeCoreSurgery() {
      this.coreSurgeryActive = false;
      this.coreSurgeryRemainingTime = 0;
      this.coreSurgeryStartingDuration = this.getCoreSurgeryDuration();
      this.applyNaturalMagnetosphere();
    }

    updateDurationFromEffects() {
      super.updateDurationFromEffects();

      if (!this.coreSurgeryActive) {
        this.coreSurgeryStartingDuration = this.getCoreSurgeryDuration();
        return;
      }

      const previousDuration = this.coreSurgeryStartingDuration;
      const nextDuration = this.getCoreSurgeryDuration();
      if (!(previousDuration > 0)) {
        this.coreSurgeryStartingDuration = nextDuration;
        this.coreSurgeryRemainingTime = nextDuration;
        return;
      }

      const progress = (previousDuration - this.coreSurgeryRemainingTime) / previousDuration;
      this.coreSurgeryStartingDuration = nextDuration;
      this.coreSurgeryRemainingTime = Math.max(0, nextDuration * (1 - progress));
    }

    update(deltaTime) {
      super.update(deltaTime);

      if (!this.coreSurgeryActive) {
        if (this.coreSurgeryAutoStart && this.canStartCoreSurgery()) {
          this.startCoreSurgery();
        }
        return;
      }

      this.coreSurgeryRemainingTime -= deltaTime;
      if (this.coreSurgeryRemainingTime <= 0) {
        this.completeCoreSurgery();
      }
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = 'Core Surgery Controls';
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

      const createSummaryBox = (labelText) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const content = document.createElement('div');
        content.classList.add('project-summary-content');
        const value = document.createElement('span');
        value.classList.add('stat-value');
        content.appendChild(value);
        box.append(label, content);
        summaryGrid.appendChild(box);
        return value;
      };

      const costValue = createSummaryBox('Activation Cost');
      const durationValue = createSummaryBox('Surgery Time');
      const statusValue = createSummaryBox('Status');

      const actionWrapper = document.createElement('div');
      actionWrapper.style.position = 'relative';
      actionWrapper.style.width = '100%';
      actionWrapper.style.marginTop = '10px';

      const actionButton = document.createElement('button');
      actionButton.classList.add('progress-button');
      actionButton.style.width = '100%';
      actionButton.style.display = 'flex';
      actionButton.style.alignItems = 'center';
      actionButton.style.justifyContent = 'center';
      actionButton.style.paddingLeft = '36px';
      actionButton.style.paddingRight = '12px';

      const autoToggle = document.createElement('label');
      autoToggle.style.display = 'inline-flex';
      autoToggle.style.alignItems = 'center';
      autoToggle.style.justifyContent = 'center';
      autoToggle.style.cursor = 'pointer';
      autoToggle.style.position = 'absolute';
      autoToggle.style.left = '10px';
      autoToggle.style.top = '50%';
      autoToggle.style.transform = 'translateY(-50%)';
      autoToggle.style.zIndex = '1';

      const autoCheckbox = document.createElement('input');
      autoCheckbox.type = 'checkbox';
      autoCheckbox.setAttribute('aria-label', 'Automatically perform core surgery when possible');
      autoToggle.appendChild(autoCheckbox);

      const actionLabel = document.createElement('span');

      autoToggle.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      autoCheckbox.addEventListener('change', () => {
        this.coreSurgeryAutoStart = autoCheckbox.checked;
        if (this.coreSurgeryAutoStart && this.canStartCoreSurgery()) {
          this.startCoreSurgery();
        }
        updateProjectUI(this.name);
      });

      actionButton.append(autoToggle, actionLabel);
      actionButton.addEventListener('click', () => {
        if (!this.startCoreSurgery()) {
          return;
        }
        updateProjectUI(this.name);
      });

      actionWrapper.append(actionButton, autoToggle);
      body.append(summaryGrid, actionWrapper);
      card.appendChild(body);
      container.appendChild(card);

      this.uiElements = {
        costValue,
        durationValue,
        statusValue,
        actionButton,
        actionLabel,
        autoCheckbox
      };

      this.updateUI();
    }

    getStatusText() {
      if (this.coreSurgeryActive) {
        return `In progress (${Math.max(0, this.coreSurgeryRemainingTime / 1000).toFixed(2)}s left)`;
      }
      if (this.hasNaturalMagnetosphere()) {
        return 'Natural magnetosphere active';
      }
      if (!this.isCompleted) {
        return 'Platform incomplete';
      }
      const blockedReason = this.getActivationBlockedReason();
      return blockedReason ? blockedReason : 'Ready';
    }

    updateUI() {
      if (!this.uiElements) {
        return;
      }

      this.uiElements.costValue.textContent = `${formatNumber(CORE_SURGERY_ACTION_COST, true)} space energy`;
      this.uiElements.durationValue.textContent = formatSeconds(this.getCoreSurgeryDuration() / 1000);
      this.uiElements.statusValue.textContent = this.getStatusText();

      if (this.coreSurgeryActive) {
        this.uiElements.actionLabel.textContent = `Core Surgery in Progress (${Math.max(0, this.coreSurgeryRemainingTime / 1000).toFixed(2)}s)`;
      } else if (this.hasNaturalMagnetosphere()) {
        this.uiElements.actionLabel.textContent = 'Natural Magnetosphere Established';
      } else {
        this.uiElements.actionLabel.textContent = `Perform Core Surgery (${formatNumber(CORE_SURGERY_ACTION_COST, true)} space energy)`;
      }
      this.uiElements.actionButton.disabled = !this.canStartCoreSurgery();
      this.uiElements.autoCheckbox.checked = this.coreSurgeryAutoStart === true;
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        coreSurgeryAutoStart: this.coreSurgeryAutoStart === true
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'coreSurgeryAutoStart')) {
        this.coreSurgeryAutoStart = settings.coreSurgeryAutoStart === true;
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        coreSurgeryActive: this.coreSurgeryActive === true,
        coreSurgeryRemainingTime: this.coreSurgeryRemainingTime,
        coreSurgeryStartingDuration: this.coreSurgeryStartingDuration,
        coreSurgeryAutoStart: this.coreSurgeryAutoStart === true
      };
    }

    loadState(state = {}) {
      super.loadState(state);
      this.coreSurgeryActive = state.coreSurgeryActive === true;
      this.coreSurgeryRemainingTime = state.coreSurgeryRemainingTime || 0;
      this.coreSurgeryStartingDuration = state.coreSurgeryStartingDuration || this.getCoreSurgeryDuration();
      this.coreSurgeryAutoStart = state.coreSurgeryAutoStart === true;
    }

    saveTravelState() {
      return {
        ...super.saveTravelState(),
        coreSurgeryActive: this.coreSurgeryActive === true,
        coreSurgeryRemainingTime: this.coreSurgeryRemainingTime,
        coreSurgeryStartingDuration: this.coreSurgeryStartingDuration,
        coreSurgeryAutoStart: this.coreSurgeryAutoStart === true
      };
    }

    loadTravelState(state = {}) {
      super.loadTravelState(state);
      this.coreSurgeryActive = state.coreSurgeryActive === true;
      this.coreSurgeryRemainingTime = state.coreSurgeryRemainingTime || 0;
      this.coreSurgeryStartingDuration = state.coreSurgeryStartingDuration || this.getCoreSurgeryDuration();
      this.coreSurgeryAutoStart = state.coreSurgeryAutoStart === true;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApolloCoreSurgeryPlatformProject;
  } else {
    window.ApolloCoreSurgeryPlatformProject = ApolloCoreSurgeryPlatformProject;
  }
}());
