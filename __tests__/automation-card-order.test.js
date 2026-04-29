global.EffectableEntity = class EffectableEntity {
  constructor() {
    this.booleanFlags = new Set();
  }

  applyBooleanFlag() {}

  isBooleanFlagSet() {
    return false;
  }
};

const { AutomationManager } = require('../src/js/automation/automation.js');

describe('Automation card order', () => {
  it('moves against the current visible order after previous reorders', () => {
    const manager = new AutomationManager();

    manager.moveAutomationCard('life', -1, ['ships', 'life', 'research']);
    expect(manager.getAutomationCardOrder().slice(0, 3)).toEqual(['life', 'ships', 'research']);

    manager.moveAutomationCard('life', 1, ['life', 'ships', 'research']);
    expect(manager.getAutomationCardOrder().slice(0, 3)).toEqual(['ships', 'life', 'research']);
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
