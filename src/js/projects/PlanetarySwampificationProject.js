const PLANETARY_SWAMPIFICATION_LAND_SOURCE = 'planetarySwampification';

class PlanetarySwampificationProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    this.maxRepeatCount = this.getSegmentCount();
  }

  getSegmentCount() {
    const geometricLand = Math.max(
      0,
      resolveWorldGeometricLand(terraforming, resources.surface.land)
    );
    return Math.max(1, Math.floor(geometricLand));
  }

  syncSegmentLimit() {
    const segmentCount = this.getSegmentCount();
    this.maxRepeatCount = segmentCount;
    this.repeatCount = Math.max(0, Math.min(segmentCount, this.repeatCount || 0));
    this.isCompleted = this.repeatCount >= segmentCount;
    return segmentCount;
  }

  isContinuous() {
    return false;
  }

  getAndroidSpeedMultiplier() {
    return 1 + ((this.assignedAndroids || 0) / 100);
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
    return this.isCompleted || this.repeatCount > 0 || this.hasCurrentSegmentProgress();
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
    const reservedSegments = this.isCompleted
      ? segmentCount
      : Math.max(0, Math.min(
        segmentCount,
        (this.repeatCount || 0) + (this.hasCurrentSegmentProgress() ? 1 : 0)
      ));
    const reserved = this.getTargetReservedLand() * (reservedSegments / segmentCount);
    resources.surface.land.setReservedAmountForSource(PLANETARY_SWAMPIFICATION_LAND_SOURCE, reserved);
  }

  canStart() {
    const segmentCount = this.syncSegmentLimit();
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
    const segmentCount = this.getSegmentCount();
    this.repeatCount = Math.min(segmentCount, this.repeatCount + 1);
    this.isCompleted = this.repeatCount >= segmentCount;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = this.isCompleted ? 0 : this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
    this.syncLandReservation();
  }

  resetSwampification() {
    const hadProgress = this.hasSwampificationProgress();
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.repeatCount = 0;
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
    this.shortfallLastTick = false;
    this.releaseAndroidAssignments();
    this.syncLandReservation();
    return hadProgress;
  }

  update(deltaTime) {
    this.syncSegmentLimit();
    super.update(deltaTime);
    this.syncLandReservation();
  }

  renderUI(container) {
    super.renderUI(container);

    const section = document.createElement('div');
    section.classList.add('project-section-container');

    const reservedLand = document.createElement('p');
    reservedLand.classList.add('no-margin');

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = t('ui.projects.planetarySwampification.reset', null, '');
    resetButton.addEventListener('click', () => {
      this.resetSwampification();
      updateProjectUI(this.name);
    });

    section.append(reservedLand, resetButton);
    container.appendChild(section);
    projectElements[this.name] = {
      ...projectElements[this.name],
      swampificationReservedLand: reservedLand,
      swampificationResetButton: resetButton,
    };
  }

  updateUI() {
    this.syncSegmentLimit();
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements?.swampificationReservedLand) {
      return;
    }
    elements.swampificationReservedLand.textContent = t(
      'ui.projects.planetarySwampification.landReserved',
      {
        current: formatNumber(this.getReservedLand(), true, 3),
        target: formatNumber(this.getTargetReservedLand(), true, 3),
      },
      ''
    );
    if (elements.repeatCountElement) {
      elements.repeatCountElement.textContent = t(
        'ui.projects.planetarySwampification.segmentsCompleted',
        {
          current: formatNumber(this.repeatCount, true),
          total: formatNumber(this.getSegmentCount(), true),
        },
        ''
      );
    }
    elements.swampificationResetButton.disabled = !this.hasSwampificationProgress();
  }

  loadState(state) {
    this.maxRepeatCount = this.getSegmentCount();
    super.loadState(state);
    this.syncSegmentLimit();
    this.syncLandReservation();
  }

  cleanupForReset() {
    resources.surface.land.setReservedAmountForSource(PLANETARY_SWAMPIFICATION_LAND_SOURCE, 0);
  }
}

registerProjectConstructor('PlanetarySwampificationProject', PlanetarySwampificationProject);
