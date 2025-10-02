const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('terraforming complete objective tracks planet at activation', () => {
  test('objective uses planet captured on activation', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {}, getElementById: () => null },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      spaceManager: {
        getCurrentPlanetKey: jest.fn().mockReturnValue('mars'),
        isPlanetTerraformed: jest.fn((planet) => planet === 'mars')
      }
    };
    vm.createContext(context);
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, context);

    const progressData = {
      chapters: [
        { id: 'c1', type: 'journal', narrative: '', objectives: [ { type: 'terraforming', terraformingParameter: 'complete' } ] }
      ]
    };

    const manager = new context.StoryManager(progressData);
    context.window = { storyManager: manager };

    const event = manager.findEventById('c1');
    manager.activateEvent(event);

    // change current planet after activation
    context.spaceManager.getCurrentPlanetKey.mockReturnValue('callisto');
    context.spaceManager.isPlanetTerraformed.mockImplementation((planet) => planet === 'mars');

    expect(manager.isObjectiveComplete(event.objectives[0], event)).toBe(true);
  });
});
