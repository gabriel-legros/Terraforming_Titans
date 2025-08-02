function renderSpaceStorageUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('space-storage-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Space Storage</span>
    </div>
    <div class="card-body">
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-label">Used Storage:</span><span id="ss-used"></span></div>
        <div class="stat-item"><span class="stat-label">Max Storage:</span><span id="ss-max"></span></div>
      </div>
    </div>`;
  container.appendChild(card);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max')
  };
}

function updateSpaceStorageUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  if (els.storageCard) {
    els.storageCard.style.display = project.isCompleted ? 'block' : 'none';
  }
  if (els.usedDisplay) {
    els.usedDisplay.textContent = formatNumber(project.usedStorage, false, 0);
  }
  if (els.maxDisplay) {
    els.maxDisplay.textContent = formatNumber(project.maxStorage, false, 0);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderSpaceStorageUI = renderSpaceStorageUI;
  globalThis.updateSpaceStorageUI = updateSpaceStorageUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderSpaceStorageUI, updateSpaceStorageUI };
}
