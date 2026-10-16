const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ZonalResources } = require('../src/js/terraforming/zonal-resources.js');

const zones = ['tropical', 'temperate', 'polar'];
let methods;
vm.runInNewContext(
  fs.readFileSync(path.resolve(__dirname, '../src/js/terraforming/terraforming-resources.js'), 'utf8'),
  {
    registerTerraformingMethods(name, factory) { methods = factory({}); },
    getZones: () => zones,
  }
);

function createTerraforming() {
  const zonalSurface = new ZonalResources(['liquidAmmonia'], zones);
  zonalSurface.liquidAmmonia.polar = 3.734500836108035e-52;
  return {
    zonalSurface,
    zonalSurfaceResourceConfigs: [{
      name: 'liquidAmmonia',
      keys: ['liquidAmmonia'],
      distributionKey: 'liquidAmmonia',
      distribution: { production: 'area', consumption: 'currentAmount' },
    }],
    getZoneWeight: () => 1 / zones.length,
  };
}

describe('Trace surface resource distribution', () => {
  it.each(['entire trace inventory', 'request larger than trace inventory'])(
    'removes %s instead of skipping the zonal change', (scenario) => {
      const terraforming = createTerraforming();
      const inventory = terraforming.zonalSurface.liquidAmmonia.polar;
      const request = scenario === 'entire trace inventory' ? inventory : 1e-8;
      const changes = methods.calculateZonalSurfaceChanges.call(terraforming, { liquidAmmonia: -request });
      expect(changes.polar.liquidAmmonia).toBe(-inventory);
    }
  );

  it('distributes trace production across zones', () => {
    const amount = 1e-52;
    const changes = methods.calculateZonalSurfaceChanges.call(createTerraforming(), { liquidAmmonia: amount });
    for (const zone of zones) {
      expect(changes[zone].liquidAmmonia).toBeGreaterThan(0);
    }
  });
});
