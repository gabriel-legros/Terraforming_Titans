const reconstructJournalState = require('../src/js/journal-reconstruction.js');

describe('journal reconstruction project entries', () => {
  it('rebuilds story project steps from completed chapters', () => {
    const data = {
      chapters: [
        {
          id: 'chapter1',
          type: 'journal',
          chapter: 1,
          narrative: 'Chapter 1',
          objectives: [{ type: 'project', projectId: 'probe', repeatCount: 1 }],
        },
        {
          id: 'chapter2',
          type: 'journal',
          chapter: 2,
          narrative: 'Chapter 2',
          objectives: [{ type: 'project', projectId: 'probe', repeatCount: 3 }],
        },
      ],
      storyProjects: {
        probe: {
          name: 'Probe',
          attributes: {
            storySteps: ['Step 1', 'Step 2', 'Step 3'],
          },
        },
      },
    };

    const storyManager = {
      completedEventIds: new Set(['chapter1', 'chapter2']),
      activeEventIds: new Set(),
    };

    const projectManager = {
      projects: {
        probe: { repeatCount: 0 },
      },
    };

    const result = reconstructJournalState(storyManager, projectManager, data, false);
    const projectEntries = result.historySources.filter(source => source.type === 'project');

    expect(projectEntries.map(entry => entry.step)).toEqual([0, 1, 2]);
  });

  it('does not assume incomplete project steps for active chapters', () => {
    const data = {
      chapters: [
        {
          id: 'chapter1',
          type: 'journal',
          chapter: 1,
          narrative: 'Chapter 1',
          objectives: [{ type: 'project', projectId: 'probe', repeatCount: 3 }],
        },
      ],
      storyProjects: {
        probe: {
          name: 'Probe',
          attributes: {
            storySteps: ['Step 1', 'Step 2', 'Step 3'],
          },
        },
      },
    };

    const storyManager = {
      completedEventIds: new Set(),
      activeEventIds: new Set(['chapter1']),
    };

    const projectManager = {
      projects: {
        probe: { repeatCount: 1 },
      },
    };

    const result = reconstructJournalState(storyManager, projectManager, data, false);
    const projectEntries = result.historySources.filter(source => source.type === 'project');

    expect(projectEntries.map(entry => entry.step)).toEqual([0]);
  });
});
