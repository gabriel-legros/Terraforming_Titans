const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC individual challenge member name', () => {
  test('summary includes member name', () => {
    const wgc = new WarpGateCommand();
    const member = WGCTeamMember.create('Alice', '', 'Soldier', {});
    wgc.recruitMember(0, 0, member);
    wgc.roll = () => ({ sum: 10, rolls: [10] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const event = { name: 'Ind', type: 'individual', skill: 'athletics' };
    wgc.resolveEvent(0, event);
    expect(wgc.operations[0].summary).toMatch(/Alice/);
    Math.random.mockRestore();
  });
});
