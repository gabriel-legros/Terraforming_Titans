const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC facility upgrades', () => {
  test('upgrade sets cooldown and increases level', () => {
    const wgc = new WarpGateCommand();
    expect(wgc.upgradeFacility('infirmary')).toBe(true);
    expect(wgc.facilities.infirmary).toBe(1);
    expect(wgc.facilityCooldown).toBe(3600);
    expect(wgc.upgradeFacility('infirmary')).toBe(false);
    wgc.update(3600 * 1000);
    expect(wgc.facilityCooldown).toBe(0);
    expect(wgc.upgradeFacility('infirmary')).toBe(true);
  });

  test('infirmary boosts healing rate', () => {
    const wgc = new WarpGateCommand();
    const mem = WGCTeamMember.create('A', '', 'Soldier', {});
    mem.health = 5;
    wgc.recruitMember(0,0,mem);
    wgc.facilities.infirmary = 10;
    wgc.update(60000);
    expect(mem.health).toBeCloseTo(60);
  });
});
