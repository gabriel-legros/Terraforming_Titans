hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

terraformingGraphsManager.show();
terraformingGraphsManager.selectGraph('phase');
terraformingGraphsManager.selectPhaseDiagram('water');
