import React, {useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileAudio,
  Loader2,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';
import type {SavedTranscript} from '../types/study';

interface AudioTranscribeTabProps {
  savedTranscripts: SavedTranscript[];
  onSaveTranscript: (
    entry: Omit<SavedTranscript, 'id' | 'createdAt'>,
  ) => SavedTranscript;
  onDeleteTranscript: (id: string) => void;
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AudioTranscribeTab: React.FC<AudioTranscribeTabProps> = ({
  savedTranscripts,
  onSaveTranscript,
  onDeleteTranscript,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noteTitle, setNoteTitle] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const elapsedRef = useRef(0);

  const cleanupRecordingResources = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current !== null) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
    };
  }, []);

  const sendAudioForTranscription = async (
    blob: Blob,
    durationSeconds: number,
    fallbackTitle: string,
  ) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const buffer = await blob.arrayBuffer();
      const audioBase64 = arrayBufferToBase64(buffer);
      const mimeType = blob.type || 'audio/webm';

      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({audioBase64, mimeType}),
      });

      const data = (await res.json()) as {
        transcript?: string;
        error?: string;
      };

      if (!res.ok || !data.transcript) {
        throw new Error(data.error || 'Failed to transcribe audio.');
      }

      const finalTitle =
        noteTitle.trim() ||
        fallbackTitle ||
        `Voice Study Note (${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })})`;

      onSaveTranscript({
        title: finalTitle,
        transcript: data.transcript,
        durationSeconds,
      });
      setNoteTitle('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to transcribe audio.',
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedMime = mimeCandidates.find((m) =>
        MediaRecorder.isTypeSupported(m),
      );

      const recorder = supportedMime
        ? new MediaRecorder(stream, {mimeType: supportedMime})
        : new MediaRecorder(stream);

      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsedSec(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const duration = elapsedRef.current;
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, {type: mime});
        cleanupRecordingResources();
        if (audioBlob.size > 0) {
          await sendAudioForTranscription(
            audioBlob,
            duration,
            `Voice Recording (${formatDuration(duration)})`,
          );
        }
      };

      // Live audio level meter
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = window.requestAnimationFrame(updateLevel);
      };
      updateLevel();

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSec(elapsedRef.current);
      }, 1000);

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch (err) {
      cleanupRecordingResources();
      setError(
        err instanceof Error
          ? `Microphone permission error: ${err.message}`
          : 'Could not access microphone.',
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAudioFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file (MP3, WAV, WebM, M4A).');
      return;
    }
    await sendAudioForTranscription(file, 0, file.name.replace(/\.[^.]+$/, ''));
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDownloadTxt = (item: SavedTranscript) => {
    const blob = new Blob([`${item.title}\n\n${item.transcript}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'transcript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Recorder & Uploader */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <header className="border-b border-slate-200/70 pb-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Voice Notes &amp; Transcription
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Dictate study summaries or record lecture clips using your
            microphone (+20 XP per transcript). Saved notes are searchable via
            Global Search.
          </p>
        </header>

        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="voice-note-title"
              className="block text-xs font-semibold text-slate-800"
            >
              Note Title (optional)
            </label>
            <input
              id="voice-note-title"
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g., Chapter 4 — Cellular Respiration Recap"
              className="mt-1.5 block min-h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Microphone Capture Card */}
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-blue-50/30 p-5 text-center shadow-2xs">
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono-tabular text-2xl font-bold tracking-tight text-slate-900">
                {formatDuration(elapsedSec)}
              </span>
            </div>

            {/* Live Input Meter */}
            <div className="mx-auto mt-3 flex h-8 max-w-[220px] items-center justify-center gap-1">
              {Array.from({length: 14}).map((_, idx) => {
                const barFactor = Math.sin((idx + 1) * 0.55) * 0.4 + 0.6;
                const heightPct = isRecording
                  ? Math.max(16, Math.min(100, audioLevel * barFactor))
                  : 16;
                return (
                  <span
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isRecording ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    style={{height: `${heightPct}%`}}
                  />
                );
              })}
            </div>

            <div className="mt-4">
              {!isRecording ? (
                <button
                  type="button"
                  disabled={isTranscribing}
                  onClick={startRecording}
                  className="btn-primary-premium inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Start Microphone Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-red-500 to-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105"
                >
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>Stop &amp; Transcribe</span>
                </button>
              )}
            </div>
          </div>

          {/* Alternative Audio File Upload */}
          <div>
            <label className="surface-card-interactive flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700">
              <FileAudio className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Or Upload Audio File (MP3, WAV, WebM, M4A)</span>
              <input
                type="file"
                accept="audio/*"
                disabled={isRecording || isTranscribing}
                onChange={handleAudioFileUpload}
                className="sr-only"
              />
            </label>
          </div>

          {isTranscribing && (
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3.5 text-xs font-semibold text-blue-900">
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-blue-600"
                aria-hidden="true"
              />
              <span>Transcribing speech to study notes...</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200/90 bg-gradient-to-r from-red-50 to-rose-50/70 p-3.5 text-xs leading-relaxed text-red-900"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {/* Saved Transcripts */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              Saved Voice Transcripts
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Stored locally for offline review and global search
            </p>
          </div>
          <span className="font-mono-tabular text-xs font-medium text-slate-500">
            {savedTranscripts.length} saved
          </span>
        </div>

        {savedTranscripts.length === 0 ? (
          <div className="py-12 text-center">
            <Mic
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold tracking-tight text-slate-700">
              No voice transcripts yet
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Record a study summary or upload an audio clip to generate your
              first transcript.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {savedTranscripts.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-2xs sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold tracking-tight text-slate-900">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.durationSeconds > 0
                        ? ` · ${formatDuration(item.durationSeconds)}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.transcript)}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check
                            className="h-3.5 w-3.5 text-emerald-600"
                            aria-hidden="true"
                          />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadTxt(item)}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>.txt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTranscript(item.id)}
                      aria-label="Delete transcript"
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {item.transcript}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
