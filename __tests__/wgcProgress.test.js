const EffectableEntity = require('../src/js/effectable-entity');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc/wgc.js');
const { WGCTeamMember } = require('../src/js/wgc/team-member.js');

function buildMember(name, power, athletics, wit) {
  return new WGCTeamMember({ firstName: name, lastName: '', classType: 'Soldier', level: 1, power, athletics, wit, health: 100, maxHealth: 100 });
}

function fillTeam(manager, power) {
  const members = [
    buildMember('A', power, 0, 0),
    buildMember('B', power, 0, 0),
    buildMember('C', power, 0, 0),
    buildMember('D', power, 0, 0)
  ];
  manager.teams[0] = members;
}

describe('Warp Gate Command progress segments', () => {
  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('starting an operation seeds pending segment states', () => {
    const manager = new WarpGateCommand();
    fillTeam(manager, 10);
    const started = manager.startOperation(0, 0);
    expect(started).toBe(true);
    const op = manager.operations[0];
    expect(op.baseEventResults).toHaveLength(op.baseEventsTotal);
    expect(op.baseEventResults.every(state => state === 'pending')).toBe(true);
  });

  test('successful base event marks the segment green', () => {
    const manager = new WarpGateCommand();
    fillTeam(manager, 50);
    manager.startOperation(0, 0);
    const op = manager.operations[0];
    op.baseEventsTotal = 1;
    op.baseEventResults = ['pending'];
    op.eventQueue = [{ type: 'team', skill: 'power', isBase: true, stanceDifficultyModifier: 1 }];
    op.currentEventIndex = 0;
    op.nextEvent = 1;
    op.progressSegmentStart = 0;
    manager.update(2000);
    expect(op.baseEventResults[0]).toBe('success');
  });

  test('failed base event marks the segment red', () => {
    const manager = new WarpGateCommand();
    fillTeam(manager, 0);
    manager.startOperation(0, 0);
    const op = manager.operations[0];
    op.baseEventsTotal = 1;
    op.baseEventResults = ['pending'];
    op.eventQueue = [{ type: 'team', skill: 'power', isBase: true, stanceDifficultyModifier: 1 }];
    op.currentEventIndex = 0;
    op.nextEvent = 1;
    op.progressSegmentStart = 0;
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    manager.update(2000);
    randomSpy.mockRestore();
    expect(op.baseEventResults[0]).toBe('failure');
  });
});
