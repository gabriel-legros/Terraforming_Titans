const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('WGC team leader placeholder', () => {
  function createContext(wgc) {
    const ctx = {
      addJournalEntry: jest.fn(),
      clearJournal: () => {},
      document: { addEventListener: () => {}, removeEventListener: () => {} },
      window: {}
    };
    if (wgc !== undefined) ctx.warpGateCommand = wgc;
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress.js'), 'utf8');
    vm.createContext(ctx);
    vm.runInContext(code + '; this.StoryManager = StoryManager;', ctx);
    return ctx;
  }

  test('replaces placeholder with leader name', () => {
    const ctx = createContext({ teams: [[{ firstName: 'Alice', lastName: 'Smith' }]] });
    const progressData = { chapters: [{ id: 'c', type: 'journal', narrative: 'Leader: $WGC_TEAM1_LEADER$.' }] };
    const manager = new ctx.StoryManager(progressData);
    ctx.window.storyManager = manager;
    const event = manager.findEventById('c');
    event.trigger();
    expect(ctx.addJournalEntry).toHaveBeenCalledWith('Leader: Alice Smith.', 'c', { type: 'chapter', id: 'c' });
  });

  test('defaults when leader missing', () => {
    const ctx = createContext({ teams: [[]] });
    const progressData = { chapters: [{ id: 'd', type: 'journal', narrative: '$WGC_TEAM1_LEADER$' }] };
    const manager = new ctx.StoryManager(progressData);
    ctx.window.storyManager = manager;
    const event = manager.findEventById('d');
    event.trigger();
    expect(ctx.addJournalEntry).toHaveBeenCalledWith('Team Leader 1', 'd', { type: 'chapter', id: 'd' });
  });
});
