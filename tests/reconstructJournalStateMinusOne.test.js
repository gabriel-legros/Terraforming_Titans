const debugTools = require('../src/js/debug-tools.js');

describe('reconstructJournalState ignores chapter -1 entries', () => {
  test('entries with chapter -1 are omitted', () => {
    const data = {
      chapters: [
        { id: 'c1', type: 'journal', chapter: 0, narrative: 'keep' },
        { id: 'c2', type: 'journal', chapter: -1, narrative: 'skip' }
      ]
    };
    const sm = { completedEventIds: new Set(['c1','c2']), activeEventIds: new Set() };
    const res = debugTools.reconstructJournalState(sm, null, data);
    expect(res.entries).toEqual(['keep']);
    expect(res.sources).toEqual([{ type: 'chapter', id: 'c1' }]);
    expect(res.historyEntries).toEqual(['keep']);
    expect(res.historySources).toEqual([{ type: 'chapter', id: 'c1' }]);
  });
});
