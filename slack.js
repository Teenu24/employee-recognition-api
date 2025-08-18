// slack.js
const https = require('https');

function postToSlack(rec) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return Promise.resolve();

  const payload = {
    text: `🎉 *New recognition* for <@${rec.recipientId}>:\n> ${rec.message} ${rec.emoji || ''}\n_Visibility: ${rec.visibility}_`
  };

  return new Promise((resolve, reject) => {
    const { hostname, pathname } = new URL(url);
    const data = Buffer.from(JSON.stringify(payload));

    const req = https.request({
      hostname,
      path: pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => { res.on('data', () => {}); res.on('end', resolve); });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { postToSlack };
