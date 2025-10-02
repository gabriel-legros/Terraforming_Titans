const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const { effectiveTemp } = require('../src/js/terraforming/physics.js');

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
// Disable project flags
 global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
 global.mirrorOversightSettings = {};
// Stub physics functions used in updateSurfaceTemperature
 global.calculateAtmosphericPressure = () => 0;
 global.calculateEmissivity = () => ({ emissivity:0, tau:0, contributions:{} });
 global.dayNightTemperaturesModel = () => ({ mean:0, day:0, night:0, equilibriumTemperature:0 });
 global.effectiveTemp = effectiveTemp;
 global.calculateZonalSurfaceFractions = () => ({ ocean:0, ice:0, hydrocarbon:0, hydrocarbonIce:0, co2_ice:0, biomass:0 });

global.calculateActualAlbedoPhysics = () => ({ albedo:0.3, components:{ dA_ch4:0.05, dA_calcite:0.02, dA_cloud:0.03 } });

const Terraforming = require('../src/js/terraforming.js');

describe('cloud and haze penalty', () => {
  test('reduces modified solar flux and displays in UI', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } } };
    global.buildings = { spaceMirror:{ surfaceArea:500, active:1 }, hyperionLantern:{ active:0 } };
    const tf = new Terraforming(global.resources, { radius:1, distanceFromSun:1, albedo:0, gravity:1 });
    tf.updateLuminosity();
    const penalty = 0.05 + 0.02 + 0.03;
    expect(tf.luminosity.cloudHazePenalty).toBeCloseTo(penalty, 5);
    const weighted = ['tropical','temperate','polar'].reduce((s,z)=> s + (tf.luminosity.zonalFluxes[z] || 0) * getZonePercentage(z),0);
    const expectedFlux = weighted * (1 - penalty);
    expect(tf.luminosity.modifiedSolarFlux).toBeCloseTo(expectedFlux, 5);
    const expectedTemp = effectiveTemp(tf.luminosity.surfaceAlbedo, weighted);
    expect(tf.temperature.effectiveTempNoAtmosphere).toBeCloseTo(expectedTemp, 5);

    const dom = new JSDOM('<!DOCTYPE html><div id="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = require('../src/js/numbers.js').formatNumber;
    ctx.ZONES = ['tropical','temperate','polar'];
    ctx.calculateZonalSurfaceFractions = () => ({ ocean:0, ice:0, hydrocarbon:0, hydrocarbonIce:0, co2_ice:0, biomass:0 });
    ctx.projectManager = { isBooleanFlagSet: () => false };
    ctx.resources = global.resources;
    ctx.terraforming = tf;

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    const row = dom.window.document.getElementById('row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();
    const text = dom.window.document.getElementById('cloud-haze-penalty').textContent;
    expect(text).toBe('0.100');
  });
});
