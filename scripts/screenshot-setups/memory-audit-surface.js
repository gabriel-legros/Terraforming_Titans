const saveText = await fetch('/test_saves/debug/memory_test_file.json').then(response => response.text());
loadGame(saveText, true, { skipRender: true });
updateRender.lastDelta = 0;
updateRender(true, { forceAllSubtabs: true });

const safetyButton = document.querySelector('.system-choice-popup-button-yes');
if (safetyButton) safetyButton.click();
for (let index = 0; index < 10; index += 1) {
  const closeButton = document.querySelector('.popup-close-button');
  if (!closeButton) break;
  skipActivePopupTyping();
  closeButton.click();
}

setGameSpeedChoice(0);
const surface = new URLSearchParams(window.location.search).get('surface') || 'solis';
const targets = {
  solis: ['hope', 'solis-hope'],
  automation: ['hope', 'automation-hope'],
  summary: ['terraforming', 'summary-terraforming'],
  galaxy: ['space', 'space-galaxy'],
  artificial: ['space', 'space-artificial'],
  projects: ['special-projects', 'giga-projects']
};
const target = targets[surface];
document.querySelector(`.tab[data-tab="${target[0]}"]`).click();
document.querySelector(`[data-subtab="${target[1]}"]`).click();
updateRender.lastDelta = 0;
updateRender(false, { forceAllSubtabs: false });
