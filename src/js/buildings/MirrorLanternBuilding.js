let MirrorBase = typeof Building !== 'undefined' ? Building : null;
if (!MirrorBase && typeof require === 'function') {
  try {
    ({ Building: MirrorBase } = require('../building.js'));
  } catch (e) {}
}
if (!MirrorBase && typeof window !== 'undefined') {
  MirrorBase = window.Building;
}
if (!MirrorBase && typeof Building !== 'undefined') {
  MirrorBase = Building;
}
if (!MirrorBase) {
  MirrorBase = class {};
}

class MirrorLanternBuilding extends MirrorBase {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._baseProductivity = 1;
    this._assignmentShare = 1;
    this._allowFullProductivity = false;
  }

  _isEveryZoneAboveTrend() {
    const zones = ['tropical', 'temperate', 'polar'];
    if (!terraforming?.temperature?.zones) return false;
    return zones.every(zone => {
      const data = terraforming.temperature.zones[zone] || {};
      const temp = Number.isFinite(data.value) ? data.value : null;
      const trend = Number.isFinite(data.trendValue) ? data.trendValue : null;
      if (!Number.isFinite(temp) || !Number.isFinite(trend)) return false;
      return temp > trend - 0.001;
    });
  }

  _getAssignmentData(baseTarget) {
    const isMirror = this.name === 'spaceMirror';
    const isLantern = this.name === 'hyperionLantern';
    if (!isMirror && !isLantern) return null;
    if (this.active <= 0) {
      return { cap: 0, share: 0, allowFull: false };
    }

    const settings = mirrorOversightSettings;
    const oversightEnabled = projectManager?.projects?.spaceMirrorFacility?.isBooleanFlagSet?.('spaceMirrorFacilityOversight');
    if (!settings || !oversightEnabled) {
      return { cap: baseTarget, share: 1, allowFull: false };
    }

    const typeKey = isMirror ? 'mirrors' : 'lanterns';
    const useAssignments = settings.advancedOversight || settings.useFinerControls;
    let assignedCount = 0;
    const total = this.active;

    if (useAssignments) {
      // When applyToLantern is false, lanterns are treated as "Any Zone" (full productivity)
      if (isLantern && !settings.applyToLantern) {
        assignedCount = total;
      } else {
        const assigned = settings.assignments?.[typeKey] || {};
        assignedCount =
          (assigned.tropical || 0) +
          (assigned.temperate || 0) +
          (assigned.polar || 0) +
          (assigned.focus || 0) +
          (assigned.any || 0);
      }
    } else {
      const dist = settings.distribution || {};
      const assignedShare = 1 - (dist.unassigned || 0);
      // When applyToLantern is false, lanterns are treated as "Any Zone" (full productivity)
      const usableShare = isLantern && !settings.applyToLantern ? 1 : assignedShare;
      assignedCount = total * Math.max(0, Math.min(1, usableShare));
    }

    const assignmentShare = total > 0 ? Math.max(0, Math.min(1, assignedCount / total)) : 0;
    const allowFull =
      settings.advancedOversight &&
      settings.allowAvailableToHeat !== false &&
      !this._isEveryZoneAboveTrend();
    const capShare = allowFull ? 1 : assignmentShare;

    return {
      cap: Math.min(baseTarget, capShare),
      share: assignmentShare,
      allowFull,
    };
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget } = this.computeBaseProductivity(
      resources,
      deltaTime
    );
    this._baseProductivity = baseTarget;

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this._assignmentShare = 0;
      this._allowFullProductivity = false;
      return;
    }

    let targetProductivity = baseTarget;

    const assignmentData = this._getAssignmentData(baseTarget);
    if (assignmentData) {
      this._assignmentShare = assignmentData.share;
      this._allowFullProductivity = assignmentData.allowFull;
      targetProductivity = assignmentData.cap;
    } else {
      this._assignmentShare = 1;
      this._allowFullProductivity = false;
    }

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity += dampingFactor * (targetProductivity - this.productivity);
    }
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MirrorLanternBuilding };
} else if (typeof window !== 'undefined') {
  window.MirrorLanternBuilding = MirrorLanternBuilding;
}
