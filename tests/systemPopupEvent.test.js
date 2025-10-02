const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('StoryEvent type system-pop-up', () => {
  test('triggers createSystemPopup with parameters', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    const context = {
      console,
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      clearJournal: () => {},
      createPopup: () => {},
      createSystemPopup: jest.fn(),
      addJournalEntry: () => {},
      addEffect: () => {},
      removeEffect: () => {},
      buildings: {},
      colonies: {},
      resources: {},
      terraforming: {},
      window: {}
    };
    vm.createContext(context);
    vm.runInContext(code + '; this.StoryEvent = StoryEvent;', context);

    const event = new context.StoryEvent({
      id: 'sys1',
      type: 'system-pop-up',
      parameters: { title: 'T', text: 'Message', buttonText: 'OK' }
    });

    event.trigger();

    expect(context.createSystemPopup).toHaveBeenCalledWith('T', 'Message', 'OK');
  });
});
