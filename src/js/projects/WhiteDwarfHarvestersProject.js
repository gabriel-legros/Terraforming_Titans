const WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP = 10_000_000_000n;
const WHITE_DWARF_HARVESTER_WARP_GATE_LEVEL_CAP = 1_000_000;

let WhiteDwarfHarvestersBase = null;
try {
  WhiteDwarfHarvestersBase = LiftersProject;
} catch (error) {}
try {
  WhiteDwarfHarvestersBase = WhiteDwarfHarvestersBase || require('./LiftersProject.js');
} catch (error) {}

class WhiteDwarfHarvestersProject extends WhiteDwarfHarvestersBase {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = 1000;
  }

  getLifterTextPath() {
    return 'ui.projects.whiteDwarfHarvesters';
  }

  getExpansionRateSourceLabel() {
    return 'White Dwarf Harvester expansion';
  }

  getOperationRateSourceLabel() {
    return 'White Dwarf Harvesting';
  }

  isAtmosphereStripDisabled() {
    return true;
  }

  renderAutomationUI() {}

  getGasGiantCapResourceKey() {
    return 'whiteDwarf';
  }

  getAverageWarpGateNetworkLevel() {
    return warpGateNetworkManager.getAverageWarpGateLevelAllSectors();
  }

  getWhiteDwarfCapMultiplier() {
    const averageLevel = this.getAverageWarpGateNetworkLevel();
    return Math.max(1, averageLevel) / WHITE_DWARF_HARVESTER_WARP_GATE_LEVEL_CAP;
  }

  getEffectiveWhiteDwarfAssignmentCap() {
    const scaled = Number(WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP) * this.getWhiteDwarfCapMultiplier();
    return BigInt(Math.max(0, Math.floor(scaled)));
  }

  getGasGiantMaxAssignmentForRecipe(key, recipe = null) {
    if (this.isUnassignedAssignmentKey(key)) {
      return null;
    }
    const resolved = recipe || this.getRecipe(key);
    if (!resolved) {
      return 0n;
    }
    return this.getEffectiveWhiteDwarfAssignmentCap();
  }

  getGasGiantMaxAssignmentTooltipText() {
    const averageLevel = this.getAverageWarpGateNetworkLevel();
    const networkScale = this.getWhiteDwarfCapMultiplier();
    const cap = this.getEffectiveWhiteDwarfAssignmentCap();
    return this.getProjectText(
      'maxAssignmentTooltip',
      {
        base: formatNumber(WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP, true, 2),
        averageLevel: formatNumber(averageLevel, true, 3),
        levelCap: formatNumber(WHITE_DWARF_HARVESTER_WARP_GATE_LEVEL_CAP, true),
        networkScale: formatNumber(networkScale, true, 6),
        max: formatNumber(cap, true, 2),
      },
      `Base assignment cap: ${formatNumber(WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP, true, 2)}
Warp Gate Network scale: max(1, ${formatNumber(averageLevel, true, 3)}) / ${formatNumber(WHITE_DWARF_HARVESTER_WARP_GATE_LEVEL_CAP, true)} = ${formatNumber(networkScale, true, 6)}
Accessible white dwarf assignment cap: ${formatNumber(cap, true, 2)}`
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WhiteDwarfHarvestersProject;
} else if (typeof window !== 'undefined') {
  window.WhiteDwarfHarvestersProject = WhiteDwarfHarvestersProject;
}
