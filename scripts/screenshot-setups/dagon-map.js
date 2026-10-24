hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;
if (!isGamePaused()) togglePause();

galaxyManager.initialize();
galaxyManager.enabled = true;
galaxyManager.hasSeenWelcomePopup = true;
galaxyInvasionManager.dagon.started = true;
galaxyInvasionManager.dagon.prometheusRepaired = true;
gameCompleted = true;
const sectors = galaxyManager.getSectors();
const tentacleKeys = new Set(galaxyInvasionManager.dagon.tentacles.flatMap(tentacle => tentacle.keys));
sectors.forEach((sector, index) => {
  const label = sector.getDisplayName();
  const control = ['Core', 'R5-07'].includes(label) ? { uhf: 1 }
    : tentacleKeys.has(sector.key) || label === 'R4-05' || index < 32 ? { dagon: 1 }
    : index < 96 ? { uhf: 0.5, dagon: 0.5 } : { uhf: 1 };
  galaxyManager.replaceSectorControl(sector.key, control);
});
document.getElementById('space-tab').classList.remove('hidden');
tabManager.activateTab('space');
galaxyManager.refreshUIVisibility();
spaceSubtabManager.activate('space-galaxy');
updateGalaxyUI({ force: true });

const cache = galaxyUICache;
const core = cache.hexElements.find(hex => hex.dataset.displayName === 'Core');
cache.mapState.userInteracted = true;
cache.mapState.deferredCenter = false;
cache.mapState.scale = 1.1;
cache.mapState.offsetX = cache.mapCanvas.clientWidth / 2 - core.galaxyCenterX * cache.mapState.scale;
cache.mapState.offsetY = cache.mapCanvas.clientHeight / 2 - core.galaxyCenterY * cache.mapState.scale;
updateGalaxyMapTransform(cache);
