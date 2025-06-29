class SpaceMirrorFacilityProject extends Project {
  renderUI(container) {
    const mirrorDetails = document.createElement('div');
    mirrorDetails.classList.add('mirror-details');
    mirrorDetails.innerHTML = `
      <p>Mirrors: <span id="num-mirrors">0</span></p>
      <p>Power/Mirror: <span id="power-per-mirror">0</span>W | Per m²: <span id="power-per-mirror-area">0</span>W/m²</p>
      <p>Total Power: <span id="total-power">0</span>W | Per m²: <span id="total-power-area">0</span>W/m²</p>
    `;
    container.appendChild(mirrorDetails);
    projectElements[this.name] = {
      ...projectElements[this.name],
      mirrorDetails: {
        numMirrors: mirrorDetails.querySelector('#num-mirrors'),
        powerPerMirror: mirrorDetails.querySelector('#power-per-mirror'),
        powerPerMirrorArea: mirrorDetails.querySelector('#power-per-mirror-area'),
        totalPower: mirrorDetails.querySelector('#total-power'),
        totalPowerArea: mirrorDetails.querySelector('#total-power-area'),
      },
    };
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements || !elements.mirrorDetails) return;
    const numMirrors = buildings['spaceMirror'].active;
    const mirrorEffect = terraforming.calculateMirrorEffect();
    const powerPerMirror = mirrorEffect.interceptedPower;
    const powerPerMirrorArea = mirrorEffect.powerPerUnitArea;
    const totalPower = powerPerMirror * numMirrors;
    const totalPowerArea = powerPerMirrorArea * numMirrors;

    elements.mirrorDetails.numMirrors.textContent = formatNumber(numMirrors, false, 2);
    elements.mirrorDetails.powerPerMirror.textContent = formatNumber(powerPerMirror, false, 2);
    elements.mirrorDetails.powerPerMirrorArea.textContent = formatNumber(powerPerMirrorArea, false, 2);
    elements.mirrorDetails.totalPower.textContent = formatNumber(totalPower, false, 2);
    elements.mirrorDetails.totalPowerArea.textContent = formatNumber(totalPowerArea, false, 2);
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceMirrorFacilityProject;
}
