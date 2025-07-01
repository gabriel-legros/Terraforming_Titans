const debugTools = require('../src/js/debug-tools.js');

describe('reconstructJournalState clearJournal handling', () => {
  test('skips entries before clearJournal and ignores null steps', () => {
    const data = {
      chapters: [
        { id: 'c1', type: 'journal', narrative: 'first' },
        { id: 'c2', type: 'journal', narrative: 'reset', special: 'clearJournal' },
        { id: 'c3', type: 'journal', narrative: 'after', objectives: [ { type: 'project', projectId: 'p1', repeatCount: 2 } ] }
      ],
      storyProjects: { p1: { attributes: { storySteps: [null, 'step2'] } } }
    };
    const sm = { completedEventIds: new Set(['c1','c2','c3']), activeEventIds: new Set() };
    const pm = { projects: { p1: { repeatCount: 2 } } };
    const res = debugTools.reconstructJournalState(sm, pm, data);
    expect(res.entries).toEqual(['reset','after','step2']);
    expect(res.sources).toEqual([
      { type: 'chapter', id: 'c2' },
      { type: 'chapter', id: 'c3' },
      { type: 'project', id: 'p1', step: 1 }
    ]);
  });
});
