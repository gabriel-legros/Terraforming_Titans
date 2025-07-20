class AndroidProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.assignedAndroids = 0;
    this.autoAssignAndroids = false;
    this.assignmentMultiplier = 1;
  }

  adjustActiveDuration() {
    if (this.isActive) {
      const newDuration = this.getEffectiveDuration();
      const progressRatio = (this.startingDuration - this.remainingTime) / this.startingDuration;
      this.startingDuration = newDuration;
      this.remainingTime = newDuration * (1 - progressRatio);
    }
  }

  assignAndroids(count) {
    const available = Math.floor(resources.colony.androids.value);
    this.assignedAndroids = this.assignedAndroids || 0;
    const adjusted = Math.max(-this.assignedAndroids, Math.min(count, available));
    this.assignedAndroids += adjusted;
    resources.colony.androids.value -= adjusted;
    this.adjustActiveDuration();
    if (typeof updateProjectUI === 'function') {
      updateProjectUI(this.name);
    }
  }

  getAndroidSpeedMultiplier() {
    const maxDeposits = currentPlanetParameters.resources.underground.ore.maxDeposits || 1;
    return 1 + Math.sqrt(this.assignedAndroids / maxDeposits);
  }

  getBaseDuration() {
    if (this.isBooleanFlagSet('androidAssist')) {
      const multiplier = this.getAndroidSpeedMultiplier();
      if (multiplier > 1) {
        return this.duration / multiplier;
      }
    }
    return super.getBaseDuration();
  }

  canStart() {
    if (this.isBooleanFlagSet('androidAssist') && this.assignedAndroids === 0) {
      return false;
    }
    return super.canStart();
  }

  createAndroidAssignmentUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = 'Androids';
    sectionContainer.appendChild(title);

    const assignmentContainer = document.createElement('div');
    assignmentContainer.classList.add('spaceship-assignment-container');

    const assignedAndAvailableContainer = document.createElement('div');
    assignedAndAvailableContainer.classList.add('assigned-and-available-container');

    const assignedContainer = document.createElement('div');
    assignedContainer.classList.add('assigned-ships-container');
    const assignedLabel = document.createElement('span');
    assignedLabel.textContent = 'Assigned:';
    const assignedDisplay = document.createElement('span');
    assignedDisplay.id = `${this.name}-assigned-androids`;
    assignedContainer.append(assignedLabel, assignedDisplay);

    const availableContainer = document.createElement('div');
    availableContainer.classList.add('available-ships-container');
    const availableLabel = document.createElement('span');
    availableLabel.textContent = 'Available:';
    const availableDisplay = document.createElement('span');
    availableDisplay.id = `${this.name}-available-androids`;
    availableContainer.append(availableLabel, availableDisplay);

    assignedAndAvailableContainer.append(assignedContainer, availableContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');

    const createButton = (text, onClick, parent = buttonsContainer) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', onClick);
      parent.appendChild(button);
      return button;
    };

    const mainButtons = document.createElement('div');
    mainButtons.classList.add('main-buttons');
    buttonsContainer.appendChild(mainButtons);

    createButton('0', () => this.assignAndroids(-this.assignedAndroids), mainButtons);
    const minusButton = createButton(`-${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignAndroids(-this.assignmentMultiplier), mainButtons);
    const plusButton = createButton(`+${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignAndroids(this.assignmentMultiplier), mainButtons);
    createButton('Max', () => this.assignAndroids(Math.floor(resources.colony.androids.value)), mainButtons);

    const multiplierContainer = document.createElement('div');
    multiplierContainer.classList.add('multiplier-container');
    buttonsContainer.appendChild(multiplierContainer);

    createButton('/10', () => {
      this.assignmentMultiplier = Math.max(1, this.assignmentMultiplier / 10);
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);
    createButton('x10', () => {
      this.assignmentMultiplier *= 10;
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);

    const speedDisplay = document.createElement('div');
    speedDisplay.id = `${this.name}-android-speed`;
    speedDisplay.title = '1 + sqrt(androids assigned / ore veins max deposits)';
    multiplierContainer.appendChild(speedDisplay);

    assignmentContainer.append(assignedAndAvailableContainer, buttonsContainer);
    sectionContainer.appendChild(assignmentContainer);
    sectionContainer.id = `${this.name}-android-assignment`;
    sectionContainer.style.display = this.isBooleanFlagSet('androidAssist') ? 'block' : 'none';
    container.appendChild(sectionContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      assignedAndroidsDisplay: assignedDisplay,
      availableAndroidsDisplay: availableDisplay,
      androidAssignmentContainer: sectionContainer,
      androidSpeedDisplay: speedDisplay,
    };
  }

  renderUI(container) {
    this.createAndroidAssignmentUI(container);
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    if (elements.androidAssignmentContainer) {
      elements.androidAssignmentContainer.style.display = this.isBooleanFlagSet('androidAssist') ? 'block' : 'none';
    }
    if (elements.assignedAndroidsDisplay) {
      elements.assignedAndroidsDisplay.textContent = formatBigInteger(this.assignedAndroids);
    }
    if (elements.availableAndroidsDisplay) {
      elements.availableAndroidsDisplay.textContent = formatBigInteger(Math.floor(resources.colony.androids.value));
    }
    if (elements.androidSpeedDisplay) {
      const mult = this.getAndroidSpeedMultiplier();
      elements.androidSpeedDisplay.textContent = `Deepening speed boost x${formatNumber(mult, true)}`;
    }
  }

  autoAssign() {
    if (!this.autoAssignAndroids) return;
    const available = Math.floor(resources.colony.androids.value);
    if (available > 0) {
      this.assignAndroids(available);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      assignedAndroids: this.assignedAndroids,
      autoAssignAndroids: this.autoAssignAndroids,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.assignedAndroids = state.assignedAndroids || 0;
    this.autoAssignAndroids = state.autoAssignAndroids || 0;
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.AndroidProject = AndroidProject;
}

if (typeof module !== 'undefined') {
  module.exports = AndroidProject;
}
