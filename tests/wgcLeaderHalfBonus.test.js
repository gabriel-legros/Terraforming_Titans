const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team leader bonus', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('leader adds half skill on own individual challenges', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.athletics = 10;
    wgc.recruitMember(0, 0, leader);
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const event = { name: 'Test', type: 'individual', skill: 'athletics' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/leader 5/);
    Math.random.mockRestore();
  });

  test('leader adds half skill to other member individual challenge', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.athletics = 10;
    const member = WGCTeamMember.create('Bob', '', 'Soldier', {});
    member.athletics = 5;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, member);
    wgc.roll = () => ({ sum: 1, rolls: [1] });
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const event = { name: 'Test', type: 'individual', skill: 'athletics' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/leader 5/);
    Math.random.mockRestore();
  });

  test('leader adds half wit on science challenges', () => {
    const wgc = new WarpGateCommand();
    const leader = WGCTeamMember.create('Lead', '', 'Team Leader', {});
    leader.wit = 8;
    const scientist = WGCTeamMember.create('Nat', '', 'Natural Scientist', {});
    scientist.wit = 6;
    wgc.recruitMember(0, 0, leader);
    wgc.recruitMember(0, 1, scientist);
    wgc.roll = () => ({ sum: 2, rolls: [2] });
    const event = { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/leader 4/);
  });
});
