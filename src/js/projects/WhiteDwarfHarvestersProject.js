const WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP = 10_000_000_000n;

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

  getGasGiantCapResourceKey() {
    return 'whiteDwarf';
  }

  getGasGiantMaxAssignmentForRecipe(key, recipe = null) {
    if (this.isUnassignedAssignmentKey(key)) {
      return null;
    }
    const resolved = recipe || this.getRecipe(key);
    if (!resolved) {
      return 0n;
    }
    return WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP;
  }

  getGasGiantMaxAssignmentTooltipText() {
    return this.getProjectText(
      'maxAssignmentTooltip',
      {
        max: formatNumber(WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP, true, 2),
      },
      `Accessible white dwarf assignment cap: ${formatNumber(WHITE_DWARF_HARVESTER_ASSIGNMENT_CAP, true, 2)}`
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WhiteDwarfHarvestersProject;
} else if (typeof window !== 'undefined') {
  window.WhiteDwarfHarvestersProject = WhiteDwarfHarvestersProject;
}
