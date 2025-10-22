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

const { WGCTeamMember } = require('../src/js/wgc/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc/wgc.js');

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
    expect(op.eventQueue.every(evt => evt.isBase)).toBe(true);
    expect(op.currentEventIndex).toBe(0);
    expect(op.baseEventsTotal).toBe(10);
  });

  test('failing social science challenge inserts follow-up combat', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    Math.random = () => 0.1;
    expect(wgc.startOperation(0, 0)).toBe(true);
    const op = wgc.operations[0];
    Object.assign(op.eventQueue[0], {
      name: 'Social Science challenge',
      type: 'science',
      specialty: 'Social Scientist',
      escalate: true
    });
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    Math.random = () => 0.99;

    wgc.update(60000);

    expect(op.currentEventIndex).toBe(1);
    expect(op.eventQueue.length).toBe(11);
    const inserted = op.eventQueue[1];
    expect(inserted.type).toBe('combat');
    expect(inserted.difficultyMultiplier).toBeCloseTo(1.25);
    expect(op.nextEvent).toBe(120);
    expect(inserted.isBase).toBe(false);
  });

  test('progress scales with delays and ignores extra combat challenges', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    Math.random = () => 0.1;
    expect(wgc.startOperation(0, 0)).toBe(true);
    const op = wgc.operations[0];
    Object.assign(op.eventQueue[0], {
      name: 'Social Science challenge',
      type: 'science',
      specialty: 'Social Scientist',
      escalate: true
    });
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    Math.random = () => 0.99;

    wgc.update(30000);
    expect(op.progress).toBeCloseTo(0.05, 3);

    wgc.update(30000);
    expect(op.progress).toBeCloseTo(0.1, 3);
    expect(op.baseEventsCompleted).toBe(1);

    wgc.update(30000);
    expect(op.progress).toBeCloseTo(0.1, 3);

    wgc.update(30000);
    expect(op.progress).toBeCloseTo(0.1, 3);
    expect(op.eventQueue[1].isBase).toBe(false);

    wgc.update(30000);
    expect(op.progress).toBeCloseTo(0.15, 2);
  });

  test('level 100 shooting range converts failed combat with no reroll into success', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    wgc.facilities.shootingRange = 100;
    Math.random = () => 0.1;
    expect(wgc.startOperation(0, 0)).toBe(true);

    const op = wgc.operations[0];
    wgc.teams[0].forEach(member => { member.power = 0; });
    op.eventQueue[0] = {
      name: 'Combat challenge',
      type: 'combat',
      isBase: true
    };
    op.facilityRerolls.shootingRange = 0;
    wgc.roll = dice => ({ sum: dice, rolls: Array(dice).fill(1) });
    Math.random = () => 0.99;

    wgc.update(60000);

    expect(op.successes).toBe(1);
    expect(op.summary).toContain('fail-safe success');
    wgc.teams[0].forEach(member => {
      expect(member.health).toBe(member.maxHealth);
    });
  });

  test('level 100 shooting range converts post-reroll failure into success', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    wgc.facilities.shootingRange = 100;
    Math.random = () => 0.1;
    expect(wgc.startOperation(0, 0)).toBe(true);

    const op = wgc.operations[0];
    wgc.teams[0].forEach(member => { member.power = 0; });
    op.eventQueue[0] = {
      name: 'Combat challenge',
      type: 'combat',
      isBase: true
    };
    op.facilityRerolls.shootingRange = 1;
    let rollCount = 0;
    wgc.roll = dice => {
      rollCount += 1;
      return { sum: dice, rolls: Array(dice).fill(1) };
    };
    Math.random = () => 0.99;

    wgc.update(60000);

    expect(rollCount).toBe(2);
    expect(op.successes).toBe(1);
    expect(op.facilityRerolls.shootingRange).toBe(0);
    expect(op.summary).toContain('fail-safe success');
  });

  test('barracks level 100 multiplies individual critical XP', () => {
    const wgc = new WarpGateCommand();
    fillTeam(wgc, 0);
    wgc.facilities.barracks = 100;
    Math.random = () => 0.25;
    expect(wgc.startOperation(0, 0)).toBe(true);

    const op = wgc.operations[0];
    const event = { name: 'Solo Power', type: 'individual', skill: 'power', isBase: true };
    wgc.roll = () => ({ sum: 20, rolls: [20] });

    wgc.resolveEvent(0, event);
    expect(op.criticalXpMultiplier).toBe(10);
    expect(wgc.facilities.barracks).toBe(100);
    op.successes = 1;
    op.difficulty = 0;
    const expectedBase = op.successes * (1 + 0.1 * op.difficulty);
    const expectedTotal = expectedBase * op.criticalXpMultiplier;
    const challengeSummary = op.summary;

    wgc.finishOperation(0);
    wgc.teams[0].forEach(member => {
      expect(member.xp).toBeCloseTo(expectedTotal);
    });
    expect(challengeSummary).toContain('Barracks XP x10');
  });
});
