const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('describeObjective for currentPlanet', () => {
  test('shows travel text and completion text', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const ctx = {
      console,
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      resources: {},
      buildings: {},
      colonies: {},
      terraforming: {},
      spaceManager: { getCurrentPlanetKey: () => 'mars' },
      planetParameters: { titan: { name: 'Titan' } }
    };
    vm.createContext(ctx);
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, ctx);

    const manager = new ctx.StoryManager({ chapters: [] });

    const objective = { type: 'currentPlanet', planetId: 'titan' };
    expect(manager.isObjectiveComplete(objective)).toBe(false);
    expect(manager.describeObjective(objective)).toBe('Travel to Titan');

    ctx.spaceManager.getCurrentPlanetKey = () => 'titan';
    expect(manager.isObjectiveComplete(objective)).toBe(true);
    expect(manager.describeObjective(objective)).toBe('Currently on Titan');
  });
});
