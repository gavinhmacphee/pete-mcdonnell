// Build: read content/writing/*.md, generate writing/<slug>.html and inject the
// writing list + site content (from content/site.json) into index.html
// between marker comments.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'writing');
const SITE_JSON = path.join(ROOT, 'content', 'site.json');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'article.html');
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'writing');

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

function loadSite() {
  if (!fs.existsSync(SITE_JSON)) return null;
  try { return JSON.parse(fs.readFileSync(SITE_JSON, 'utf8')); }
  catch (e) { throw new Error(`Failed to parse ${SITE_JSON}: ${e.message}`); }
}

function buildAboutHtml(about) {
  if (!about) return '';
  const heading = `<h2>${escapeHtml(about.heading || '')}</h2>`;
  const paras = (about.paragraphs || []).map(p => `      <p>${escapeHtml(p)}</p>`).join('\n');
  return `      ${heading}\n${paras}`;
}

function buildRecordItemsHtml(items) {
  if (!items || !items.length) return '';
  return items.map(it => `          <li>
            <span class="record-year">${escapeHtml(it.tag || '')}</span>
            <div class="record-detail">
              <h4>${escapeHtml(it.title || '')}</h4>
              <p>${escapeHtml(it.subtitle || '')}</p>
            </div>
          </li>`).join('\n');
}

function injectBetween(html, startMarker, endMarker, replacement) {
  const re = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (!re.test(html)) {
    throw new Error(`index.html is missing ${startMarker} / ${endMarker} markers`);
  }
  return html.replace(re, `${startMarker}\n${replacement}\n      ${endMarker}`);
}

function injectIntoIndex(listHtml, site) {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = injectBetween(html, '<!-- WRITING_LIST_START -->', '<!-- WRITING_LIST_END -->', listHtml);
  if (site) {
    if (site.about) {
      html = injectBetween(html, '<!-- ABOUT_START -->', '<!-- ABOUT_END -->', buildAboutHtml(site.about));
    }
    if (site.qualifications) {
      html = injectBetween(html, '<!-- QUALIFICATIONS_START -->', '<!-- QUALIFICATIONS_END -->', buildRecordItemsHtml(site.qualifications));
    }
    if (site.achievements) {
      html = injectBetween(html, '<!-- ACHIEVEMENTS_START -->', '<!-- ACHIEVEMENTS_END -->', buildRecordItemsHtml(site.achievements));
    }
  }
  fs.writeFileSync(INDEX_PATH, html);
}

function main() {
  const entries = loadEntries();
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const site = loadSite();
  const liveCount = buildArticles(entries, template);
  const listHtml = buildWritingList(entries);
  injectIntoIndex(listHtml, site);
  console.log(`Built ${liveCount} article page(s) from ${entries.length} entr(ies). Site content${site ? ' + writing list' : ''} updated.`);
}

main();
