import { useEffect, useState, type CSSProperties } from 'react';

interface PromptBoxProps {
  readonly prompt: string;
  /** When true, the box is clickable and opens a modal with the full prompt. */
  readonly clickable?: boolean;
  readonly lines?: number;
  readonly fontSize?: number;
  readonly padding?: string;
  readonly borderRadius?: number;
  readonly maxWidth?: number | string;
}

const TERMINAL: CSSProperties = {
  background: '#241f18',
  color: '#c9e4a8',
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.5,
};

export function PromptBox({
  prompt, clickable = false, lines = 4,
  fontSize = 13, padding = '12px 14px', borderRadius = 8, maxWidth,
}: PromptBoxProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={clickable ? () => setOpen(true) : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? e => { if (e.key === 'Enter') setOpen(true); } : undefined}
        title={clickable ? 'View full prompt' : undefined}
        style={{
          ...TERMINAL, fontSize, padding, borderRadius, maxWidth,
          overflow: 'hidden',
          cursor: clickable ? 'pointer' : undefined,
        }}
      >
        {/* Clamp lives on an inner element with no padding, plus a hard
            max-height, so a partial extra line can't leak into the padding. */}
        <div
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: lines,
            overflow: 'hidden',
            maxHeight: `${lines * 1.5}em`,
            lineHeight: 1.5,
          }}
        >
          &gt; {prompt}
        </div>
      </div>
      {open && <PromptModal prompt={prompt} onClose={() => setOpen(false)} />}
    </>
  );
}

function PromptModal({ prompt, onClose }: { readonly prompt: string; readonly onClose: () => void }) {
  useEffect(() => {
    // Capture phase + stopPropagation so Escape closes only this modal, not an
    // underlying build-detail modal that also listens for Escape.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    globalThis.addEventListener('keydown', onKey, true);
    return () => { globalThis.removeEventListener('keydown', onKey, true); };
  }, [onClose]);

  return (
    <div
      onClick={e => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(22,18,10,.6)', backdropFilter: 'blur(3px)',
        zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
      }}
    >
      <div
        onClick={e => { e.stopPropagation(); }}
        style={{
          position: 'relative', background: '#fffdf8', borderRadius: 14, maxWidth: 640, width: '100%',
          boxShadow: '0 30px 70px rgba(0,0,0,.4)', padding: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#948d75' }}>
            Full Prompt
          </div>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
            style={{
              border: 'none', background: '#efe9d9', color: '#5c5640', borderRadius: 6,
              width: 30, height: 30, fontSize: 14, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{
          ...TERMINAL, fontSize: 13.5, borderRadius: 8, padding: '16px 18px', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto',
        }}>
          &gt; {prompt}
        </div>
      </div>
    </div>
  );
}
