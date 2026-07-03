import { useFilterBarLogic } from './useFilterBarLogic';

export function FilterBar() {
  const { modelOptions, effortOptions } = useFilterBarLogic();
  return (
    <div style={{ padding: '26px 0 6px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <FilterGroup label="Model" options={modelOptions} />
      <FilterGroup label="Effort" options={effortOptions} />
    </div>
  );
}

interface Option {
  readonly value: string;
  readonly label: string;
  readonly style: { background: string; borderColor: string; color: string };
  readonly onClick: () => void;
}

function FilterGroup({ label, options }: { readonly label: string; readonly options: readonly Option[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#948d75' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={opt.onClick}
            style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              transition: 'all .15s ease', border: `2px solid ${opt.style.borderColor}`,
              background: opt.style.background, color: opt.style.color,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
