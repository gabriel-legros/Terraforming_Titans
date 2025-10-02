const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation difficulty', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('difficulty modifies DC and artifact rewards', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A' + i, '', 'Soldier', {});
      m.power = 10; m.athletics = 10; m.wit = 10;
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0, 2);
    const ev = { name: 'Team Power Challenge', type: 'team', skill: 'power' };
    wgc.resolveEvent(0, ev);
    expect(wgc.operations[0].summary).toMatch(/DC 48/);
    expect(wgc.operations[0].artifacts).toBeCloseTo(1.2);
    Math.random.mockRestore();
  });

  test('failing challenges cause health loss', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Bob', '', 'Soldier', {});
    wgc.recruitMember(0, 0, member);
    wgc.operations[0].difficulty = 3;
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    const indEvent = { name: 'Ind', type: 'individual', skill: 'power' };
    const teamEvent = { name: 'Team', type: 'team', skill: 'power' };
    wgc.resolveEvent(0, indEvent);
    expect(member.health).toBe(85);
    wgc.recruitMember(0, 1, WGCTeamMember.create('C', '', 'Soldier', {}));
    wgc.recruitMember(0, 2, WGCTeamMember.create('D', '', 'Soldier', {}));
    wgc.recruitMember(0, 3, WGCTeamMember.create('E', '', 'Soldier', {}));
    wgc.resolveEvent(0, teamEvent);
    expect(wgc.teams[0][0].health).toBe(79);
    wgc.teams[0].slice(1).forEach(m => { if (m) expect(m.health).toBe(94); });
  });
});
