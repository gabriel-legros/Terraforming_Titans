const IMPORT_CAP_BASE = 1e9;
const IMPORT_CAP_WARP = 1e10;
const IMPORT_CAP_PER_SECTOR = 1e10;
const WARP_GATE_MAX_LEVEL = 1000000;
const IMPORT_CAP_RATIOS = {
  metal: 1,
  nitrogen: 1,
  carbon: 2,
  silicon: 5,
  water: 10,
};
const IMPORT_CAP_MULTIPLIERS = {
  metal: 1,
  nitrogen: 1,
  carbon: 1,
  silicon: 1,
  water: 1,
};
const IMPORT_CAP_RESOURCES = [
  { key: 'metal', label: 'Metal' },
  { key: 'nitrogen', label: 'Nitrogen' },
  { key: 'carbon', label: 'CO2' },
  { key: 'silicon', label: 'Silicates' },
  { key: 'water', label: 'Water' },
];

const getImportCapRatio = (resourceKey) => (
  (IMPORT_CAP_RATIOS[resourceKey] || 1) * (IMPORT_CAP_MULTIPLIERS[resourceKey] || 1)
);

const formatImportCapList = (baseCap) => (
  IMPORT_CAP_RESOURCES.map(({ key, label }) => {
    const cap = baseCap * getImportCapRatio(key);
    return `${label}: ${formatNumber(cap, true)}`;
  }).join(', ')
);

const getImportRatioSummary = () => (
  'Ratios: Metal x1, Nitrogen x1, CO2 x2, Silicates x5, Water x10.'
);

const getImportCapEntries = (baseCap, summary, fallbackDetail) => (
  IMPORT_CAP_RESOURCES.map(({ key, label }) => {
    const ratio = getImportCapRatio(key);
    const base = baseCap * ratio;
    const entry = summary ? summary.resources[key] : null;
    const useEntry = summary && summary.fullControlCount > 0;
    const cap = useEntry ? entry.cap : base;
    const detail = useEntry
      ? `${entry.richCount} rich, ${entry.poorCount} poor, ${entry.normalCount} normal`
      : fallbackDetail;
    return {
      key,
      label,
      ratio: `x${ratio}`,
      cap: formatNumber(cap, true),
      detail,
    };
  })
);

class WarpGateNetworkManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages warp gate network growth and import caps.' });
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

  update(deltaMs) {
    if (!this.isBooleanFlagSet('warpGateFabrication')) {
      return;
    }
    if (!galaxyManager.enabled) {
      return;
    }
    const deltaHours = deltaMs / 3600000;
    const sectors = galaxyManager.getUhfControlledSectors();
    let levelChanged = false;
    for (let index = 0; index < sectors.length; index += 1) {
      const sector = sectors[index];
      const worldCount = galaxyManager.getTerraformedWorldCountForSector(sector);
      if (!(worldCount > 0)) {
        continue;
      }
      let level = sector.warpGateNetworkLevel || 0;
      let progress = sector.warpGateNetworkProgress || 0;
      if (level >= WARP_GATE_MAX_LEVEL) {
        sector.warpGateNetworkProgress = 0;
        continue;
      }
      progress += deltaHours * worldCount;
      let required = level + 1;
      while (progress >= required && level < WARP_GATE_MAX_LEVEL) {
        progress -= required;
        level += 1;
        required = level + 1;
        levelChanged = true;
      }
      if (level >= WARP_GATE_MAX_LEVEL) {
        level = WARP_GATE_MAX_LEVEL;
        progress = 0;
      }
      sector.warpGateNetworkLevel = level;
      sector.warpGateNetworkProgress = progress;
    }
    if (levelChanged) {
      this.breakdownDirty = true;
    }
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    if (effect.flagId === 'warpGateFabrication') {
      this.breakdownDirty = true;
    }
  }

  applyImportCapMultiplier(effect) {
    const key = effect.resourceKey;
    IMPORT_CAP_MULTIPLIERS[key] = effect.value;
    this.breakdownDirty = true;
  }

  getFoundryMetalCapBonus() {
    try {
      const count = spaceManager.getFoundryWorldCount({ excludeCurrent: true });
      return { count, bonus: count * 1e12 };
    } catch (error) {
      return { count: 0, bonus: 0 };
    }
  }

  getCapForProject(project) {
    return this.getCapForResource(project.attributes.importCapResource);
  }

  getCapForResource(resourceKey) {
    this.syncUnlocks();
    if (resourceKey === 'hydrogen') {
      return Infinity;
    }
    const foundryBonus = resourceKey === 'metal'
      ? this.getFoundryMetalCapBonus().bonus
      : 0;
    if (!this.warpGateUnlocked) {
      return IMPORT_CAP_BASE * getImportCapRatio(resourceKey) + foundryBonus;
    }
    if (!this.galaxyUnlocked) {
      return IMPORT_CAP_WARP * getImportCapRatio(resourceKey) + foundryBonus;
    }
    return this.getGalaxyCap(resourceKey) + foundryBonus;
  }

  getGalaxyCap(resourceKey) {
    const summary = this.getGalaxyResourceSummary(resourceKey);
    if (summary.fullControlCount <= 0) {
      return IMPORT_CAP_PER_SECTOR * getImportCapRatio(resourceKey);
    }
    return summary.cap;
  }

  getCapSummaryText() {
    this.syncUnlocks();
    const foundry = this.getFoundryMetalCapBonus();
    const foundryLine = foundry.bonus > 0
      ? ` Foundry worlds add +${formatNumber(foundry.bonus, true)} to the Metal cap.`
      : '';
    if (!this.warpGateUnlocked) {
      return `Due to limited deposits, import caps are ${formatImportCapList(IMPORT_CAP_BASE)} ships.${foundryLine}`;
    }
    if (!this.galaxyUnlocked) {
      return `Due to limited deposits in the accessible Warp Gate Network, import caps are ${formatImportCapList(IMPORT_CAP_WARP)} ships.${foundryLine}`;
    }
    return `${this.getGalaxyCapText()}${foundryLine}`;
  }

  getCapSummaryData() {
    this.syncUnlocks();
    const foundry = this.getFoundryMetalCapBonus();
    const foundryRule = foundry.bonus > 0
      ? `Foundry worlds: +${formatNumber(foundry.bonus, true)} Metal cap (${foundry.count} worlds).`
      : '';
    if (!this.warpGateUnlocked) {
      return {
        intro: 'Due to limited deposits, imports are limited until Warp Gate Command is unlocked.',
        baseCapLine: `Base cap: ${formatNumber(IMPORT_CAP_BASE, true)} ships.`,
        ratiosLine: '',
        ruleLines: foundryRule ? [foundryRule] : [],
        fullControlLine: '',
        caps: getImportCapEntries(IMPORT_CAP_BASE, null, 'Base cap'),
        hydrogen: { label: 'Hydrogen', ratio: '—', cap: '∞', detail: 'No cap' },
      };
    }
    if (!this.galaxyUnlocked) {
      return {
        intro: 'Warp Gate Command expands shipments before galaxy control is available.',
        baseCapLine: `Base cap: ${formatNumber(IMPORT_CAP_WARP, true)} ships.`,
        ratiosLine: '',
        ruleLines: foundryRule ? [foundryRule] : [],
        fullControlLine: '',
        caps: getImportCapEntries(IMPORT_CAP_WARP, null, 'Base cap'),
        hydrogen: { label: 'Hydrogen', ratio: '—', cap: '∞', detail: 'No cap' },
      };
    }
    const summary = this.getGalaxyBreakdown();
    const baseLine = `Base cap: ${formatNumber(IMPORT_CAP_PER_SECTOR, true)} ships per fully controlled sector (minimum 1 sector).`;
    const fullControlLine = `Fully controlled sectors: ${summary.fullControlCount}.`;
    return {
      intro: 'Import caps scale with fully controlled sectors.',
      baseCapLine: baseLine,
      ratiosLine: '',
      ruleLines: [
        'Rich sectors add +100% for that resource; poor sectors cut -50%.',
        'Warp Gate Network levels add +10% cap per level.',
        ...(foundryRule ? [foundryRule] : []),
      ],
      fullControlLine,
      caps: getImportCapEntries(IMPORT_CAP_PER_SECTOR, summary, 'Minimum cap'),
      hydrogen: { label: 'Hydrogen', ratio: '—', cap: '∞', detail: 'No cap' },
    };
  }

  getGalaxyCapText() {
    const summary = this.getGalaxyBreakdown();
    const lines = [
      'Import caps scale with fully controlled sectors.',
      `Base cap: ${formatNumber(IMPORT_CAP_PER_SECTOR, true)} ships per fully controlled sector (minimum 1 sector).`,
      getImportRatioSummary(),
      'Rich sectors add +100% for that resource; poor sectors cut -50%.',
      'Warp Gate Network levels add +10% cap per level.',
      `Fully controlled sectors: ${summary.fullControlCount}.`,
    ];

    IMPORT_CAP_RESOURCES.forEach(({ key, label }) => {
      const entry = summary.resources[key];
      const baseCap = IMPORT_CAP_PER_SECTOR * getImportCapRatio(key);
      const cap = summary.fullControlCount > 0 ? entry.cap : baseCap;
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
      const warpGateMultiplier = this.getWarpGateMultiplier(sector);
      IMPORT_CAP_RESOURCES.forEach(({ key }) => {
        const entry = summary.resources[key];
        const baseCap = IMPORT_CAP_PER_SECTOR * warpGateMultiplier * getImportCapRatio(key);
        if (richResource === key) {
          entry.richCount += 1;
          entry.cap += baseCap * 2;
          return;
        }
        if (poorResources.includes(key)) {
          entry.poorCount += 1;
          entry.cap += baseCap * 0.5;
          return;
        }
        entry.normalCount += 1;
        entry.cap += baseCap;
      });
    }

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

  getWarpGateMultiplier(sector) {
    if (!this.isBooleanFlagSet('warpGateFabrication')) {
      return 1;
    }
    const level = sector.warpGateNetworkLevel || 0;
    return 1 + 0.1 * (level - 1);
  }
}

window.WarpGateNetworkManager = WarpGateNetworkManager;
