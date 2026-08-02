hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

document.getElementById('buildings-tab').classList.remove('hidden');
document.getElementById('building-container').classList.remove('hidden');
buildings.dustFactory.unlocked = true;
buildings.dustFactory.reversalAvailable = true;
globalEffects.booleanFlags.add('automateConstruction');
DustFactory.loadAutomationSettings({
  dustColors: {
    north: { tropical: '#e9a23b', temperate: '#8b6f47', polar: '#e5edf5' },
    south: { tropical: '#b85c38', temperate: '#677d42', polar: '#99c6dd' },
  },
});
resources.special.albedoUpgrades.value = terraforming.celestialParameters.surfaceArea;
for (const zone of ['tropical', 'temperate', 'polar']) {
  const expected = DustFactory.getDustZoneAlbedo(zone);
  const actual = terraforming.calculateZonalGroundAlbedo(zone);
  if (Math.abs(actual - expected) > 1e-12) {
    throw new Error(`${zone} dust albedo did not apply by zone`);
  }
}

tabManager.activateTab('buildings');
activateBuildingSubtab('terraforming-buildings');
updateBuildingDisplay(buildings);
document.querySelector('[data-structure-name="dustFactory"] .dust-advanced-settings-button').click();
