function renderOrbitalRingUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('orbital-ring-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Orbital Ring</span>
    </div>
    <div class="card-body">
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-label">Rings Built:</span><span id="or-rings-built"></span></div>
        <div class="stat-item"><span class="stat-label">Max Rings:</span><span id="or-max-rings"></span></div>
        <div class="stat-item"><span class="stat-label">Current World Ring:</span><span id="or-current-world"></span></div>
      </div>
    </div>`;
  container.appendChild(card);

  projectElements[project.name] = {
    ...projectElements[project.name],
    ringCard: card,
    ringsBuiltDisplay: card.querySelector('#or-rings-built'),
    maxRingsDisplay: card.querySelector('#or-max-rings'),
    currentWorldDisplay: card.querySelector('#or-current-world'),
  };
}

function updateOrbitalRingUI(project) {
  const els = projectElements[project.name];
  if (!els) return;

  els.ringsBuiltDisplay.textContent = project.ringCount;
  const terraformedWorlds =
    typeof spaceManager !== 'undefined' && typeof spaceManager.getUnmodifiedTerraformedWorldCount === 'function'
      ? spaceManager.getUnmodifiedTerraformedWorldCount()
      : 0;
  els.maxRingsDisplay.textContent = terraformedWorlds;
  els.currentWorldDisplay.textContent = project.currentWorldHasRing ? 'Yes' : 'No';
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderOrbitalRingUI = renderOrbitalRingUI;
  globalThis.updateOrbitalRingUI = updateOrbitalRingUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderOrbitalRingUI, updateOrbitalRingUI };
}