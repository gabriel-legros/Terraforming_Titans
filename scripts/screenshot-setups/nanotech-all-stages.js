hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach((overlay) => overlay.remove());
window.popupActive = false;

document.getElementById('colonies-tab').classList.remove('hidden');
nanotechManager.enabled = true;
['stage2_enabled', 'stage3_enabled', 'stage4_enabled', 'stageSkull_enabled', 'nanotechRecycling'].forEach((flag) => {
  nanotechManager.booleanFlags.add(flag);
});
resources.surface.hazardousBiomass.value = 1e6;
updateColonySubtabsVisibility();
tabManager.activateTab('colonies');
activateColonySubtab('nanocolony-colonies');
nanotechManager.updateUI();
