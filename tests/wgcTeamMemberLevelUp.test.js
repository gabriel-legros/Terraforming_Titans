const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team member XP and leveling', () => {
  test('addXP levels up using quadratic requirement', () => {
    const m = WGCTeamMember.create('Bob', '', 'Soldier', {});
    m.addXP(10);
    expect(m.level).toBe(2);
    expect(m.xp).toBe(0);
    m.addXP(50); // 40 needed for level 3, 10 leftover
    expect(m.level).toBe(3);
    expect(m.xp).toBe(10);
  });

  test('operations grant XP and trigger level ups', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Alice', '', 'Soldier', {});
    wgc.recruitMember(0, 0, member);
    wgc.operations[0].successes = 10;
    wgc.finishOperation(0);
    expect(member.level).toBe(2);
    expect(member.xp).toBe(0);
  });
});
