const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager condition prerequisites', () => {
  test('event activates only when condition is true', () => {
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {}, getElementById: () => null },
      clearJournal: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      resources: {},
      buildings: {},
      colonies: {},
      terraforming: {}
    };
    vm.createContext(context);
    vm.runInContext(progressCode + '; this.StoryManager = StoryManager;', context);

    context.progressData = { chapters: [
      {
        id: 'cond.test',
        type: 'journal',
        chapter: -1,
        narrative: 'x',
        prerequisites: [{ type: 'condition', conditionId: 'testCondition' }]
      }
    ] };

    context.testCondition = () => false;

    const manager = new context.StoryManager(context.progressData);
    context.window = { popupActive: false, storyManager: manager };

    manager.update();
    expect(manager.activeEventIds.has('cond.test')).toBe(false);

    context.testCondition = () => true;
    manager.update();
    expect(manager.activeEventIds.has('cond.test')).toBe(true);
  });
});
