const fs = require('fs');
const p = 'src/common/components/StatusCard.jsx';
let c = fs.readFileSync(p, 'utf8');
const map = {
  '\u00f0\u0178\u0161\u2014': '\u{1F697}',
  '\u00f0\u0178\u0178\u00a2': '\u{1F7E2}',
  '\u00f0\u0178\u201d\u00b4': '\u{1F534}',
  '\u00f0\u0178\u201d\u2018': '\u{1F511}',
  '\u00f0\u0178\u201d\u2019': '\u{1F512}',
  '\u00f0\u0178\u201d\u201c': '\u{1F513}',
  '\u00f0\u0178\u0161\u2122': '\u{1F699}',
  '\u00f0\u0178\u201d\u00a2': '\u{1F522}',
};
for (const [k, v] of Object.entries(map)) {
  c = c.split(k).join(v);
}
fs.writeFileSync(p, c, 'utf8');
console.log('OK');
