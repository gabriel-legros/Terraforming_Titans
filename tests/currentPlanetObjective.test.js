const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager currentPlanet objective', () => {
  test('checks current planet against objective', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');

    const context = {
      console,
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      spaceManager: { getCurrentPlanetKey: () => 'titan' }
    };

    vm.createContext(context);
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, context);

    const manager = new context.StoryManager({ chapters: [] });

    expect(
      manager.isObjectiveComplete({ type: 'currentPlanet', planetId: 'titan' })
    ).toBe(true);
    expect(
      manager.isObjectiveComplete({ type: 'currentPlanet', planetId: 'mars' })
    ).toBe(false);
  });
});
