let silentLoopAudioElement;
let silentLoopAudioInitialized = false;

const backgroundWhiteNoiseSrc = 'assets/white_noise/weak_white_noise_-60dBFS_60s_22k.wav';
// One second of silent mono PCM: 8-bit samples at 8 kHz, with a WAV header.
const backgroundSilenceDataUri = 'data:audio/wav;base64,' + btoa(
  'RIFFd\x1f\0\0WAVEfmt \x10\0\0\0\x01\0\x01\0@\x1f\0\0@\x1f\0\0\x01\0\x08\0data@\x1f\0\0'
  + '\x80'.repeat(8000)
);
const isFirefoxBrowser = !!navigator?.userAgent?.toLowerCase().includes('firefox');
const defaultLoopVolume = 0.25;
const firefoxLoopVolume = 0.02;
const backgroundLoopVolume = isFirefoxBrowser ? firefoxLoopVolume : defaultLoopVolume;

function initializeSilentLoopAudio() {
  if (silentLoopAudioInitialized) {
    return;
  }
  silentLoopAudioInitialized = true;

  const audioElement = document.createElement('audio');
  audioElement.src = backgroundWhiteNoiseSrc;
  audioElement.addEventListener(
    'error',
    () => {
      audioElement.src = backgroundSilenceDataUri;
    },
    { once: true }
  );
  audioElement.loop = true;
  audioElement.volume = backgroundLoopVolume;
  audioElement.autoplay = true;
  audioElement.playsInline = true;
  audioElement.style.display = 'none';
  audioElement.setAttribute('aria-hidden', 'true');

  const startPlayback = () => {
    if (audioElement.paused) {
      audioElement.play().catch(() => {});
    }
  };

  audioElement.addEventListener('canplaythrough', startPlayback, { once: true });
  document.addEventListener('pointerdown', startPlayback, { once: true });
  document.addEventListener('keydown', startPlayback, { once: true });
  silentLoopAudioElement = audioElement;
  document.body.appendChild(audioElement);
  startPlayback();
}

function startBackgroundSilence() {
  if (!GAME_FEATURES.whiteNoiseKeepAlive) {
    return;
  }
  initializeSilentLoopAudio();
  if (!silentLoopAudioElement) {
    return;
  }
  silentLoopAudioElement.volume = backgroundLoopVolume;
  silentLoopAudioElement.muted = false;
  silentLoopAudioElement.play().catch(() => {});
}

function stopBackgroundSilence() {
  if (!silentLoopAudioElement) {
    return;
  }
  silentLoopAudioElement.pause();
  silentLoopAudioElement.currentTime = 0;
  silentLoopAudioElement.muted = true;
}
