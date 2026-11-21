import React from 'react';
import {Library, Warehouse} from 'lucide-react';

interface EmptyStudyStateProps {
  onGoToLibrary: () => void;
}

export const EmptyStudyState: React.FC<EmptyStudyStateProps> = ({
  onGoToLibrary,
}) => {
  return (
    <div className="surface-card mx-auto max-w-xl rounded-2xl p-7 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 shadow-2xs">
        <Warehouse className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Select a Study Module
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Open the Study Library to choose any of the 6 SSW Logistics &amp;
        Warehouse textbook parts with diagrams, bilingual notes, flashcards,
        and Japanese practice quizzes.
      </p>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onGoToLibrary}
          className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          <Library className="h-4 w-4" aria-hidden="true" />
          <span>Open Study Library</span>
        </button>
      </div>
    </div>
  );
};
