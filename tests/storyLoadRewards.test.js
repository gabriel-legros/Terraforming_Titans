const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager loads waiting event rewards immediately', () => {
  test('waiting journal event completion applies rewards on load', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: jest.fn(),
      removeEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      progressData: {
        chapters: [
          { id: 'c1', type: 'journal', narrative: 'n', reward: [{ target: 'global', type: 'dummy' }], rewardDelay: 0 }
        ]
      }
    };
    vm.createContext(context);
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, context);

    const manager = new context.StoryManager(context.progressData);
    context.window = { storyManager: manager };

    const state = {
      activeEventIds: ['c1'],
      completedEventIds: [],
      appliedEffects: [],
      waitingForJournalEventId: 'c1'
    };

    manager.loadState(state);

    expect(context.addEffect).toHaveBeenCalledWith({ target: 'global', type: 'dummy' });
    expect(manager.completedEventIds.has('c1')).toBe(true);
    expect(manager.activeEventIds.has('c1')).toBe(false);
  });
});
