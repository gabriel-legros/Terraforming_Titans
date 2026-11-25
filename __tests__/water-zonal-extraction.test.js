const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ZonalResources } = require('../src/js/terraforming/zonal-resources');
const { PreciseDecimal } = require('../src/js/precise-decimal');

const zones = ['tropical', 'temperate', 'polar'];
const phases = ['liquidWater', 'ice', 'buriedIce'];
const filename = path.resolve(__dirname, '../src/js/terraforming/terraforming-resources.js');
let methods;
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
  getZones: () => zones,
  registerTerraformingMethods(_name, factory) { methods = factory({}); }
}, { filename });

function reservoirs() {
  return {
    ...methods,
    zonalSurface: new ZonalResources(phases, zones),
    zonalSurfaceResourceConfigs: ['liquidWater', 'ice'].map(name => ({
      name, ...defaultPlanetResources.surface[name].zonalConfig
    })),
    getZoneWeight: zone => ({ tropical: 0.5, temperate: 0.375, polar: 0.125 })[zone]
  };
}

function inventory(world) {
  let total = PreciseDecimal.zero();
  for (const phase of phases) {
    for (const zone of zones) {
      const value = world.zonalSurface[phase].getExact(zone);
      expect(value.compare(0)).toBeGreaterThanOrEqual(0);
      total = total.add(value);
    }
  }
  return total;
}

test.each([
  ['zero extraction', 0, 8, 12],
  ['part of the exposed ice', 4, 4, 12],
  ['all exposed ice', 8, 0, 12],
  ['cross into the buried reserve', 11, 0, 9],
  ['exactly exhaust both layers', 20, 0, 0],
  ['demand exceeds all solid water', 35, 0, 0]
])('%s across disjoint zones', (_label, requested, exposedLeft, buriedLeft) => {
  const world = reservoirs();
  world.zonalSurface.ice.polar = 6;
  world.zonalSurface.ice.temperate = 2;
  world.zonalSurface.buriedIce.tropical = 9;
  world.zonalSurface.buriedIce.polar = 3;
  world.zonalSurface.liquidWater.polar = 5;
  const before = inventory(world);
  const changes = world.distributeSurfaceChangesToZones({ ice: -requested });
  // Harvester settlement consumes the reported zonal changes. Compare that
  // report with an independent measurement of the underlying inventory.
  const reported = Object.values(changes).flatMap(Object.values).reduce((withdrawn, delta) => withdrawn - delta, 0);
  expect(reported).toBe(Math.min(20, requested));
  expect(before.subtract(inventory(world)).toNumber()).toBe(reported);
  expect(world.zonalSurface.ice.polar).toBe(exposedLeft * 0.75);
  expect(world.zonalSurface.buriedIce.tropical).toBe(buriedLeft * 0.75);
  expect(world.zonalSurface.liquidWater.polar).toBe(5);
});

test('repeated tiny pump withdrawals from a 10²⁷-ton ocean survive exact zonal accounting', () => {
  const world = reservoirs();
  world.zonalSurface.liquidWater.tropical = 1e27;
  const before = inventory(world);
  for (let i = 0; i < 128; i++) {
    world.distributeSurfaceChangesToZones({ liquidWater: -0.125 });
  }
  expect(before.subtract(inventory(world)).toNumber()).toBe(16);
  // Even the much larger return transfer disappears in a naive Number sum.
  world.distributeSurfaceChangesToZones({ liquidWater: 16 });
  expect(inventory(world).equals(before)).toBe(true);
  expect(world.zonalSurface.liquidWater.polar).toBe(2);
});

test('overdrawing a trace reservoir returns the actual amount exactly once', () => {
  const world = reservoirs();
  world.zonalSurface.liquidWater.polar = 1e-52;
  const first = world.distributeSurfaceChangesToZones({ liquidWater: -1e9 });
  const second = world.distributeSurfaceChangesToZones({ liquidWater: -1e9 });
  expect(first.polar.liquidWater).toBe(-1e-52);
  expect(Math.abs(second.polar.liquidWater)).toBe(0);
  expect(inventory(world).equals(0)).toBe(true);
});
