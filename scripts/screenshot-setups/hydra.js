hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;
currentPlanetParameters = getSpecialSeedParameters('hydra');
currentPlanetParameters.rwgMeta = { specialSeedKey: 'hydra' };
initializeGameState({ skipStoryInitialization: true });
terraforming.calculateInitialValues();
produceResources(20, buildings);
document.getElementById('special-projects-tab').classList.remove('hidden');
tabManager.activateTab('special-projects');
activateProjectSubtab('story-projects');
updateProjectUI('hydra');

setGameSpeedChoice(0);
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;
hideLoadingOverlay();
