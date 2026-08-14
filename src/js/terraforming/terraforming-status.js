registerTerraformingMethods('status', ({
  calculateTerraformingTargetCoverage,
  getEffectiveLifeFraction,
  getLifeBiomassDensity,
  getLifeBiomassDensityTarget,
  isLiquidCoverageTargetMet
}) => ({
  getMagnetosphereStatus() {
    if (this.magnetosphere.value >= this.magnetosphere.target) {
      return true;
    }
    if (this.isBooleanFlagSet('magneticShield')) {
      return true;
    }
    if (projectManager?.projects?.artificialSky?.isCompleted) {
      return true;
    }
    return false;
  },
  getTemperatureStatus() {
    return this.temperature.value >= this.temperature.targetMin && this.temperature.value <= this.temperature.targetMax;
  },
  getAtmosphereStatus() {
    const pressureTarget = this.atmosphere.totalPressureTargetRangeKPa;
    const totalPressureKPa = this.calculateTotalPressure();
    const totalPressureOk = !pressureTarget || totalPressureKPa >= pressureTarget.min && totalPressureKPa <= pressureTarget.max;
    for (const gas in this.gasTargets) {
      const gasAmount = this.resources.atmospheric[gas]?.value || 0;
      const gasPressurePa = calculateAtmosphericPressure(gasAmount, this.celestialParameters.gravity, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
      const target = this.gasTargets[gas];
      if (gasPressurePa < target.min || gasPressurePa > target.max) {
        return false;
      }
    }
    return totalPressureOk;
  },
  getWaterStatus() {
    for (const entry of this.liquidCoverageTargets) {
      const currentCoverage = calculateTerraformingTargetCoverage(this, entry.coverageKey);
      if (!isLiquidCoverageTargetMet(entry, currentCoverage)) {
        return false;
      }
    }
    return true;
  },
  getLuminosityStatus() {
    const objectiveFlux = this.calculateSurfaceSolarFlux();
    return objectiveFlux >= this.luminosity.targetMin && objectiveFlux <= this.luminosity.targetMax;
  },
  getLifeStatus() {
    const densityTarget = getLifeBiomassDensityTarget(this);
    if (densityTarget > 0) {
      return getLifeBiomassDensity(this) >= densityTarget;
    }
    // Compare average biomass coverage to the global target
    return calculateAverageCoverage(this, 'biomass') >= getEffectiveLifeFraction(this);
  },
  getHazardClearanceStatus() {
    if (!this.requirements.requireHazardClearance) {
      return true;
    }
    try {
      return hazardManager.getHazardClearanceStatus(this);
    } catch (error) {
      // Fall back to direct hazardous biomass checks when hazard manager is unavailable.
    }
    const tolerance = 1e-6;
    for (const zone of getZones()) {
      if ((this.zonalSurface.hazardousBiomass[zone] || 0) > tolerance) {
        return false;
      }
    }
    return true;
  },
  getOtherRequirementStatuses() {
    const statuses = [];
    const list = this.requirements.otherRequirements || [];
    for (let index = 0; index < list.length; index += 1) {
      const requirement = list[index];
      if (!requirement || !requirement.type) {
        continue;
      }
      if (requirement.type === 'projectCompletion') {
        const projectId = requirement.projectId;
        const project = projectManager && projectManager.projects ? projectManager.projects[projectId] : null;
        const label = requirement.labelKey ? t(requirement.labelKey, null, requirement.label || project?.displayName || projectId || 'Project') : requirement.label || project?.displayName || projectId || 'Project';
        const complete = !!(project && (typeof project.isComplete === 'function' ? project.isComplete() : project.isCompleted));
        statuses.push({
          key: `project:${projectId}`,
          label,
          passed: complete,
          targetText: requirement.targetTextKey ? t(requirement.targetTextKey, null, requirement.targetText || `Complete ${label}.`) : requirement.targetText || `Complete ${label}.`,
          buttonText: requirement.buttonTextKey ? t(requirement.buttonTextKey, null, requirement.buttonText || `Complete ${label} first`) : requirement.buttonText,
          currentText: complete ? 'Completed' : 'Not completed'
        });
        continue;
      }
      if (requirement.type === 'fullyControlledSectors') {
        const required = Math.max(0, requirement.minimum || 0);
        const controlled = galaxyManager?.getUhfControlledSectors?.()?.length || 0;
        statuses.push({
          key: 'sectors',
          label: requirement.labelKey ? t(requirement.labelKey, null, requirement.label || 'Controlled Sectors') : requirement.label || 'Controlled Sectors',
          passed: controlled >= required,
          targetText: requirement.targetTextKey ? t(requirement.targetTextKey, {
            value: required
          }, requirement.targetText || `Reach ${required} fully controlled sectors.`) : requirement.targetText || `Reach ${required} fully controlled sectors.`,
          currentText: `${controlled}/${required}`
        });
        continue;
      }
      if (requirement.type === 'gravityMinimum') {
        const minimum = Math.max(0, requirement.minimum || 0);
        const gravity = Number.isFinite(this.celestialParameters?.gravity) ? this.celestialParameters.gravity : 0;
        statuses.push({
          key: `gravityMinimum:${minimum}`,
          label: requirement.labelKey ? t(requirement.labelKey, null, requirement.label || 'Gravity') : requirement.label || 'Gravity',
          passed: gravity >= minimum,
          targetText: requirement.targetTextKey ? t(requirement.targetTextKey, {
            value: minimum
          }, requirement.targetText || `Reach at least ${minimum} m/s² gravity.`) : requirement.targetText || `Reach at least ${minimum} m/s² gravity.`,
          currentText: `${gravity.toFixed(2)}/${minimum.toFixed(2)} m/s²`
        });
        continue;
      }
      if (requirement.type === 'coverageMinimum') {
        const minimum = Math.max(0, Math.min(requirement.minimum || 0, 1));
        const coverageKey = requirement.coverageKey || '';
        const coverage = calculateTerraformingTargetCoverage(this, coverageKey);
        statuses.push({
          key: `coverageMinimum:${coverageKey}`,
          label: requirement.labelKey ? t(requirement.labelKey, null, requirement.label || coverageKey || 'Coverage') : requirement.label || coverageKey || 'Coverage',
          passed: coverage >= minimum,
          targetText: requirement.targetTextKey ? t(requirement.targetTextKey, null, requirement.targetText || `Reach at least ${(minimum * 100).toFixed(0)}% coverage.`) : requirement.targetText || `Reach at least ${(minimum * 100).toFixed(0)}% coverage.`,
          currentText: `${(coverage * 100).toFixed(2)}%`
        });
        continue;
      }
      if (requirement.type === 'rotationPeriodMinimum') {
        const minimumHours = Math.max(0, requirement.minimumHours || 0);
        const rotationHours = Math.abs(this.celestialParameters?.dayNightPeriod || 0);
        statuses.push({
          key: `rotationPeriodMinimum:${minimumHours}`,
          label: requirement.labelKey ? t(requirement.labelKey, null, requirement.label || 'Day-Night Cycle') : requirement.label || 'Day-Night Cycle',
          passed: rotationHours >= minimumHours,
          targetText: requirement.targetTextKey ? t(requirement.targetTextKey, null, requirement.targetText || `Reach a day-night cycle of at least ${(minimumHours / 24).toFixed(0)} days.`) : requirement.targetText || `Reach a day-night cycle of at least ${(minimumHours / 24).toFixed(0)} days.`,
          currentText: `${(rotationHours / 24).toFixed(2)} days`
        });
        continue;
      }
    }
    return statuses;
  },
  getOtherRequirementsStatus() {
    const statuses = this.getOtherRequirementStatuses();
    for (let i = 0; i < statuses.length; i += 1) {
      if (!statuses[i].passed) {
        return false;
      }
    }
    return true;
  },
  getOthersStatus() {
    return this.getMagnetosphereStatus() && this.getOtherRequirementsStatus();
  },
  getTerraformingStatus() {
    return this.getTemperatureStatus() && this.getAtmosphereStatus() && this.getWaterStatus() && this.getLuminosityStatus() && this.getLifeStatus() && this.getHazardClearanceStatus() && this.getOthersStatus();
  },
  applyRequirementEffects() {
    const effects = this.requirements.appliedEffects || [];
    for (let index = 0; index < effects.length; index += 1) {
      const baseEffect = effects[index];
      if (!baseEffect || !baseEffect.type || !baseEffect.target) {
        continue;
      }
      addEffect({
        ...baseEffect,
        effectId: baseEffect.effectId || `terraforming-requirement-${this.requirementId}-${index}`,
        sourceId: baseEffect.sourceId || `terraforming-requirement-${this.requirementId}`
      });
    }
  }
}));
