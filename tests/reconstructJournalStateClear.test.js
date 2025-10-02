const debugTools = require('../src/js/debug-tools.js');

describe('reconstructJournalState chapter handling', () => {
  test('keeps only entries from the current chapter but returns full history', () => {
    const data = {
      chapters: [
        { id: 'c1', type: 'journal', chapter: 1, narrative: 'first' },
        { id: 'c2', type: 'journal', chapter: 2, narrative: 'reset' },
        { id: 'c3', type: 'journal', chapter: 2, narrative: 'after', objectives: [ { type: 'project', projectId: 'p1', repeatCount: 2 } ] }
      ],
      storyProjects: { p1: { name: 'P1', attributes: { storySteps: [null, 'step2'] } } }
    };
    const sm = { completedEventIds: new Set(['c1','c2','c3']), activeEventIds: new Set() };
    const pm = { projects: { p1: { repeatCount: 2 } } };
    const res = debugTools.reconstructJournalState(sm, pm, data);
    expect(res.entries).toEqual(['reset','after','P1 2/2: step2']);
    expect(res.sources).toEqual([
      { type: 'chapter', id: 'c2' },
      { type: 'chapter', id: 'c3' },
      { type: 'project', id: 'p1', step: 1 }
    ]);
    expect(res.historyEntries).toEqual(['first','reset','after','P1 2/2: step2']);
    expect(res.historySources).toEqual([
      { type: 'chapter', id: 'c1' },
      { type: 'chapter', id: 'c2' },
      { type: 'chapter', id: 'c3' },
      { type: 'project', id: 'p1', step: 1 }
    ]);
  });
});
