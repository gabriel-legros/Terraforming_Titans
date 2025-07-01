const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryManager chapter auto clear', () => {
  test('clears journal when chapter changes', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => null,
        dispatchEvent: () => {}
      },
      window: { popupActive: false },
      clearJournal: jest.fn(),
      createPopup: () => {},
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {}
    };
    vm.createContext(context);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', context);

    const data = {
      chapters: [
        { id: 'chapter1.1', chapter: 1, type: 'journal', narrative: 'a' },
        { id: 'chapter2.1', chapter: 2, type: 'journal', narrative: 'b', prerequisites: ['chapter1.1'] }
      ]
    };

    const manager = new context.StoryManager(data);
    context.window.storyManager = manager;

    const e1 = manager.findEventById('chapter1.1');
    manager.activateEvent(e1);
    manager.processEventCompletion('chapter1.1');

    const e2 = manager.findEventById('chapter2.1');
    manager.activateEvent(e2);

    expect(context.clearJournal).toHaveBeenCalled();
  });
});
