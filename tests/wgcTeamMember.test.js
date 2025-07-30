const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team members', () => {
  test('creation applies base stats', () => {
    const m = WGCTeamMember.create('Bob', '', 'Soldier', { power: 2, stamina: 1, wit: 1 });
    expect(m.level).toBe(1);
    expect(m.power).toBe(3);
    expect(m.stamina).toBe(2);
    expect(m.wit).toBe(1);
    expect(m.health).toBe(100);
    expect(m.maxHealth).toBe(100);
  });

  test('max health scales with level', () => {
    const m = new WGCTeamMember({ firstName: 'Eve', classType: 'Soldier', level: 5 });
    expect(m.maxHealth).toBe(104);
    expect(m.health).toBe(104);
  });

  test('save and load preserves members', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Alice', '', 'Team Leader', { power: 1, stamina: 0, wit: 0 });
    wgc.recruitMember(0, 0, member);
    const data = wgc.saveState();
    const wgc2 = new WarpGateCommand();
    wgc2.loadState(data);
    expect(wgc2.teams[0][0].firstName).toBe('Alice');
    expect(wgc2.teams[0][0].power).toBe(member.power);
    expect(wgc2.teams[0][0].health).toBe(member.health);
    expect(wgc2.teams[0][0].maxHealth).toBe(member.maxHealth);
  });
});
