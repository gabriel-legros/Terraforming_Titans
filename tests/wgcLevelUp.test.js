const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC leveling', () => {
  test('team members level up when gaining enough XP', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Bob', '', 'Soldier', {});
    wgc.recruitMember(0, 0, member);
    const op = wgc.operations[0];
    op.successes = 15;
    op.artifacts = 0;
    op.difficulty = 0;
    op.number = 1;
    wgc.finishOperation(0);
    expect(member.level).toBe(2);
    expect(member.xp).toBe(5);
    expect(member.getXPForNextLevel()).toBe(20);
  });
});
