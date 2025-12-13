let silentLoopAudioElement;
let silentLoopAudioInitialized = false;

const backgroundWhiteNoiseSrc = 'assets/white_noise/weak_white_noise_-60dBFS_60s_22k.wav';

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
  audioElement.volume = 1;
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
  initializeSilentLoopAudio();
  if (!silentLoopAudioElement) {
    return;
  }
  silentLoopAudioElement.volume = 0.25;
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
