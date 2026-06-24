const GAME_BUILD_TARGET = 'steam';
const STEAM_APP_ID = 4876760;
const GAME_FEATURES = {
    patienceDailyClaimButton: GAME_BUILD_TARGET === 'steam',
    patienceDailyRewardFromExport: GAME_BUILD_TARGET === 'browser',
    whiteNoiseKeepAlive: GAME_BUILD_TARGET === 'browser',
    exitSaveSlot: GAME_BUILD_TARGET !== 'browser'
};
