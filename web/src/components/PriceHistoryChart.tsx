interface Point {
  date: Date;
  price: number;
}

/** Server-rendered SVG line chart of the best (lowest) price per day.
 *  No client JS; theme-matched to the dark palette. */
export default function PriceHistoryChart({
  history,
  currencyLabel,
  locale,
}: {
  history: { price: unknown; recordedAt: Date }[];
  currencyLabel: string;
  locale: string;
}) {
  // Collapse to lowest price per calendar day.
  const perDay = new Map<string, Point>();
  for (const h of history) {
    const day = h.recordedAt.toISOString().slice(0, 10);
    const price = Number(h.price);
    const existing = perDay.get(day);
    if (!existing || price < existing.price) {
      perDay.set(day, { date: h.recordedAt, price });
    }
  }
  const points = [...perDay.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  if (points.length < 2) return null; // nothing meaningful to draw yet

  const W = 640;
  const H = 180;
  const PAD = { top: 12, right: 12, bottom: 24, left: 64 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.05 || 1;
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;

  const t0 = points[0].date.getTime();
  const t1 = points[points.length - 1].date.getTime();
  const x = (d: Date) =>
    PAD.left + ((d.getTime() - t0) / (t1 - t0 || 1)) * innerW;
  const y = (p: number) => PAD.top + (1 - (p - yMin) / (yMax - yMin)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(" ");

  const numberLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const fmt = (n: number) => n.toLocaleString(numberLocale);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(numberLocale, { day: "numeric", month: "short" });

  const gridPrices = [min, (min + max) / 2, max];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-2xl"
        role="img"
        aria-label="price history"
      >
        {gridPrices.map((gp) => (
          <g key={gp}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(gp)}
              y2={y(gp)}
              stroke="#1f2937"
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left - 8}
              y={y(gp) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#9ca3af"
            >
              {fmt(gp)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" />
        {points.map((p) => (
          <circle
            key={p.date.getTime()}
            cx={x(p.date)}
            cy={y(p.price)}
            r="3"
            fill="#60a5fa"
          />
        ))}
        <text
          x={PAD.left}
          y={H - 6}
          fontSize="11"
          fill="#9ca3af"
        >
          {fmtDate(points[0].date)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          fontSize="11"
          fill="#9ca3af"
        >
          {fmtDate(points[points.length - 1].date)}
        </text>
        <text x={PAD.left} y={PAD.top} fontSize="11" fill="#6b7280">
          {currencyLabel}
        </text>
      </svg>
    </div>
  );
}
