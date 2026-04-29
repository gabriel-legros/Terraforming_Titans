global.EffectableEntity = class EffectableEntity {
  constructor() {
    this.booleanFlags = new Set();
  }

  applyBooleanFlag() {}

  isBooleanFlagSet() {
    return false;
  }
};

class AutomationStub {}

global.SpaceshipAutomation = AutomationStub;
global.LifeAutomation = AutomationStub;
global.BuildingAutomation = AutomationStub;
global.ProjectAutomation = AutomationStub;
global.ColonyAutomation = AutomationStub;
global.ResearchAutomation = AutomationStub;
global.ScriptAutomation = AutomationStub;

const { AutomationManager } = require('../src/js/automation/automation.js');

function visibleOrder(manager, visibleKeys) {
  const visibleSet = new Set(visibleKeys);
  return manager.getAutomationCardOrder().filter(key => visibleSet.has(key));
}

describe('Automation card order', () => {
  it('moves against the current visible order after previous reorders', () => {
    const manager = new AutomationManager();

    manager.moveAutomationCard('life', -1, ['ships', 'life', 'research']);
    expect(visibleOrder(manager, ['ships', 'life', 'research'])).toEqual(['life', 'ships', 'research']);

    manager.moveAutomationCard('life', 1, ['life', 'ships', 'research']);
    expect(visibleOrder(manager, ['ships', 'life', 'research'])).toEqual(['ships', 'life', 'research']);
  });

  it('inserts moved cards beside the visible target when hidden cards are between them', () => {
    const manager = new AutomationManager();
    manager.automationCardOrder = [
      'ships',
      'scripts',
      'life',
      'research',
      'buildings',
      'projects',
      'colony'
    ];

    manager.moveAutomationCard('life', -1, ['ships', 'life', 'research']);

    expect(manager.getAutomationCardOrder()).toEqual([
      'life',
      'ships',
      'scripts',
      'research',
      'buildings',
      'projects',
      'colony'
    ]);
  });
});
