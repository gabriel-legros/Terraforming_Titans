const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('journal event completion', () => {
  test('chapter not marked complete until typing finished', () => {
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');

    const documentEvents = {};
    const documentMock = {
      addEventListener: (type, handler) => { documentEvents[type] = handler; },
      removeEventListener: () => {},
      getElementById: () => null,
      dispatchEvent: (event) => { if (documentEvents[event.type]) documentEvents[event.type](event); }
    };

    const context = {
      console,
      document: documentMock,
      window: { popupActive: false },
      clearJournal: () => {},
      createPopup: () => {},
      journalQueue: [],
      journalCurrentEventId: null,
      addJournalEntry: (text, id) => { context.journalCurrentEventId = id; },
      addEffect: () => {},
      removeEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {}
    };

    vm.createContext(context);
    vm.runInContext(`${progressCode}; this.StoryManager = StoryManager;`, context);

    const progressData = {
      chapters: [
        { id: 'c1', type: 'journal', narrative: 'one' },
        { id: 'c2', type: 'journal', narrative: 'two', prerequisites: ['c1'] }
      ]
    };

    const manager = new context.StoryManager(progressData);
    context.window.storyManager = manager;

    const event1 = manager.findEventById('c1');
    manager.activateEvent(event1);
    manager.update();

    expect(manager.completedEventIds.has('c1')).toBe(false);
    expect(manager.activeEventIds.has('c2')).toBe(false);

    // Simulate typing finished
    context.journalCurrentEventId = null;
    documentMock.dispatchEvent({ type: 'storyJournalFinishedTyping', detail: { eventId: 'c1' } });
    manager.update();

    expect(manager.completedEventIds.has('c1')).toBe(true);
    expect(manager.activeEventIds.has('c2')).toBe(true);
  });
});
