import React, {useRef, useState} from 'react';
import {
  AlertCircle,
  Download,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import type {SavedVisual} from '../types/study';

interface VisualStudioTabProps {
  savedVisuals: SavedVisual[];
  onSaveVisual: (visual: Omit<SavedVisual, 'id' | 'createdAt'>) => void;
  onDeleteVisual: (id: string) => void;
}

const ASPECT_RATIOS = ['4:3', '16:9', '1:1', '3:4', '9:16'] as const;
const IMAGE_SIZES = ['1K', '2K', '4K'] as const;

export const VisualStudioTab: React.FC<VisualStudioTabProps> = ({
  savedVisuals,
  onSaveVisual,
  onDeleteVisual,
}) => {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');
  const [imageSize, setImageSize] = useState<string>('1K');
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string>('image/png');
  const [sourceName, setSourceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<{
    imageDataUrl: string;
    caption?: string;
    prompt: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a PNG, JPEG, or WebP image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceDataUrl(reader.result);
        setSourceMimeType(file.type || 'image/png');
        setSourceName(file.name);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseForEdit = (dataUrl: string, label: string) => {
    setMode('edit');
    setSourceDataUrl(dataUrl);
    const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);base64,/);
    setSourceMimeType(mimeMatch ? mimeMatch[1] : 'image/png');
    setSourceName(label);
    setError(null);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Enter a prompt describing the study visual to create or edit.');
      return;
    }
    if (mode === 'edit' && !sourceDataUrl) {
      setError('Upload or select a base image to edit.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let sourceImageBase64: string | undefined;
      if (mode === 'edit' && sourceDataUrl) {
        const commaIdx = sourceDataUrl.indexOf(',');
        sourceImageBase64 =
          commaIdx >= 0 ? sourceDataUrl.slice(commaIdx + 1) : sourceDataUrl;
      }

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
          sourceImageBase64,
          sourceMimeType: mode === 'edit' ? sourceMimeType : undefined,
        }),
      });

      const data = (await res.json()) as {
        imageDataUrl?: string;
        caption?: string;
        error?: string;
      };

      if (!res.ok || !data.imageDataUrl) {
        throw new Error(data.error || 'Failed to generate image.');
      }

      setActivePreview({
        imageDataUrl: data.imageDataUrl,
        caption: data.caption,
        prompt: prompt.trim(),
      });

      onSaveVisual({
        prompt: prompt.trim(),
        aspectRatio,
        imageDataUrl: data.imageDataUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to generate image.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Prompt & Configuration */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <header className="border-b border-slate-200/70 pb-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Study Visual Studio
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Create custom concept diagrams, memory aids, or edit existing
            illustrations with prompts (+20 XP per visual).
          </p>
        </header>

        {/* Mode Switcher */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Create Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'edit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit Visual</span>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-800">
                Base Image to Edit
              </label>
              <label className="mt-2 flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50/90 to-slate-100/40 p-4 text-center transition-all hover:border-blue-500 hover:from-blue-50/50 hover:to-indigo-50/30">
                {sourceDataUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={sourceDataUrl}
                      alt="Selected base visual"
                      className="h-14 w-14 rounded-lg border border-slate-200 object-cover shadow-2xs"
                    />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-900">
                        {sourceName || 'Base image loaded'}
                      </p>
                      <p className="text-[11px] font-medium text-blue-600">
                        Click to replace image
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload
                      className="h-5 w-5 text-blue-600"
                      aria-hidden="true"
                    />
                    <span className="mt-1.5 text-xs font-semibold text-slate-800">
                      Upload an image to edit
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PNG, JPG, or WebP
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSourceFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          )}

          <div>
            <label
              htmlFor="visual-prompt"
              className="block text-xs font-semibold text-slate-800"
            >
              {mode === 'create' ? 'Visual Prompt' : 'Edit Instructions'}
            </label>
            <textarea
              id="visual-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'create'
                  ? 'Example: Clean textbook diagram of the human heart showing oxygenated and deoxygenated blood flow with crisp labels on a light slate background'
                  : 'Example: Add clear arrows showing electron flow and highlight the membrane in cobalt blue'
              }
              className="mt-2 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="aspect-ratio"
                className="block text-xs font-semibold text-slate-800"
              >
                Aspect Ratio
              </label>
              <select
                id="aspect-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="mt-1.5 block min-h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="image-size"
                className="block text-xs font-semibold text-slate-800"
              >
                Resolution
              </label>
              <select
                id="image-size"
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="mt-1.5 block min-h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none"
              >
                {IMAGE_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary-premium inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>
                  {mode === 'create'
                    ? 'Generating visual...'
                    : 'Applying edits...'}
                </span>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                <span>
                  {mode === 'create' ? 'Generate Visual' : 'Edit Visual'}
                </span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200/90 bg-gradient-to-r from-red-50 to-rose-50/70 p-3.5 text-xs leading-relaxed text-red-900"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Output Canvas & Saved Visuals Gallery */}
      <div className="space-y-6">
        <section className="surface-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Canvas Preview
            </h3>
            {activePreview && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleUseForEdit(
                      activePreview.imageDataUrl,
                      'Generated visual',
                    )
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit This</span>
                </button>
                <a
                  href={activePreview.imageDataUrl}
                  download={`study-visual-${Date.now()}.png`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download</span>
                </a>
              </div>
            )}
          </div>

          <div className="mt-5">
            {activePreview ? (
              <figure className="overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/50 shadow-2xs">
                <img
                  src={activePreview.imageDataUrl}
                  alt={activePreview.prompt}
                  className="mx-auto max-h-[460px] w-auto max-w-full object-contain p-3"
                />
                <figcaption className="border-t border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600">
                  {activePreview.caption || activePreview.prompt}
                </figcaption>
              </figure>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/90 to-slate-100/40 p-8 text-center">
                <ImageIcon
                  className="h-8 w-8 text-slate-300"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold tracking-tight text-slate-700">
                  Your study diagram will appear here
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                  Describe any concept diagram, chart, or visual mnemonic above
                  to generate or edit it.
                </p>
              </div>
            )}
          </div>
        </section>

        {savedVisuals.length > 0 && (
          <section className="surface-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Saved Visual Library
              </h3>
              <span className="font-mono-tabular text-xs font-medium text-slate-500">
                {savedVisuals.length} saved
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {savedVisuals.map((vis) => (
                <div
                  key={vis.id}
                  className="surface-card-interactive overflow-hidden rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActivePreview({
                        imageDataUrl: vis.imageDataUrl,
                        prompt: vis.prompt,
                      })
                    }
                    className="block w-full bg-gradient-to-b from-slate-50 to-slate-100/50 p-2"
                  >
                    <img
                      src={vis.imageDataUrl}
                      alt={vis.prompt}
                      className="h-40 w-full rounded-lg object-contain"
                    />
                  </button>
                  <div className="border-t border-slate-200/70 p-3">
                    <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-700">
                      {vis.prompt}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-[11px] text-slate-400">
                        {vis.aspectRatio}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUseForEdit(vis.imageDataUrl, 'Saved visual')
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVisual(vis.id)}
                          aria-label="Delete visual"
                          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
