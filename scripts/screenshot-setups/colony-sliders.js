hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

document.getElementById('colonies-tab').classList.remove('hidden');
tabManager.activateTab('colonies');
activateColonySubtab('population-colonies');

researchManager.getResearchById('colony_sliders').isResearched = true;
colonySliderSettings.workerRatio = 0.75;
colonySliderSettings.foodConsumption = 1;
colonySliderSettings.luxuryWater = 1;
colonySliderSettings.oreMineWorkers = 1;
updateColonySlidersUI();
