const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('water leaks when colony storage full', () => {
  function setupTerraforming(tempAbove) {
    const temps = tempAbove ? { tropical: 280, temperate: 250, polar: 260 } : { tropical: 260, temperate: 250, polar: 260 };
    return {
      zonalWater: {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: 0, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      },
      temperature: { zones: {
        tropical: { value: temps.tropical },
        temperate: { value: temps.temperate },
        polar: { value: temps.polar },
      } },
      updateResources: () => {}
    };
  }

  function createContext(tempAbove) {
    const ctx = { console };
    vm.createContext(ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.getZonePercentage = getZonePercentage;
    ctx.structures = {};
    ctx.dayNightCycle = { isDay: () => true };
    ctx.buildings = {};
    ctx.terraforming = setupTerraforming(tempAbove);
    ctx.terraforming.distributeGlobalChangesToZones = () => {};
    ctx.fundingModule = null;
    ctx.lifeManager = null;
    ctx.researchManager = null;
    ctx.projectManager = null;
    function stubResource(value = 0, cap = Infinity) {
      return {
        value,
        cap,
        hasCap: cap !== Infinity,
        productionRate: 0,
        consumptionRate: 0,
        productionRateBySource: {},
        consumptionRateBySource: {},
        updateStorageCap: () => {},
        resetRates: function () {
          this.productionRate = 0;
          this.consumptionRate = 0;
          this.productionRateBySource = {};
          this.consumptionRateBySource = {};
        },
        recalculateTotalRates: () => {},
        modifyRate: function (val, source) {
          if (val > 0) {
            this.productionRate += val;
            this.productionRateBySource[source] = (this.productionRateBySource[source] || 0) + val;
          } else if (val < 0) {
            const amt = -val;
            this.consumptionRate += amt;
            this.consumptionRateBySource[source] = (this.consumptionRateBySource[source] || 0) + amt;
          }
        }
      };
    }
    ctx.resources = {
      colony: {
        water: { name: 'water', ...stubResource(100, 100) }
      },
      surface: { liquidWater: stubResource(), ice: stubResource() },
      atmospheric: { atmosphericWater: stubResource() },
      underground: {},
      special: { albedoUpgrades: stubResource() }
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resource.js'), 'utf8');
    vm.runInContext(code + '; this.produceResources = produceResources;', ctx);
    return ctx;
  }

  function makeBuilding() {
    return {
      displayName: 'WaterMaker',
      active: 1,
      dayNightActivity: false,
      productivity: 1,
      production: { colony: { water: 10 } },
      consumption: {},
      getProductionRatio: () => 1,
      getEffectiveProductionMultiplier: () => 1,
      getEffectiveResourceProductionMultiplier: () => 1,
      getConsumptionRatio: () => 1,
      getEffectiveConsumptionMultiplier: () => 1,
      getEffectiveResourceConsumptionMultiplier: () => 1,
      updateProductivity: () => {},
      produce(acc, dt) { acc.colony.water += 10 * (dt/1000); },
      consume: () => {},
      applyMaintenance: () => {}
    };
  }

  test('leaks entirely into warm zones', () => {
    const ctx = createContext(true);
    const b = makeBuilding();
    ctx.b = b;
    vm.runInContext('produceResources(1000, {b})', ctx, { filename: 'vm' });
    const tropExp = 10; // all overflow goes to tropical zone
    expect(ctx.terraforming.zonalWater.tropical.liquid).toBeCloseTo(tropExp);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBe(0);
    expect(ctx.terraforming.zonalWater.temperate.ice).toBe(0);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBe(0);
    expect(ctx.terraforming.zonalWater.polar.ice).toBe(0);
    expect(ctx.resources.colony.water.value).toBe(100);
    expect(ctx.resources.colony.water.consumptionRateBySource['Overflow (not summed)']).toBeCloseTo(10);
    expect(ctx.resources.surface.liquidWater.productionRateBySource.Overflow).toBeCloseTo(10);
    expect(ctx.resources.surface.ice.productionRateBySource.Overflow || 0).toBe(0);
  });

  test('distributes across multiple warm zones by area', () => {
    const ctx = createContext(true);
    // Make another zone warm as well
    ctx.terraforming.temperature.zones.polar.value = 280;
    const b = makeBuilding();
    ctx.b = b;
    vm.runInContext('produceResources(1000, {b})', ctx, { filename: 'vm' });
    const warmZones = ['tropical', 'polar'];
    const warmArea = warmZones.reduce((sum, z) => sum + getZonePercentage(z), 0);
    const tropExp = 10 * (getZonePercentage('tropical') / warmArea);
    const polarExp = 10 * (getZonePercentage('polar') / warmArea);
    expect(ctx.terraforming.zonalWater.tropical.liquid).toBeCloseTo(tropExp);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBeCloseTo(polarExp);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBe(0);
    expect(ctx.resources.surface.liquidWater.productionRateBySource.Overflow).toBeCloseTo(10);
    expect(ctx.resources.surface.ice.productionRateBySource.Overflow || 0).toBe(0);
  });

  test('leaks as ice when all zones below 0C', () => {
    const ctx = createContext(false);
    const b = makeBuilding();
    ctx.b = b;
    vm.runInContext('produceResources(1000, {b})', ctx, { filename: 'vm' });
    const tropExp = 10 * getZonePercentage('tropical');
    const tempExp = 10 * getZonePercentage('temperate');
    const polarExp = 10 * getZonePercentage('polar');
    expect(ctx.terraforming.zonalWater.tropical.ice).toBeCloseTo(tropExp);
    expect(ctx.terraforming.zonalWater.temperate.ice).toBeCloseTo(tempExp);
    expect(ctx.terraforming.zonalWater.polar.ice).toBeCloseTo(polarExp);
    expect(ctx.resources.colony.water.value).toBe(100);
    expect(ctx.resources.colony.water.consumptionRateBySource['Overflow (not summed)']).toBeCloseTo(10);
    expect(ctx.resources.surface.ice.productionRateBySource.Overflow).toBeCloseTo(10);
  });

  test('vents into atmosphere when all zones exceed 100C', () => {
    const ctx = createContext(true);
    Object.keys(ctx.terraforming.temperature.zones).forEach(zone => {
      ctx.terraforming.temperature.zones[zone].value = 380;
    });
    const b = makeBuilding();
    ctx.b = b;
    vm.runInContext('produceResources(1000, {b})', ctx, { filename: 'vm' });
    expect(ctx.terraforming.zonalWater.tropical.liquid).toBe(0);
    expect(ctx.terraforming.zonalWater.temperate.liquid).toBe(0);
    expect(ctx.terraforming.zonalWater.polar.liquid).toBe(0);
    expect(ctx.resources.surface.liquidWater.productionRateBySource.Overflow).toBeUndefined();
    expect(ctx.resources.surface.ice.productionRateBySource.Overflow).toBeUndefined();
    expect(ctx.resources.atmospheric.atmosphericWater.value).toBeCloseTo(10);
    expect(ctx.resources.atmospheric.atmosphericWater.productionRateBySource.Overflow).toBeCloseTo(10);
    expect(ctx.resources.colony.water.value).toBe(100);
    expect(ctx.resources.colony.water.consumptionRateBySource['Overflow (not summed)']).toBeCloseTo(10);
  });
});
