const originalRandom = Math.random;

global.EffectableEntity = global.EffectableEntity || class {
  constructor() {}
};
global.addJournalEntry = global.addJournalEntry || (() => {});
global.addEffect = global.addEffect || (() => {});
if (!global.resources) {
  global.resources = {};
}
if (!global.resources.special) {
  global.resources.special = {};
}
global.resources.special.alienArtifact = global.resources.special.alienArtifact || {
  increase: () => {},
  decrease: () => {},
  value: 0
};

afterEach(() => {
  Math.random = originalRandom;
});

const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

function createMember(firstName, classType) {
  return new WGCTeamMember({
    firstName,
    classType,
    power: 5,
    athletics: 5,
    wit: 5
  });
}

function fillTeam(command, teamIndex = 0) {
  command.teams[teamIndex] = [
    createMember('Lead', 'Team Leader'),
    createMember('Soldier', 'Soldier'),
    createMember('Natural', 'Natural Scientist'),
    createMember('Social', 'Social Scientist')
  ];
}

describe('WarpGateCommand operation queue', () => {
  test('startOperation pre-generates ten challenges', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    Math.random = () => 0.1;

    const started = wgc.startOperation(0, 0);
    expect(started).toBe(true);
    const op = wgc.operations[0];
    expect(Array.isArray(op.eventQueue)).toBe(true);
    expect(op.eventQueue.length).toBe(10);
    expect(op.currentEventIndex).toBe(0);
  });

  test('failing social science challenge inserts follow-up combat', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    const op = wgc.operations[0];
    op.active = true;
    op.timer = 0;
    op.nextEvent = 60;
    op.eventQueue = [
      {
        name: 'Social Science challenge',
        type: 'science',
        specialty: 'Social Scientist',
        escalate: true
      }
    ];
    op.currentEventIndex = 0;
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    Math.random = () => 0.99;

    wgc.update(60000);

    expect(op.currentEventIndex).toBe(1);
    expect(op.eventQueue.length).toBe(2);
    const inserted = op.eventQueue[1];
    expect(inserted.type).toBe('combat');
    expect(inserted.difficultyMultiplier).toBeCloseTo(1.25);
    expect(op.nextEvent).toBe(120);
  });
});
