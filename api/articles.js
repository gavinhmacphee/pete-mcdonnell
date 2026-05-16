const matter = require('gray-matter');
const { requireAuth, readBody } = require('../lib/auth');
const { getFile, listDir, writeFile, deleteFile } = require('../lib/github');

const DIR = 'content/writing';

function fileNameFor(order, slug) {
  const padded = String(order).padStart(2, '0');
  return `${padded}-${slug}.md`;
}

function buildFrontmatter(meta, body) {
  const stringify = require('gray-matter').stringify;
  return stringify(body || '', meta);
}

async function listArticles() {
  const entries = await listDir(DIR);
  const mdFiles = entries.filter(e => e.type === 'file' && e.name.endsWith('.md'));
  const articles = await Promise.all(mdFiles.map(async f => {
    const file = await getFile(`${DIR}/${f.name}`);
    if (!file) return null;
    const { data } = matter(file.content);
    return {
      filename: f.name,
      sha: file.sha,
      title: data.title || 'Untitled',
      slug: data.slug || f.name.replace(/^\d+-/, '').replace(/\.md$/, ''),
      order: typeof data.order === 'number' ? data.order : 999,
      status: data.status || 'coming-soon',
      date_label: data.date_label || ''
    };
  }));
  return articles.filter(Boolean).sort((a, b) => a.order - b.order);
}

async function getArticle(filename) {
  const file = await getFile(`${DIR}/${filename}`);
  if (!file) return null;
  const { data, content } = matter(file.content);
  return { filename, sha: file.sha, meta: data, body: content };
}

async function saveArticle(payload) {
  const { title, slug, order, status, date, date_label, deck, read_time, body, originalFilename } = payload;
  if (!title || !slug || !order) {
    throw Object.assign(new Error('Missing required fields'), { status: 400 });
  }
  const meta = {
    title: String(title),
    slug: String(slug).trim().toLowerCase(),
    order: parseInt(order, 10),
    status: status || 'coming-soon',
    date: date || '',
    date_label: date_label || '',
    deck: deck || '',
    read_time: read_time || '5 min read'
  };
  const newFilename = fileNameFor(meta.order, meta.slug);
  const content = buildFrontmatter(meta, body || '');

  if (originalFilename && originalFilename !== newFilename) {
    const existing = await getFile(`${DIR}/${originalFilename}`);
    if (existing) {
      await deleteFile(`${DIR}/${originalFilename}`, existing.sha, `Rename ${originalFilename} → ${newFilename}`);
    }
    await writeFile(`${DIR}/${newFilename}`, content, undefined, `Save article: ${meta.title}`);
  } else {
    const existing = await getFile(`${DIR}/${newFilename}`);
    await writeFile(`${DIR}/${newFilename}`, content, existing ? existing.sha : undefined, `Save article: ${meta.title}`);
  }

  return { filename: newFilename, ...meta };
}

async function removeArticle(filename) {
  const file = await getFile(`${DIR}/${filename}`);
  if (!file) throw Object.assign(new Error('Not found'), { status: 404 });
  await deleteFile(`${DIR}/${filename}`, file.sha, `Delete article: ${filename}`);
  return { success: true };
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const filename = req.query?.filename;
      if (filename) {
        const article = await getArticle(filename);
        if (!article) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(article);
      }
      const list = await listArticles();
      return res.status(200).json({ articles: list });
    }
    if (req.method === 'POST') {
      const payload = await readBody(req);
      const saved = await saveArticle(payload);
      return res.status(200).json(saved);
    }
    if (req.method === 'DELETE') {
      const filename = req.query?.filename;
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const result = await removeArticle(filename);
      return res.status(200).json(result);
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
