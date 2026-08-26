export function Footer() {
  return (
    <footer
      className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-3"
      style={{
        borderTop: '1px solid var(--hairline)',
        background: 'var(--void)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs" style={{ color: 'var(--phosphor)', opacity: 0.5 }}>
          TRITON WATCH v0.1.0-alpha
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.3 }}>
          SIH 2026 · Problem #26143
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--bone)', opacity: 0.4 }}
          >
            SAR FEED
          </span>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--phosphor)', boxShadow: 'var(--glow-green)', animation: 'status-blink 2s infinite' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--bone)', opacity: 0.4 }}
          >
            AIS STREAM
          </span>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--phosphor)', boxShadow: 'var(--glow-green)', animation: 'status-blink 2.4s infinite 0.4s' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--bone)', opacity: 0.4 }}
          >
            SENTINEL-1 API
          </span>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--phosphor)', boxShadow: 'var(--glow-green)', animation: 'status-blink 1.6s infinite 0.8s' }}
          />
        </div>
      </div>

      <span className="font-mono text-xs" style={{ color: 'var(--bone)', opacity: 0.25 }}>
        © 2026 TRITON · MIT License
      </span>
    </footer>
  )
}
