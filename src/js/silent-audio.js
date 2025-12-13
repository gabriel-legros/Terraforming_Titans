let silentLoopAudioElement;
let silentLoopAudioInitialized = false;

const backgroundSilenceDataUri = 'data:audio/wav;base64,UklGRgxFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YehEAAAAAB8APgBdAHwAmgC3ANQA8AALASUBPgFVAWsBgAGTAaUBtQHDAdAB2wHjAeoB7wHyAfMB8wHwAesB5AHcAdEBxQG3AacBlQGCAW4BWAFAASgBDgHzANcAugCdAH8AYABCACIAAwDl/8b/p/+I/2r/TP8v/xP/+P7e/sX+rf6X/oL+b/5d/k3+Pv4x/if+Hf4W/hH+Dv4N/g3+EP4U/hv+I/4u/jr+SP5X/mj+e/6Q/qb+vf7V/u/+Cv8m/0L/YP9+/5z/u//a//n/GAA3AFYAdQCTALEAzQDqAAUBHwE4AVABZgF8AY8BoQGyAcABzQHYAeIB6QHuAfIB8wHzAfEB7AHmAd4B1AHIAboBqwGaAYcBcwFdAUYBLQEUAfkA3gDBAKQAhgBnAEkAKQAKAOz/zf+u/4//cf9T/zb/Gv/+/uT+y/6z/pz+h/5z/mH+UP5B/jT+Kf4f/hj+Ev4O/g3+Df4P/hP+Gf4h/iv+N/5E/lP+ZP53/ov+of64/tD+6f4E/x//PP9Z/3f/lf+0/9P/8v8RADAATwBuAIwAqgDHAOMA/wAZATIBSwFhAXcBiwGdAa4BvQHKAdYB4AHnAe0B8QHzAfMB8QHtAegB4AHWAcsBvQGuAZ4BiwF3AWIBSwEzARoB/wDkAMgAqwCNAG4AUAAxABEA8//U/7X/lv93/1r/PP8g/wT/6v7Q/rj+of6M/nf+Zf5U/kX+N/4r/iH+Gf4T/g/+Df4N/g7+Ev4Y/h/+Kf40/kH+UP5g/nP+hv6c/rL+yv7j/v7+Gf81/1L/cP+O/63/zP/r/wkAKQBIAGcAhQCjAMAA3QD5ABMBLQFFAVwBcgGGAZkBqgG6AcgB0wHeAeYB7AHxAfMB8wHyAe4B6QHiAdkBzQHBAbIBogGQAXwBZwFQATkBIAEFAeoAzgCxAJQAdQBXADgAGAD6/9v/vP+d/37/YP9D/yb/C//w/tb+vf6m/pD+fP5p/lj+SP46/i7+I/4b/hT+EP4N/g3+Dv4R/hb+Hf4m/jH+Pv5M/lz+bv6C/pf+rf7F/t3++P4T/y//S/9p/4f/pv/F/+T/AgAiAEEAYAB+AJwAugDXAPIADQEnAUABVwFtAYIBlQGnAbYBxQHRAdsB5AHrAfAB8wHzAfIB7wHqAeQB2wHQAcQBtQGlAZQBgQFsAVYBPgElAQsB8QDVALgAmgB8AF4APwAgAAAA4v/D/6T/hf9n/0n/Lf8R//b+3P7D/qv+lf6A/m3+W/5L/j3+MP4m/h3+Fv4R/g7+Df4N/hD+Ff4c/iT+L/47/kn+Wf5q/n3+kv6o/r/+2P7y/gz/KP9F/2L/gP+f/77/3f/8/xsAOgBZAHcAlgCzANAA7AAHASEBOgFSAWgBfQGRAaMBswHCAc4B2QHiAeoB7wHyAfMB8wHwAewB5QHdAdMBxwG5AakBmAGFAXEBWwFEASsBEQH3ANsAvgChAIMAZQBGACcABwDp/8r/q/+M/27/UP8z/xf//P7i/sj+sf6a/oX+cf5f/k/+QP4z/ij+H/4X/hL+Dv4N/g3+D/4U/hr+Iv4s/jj+Rv5V/mb+ef6N/qP+uv7S/uz+Bv8i/z7/XP95/5j/t//W//X/EwAzAFIAcACPAK0AygDmAAEBHAE1AU0BYwF5AY0BnwGvAb4BzAHXAeAB6AHuAfIB8wHzAfEB7QHnAd8B1QHKAbwBrQGcAYoBdQFgAUkBMQEXAf0A4QDFAKgAigBsAE0ALgAOAPD/0f+y/5P/df9X/zr/Hf8C/+f+zv62/p/+iv52/mP+Uv5D/jb+Kv4h/hn+E/4P/g3+Df4P/hL+GP4g/ir+Nf5C/lH+Yv50/oj+nv60/sz+5v4A/xv/OP9V/3P/kf+w/8//7v8MACwASwBqAIgApgDDAN8A+wAWAS8BRwFeAXQBiAGbAawBuwHJAdQB3gHmAe0B8QHzAfMB8gHuAegB4QHYAcwBvwGxAaABjgF6AWUBTgE2AR0BAwHoAMwArwCRAHMAVAA1ABYA9//Y/7n/mv97/17/QP8k/wj/7f7U/rv+pP6O/nr+Z/5W/kf+Of4t/iP+Gv4U/hD+Df4N/g7+Ef4X/h7+J/4y/j/+Tv5e/nD+hP6Z/q/+x/7g/vr+Ff8x/07/bP+K/6n/yP/n/wUAJQBEAGMAgQCfALwA2QD1ABABKQFCAVkBbwGEAZcBqAG4AcYB0gHcAeUB6wHwAfMB8wHyAe8B6gHjAdoBzwHCAbQBpAGSAX8BagFUATwBIwEJAe4A0gC1AJgAeQBbADwAHQD+/9//wP+h/4L/ZP9H/yr/Dv/z/tn+wf6p/pP+f/5r/lr+Sv48/i/+Jf4c/hX+EP4N/g3+Dv4Q/hX+HP4l/jD+PP5K/lr+bP5//pT+qv7B/tr+9P4P/yv/SP9l/4P/ov/B/+D///8dAD0AXAB6AJgAtgDTAO8ACgEkAT0BVAFqAX8BkwGkAbQBwwHPAdoB4wHqAe8B8gHzAfMB8AHrAeUB3AHSAcUBtwGoAZYBgwFvAVkBQQEpAQ8B9ADYALwAngCAAGIAQwAkAAQA5v/H/6j/if9r/03/Mf8V//n+3/7G/q/+mP6D/nD+Xv5N/j/+Mv4n/h7+F/4R/g7+Df4N/hD+FP4b/iP+Lf45/kf+Vv5o/nr+j/6l/rz+1P7u/gn/JP9B/17/fP+b/7r/2f/4/xYANgBVAHMAkgCvAMwA6AAEAR4BNwFPAWUBewGOAaABsQHAAc0B2AHhAekB7gHyAfMB8wHxAe0B5gHeAdQByAG7AasBmgGIAXQBXgFHAS8BFQH6AN8AwgClAIcAaQBKACsADADt/87/r/+Q/3L/VP83/xv///7l/sz+tP6d/oj+dP5i/lH+Qv41/in+IP4Y/hL+D/4N/g3+D/4T/hn+If4r/jb+RP5T/mT+dv6K/qD+tv7P/uj+A/8e/zr/V/91/5T/sv/S//H/DwAuAE4AbACLAKkAxgDiAP0AGAExAUoBYAF2AYoBnAGtAbwBygHVAd8B5wHtAfEB8wHzAfEB7gHoAeAB1wHLAb4BrwGeAYwBeAFjAUwBNAEbAQEB5QDJAKwAjgBwAFEAMgATAPT/1f+2/5f/ef9b/z7/If8G/+v+0f65/qL+jP54/mb+Vf5F/jj+LP4i/hr+E/4P/g3+Df4O/hL+F/4f/ij+M/5A/k/+YP5y/oX+m/6x/sn+4v78/hj/NP9R/27/jf+r/8r/6v8IACcARgBlAIQAogC/ANwA9wASASwBRAFbAXEBhgGYAaoBuQHHAdMB3QHlAewB8AHzAfMB8gHvAekB4gHZAc4BwQGzAaIBkAF9AWgBUQE6ASEBBwHrAM8AswCVAHcAWAA5ABoA/P/c/73/nv+A/2L/RP8o/wz/8f7X/r/+p/6R/n3+av5Y/kn+O/4u/iT+G/4V/hD+Df4N/g7+Ef4W/h3+Jv4x/j3+TP5c/m3+gf6W/qz+w/7c/vb+Ef8t/0r/aP+G/6T/w//j/wEAIAA/AF4AfQCbALgA1QDxAAwBJgE/AVYBbAGBAZQBpgG2AcQB0AHbAeQB6wHwAfIB8wHzAfAB6wHkAdsB0QHEAbYBpgGVAYEBbQFXAT8BJwENAfIA1gC5AJwAfgBfAEAAIQACAOP/xP+l/4f/aP9L/y7/Ev/3/t3+xP6s/pb+gf5u/lz+TP4+/jH+Jv4d/hb+Ef4O/g3+Df4Q/hX+G/4k/i7+Ov5I/lj+af58/pH+p/6+/tf+8P4L/yf/RP9h/3//nf+8/9v/+/8ZADgAVwB2AJQAsgDPAOsABgEgATkBUQFnAXwBkAGiAbIBwQHOAdkB4gHpAe8B8gHzAfMB8AHsAeYB3QHTAccBuQGqAZkBhgFyAVwBRQEsARMB+ADcAMAAogCFAGYARwAoAAkA6v/L/6z/jf9v/1H/NP8Y//3+4/7K/rL+m/6G/nL+YP5P/kH+NP4o/h/+GP4S/g7+Df4N/g/+E/4a/iL+LP43/kX+VP5l/nj+jP6i/rn+0f7q/gX/If89/1r/eP+W/7X/1P/0/xIAMQBQAG8AjQCrAMgA5QAAARoBNAFMAWIBeAGMAZ4BrwG+AcsB1gHgAegB7gHxAfMB8wHxAe0B5wHfAdYBygG9Aa4BnQGKAXYBYQFKATIBGQH+AOMAxgCpAIsAbQBOAC8AEADy/9L/s/+U/3b/WP87/x//A//p/s/+t/6g/ov+dv5k/lP+RP42/iv+If4Z/hP+D/4N/g3+Dv4S/hj+IP4p/jT+Qv5R/mH+c/6H/p3+s/7L/uT+//4a/zb/U/9x/5D/rv/N/+3/CwAqAEkAaACHAKQAwgDeAPoAFAEuAUYBXQFzAYcBmgGrAboByAHUAd4B5gHsAfEB8wHzAfIB7gHpAeEB2AHNAcABsQGhAY8BewFmAU8BOAEeAQQB6QDNALAAkgB0AFUANgAXAPn/2f+6/5v/ff9f/0L/Jf8J/+/+1f68/qX+j/57/mj+V/5H/jn+Lf4j/hv+FP4Q/g3+Df4O/hH+Fv4e/if+Mv4+/k3+Xf5v/oP+mP6u/sb+3/75/hT/MP9N/2r/if+n/8b/5f8EACMAQgBhAIAAngC7ANgA9AAOASgBQQFYAW4BgwGWAacBtwHFAdEB3AHkAesB8AHzAfMB8gHvAeoB4wHaAdABwwG1AaUBkwGAAWsBVQE9ASQBCgHvANMAtwCZAHsAXAA9AB4AAADg/8H/ov+E/2b/SP8r/w//9f7b/sL+qv6U/n/+bP5b/kv+PP4w/iX+HP4W/hH+Dv4N/g3+EP4V/hz+Jf4v/jv+Sv5Z/mv+fv6T/qn+wP7Z/vP+Dv8p/0b/ZP+C/6D/v//e//7/HAA7AFoAeQCXALUA0QDtAAgBIwE7AVMBaQF+AZIBpAG0AcIBzwHaAeMB6gHvAfIB8wHzAfAB7AHlAd0B0gHGAbgBqAGXAYQBcAFaAUMBKgEQAfUA2gC9AKAAggBjAEQAJQAGAOj/yP+p/4v/bP9P/zL/Fv/7/uD+x/6w/pn+hP5w/l7+Tv4//jP+J/4e/hf+Ev4O/g3+Df4P/hT+Gv4i/i3+OP5G/lb+Z/56/o7+pP67/tP+7f4H/yP/QP9d/3v/mf+4/9f/9/8VADQAUwByAJAArgDLAOcAAgEdATYBTgFkAXoBjQGgAbABvwHMAdcB4QHoAe4B8gHzAfMB8QHtAecB3wHVAckBuwGsAZsBiQF0AV8BSAEwARYB/ADgAMQApgCJAGoASwAsAA0A7//P/7D/kv9z/1X/OP8c/wH/5v7N/rX+nv6J/nX+Yv5S/kP+Nf4q/iD+GP4T/g/+Df4N/g/+E/4Z/iD+Kv42/kP+Uv5j/nX+if6f/rX+zv7n/gH/Hf85/1b/dP+S/7H/0P/v/w4ALQBMAGsAiQCnAMQA4QD8ABcBMAFIAV8BdQGJAZwBrQG8AckB1QHfAecB7QHxAfMB8wHyAe4B6AHhAdcBzAG/AbABnwGNAXkBZAFNATUBHAECAeYAygCtAI8AcQBSADMAFAD2/9f/t/+Z/3r/XP8//yL/B//s/tP+uv6j/o3+ef5m/lX+Rv44/iz+Iv4a/hT+D/4N/g3+Dv4S/hf+Hv4o/jP+QP5O/l/+cf6E/pr+sP7I/uH++/4W/zP/T/9t/4v/qv/J/+j/BwAmAEUAZACCAKAAvgDaAPYAEQErAUMBWgFwAYUBmAGpAbgBxgHSAd0B5QHsAfAB8wHzAfIB7wHqAeMB2QHPAcIBswGjAZEBfgFpAVMBOwEiAQgB7QDRALQAlgB4AFkAOgAbAP3/3v++/6D/gf9j/0b/Kf8N//L+2P7A/qj+kv5+/mv+Wf5J/jv+L/4k/hz+Ff4Q/g3+Df4O/hH+Fv4d/iX+MP49/kv+W/5t/oD+lf6r/sL+2/71/hD/LP9J/2b/hP+j/8L/4f8=';

function initializeSilentLoopAudio() {
  if (silentLoopAudioInitialized) {
    return;
  }
  silentLoopAudioInitialized = true;

  const audioElement = document.createElement('audio');
  audioElement.src = backgroundSilenceDataUri;
  audioElement.loop = true;
  audioElement.volume = 0.02;
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
  silentLoopAudioElement.volume = 0.02;
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
