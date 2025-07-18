const realSetTimeout = global.setTimeout;
const realClearTimeout = global.clearTimeout;

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => realSetTimeout(cb, 0);
}
if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => realClearTimeout(id);
}

if (typeof global.window !== 'undefined') {
  if (typeof global.window.requestAnimationFrame === 'undefined') {
    global.window.requestAnimationFrame = global.requestAnimationFrame;
  }
  if (typeof global.window.cancelAnimationFrame === 'undefined') {
    global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  }
}
