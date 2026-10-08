import fs from 'node:fs';

const input = 'owner-information-questionnaire.html';
const output = 'Grand-Central-Owner-Information-Questionnaire.pdf';
let html = fs.readFileSync(input, 'utf8');

html = html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
  .replace(/<tr[^>]*>/gi, '\n')
  .replace(/<\/tr>/gi, '\n')
  .replace(/<t[dh][^>]*>/gi, ' | ')
  .replace(/<\/t[dh]>/gi, '')
  .replace(/<(p|div|section|table|ol|ul|br)[^>]*>/gi, '\n')
  .replace(/<\/(p|div|section|table|ol|ul)>/gi, '\n')
  .replace(/<span class="check">/gi, '[ ] ')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
  .replace(/&ndash;|&mdash;/g, '-').replace(/&nbsp;/g, ' ')
  .replace(/&#x2610;|☐/g, '[ ]')
  .replace(/\r/g, '')
  .split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);

const wrap = (text, width) => {
  const words = text.split(' '), out = []; let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
};

const pages = []; let page = [];
for (const raw of html) {
  const heading = raw.startsWith('#');
  const text = raw.replace(/^#{1,3}\s*/, '');
  const width = heading ? 72 : 96;
  const lines = wrap(text, width);
  const needed = lines.length + (heading ? 1 : 0);
  if (page.length + needed > 53) { pages.push(page); page = []; }
  if (heading && page.length) page.push({ text:'', size:10, bold:false });
  for (const line of lines) page.push({ text:line, size: raw.startsWith('# ') ? 20 : raw.startsWith('## ') ? 15 : raw.startsWith('### ') ? 11 : 9.5, bold:heading });
}
if (page.length) pages.push(page);

const esc = s => s.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
const objects = [null];
const add = body => { objects.push(body); return objects.length - 1; };
const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
const pageIds = [];
const contentIds = [];

for (let p = 0; p < pages.length; p++) {
  let y = 800; const cmds = ['BT'];
  for (const item of pages[p]) {
    if (!item.text) { y -= 5; continue; }
    const font = item.bold ? 'F2' : 'F1';
    cmds.push(`/${font} ${item.size} Tf`, `1 0 0 1 48 ${y.toFixed(1)} Tm`, `(${esc(item.text)}) Tj`);
    y -= item.size * (item.bold ? 1.45 : 1.32);
  }
  cmds.push('/F1 8 Tf', `1 0 0 1 48 25 Tm`, `(Grand Central Auckland - Owner Questionnaire | Page ${p + 1} of ${pages.length}) Tj`, 'ET');
  const stream = cmds.join('\n');
  contentIds.push(add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`));
  pageIds.push(add('PENDING_PAGE'));
}
const pagesId = add('PENDING_PAGES');
for (let i = 0; i < pageIds.length; i++) {
  objects[pageIds[i]] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
}
objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`;
const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

let pdf = '%PDF-1.4\n%GCQ1\n'; const offsets = [0];
for (let i = 1; i < objects.length; i++) { offsets[i] = Buffer.byteLength(pdf); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
fs.writeFileSync(output, pdf, 'binary');
console.log(`${output}\t${pages.length} pages\t${Buffer.byteLength(pdf)} bytes`);
