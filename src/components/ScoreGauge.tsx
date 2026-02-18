interface Props {
  confidence: number;
  bias: string;
  shouldTrade: boolean;
}

export function ScoreGauge({ confidence, bias, shouldTrade }: Props) {
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (confidence / 100) * circumference;

  const color =
    confidence >= 70
      ? "#22c55e"
      : confidence >= 50
        ? "#eab308"
        : "#ef4444";

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-5 flex flex-col items-center">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
        Confidence
      </h2>

      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono" style={{ color }}>
            {confidence}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase">
            {bias}
          </span>
        </div>
      </div>

      <div
        className={`mt-4 text-xs font-semibold px-3 py-1 rounded-full ${
          shouldTrade
            ? "bg-bull/15 text-bull"
            : "bg-zinc-800 text-zinc-500"
        }`}
      >
        {shouldTrade ? "TRADE ELIGIBLE" : "NO TRADE"}
      </div>
    </div>
  );
}
