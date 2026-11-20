import React, {useEffect, useState} from 'react';
import Confetti from 'react-confetti';

interface CelebrationConfettiProps {
  burstKey: number;
  active: boolean;
  onComplete: () => void;
}

const CONFETTI_COLORS = [
  '#2563eb',
  '#4f46e5',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#fbbf24',
];

export const CelebrationConfetti: React.FC<CelebrationConfettiProps> = ({
  burstKey,
  active,
  onComplete,
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => {
      setPrefersReducedMotion(Boolean(mediaQuery?.matches));
    };
    mediaQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery?.removeEventListener?.('change', handleMotionChange);
    };
  }, []);

  if (!active || prefersReducedMotion) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <Confetti
        key={burstKey}
        width={viewport.width}
        height={viewport.height}
        numberOfPieces={240}
        recycle={false}
        gravity={0.22}
        initialVelocityY={14}
        colors={CONFETTI_COLORS}
        onConfettiComplete={() => onComplete()}
      />
    </div>
  );
};
