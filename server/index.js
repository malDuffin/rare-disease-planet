import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import {
  initDb,
  getGlobePins,
  getPublicGroups,
  getInvite,
  submitSurvey,
  addFamilyMember,
  catalog,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 5173;

function sendError(res, result) {
  return res.status(result.status || 400).json({ error: result.error });
}

async function main() {
  initDb();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'Rare Disease Planet' });
  });

  app.get('/api/globe', (_req, res) => {
    res.json({ pins: getGlobePins() });
  });

  app.get('/api/groups', (_req, res) => {
    res.json({ groups: getPublicGroups() });
  });

  app.get('/api/invite/:code', (req, res) => {
    const invite = getInvite(req.params.code);
    if (!invite) return res.status(404).json({ error: 'invite_invalid' });
    res.json(invite);
  });

  app.get('/api/catalog', (_req, res) => {
    res.json(catalog());
  });

  app.post('/api/survey', (req, res) => {
    try {
      const result = submitSurvey(req.body || {});
      if (result.error) return sendError(res, result);
      res.json(result);
    } catch (err) {
      console.error('survey', err);
      res.status(500).json({ error: 'generic' });
    }
  });

  app.post('/api/family', (req, res) => {
    try {
      const result = addFamilyMember(req.body || {});
      if (result.error) return sendError(res, result);
      res.json(result);
    } catch (err) {
      console.error('family', err);
      res.status(500).json({ error: 'generic' });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(root, 'dist');
    if (!fs.existsSync(dist)) {
      console.error('Missing dist/. Run npm run build first.');
      process.exit(1);
    }
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rare Disease Planet → http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
