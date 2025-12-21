describe('completeResearchInstant requirements', () => {
  let ResearchManager;

  const geothermalResearch = {
    id: 'geothermal_plant',
    name: 'Geothermal Power Generation',
    description: '',
    cost: {},
    prerequisites: [],
    effects: [],
    requiresGeothermal: true,
    artificialAllowed: false,
  };

  const setPlanetContext = (geothermalDeposits, archetype) => {
    global.currentPlanetParameters = {
      resources: {
        surface: {},
        atmospheric: {},
        underground: { geothermal: { maxDeposits: geothermalDeposits } },
      },
      classification: { archetype },
    };
    global.spaceManager = null;
  };

  beforeEach(() => {
    jest.resetModules();
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    global.EffectableEntity = class {
      constructor() {
        this.booleanFlags = new Set();
      }
      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }
      addAndReplace() {}
      addEffect() {}
      removeEffect() {}
      applyActiveEffects() {}
    };
    ({ ResearchManager } = require('../src/js/research.js'));
  });

  it('blocks instant completion when geothermal vents are unavailable', () => {
    setPlanetContext(0, 'rocky');
    const manager = new ResearchManager({ energy: [geothermalResearch] });

    manager.completeResearchInstant('geothermal_plant');

    const research = manager.getResearchById('geothermal_plant');
    expect(research.isResearched).toBe(false);
  });

  it('blocks instant completion on artificial worlds when disallowed', () => {
    setPlanetContext(5, 'artificial');
    const manager = new ResearchManager({ energy: [geothermalResearch] });

    manager.completeResearchInstant('geothermal_plant');

    const research = manager.getResearchById('geothermal_plant');
    expect(research.isResearched).toBe(false);
  });

  it('completes instantly when requirements are satisfied', () => {
    setPlanetContext(5, 'rocky');
    const manager = new ResearchManager({ energy: [geothermalResearch] });

    manager.completeResearchInstant('geothermal_plant');

    const research = manager.getResearchById('geothermal_plant');
    expect(research.isResearched).toBe(true);
  });
});

describe('required flag research gating', () => {
  let ResearchManager;

  const gatedResearch = {
    id: 'waste_processing',
    name: 'Industrial Waste Processing',
    description: '',
    cost: {},
    prerequisites: [],
    requiredFlags: ['gabbagWasteProcessing'],
    effects: [],
  };

  beforeEach(() => {
    jest.resetModules();
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    global.EffectableEntity = class {
      constructor() {
        this.booleanFlags = new Set();
      }
      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }
      addAndReplace() {}
      addEffect() {}
      removeEffect() {}
      applyActiveEffects() {}
    };
    global.currentPlanetParameters = {
      resources: { surface: {}, atmospheric: {}, underground: {} },
      classification: { archetype: 'rocky' },
    };
    global.spaceManager = null;
    ({ ResearchManager } = require('../src/js/research.js'));
  });

  it('hides the research until the flag is set', () => {
    const manager = new ResearchManager({ industry: [gatedResearch] });

    const research = manager.getResearchById('waste_processing');
    expect(manager.isResearchDisplayable(research)).toBe(false);
  });

  it('shows the research once the flag is set', () => {
    const manager = new ResearchManager({ industry: [gatedResearch] });
    manager.booleanFlags.add('gabbagWasteProcessing');

    const research = manager.getResearchById('waste_processing');
    expect(manager.isResearchDisplayable(research)).toBe(true);
  });
});
