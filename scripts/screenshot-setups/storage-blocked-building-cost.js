hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

document.getElementById('buildings-tab').classList.remove('hidden');
document.getElementById('building-container').classList.remove('hidden');
buildings.storageDepot.unlocked = true;
buildings.storageDepot.cost.colony.silicon = 25;
resources.colony.metal.value = 0;
resources.colony.metal.cap = 50;
resources.colony.silicon.value = 0;
resources.colony.silicon.cap = 1000;

gameSettings.colorblindPalette = 'redGreen';
applyColorblindPaletteSettings();
tabManager.activateTab('buildings');
activateBuildingSubtab('storage-buildings');
updateBuildingDisplay(buildings);
