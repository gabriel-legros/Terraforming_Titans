const IMPORT_CAP_BASE = 1e9;
const IMPORT_CAP_WARP = 1e11;
const IMPORT_CAP_PER_SECTOR = 1e11;
const IMPORT_CAP_RESOURCES = [
  { key: 'metal', label: 'Metal' },
  { key: 'silicon', label: 'Silicon' },
  { key: 'carbon', label: 'Carbon' },
  { key: 'water', label: 'Water' },
  { key: 'nitrogen', label: 'Nitrogen' },
];

class ImportCapManager {
  constructor() {
    this.warpGateUnlocked = false;
    this.galaxyUnlocked = false;
    this.breakdownCache = this.createEmptyBreakdown();
    this.breakdownDirty = true;
    this.controlCacheVersion = -1;
  }

  createEmptyBreakdown() {
    const resources = {};
    IMPORT_CAP_RESOURCES.forEach(({ key }) => {
      resources[key] = {
        richCount: 0,
        poorCount: 0,
        normalCount: 0,
        cap: 0,
      };
    });
    return { fullControlCount: 0, resources };
  }

  syncUnlocks() {
    this.warpGateUnlocked = warpGateCommand.enabled === true;
    this.galaxyUnlocked = galaxyManager.enabled === true;
  }

  syncGalaxyCache() {
    const version = galaxyManager.getControlledSectorCacheVersion();
    if (version !== this.controlCacheVersion) {
      this.controlCacheVersion = version;
      this.breakdownDirty = true;
    }
  }

  setWarpGateUnlocked(value) {
    this.warpGateUnlocked = value === true;
  }

  setGalaxyUnlocked(value) {
    this.galaxyUnlocked = value === true;
  }

  getCapForProject(project) {
    return this.getCapForResource(project.attributes.importCapResource);
  }

  getCapForResource(resourceKey) {
    this.syncUnlocks();
    if (resourceKey === 'hydrogen') {
      return Infinity;
    }
    if (!this.warpGateUnlocked) {
      return IMPORT_CAP_BASE;
    }
    if (!this.galaxyUnlocked) {
      return IMPORT_CAP_WARP;
    }
    return this.getGalaxyCap(resourceKey);
  }

  getGalaxyCap(resourceKey) {
    const summary = this.getGalaxyResourceSummary(resourceKey);
    if (summary.fullControlCount <= 0) {
      return IMPORT_CAP_PER_SECTOR;
    }
    return summary.cap;
  }

  getCapSummaryText() {
    this.syncUnlocks();
    if (!this.warpGateUnlocked) {
      return 'Due to limited deposits, most resources can only be assigned 1B ships.';
    }
    if (!this.galaxyUnlocked) {
      return 'Due to limited deposits in the accessible Warp Gate Network, most resources can only be assigned 10B ships.';
    }
    return this.getGalaxyCapText();
  }

  getGalaxyCapText() {
    const summary = this.getGalaxyBreakdown();
    const lines = [
      'Import caps scale with fully controlled sectors.',
      `Base cap: ${formatNumber(IMPORT_CAP_PER_SECTOR, true)} ships per fully controlled sector (minimum 1 sector).`,
      'Rich sectors add +100% for that resource; poor sectors cut -50%.',
      `Fully controlled sectors: ${summary.fullControlCount}.`,
    ];

    IMPORT_CAP_RESOURCES.forEach(({ key, label }) => {
      const entry = summary.resources[key];
      const cap = summary.fullControlCount > 0 ? entry.cap : IMPORT_CAP_PER_SECTOR;
      const detail = summary.fullControlCount > 0
        ? `${label}: ${formatNumber(cap, true)} ships (${entry.richCount} rich, ${entry.poorCount} poor, ${entry.normalCount} normal)`
        : `${label}: ${formatNumber(cap, true)} ships (minimum cap)`;
      lines.push(detail);
    });

    lines.push('Hydrogen: no cap.');
    return lines.join('\n');
  }

  getGalaxyBreakdown() {
    this.syncGalaxyCache();
    if (!this.breakdownDirty) {
      return this.breakdownCache;
    }

    const summary = this.createEmptyBreakdown();
    const sectors = galaxyManager.getUhfControlledSectors();
    summary.fullControlCount = sectors.length;
    for (let index = 0; index < sectors.length; index += 1) {
      const sector = sectors[index];
      const richResource = sector.getRichResource();
      const poorResources = sector.getPoorResources();
      IMPORT_CAP_RESOURCES.forEach(({ key }) => {
        const entry = summary.resources[key];
        if (richResource === key) {
          entry.richCount += 1;
          return;
        }
        if (poorResources.includes(key)) {
          entry.poorCount += 1;
          return;
        }
        entry.normalCount += 1;
      });
    }

    IMPORT_CAP_RESOURCES.forEach(({ key }) => {
      const entry = summary.resources[key];
      entry.cap = (entry.normalCount + (entry.richCount * 2) + (entry.poorCount * 0.5)) * IMPORT_CAP_PER_SECTOR;
    });

    this.breakdownCache = summary;
    this.breakdownDirty = false;
    return this.breakdownCache;
  }

  getGalaxyResourceSummary(resourceKey) {
    const summary = this.getGalaxyBreakdown();
    return {
      fullControlCount: summary.fullControlCount,
      ...summary.resources[resourceKey],
    };
  }
}

window.ImportCapManager = ImportCapManager;
