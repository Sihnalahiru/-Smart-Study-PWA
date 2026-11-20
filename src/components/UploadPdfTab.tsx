import React, {useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileUp,
  Loader2,
  Lock,
} from 'lucide-react';

const REPO_STORAGE_KEY = 'smart_study_github_repo';
const TOKEN_STORAGE_KEY = 'smart_study_github_token';

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  committedPath?: string;
  repoSlug?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(''));
}

function sanitizePdfFilename(originalName: string): string {
  const withoutExt = originalName.replace(/\.pdf$/i, '');
  const safeBase = withoutExt
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safeBase || 'study_material'}.pdf`;
}

export const UploadPdfTab: React.FC = () => {
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({type: 'idle'});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedRepo = localStorage.getItem(REPO_STORAGE_KEY);
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (savedRepo) setRepo(savedRepo);
      if (savedToken) setToken(savedToken);
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }, []);

  const handleRepoChange = (value: string) => {
    setRepo(value);
    try {
      localStorage.setItem(REPO_STORAGE_KEY, value);
    } catch {
      // Ignore storage errors
    }
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } catch {
      // Ignore storage errors
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null);
      setStatus({
        type: 'error',
        message: 'Please select a valid .pdf file.',
      });
      return;
    }
    setSelectedFile(file);
    if (status.type === 'error') {
      setStatus({type: 'idle'});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanRepo = repo
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/+$/, '');
    const cleanToken = token.trim();

    if (!/^[^/\s]+\/[^/\s]+$/.test(cleanRepo)) {
      setStatus({
        type: 'error',
        message:
          'Enter a valid GitHub repository in owner/repo format (for example: octocat/smart-study).',
      });
      return;
    }

    if (!cleanToken) {
      setStatus({
        type: 'error',
        message: 'Enter your GitHub Personal Access Token.',
      });
      return;
    }

    if (!selectedFile) {
      setStatus({
        type: 'error',
        message: 'Choose a .pdf file to upload.',
      });
      return;
    }

    setStatus({
      type: 'uploading',
      message: 'Encoding PDF and uploading to GitHub...',
    });

    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64Content = arrayBufferToBase64(buffer);
      const timestamp = Math.floor(Date.now() / 1000);
      const safeName = sanitizePdfFilename(selectedFile.name);
      const targetPath = `pdfs/${timestamp}_${safeName}`;
      const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${targetPath}`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Upload study PDF: ${selectedFile.name}`,
          content: base64Content,
        }),
      });

      const responseData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        const apiMessage =
          responseData.message || `GitHub API returned status ${response.status}`;
        throw new Error(apiMessage);
      }

      setStatus({
        type: 'success',
        message:
          'PDF uploaded successfully! GitHub Actions is now processing your document with Gemini. Refresh this page in ~2 minutes after the workflow and deployment finish building.',
        committedPath: targetPath,
        repoSlug: cleanRepo,
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unexpected error while uploading PDF to GitHub.';
      setStatus({
        type: 'error',
        message: `Upload failed: ${errorMessage}. Verify your repository name and that your token has contents:write (or repo) permission.`,
      });
    }
  };

  const formattedSize = selectedFile
    ? selectedFile.size >= 1024 * 1024
      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <header className="border-b border-slate-200 pb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Upload Study PDF
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Commit a new PDF directly to your repository&apos;s{' '}
            <code className="font-mono-tabular rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
              pdfs/
            </code>{' '}
            folder to trigger automated extraction of notes, diagrams,
            flashcards, and quiz questions.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="github-repo"
              className="block text-sm font-semibold text-slate-900"
            >
              GitHub Repository
            </label>
            <input
              id="github-repo"
              type="text"
              value={repo}
              onChange={(e) => handleRepoChange(e.target.value)}
              placeholder="owner/repo"
              autoComplete="off"
              className="mt-2 block min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Saved locally in your browser&apos;s localStorage.
            </p>
          </div>

          <div>
            <label
              htmlFor="github-token"
              className="block text-sm font-semibold text-slate-900"
            >
              GitHub Personal Access Token
            </label>
            <div className="relative mt-2">
              <input
                id="github-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                autoComplete="off"
                className="block min-h-[44px] w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-12 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
                className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Stored only in localStorage. Requires{' '}
                <code className="font-mono-tabular">contents: write</code> or{' '}
                <code className="font-mono-tabular">repo</code> scope.
              </span>
            </p>
          </div>

          <div>
            <label
              htmlFor="pdf-file"
              className="block text-sm font-semibold text-slate-900"
            >
              Study Document (.pdf)
            </label>
            <label
              htmlFor="pdf-file"
              className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50/40"
            >
              <FileUp className="h-6 w-6 text-blue-600" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : 'Choose a PDF file'}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                {formattedSize
                  ? `Selected · ${formattedSize}`
                  : 'Click to browse (.pdf files only)'}
              </span>
              <input
                ref={fileInputRef}
                id="pdf-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={status.type === 'uploading'}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status.type === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Uploading to GitHub...</span>
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                <span>Upload PDF to GitHub</span>
              </>
            )}
          </button>
        </form>

        {status.type !== 'idle' && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-6 rounded-xl border p-4 text-sm ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : status.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-950'
                  : 'border-blue-200 bg-blue-50 text-blue-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {status.type === 'success' && (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              )}
              {status.type === 'error' && (
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                  aria-hidden="true"
                />
              )}
              {status.type === 'uploading' && (
                <Loader2
                  className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600"
                  aria-hidden="true"
                />
              )}
              <div className="space-y-2">
                <p className="font-medium leading-relaxed">{status.message}</p>
                {status.committedPath && (
                  <p className="font-mono-tabular text-xs text-emerald-800">
                    Committed path: {status.committedPath}
                  </p>
                )}
                {status.repoSlug && (
                  <a
                    href={`https://github.com/${status.repoSlug}/actions`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                  >
                    <span>View GitHub Actions progress</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
