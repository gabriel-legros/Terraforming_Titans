const debugTools = require('../src/js/debug-tools.js');

describe('reconstructJournalState skips chapter -1 events', () => {
  test('events with chapter -1 are ignored', () => {
    const data = {
      chapters: [
        { id: 'c1', type: 'journal', chapter: 1, narrative: 'first' },
        { id: 'cX', type: 'journal', chapter: -1, narrative: 'skip' },
        { id: 'c2', type: 'journal', chapter: 2, narrative: 'second' }
      ],
      storyProjects: {}
    };
    const sm = { completedEventIds: new Set(['c1','cX','c2']), activeEventIds: new Set() };
    const pm = {};
    const res = debugTools.reconstructJournalState(sm, pm, data);
    expect(res.entries).toEqual(['second']);
    expect(res.sources).toEqual([{ type: 'chapter', id: 'c2' }]);
    expect(res.historyEntries).toEqual(['first','second']);
    expect(res.historySources).toEqual([
      { type: 'chapter', id: 'c1' },
      { type: 'chapter', id: 'c2' }
    ]);
  });
});
