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

const HTML = (content, leftAlign = false) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Hylia Serif Beta';
  src: url('fonts/HyliaSerifBeta-Regular.otf') format('opentype');
}
body {
  color: white;
  font-family: 'Hylia Serif Beta', serif;
  font-size: 70px;
  margin: 0;
  padding: 0;
  -webkit-text-stroke: 5px black;
  paint-order: stroke fill;
}
#container {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
#title {
  font-size: 100px;
}
</style>
</head>
<body><div id="container"><div id="title">Upcoming Matches and Events</div><br>${leftAlign ? `<div style="display:inline-block;text-align:left">${content}</div>` : content}<br><br>Thank you for watching!</div></body>
</html>`;

function parseEdtDateTime(dateStr, timeStr) {
  const [month, day, year] = dateStr.split('/').map(Number);
  const timeParts = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (!timeParts) return null;

  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const meridiem = timeParts[3];

  if (meridiem) {
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }

  // EDT is UTC-4
  return new Date(Date.UTC(year, month - 1, day, hours + 4, minutes));
}

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vSJ-B6h72_epsAspcV2lgVz79Iz8_FoD6wskeNh_qMQbIE8h0fN6gdRuSKX9efmBeA6m3swCS_ObId6' +
  '/pub?output=csv&gid=793349505';

const LIVE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Hylia Serif Beta';
  src: url('fonts/HyliaSerifBeta-Regular.otf') format('opentype');
}
body {
  color: white;
  font-family: 'Hylia Serif Beta', serif;
  font-size: 70px;
  margin: 0;
  padding: 0;
  -webkit-text-stroke: 5px black;
  paint-order: stroke fill;
}
#container {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
#title {
  font-size: 100px;
}
</style>
</head>
<body>
<div id="container">
  <div id="title">Upcoming Matches and Events</div>
  <br>
  <div style="display:inline-block;text-align:left" id="content"></div>
  <br><br>
  Thank you for watching!
</div>
<script>
const CSV_URL = '${CSV_URL}';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function parseEdtDateTime(dateStr, timeStr) {
  const [month, day, year] = dateStr.split('/').map(Number);
  const timeParts = timeStr.match(/^(\\d+):(\\d+)\\s*(AM|PM)?$/i);
  if (!timeParts) return null;
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const meridiem = timeParts[3];
  if (meridiem) {
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  return new Date(Date.UTC(year, month - 1, day, hours + 4, minutes));
}

async function refresh() {
  try {
    const resp = await fetch(CSV_URL);
    const text = await resp.text();
    const rows = text.trim().split('\\n').map(parseCSVLine);
    const now = new Date();
    const lines = [];
    for (const cells of rows) {
      if (cells.length < 9) continue;
      const rawDate = cells[0].trim();
      if (!rawDate || !/^\\d+\\/\\d+\\/\\d{4}$/.test(rawDate) || !cells[8].trim()) continue;
      const [month, day] = rawDate.split('/');
      const time = cells[1].trim();
      const eventDate = parseEdtDateTime(rawDate, time);
      if (eventDate && eventDate < now) continue;
      const racer1 = cells[2].trim();
      const racer2 = cells[5].trim();
      lines.push(month + '/' + day + '  ' + time + ' EDT  ' + racer1 + ' vs ' + racer2);
      if (lines.length === 5) break;
    }
    document.getElementById('content').innerHTML = lines.length
      ? lines.join('<br>')
      : 'Check the Discord for the schedule<br>and upcoming matches';
  } catch (e) {
    console.error(e);
  }
}

refresh();
setInterval(refresh, 5 * 60 * 1000);
</script>
</body>
</html>`;

async function main() {
  const html = await fetchHtml(SHEET_URL);
  const root = parse(html);

  const now = new Date();
  const lines = [];
  for (const row of root.querySelectorAll('tbody tr')) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 9) continue;

    const rawDate = cells[0].text.trim();
    if (!rawDate || !/^\d+\/\d+\/\d{4}$/.test(rawDate) || !cells[8].text.trim()) continue;

    const [month, day] = rawDate.split('/');
    const date = `${month}/${day}`;
    const time = cells[1].text.trim();

    const eventDate = parseEdtDateTime(rawDate, time);
    if (eventDate && eventDate < now) continue;
    const racer1 = cells[2].text.trim();
    const racer2 = cells[5].text.trim();

    lines.push(`${date}  ${time} EDT  ${racer1} vs ${racer2}`);
    if (lines.length === 5) break;
  }

  const content = lines.length
    ? lines.join('<br>')
    : 'Check the Discord for the schedule<br>and upcoming matches';

  fs.mkdirSync('docs/fonts', { recursive: true });
  fs.copyFileSync('fonts/HyliaSerifBeta-Regular.otf', 'docs/fonts/HyliaSerifBeta-Regular.otf');
  fs.writeFileSync('docs/index.html', HTML(content));
  fs.writeFileSync('docs/left.html', HTML(content, true));
  fs.writeFileSync('docs/live.html', LIVE_HTML);

  console.log(`Built ${lines.length} restream entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
