import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorDetails(err: unknown): {status: number; message: string} {
  if (err && typeof err === 'object') {
    const anyErr = err as {
      status?: number;
      code?: number;
      message?: string;
    };
    const msg = anyErr.message || 'Unexpected Gemini API error.';
    const status =
      typeof anyErr.status === 'number'
        ? anyErr.status
        : typeof anyErr.code === 'number' && anyErr.code >= 400
          ? anyErr.code
          : 500;

    if (
      status === 429 ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('429')
    ) {
      return {
        status: 429,
        message:
          'Quota exceeded or billing-enabled API key required for this model. Check your API key in Settings > Secrets.',
      };
    }
    if (
      status === 403 ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('API_KEY_INVALID')
    ) {
      return {
        status: 403,
        message:
          'API key permission denied or invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    return {status, message: msg};
  }
  return {status: 500, message: 'Unexpected server error.'};
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({limit: '30mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok'});
  });

  // Audio transcription via gemini-3.5-transcribe
  app.post('/api/audio/transcribe', async (req, res) => {
    try {
      const {audioBase64, mimeType} = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res
          .status(400)
          .json({error: 'Audio recording data (audioBase64) is required.'});
      }

      const safeMime =
        typeof mimeType === 'string' && mimeType.startsWith('audio/')
          ? mimeType.split(';')[0]
          : 'audio/webm';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this audio accurately with clear punctuation and natural paragraph breaks.',
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      if (!transcript) {
        return res.status(422).json({
          error:
            'No speech was detected in the recording. Please try speaking closer to the microphone.',
        });
      }

      return res.json({transcript});
    } catch (err) {
      console.error('Audio transcription failed:', err);
      const {status, message} = extractErrorDetails(err);
      return res.status(status).json({error: message});
    }
  });

  // Create & edit images via gemini-nano-banana-2.1
  app.post('/api/images/generate', async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio,
        imageSize,
        sourceImageBase64,
        sourceMimeType,
      } = req.body as {
        prompt?: string;
        aspectRatio?: string;
        imageSize?: string;
        sourceImageBase64?: string;
        sourceMimeType?: string;
      };

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res
          .status(400)
          .json({error: 'A descriptive prompt is required.'});
      }

      const validRatios = new Set([
        '1:1',
        '3:4',
        '4:3',
        '9:16',
        '16:9',
        '1:4',
        '1:8',
        '4:1',
        '8:1',
      ]);
      const safeRatio =
        aspectRatio && validRatios.has(aspectRatio) ? aspectRatio : '4:3';

      const validSizes = new Set(['1K', '2K', '4K']);
      const safeSize =
        imageSize && validSizes.has(imageSize) ? imageSize : '1K';

      const parts: Array<
        | {text: string}
        | {inlineData: {data: string; mimeType: string}}
      > = [];

      if (sourceImageBase64 && typeof sourceImageBase64 === 'string') {
        parts.push({
          inlineData: {
            data: sourceImageBase64,
            mimeType:
              sourceMimeType && sourceMimeType.startsWith('image/')
                ? sourceMimeType
                : 'image/png',
          },
        });
      }

      parts.push({text: prompt.trim()});

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {parts},
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageDataUrl: string | null = null;
      let outMimeType = 'image/png';
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          outMimeType = part.inlineData.mimeType ?? 'image/png';
          imageDataUrl = `data:${outMimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageDataUrl) {
        return res.status(422).json({
          error:
            caption.trim() ||
            'The model did not return an image for this prompt. Try refining your description.',
        });
      }

      return res.json({
        imageDataUrl,
        mimeType: outMimeType,
        caption: caption.trim(),
      });
    } catch (err) {
      console.error('Image generation failed:', err);
      const {status, message} = extractErrorDetails(err);
      return res.status(status).json({error: message});
    }
  });

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: {server: httpServer},
        hmr: process.env.DISABLE_HMR === 'true' ? false : true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Study PWA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
