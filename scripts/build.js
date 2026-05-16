// Build: read content/writing/*.md, generate writing/<slug>.html and inject the
// writing list into index.html between <!-- WRITING_LIST_START --> markers.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'writing');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'article.html');
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'writing');

const PLACEHOLDERS = [
  { title: 'Why Dortmund Are Comfortable Losing Youth Games' },
  { title: 'The IDP Is Not the Development Plan' },
  { title: 'Why Video Analysis Should Start With the Player&rsquo;s Eyes' },
  { title: 'The Best Clubs Move Players Before They Label Them' },
  { title: 'Selection Meetings Should Ask Better Questions' },
  { title: 'Culture Is Built in Small Interactions' },
  { title: 'Conflict Is Not the Problem' }
];

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadEntries() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
      const { data, content } = matter(raw);
      return {
        file: f,
        title: data.title || 'Untitled',
        slug: data.slug || f.replace(/\.md$/, '').replace(/^\d+-/, ''),
        order: typeof data.order === 'number' ? data.order : 999,
        status: (data.status || 'coming-soon').toLowerCase(),
        date: data.date ? String(data.date) : '',
        date_label: data.date_label || '',
        deck: data.deck || '',
        read_time: data.read_time || '5 min read',
        body: content
      };
    })
    .sort((a, b) => a.order - b.order);
}

function renderArticle(entry, template) {
  const bodyHtml = marked.parse(entry.body, { breaks: false });
  return template
    .replace(/\{\{title\}\}/g, escapeHtml(entry.title))
    .replace(/\{\{deck\}\}/g, escapeHtml(entry.deck))
    .replace(/\{\{date_label\}\}/g, escapeHtml(entry.date_label))
    .replace(/\{\{read_time\}\}/g, escapeHtml(entry.read_time))
    .replace(/\{\{order_padded\}\}/g, String(entry.order).padStart(2, '0'))
    .replace(/\{\{body\}\}/g, bodyHtml);
}

function buildArticles(entries, template) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clean previously-generated files (only files we own — .html in OUT_DIR)
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT_DIR, f));
  }
  let liveCount = 0;
  for (const entry of entries) {
    if (entry.status !== 'live') continue;
    const html = renderArticle(entry, template);
    fs.writeFileSync(path.join(OUT_DIR, `${entry.slug}.html`), html);
    liveCount++;
  }
  return liveCount;
}

function buildWritingList(entries) {
  const items = [];
  let n = 0;
  for (const entry of entries) {
    if (entry.status !== 'live') continue;
    n++;
    const num = String(n).padStart(2, '0');
    const meta = entry.date_label || entry.date || 'Live';
    items.push(`      <li class="writing-item">
        <div class="writing-num">${num}</div>
        <div class="writing-body">
          <a href="writing/${escapeHtml(entry.slug)}.html" class="writing-title-link"><h3 class="writing-title">${escapeHtml(entry.title)}</h3></a>
          <p class="writing-meta">${escapeHtml(meta)}</p>
        </div>
      </li>`);
  }
  return items.join('\n');
}

function injectIntoIndex(listHtml) {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  const start = '<!-- WRITING_LIST_START -->';
  const end = '<!-- WRITING_LIST_END -->';
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!re.test(html)) {
    throw new Error(`index.html is missing ${start} / ${end} markers`);
  }
  html = html.replace(re, `${start}\n${listHtml}\n      ${end}`);
  fs.writeFileSync(INDEX_PATH, html);
}

function main() {
  const entries = loadEntries();
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const liveCount = buildArticles(entries, template);
  const listHtml = buildWritingList(entries);
  injectIntoIndex(listHtml);
  console.log(`Built ${liveCount} article page(s) from ${entries.length} entr(ies). Writing list updated.`);
}

main();
