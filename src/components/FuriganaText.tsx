import React from 'react';

interface FuriganaTextProps {
  text: string;
  showFurigana?: boolean;
  className?: string;
}

const RUBY_PATTERN =
  /\{([^{}|]+)\|([^{}|]+)\}|<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g;
const BR_TAG_PATTERN = /<br\s*\/?>/gi;

export function stripFurigana(text: string): string {
  return text
    .replace(RUBY_PATTERN, (_m, k1, _r1, k2) => k1 ?? k2 ?? '')
    .replace(BR_TAG_PATTERN, ' ');
}

export function extractSearchableText(text: string): string {
  // Preserves both kanji and furigana reading so searching either matches
  return text
    .replace(
      RUBY_PATTERN,
      (_m, k1, r1, k2, r2) => `${k1 ?? k2 ?? ''} ${r1 ?? r2 ?? ''}`,
    )
    .replace(BR_TAG_PATTERN, ' ');
}

function parseSingleLineFurigana(
  input: string,
  showFurigana: boolean,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  const regex = new RegExp(RUBY_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(input.slice(lastIndex, match.index));
    }

    const kanji = match[1] ?? match[3] ?? '';
    const reading = match[2] ?? match[4] ?? '';

    if (showFurigana && reading) {
      nodes.push(
        <ruby key={`${keyPrefix}-${matchIndex}`} className="mx-[0.5px]">
          {kanji}
          <rp>(</rp>
          <rt>{reading}</rt>
          <rp>)</rp>
        </ruby>,
      );
    } else {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-${matchIndex}`}>
          {kanji}
        </React.Fragment>,
      );
    }

    lastIndex = regex.lastIndex;
    matchIndex += 1;
  }

  if (lastIndex < input.length) {
    nodes.push(input.slice(lastIndex));
  }

  return nodes;
}

export function parseFuriganaNodes(
  input: string,
  showFurigana = true,
  keyPrefix = 'fg',
): React.ReactNode[] {
  if (!BR_TAG_PATTERN.test(input)) {
    return parseSingleLineFurigana(input, showFurigana, keyPrefix);
  }
  const segments = input.split(BR_TAG_PATTERN);
  const out: React.ReactNode[] = [];
  segments.forEach((seg, segIdx) => {
    if (segIdx > 0) {
      out.push(<br key={`${keyPrefix}-br-${segIdx}`} />);
    }
    if (seg.length > 0) {
      out.push(...parseSingleLineFurigana(seg, showFurigana, `${keyPrefix}-s${segIdx}`));
    }
  });
  return out;
}

export function renderChildrenWithFurigana(
  children: React.ReactNode,
  showFurigana = true,
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === 'string') {
      return parseFuriganaNodes(child, showFurigana, `c-${idx}`);
    }
    if (React.isValidElement<{children?: React.ReactNode}>(child) && child.props.children) {
      return React.cloneElement(child, {
        ...child.props,
        children: renderChildrenWithFurigana(child.props.children, showFurigana),
      });
    }
    return child;
  });
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({
  text,
  showFurigana = true,
  className,
}) => {
  return (
    <span className={className}>
      {parseFuriganaNodes(text, showFurigana, 'ft')}
    </span>
  );
};
