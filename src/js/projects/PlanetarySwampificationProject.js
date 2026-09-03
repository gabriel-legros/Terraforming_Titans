const PLANETARY_SWAMPIFICATION_LAND_SOURCE = 'planetarySwampification';

class PlanetarySwampificationProject extends UndergroundExpansionProject {
  getRawMaxRepeats() {
    return Math.max(1, super.getRawMaxRepeats());
  }

  getSegmentCount() {
    return this.getMaxRepeats();
  }

  shouldReportLandExpansion() {
    return false;
  }

  getScaledCost() {
    const cost = super.getScaledCost();
    return {
      ...cost,
      surface: {
        ...cost.surface,
        land: this.getTargetReservedLand() / this.getSegmentCount(),
      },
    };
  }

  isCostConsumed(category, resource) {
    return category !== 'surface' || resource !== 'land';
  }

  getProjectCostAvailableAmount(category, resource) {
    if (category === 'surface' && resource === 'land') {
      return resources.surface.land.getAvailableAmount();
    }
    return null;
  }

  isDynamicMassEnabled() {
    return false;
  }

  getAndroidSpeedTooltip() {
    return t(
      'ui.projects.planetarySwampification.androidSpeedTooltip',
      null,
      '1 + (androids assigned / 100)'
    );
  }

  getTargetReservedLand() {
    const share = Math.max(0, Math.min(1, this.attributes.landReservationShare || 0));
    return Math.max(0, resolveWorldGeometricLand(terraforming, resources.surface.land)) * share;
  }

  getReservedLand() {
    return resources.surface.land.getReservedAmountForSource(PLANETARY_SWAMPIFICATION_LAND_SOURCE) || 0;
  }

  hasSwampificationProgress() {
    return this.isCompleted
      || this.repeatCount > 0
      || this.fractionalRepeatCount > 0
      || this.hasCurrentSegmentProgress();
  }

  hasCurrentSegmentProgress() {
    if (this.isActive || this.isPaused) {
      return true;
    }
    return Number.isFinite(this.startingDuration)
      && Number.isFinite(this.remainingTime)
      && this.remainingTime < this.startingDuration;
  }

  syncLandReservation() {
    const segmentCount = this.getSegmentCount();
    let reservedSegments = this.isCompleted ? segmentCount : this.getTotalProgress();
    if (!this.isContinuous() && this.hasCurrentSegmentProgress()) {
      reservedSegments = Math.max(reservedSegments, (this.repeatCount || 0) + 1);
    }
    reservedSegments = Math.max(0, Math.min(segmentCount, reservedSegments));
    const reserved = this.getTargetReservedLand() * (reservedSegments / segmentCount);
    resources.surface.land.setReservedAmountForSource(PLANETARY_SWAMPIFICATION_LAND_SOURCE, reserved);
  }

  getContinuousProgressAllowance() {
    const remainingRepeats = super.getContinuousProgressAllowance();
    const segmentCount = this.getSegmentCount();
    const targetLand = this.getTargetReservedLand();
    if (!(targetLand > 0) || !(segmentCount > 0)) {
      return remainingRepeats;
    }

    const land = resources.surface.land;
    const availableWithOwnReservation = land.getAvailableAmount() + this.getReservedLand();
    const maximumReservedLand = Math.min(targetLand, availableWithOwnReservation);
    const maximumProgress = (maximumReservedLand / targetLand) * segmentCount;
    return Math.max(0, Math.min(
      remainingRepeats,
      maximumProgress - this.getTotalProgress()
    ));
  }

  applyContinuousProgress(progress) {
    const completed = super.applyContinuousProgress(progress);
    this.syncLandReservation();
    return completed;
  }

  canStart() {
    const segmentCount = this.getSegmentCount();
    if (this.isCompleted || this.repeatCount >= segmentCount || !super.canStart()) {
      return false;
    }
    const land = resources.surface.land;
    const availableWithOwnReservation = land.getAvailableAmount() + this.getReservedLand();
    const nextSegmentReservation = this.getTargetReservedLand()
      * (Math.min(segmentCount, this.repeatCount + 1) / segmentCount);
    return availableWithOwnReservation >= nextSegmentReservation;
  }

  start(resources) {
    const started = super.start(resources);
    if (started) {
      this.syncLandReservation();
    }
    return started;
  }

  complete() {
    super.complete();
    this.syncLandReservation();
  }

  resetSwampification() {
    const hadProgress = this.hasSwampificationProgress();
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.repeatCount = 0;
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
    this.shortfallLastTick = false;
    this.releaseAndroidAssignments();
    this.syncLandReservation();
    return hadProgress;
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.syncLandReservation();
  }

  renderUI(container) {
    super.renderUI(container);

    const section = document.createElement('div');
    section.classList.add('project-section-container');

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = t('ui.projects.planetarySwampification.reset', null, '');
    resetButton.addEventListener('click', () => {
      this.resetSwampification();
      updateProjectUI(this.name);
    });

    section.appendChild(resetButton);
    container.appendChild(section);
    projectElements[this.name] = {
      ...projectElements[this.name],
      swampificationResetButton: resetButton,
    };
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements?.swampificationResetButton) {
      return;
    }
    if (elements.repeatCountElement) {
      elements.repeatCountElement.textContent = t(
        'ui.projects.planetarySwampification.segmentsCompleted',
        {
          current: formatNumber(this.getTotalProgress(), true, 3),
          total: formatNumber(this.getSegmentCount(), true),
        },
        ''
      );
    }
    elements.swampificationResetButton.disabled = !this.hasSwampificationProgress();
  }

  loadState(state) {
    super.loadState(state);
    this.syncLandReservation();
  }

  cleanupForReset() {
    resources.surface.land.setReservedAmountForSource(PLANETARY_SWAMPIFICATION_LAND_SOURCE, 0);
  }
}

registerProjectConstructor('PlanetarySwampificationProject', PlanetarySwampificationProject);
