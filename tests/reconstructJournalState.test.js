const path = require('path');
const debugTools = require('../src/js/debug-tools.js');

describe('reconstructJournalState', () => {
  test('rebuilds journal with project steps', () => {
    const data = {
      chapters: [
        { id: 'c1', type: 'journal', narrative: 'intro' },
        { id: 'c2', type: 'journal', narrative: 'quest', objectives: [{ type: 'project', projectId: 'p1', repeatCount: 3 }] }
      ],
      storyProjects: { p1: { name: 'P1', attributes: { storySteps: ['s1','s2','s3'] } } }
    };
    const sm = { completedEventIds: new Set(['c1','c2']), activeEventIds: new Set() };
    const pm = { projects: { p1: { repeatCount: 2 } } };
    const res = debugTools.reconstructJournalState(sm, pm, data);
    expect(res.entries).toEqual(['intro','quest','P1 1/3: s1','P1 2/3: s2']);
    expect(res.sources).toEqual([
      { type:'chapter', id:'c1' },
      { type:'chapter', id:'c2' },
      { type:'project', id:'p1', step:0 },
      { type:'project', id:'p1', step:1 }
    ]);
    expect(res.historyEntries).toEqual(['intro','quest','P1 1/3: s1','P1 2/3: s2']);
    expect(res.historySources).toEqual([
      { type:'chapter', id:'c1' },
      { type:'chapter', id:'c2' },
      { type:'project', id:'p1', step:0 },
      { type:'project', id:'p1', step:1 }
    ]);
  });
});
