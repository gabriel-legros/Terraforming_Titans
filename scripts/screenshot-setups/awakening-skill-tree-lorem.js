hideLoadingOverlay();
document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
window.popupActive = false;

setLanguageData({
  ui: {
    skills: {
      common: {
        rank: 'Ullamco {current}Dolor{max}',
        cost: 'Adipiscing: {value}',
        max: 'Velit',
        valueProgress: '{current} Non {next}',
        shipEfficiencyValue: 'Magna{value} Consequat duis',
        lifeDesignValue: 'Magna{points} Duis{percent}Elit',
      },
    },
  },
});
applyLanguageToDom();

document.getElementById('hope-tab').classList.remove('hidden');
document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
document.getElementById('hope').classList.add('active');
document.getElementById('awakening-hope').classList.remove('hidden');
document.getElementById('awakening-hope').classList.add('active');

const skill = skillManager.skills.build_cost;
skill.unlocked = true;
skill.rank = skill.maxRank;
initializeSkillsUI();
updateSkillTreeUI();
queueSkillRedraw();
