const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team leader skill bonus', () => {
  test('leader adds half skill to individual checks', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.athletics = 6;
    const member = WGCTeamMember.create('Bob', '', 'Soldier', {});
    member.athletics = 2;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, member);
    wgc.roll = () => ({ sum: 5, rolls: [5] });
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValue(0.99);
    const event = { name: 'Test', type: 'individual', skill: 'athletics' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/skill 5/);
    Math.random.mockRestore();
  });

  test('leader adds half wit to science checks when not the scientist', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.wit = 6;
    const scientist = WGCTeamMember.create('Eve', '', 'Natural Scientist', {});
    scientist.wit = 4;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, scientist);
    wgc.roll = () => ({ sum: 5, rolls: [5] });
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const event = { name: 'NS', type: 'science', specialty: 'Natural Scientist' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/skill 7/);
    Math.random.mockRestore();
  });
});
