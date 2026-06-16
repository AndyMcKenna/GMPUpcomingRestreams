const https = require('https');
const fs = require('fs');
const { parse } = require('node-html-parser');

const SHEET_URL =
  'https://docs.google.com/spreadsheets/u/1/d/e/' +
  '2PACX-1vSJ-B6h72_epsAspcV2lgVz79Iz8_FoD6wskeNh_qMQbIE8h0fN6gdRuSKX9efmBeA6m3swCS_ObId6' +
  '/pubhtml/sheet?headers=false&gid=793349505';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const html = await fetchHtml(SHEET_URL);
  const root = parse(html);

  const lines = [];
  for (const row of root.querySelectorAll('tbody tr')) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 9) continue;

    const date = cells[0].text.trim();
    const time = cells[1].text.trim();
    const racer1 = cells[2].text.trim();
    const racer2 = cells[5].text.trim();
    const restreamer = cells[8].text.trim();

    if (!date || !/^\d+\/\d+\/\d{4}$/.test(date) || !restreamer) continue;

    lines.push(`${date}  ${time}  ${racer1} vs ${racer2}`);
  }

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(
    'docs/index.html',
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre>\n${lines.join('\n')}\n</pre></body></html>`
  );

  console.log(`Built ${lines.length} restream entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
