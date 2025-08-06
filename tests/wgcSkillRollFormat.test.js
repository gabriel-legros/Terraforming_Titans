const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC skill roll formatting', () => {
  test('log uses formatNumber with two decimals for skills', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.facilities.obstacleCourse = 1; // +1% athletics -> decimal skill
    wgc.roll = () => ({ sum: 40, rolls: [10, 10, 10, 10] });
    wgc.chooseEvent = () => ({ name: 'Team Athletics Challenge', type: 'team', skill: 'athletics' });
    jest.spyOn(Math, 'random').mockReturnValue(1); // prevent artifact
    wgc.startOperation(0);
    wgc.update(60000);
    const entry = wgc.logs[0][1];
    expect(entry).toContain('skill 4.04');
    expect(entry).toContain('total 44.04');
    Math.random.mockRestore();
  });
});
