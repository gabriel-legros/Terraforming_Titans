hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;
if (!isGamePaused()) togglePause();

galaxyManager.initialize();
galaxyManager.enabled = true;
galaxyInvasionManager.enabled = true;
galaxyInvasionManager.dagon.enabled = true;
galaxyInvasionManager.dagon.started = true;
galaxyInvasionManager.dagon.prometheusRepaired = true;
galaxyInvasionManager.dagon.severedTentacles = galaxyInvasionManager.dagon.tentacles.map(tentacle => tentacle.id);
const scene = Number(new URLSearchParams(location.search).get('dagonScene') ?? 7);
galaxyInvasionManager.dagon.scene = scene;
galaxyManager.hasEverControlledWholeGalaxyFlag = true;
storyManager.completedEventIds.add('chapterA.4');
galaxyManager.getFaction('uhf').fleetCapacity = 500000;
galaxyManager.getFaction('dagon').fleetCapacity = 1000000;
galaxyManager.getFaction('dagon').fleetPower = 860000;
const sectors = galaxyManager.getSectors();
sectors.forEach((sector, index) => galaxyManager.replaceSectorControl(sector.key,
  index < 32 ? { dagon: 1 } : index < 96 ? { uhf: 0.5, dagon: 0.5 } : { uhf: 1 }));
resources.colony.advancedResearch.productionRate = 1e18;
resources.colony.advancedResearch.value = 1e23;

document.getElementById('space-tab').classList.remove('hidden');
tabManager.activateTab('space');
galaxyInvasionManager.refreshUIVisibility();
spaceSubtabManager.activate('space-invasion');
galacticInvasionUICache.training.section.classList.add('collapsed');
updateGalacticInvasionUI({ force: true });
galacticInvasionUICache.dagon.cutscene.showScene(scene);
