import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIndex = process.argv.findIndex(
    (arg) => arg === '--port' || arg === '-p',
  );
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const inlinePortArg = process.argv.find((arg) => arg.startsWith('--port='));
  if (inlinePortArg) {
    const parsed = Number(inlinePortArg.split('=')[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  if (
    Number.isFinite(envPort) &&
    envPort > 0 &&
    (process.env.NODE_ENV === 'production' || envPort !== nginxPort)
  ) {
    return envPort;
  }
  return 3000;
}

const PORT = resolvePort();
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({limit: '30mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok'});
  });

  app.post('/api/admin/verify-reset', (req, res) => {
    const configuredPassword = process.env.ADMIN_RESET_PASSWORD;
    if (!configuredPassword) {
      res.status(503).json({error: 'Admin reset is not configured'});
      return;
    }
    const body = (req.body ?? {}) as {username?: string; password?: string};
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const constantTimeEqual = (a: string, b: string) => {
      const aBuf = Buffer.from(a);
      const bBuf = Buffer.from(b);
      let diff = aBuf.length ^ bBuf.length;
      const len = Math.max(aBuf.length, bBuf.length);
      for (let i = 0; i < len; i += 1) {
        diff |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
      }
      return diff === 0;
    };
    if (
      !constantTimeEqual(username, 'Admin') ||
      !constantTimeEqual(password, configuredPassword)
    ) {
      res.status(401).json({error: 'Invalid administrator credentials'});
      return;
    }
    res.json({verified: true});
  });

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: disableHmr ? false : {server: httpServer},
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader('Cache-Control', 'no-store');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Study PWA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
