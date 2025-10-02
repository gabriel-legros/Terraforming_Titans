const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager loads missing effects from completed chapters', () => {
  test('reapplies unsaved journal rewards', () => {
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
      activeEventIds: [],
      completedEventIds: ['c1'],
      appliedEffects: [],
      waitingForJournalEventId: null
    };

    manager.loadState(state);

    expect(context.addEffect).toHaveBeenCalledWith({ target: 'global', type: 'dummy' });
    expect(manager.appliedEffects).toContainEqual({ target: 'global', type: 'dummy' });
  });

  test('oneTimeFlag rewards are not reapplied', () => {
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
          { id: 'c1', type: 'journal', narrative: 'n', reward: [{ target: 'global', type: 'dummy', oneTimeFlag: true }], rewardDelay: 0 }
        ]
      }
    };
    vm.createContext(context);
    vm.runInContext(`${code}; this.StoryManager = StoryManager;`, context);

    const manager = new context.StoryManager(context.progressData);
    context.window = { storyManager: manager };

    const state = {
      activeEventIds: [],
      completedEventIds: ['c1'],
      appliedEffects: [],
      waitingForJournalEventId: null
    };

    manager.loadState(state);

    expect(context.addEffect).not.toHaveBeenCalled();
    expect(manager.appliedEffects).toEqual([]);
  });
});
