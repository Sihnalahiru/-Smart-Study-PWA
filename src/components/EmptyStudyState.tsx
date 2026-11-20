import React from 'react';
import {BookOpen, FileUp} from 'lucide-react';

interface EmptyStudyStateProps {
  onGoToUpload: () => void;
}

export const EmptyStudyState: React.FC<EmptyStudyStateProps> = ({
  onGoToUpload,
}) => {
  return (
    <div className="surface-card mx-auto max-w-2xl rounded-2xl p-7 sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-2xs">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
        No study parts generated yet
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Your study library is ready. Upload a PDF document to automatically
        extract diagrams, structured Markdown notes, 3D flashcards, and quiz
        questions via GitHub Actions and Gemini.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-6 sm:grid-cols-3">
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-blue-600">
            01. Configure Secret
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Add <code className="font-mono-tabular text-slate-800">GEMINI_API_KEY</code> to
            your repository&apos;s GitHub Actions secrets.
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-blue-600">
            02. Upload PDF
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Commit any <code className="font-mono-tabular text-slate-800">.pdf</code> file
            using the in-app uploader or push to{' '}
            <code className="font-mono-tabular text-slate-800">pdfs/</code>.
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-blue-600">
            03. Study Offline
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Wait ~2 minutes for the build to complete, then refresh to cache
            everything offline.
          </p>
        </div>
      </div>

      <div className="mt-7">
        <button
          type="button"
          onClick={onGoToUpload}
          className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          <FileUp className="h-4 w-4" aria-hidden="true" />
          <span>Upload Your First PDF</span>
        </button>
      </div>
    </div>
  );
};
