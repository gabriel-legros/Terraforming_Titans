const { StoryManager } = require('../src/js/progress.js');

describe('wgcHighestDifficulty objective', () => {
  beforeEach(() => {
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getElementById: () => null,
    };
    global.warpGateCommand = { highestDifficulty: -1 };
    global.resources = {};
    global.buildings = {};
    global.colonies = {};
    global.terraforming = null;
    global.projectManager = null;
    global.solisManager = null;
  });

  test('describes progress and completes when required difficulty reached', () => {
    const data = {
      chapters: [{
        id: 'test',
        type: 'journal',
        chapter: 0,
        narrative: '',
        objectives: [{ type: 'wgcHighestDifficulty', difficulty: 0 }],
        reward: []
      }]
    };
    const sm = new StoryManager(data);
    const ev = sm.findEventById('test');
    const obj = ev.objectives[0];
    expect(sm.describeObjective(obj)).toBe('Complete an Operation of Difficulty 0 (Highest Completed: 0)');
    expect(sm.isObjectiveComplete(obj, ev)).toBe(false);
    warpGateCommand.highestDifficulty = 0;
    expect(sm.describeObjective(obj)).toBe('Complete an Operation of Difficulty 0 (Highest Completed: 0)');
    expect(sm.isObjectiveComplete(obj, ev)).toBe(true);
  });
});
