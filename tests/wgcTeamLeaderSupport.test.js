const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team leader support', () => {
  test('leader adds half skill to individual challenges', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.athletics = 6;
    const soldier = WGCTeamMember.create('Sol', '', 'Soldier', {});
    soldier.athletics = 7;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, soldier);
    wgc.roll = () => ({ sum: 0, rolls: [0] });
    const res = wgc.resolveEvent(0, { name: 'Test', type: 'individual', skill: 'athletics' });
    expect(res.success).toBe(true);
    expect(wgc.operations[0].summary).toMatch(/total 10/);
  });

  test('leader adds half wit to science challenges', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.wit = 8;
    const sci = WGCTeamMember.create('Sci', '', 'Natural Scientist', {});
    sci.wit = 6;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, sci);
    wgc.roll = () => ({ sum: 0, rolls: [0] });
    const res = wgc.resolveEvent(0, { name: 'Science', type: 'science', specialty: 'Natural Scientist' });
    expect(res.success).toBe(true);
    expect(wgc.operations[0].summary).toMatch(/total 10/);
  });
});
