const GAME_BUILD_TARGET = 'browser';
const STEAM_APP_ID = null;
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser',
    exitSaveSlot: GAME_BUILD_TARGET !== 'browser',
    electronWindowControls: GAME_BUILD_TARGET !== 'browser',
    steamExclusiveDominions: GAME_BUILD_TARGET !== 'browser'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_BUILD_TARGET, STEAM_APP_ID, GAME_FEATURES };
}
