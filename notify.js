// notify.js

const queue = [];

function enqueueNotification(recognition) {
  queue.push({ at: Date.now(), recognition });
}

async function flushQueue(sendFn = console.log) {
  while (queue.length > 0) {
    const { recognition } = queue.shift();
    try {
      await sendFn(recognition);
    } catch (err) {
      console.error('Error sending batched notification:', err);
    }
  }
}

function startBatchFlusher(sendFn, intervalMs = 10 * 60 * 1000) {
  setInterval(() => {
    flushQueue(sendFn);
  }, intervalMs);
}

module.exports = {
  enqueueNotification,
  flushQueue,
  startBatchFlusher
};
