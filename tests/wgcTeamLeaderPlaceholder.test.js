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

  test('replaces generic placeholder with leader name', () => {
    const ctx = createContext({ teams: [[{ firstName: 'Eve', lastName: 'Doe' }]] });
    const progressData = { chapters: [{ id: 'e', type: 'journal', narrative: 'Leader: $WGC_TEAM_LEADER$.' }] };
    const manager = new ctx.StoryManager(progressData);
    ctx.window.storyManager = manager;
    const event = manager.findEventById('e');
    event.trigger();
    expect(ctx.addJournalEntry).toHaveBeenCalledWith('Leader: Eve Doe.', 'e', { type: 'chapter', id: 'e' });
  });

  test('replaces natural scientist placeholder with member name', () => {
    const ctx = createContext({ teams: [[
      { firstName: 'Eve', lastName: 'Doe' },
      { firstName: 'Nina', lastName: 'Khan', classType: 'Natural Scientist' }
    ]] });
    const progressData = { chapters: [{ id: 'f', type: 'journal', narrative: 'Scientist: $WGC_TEAM1_NATSCIENTIST$.' }] };
    const manager = new ctx.StoryManager(progressData);
    ctx.window.storyManager = manager;
    const event = manager.findEventById('f');
    event.trigger();
    expect(ctx.addJournalEntry).toHaveBeenCalledWith('Scientist: Nina Khan.', 'f', { type: 'chapter', id: 'f' });
  });

  test('defaults when natural scientist missing', () => {
    const ctx = createContext({ teams: [[{ firstName: 'Eve', lastName: 'Doe' }]] });
    const progressData = { chapters: [{ id: 'g', type: 'journal', narrative: '$WGC_TEAM1_NATSCIENTIST$' }] };
    const manager = new ctx.StoryManager(progressData);
    ctx.window.storyManager = manager;
    const event = manager.findEventById('g');
    event.trigger();
    expect(ctx.addJournalEntry).toHaveBeenCalledWith('Sam', 'g', { type: 'chapter', id: 'g' });
  });
});
