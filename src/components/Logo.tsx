export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lifeupGrad" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3AE" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <path
        d="M30 84 L30 24"
        stroke="url(#lifeupGrad)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M30 84 L64 84"
        stroke="url(#lifeupGrad)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M16 42 L30 16 L44 42"
        stroke="url(#lifeupGrad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWordmark({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <LogoMark size={size + 10} />
      <span className="font-extrabold tracking-tight" style={{ fontSize: size }}>
        <span className="text-text-primary">Life</span>
        <span className="text-gradient">UP</span>
      </span>
    </div>
  );
}
