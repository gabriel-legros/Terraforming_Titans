hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

document.getElementById('special-projects-tab').classList.remove('hidden');
tabManager.activateTab('special-projects');

const project = projectManager.projects.oreSpaceMining;
project.unlocked = true;
project.assignedSpaceships = 100;
project.autoStart = true;
project.isActive = false;
project.isContinuous = () => true;

activateProjectSubtab('resources-projects');
updateProjectUI('oreSpaceMining');
