const TRUNK = '#8B5E3C';
const LEAF = '#2D6A4F';
const ACCENT = '#C41E1E';

const STAGES = [
  { min: 0, max: 0, label: '种子', trunkW: 0, trunkH: 0, leaves: 0, canopy: 0, flowers: 0, fruit: 0, seed: true },
  { min: 1, max: 5, label: '小树苗', trunkW: 4, trunkH: 28, leaves: 2, canopy: 0, flowers: 0, fruit: 0 },
  { min: 6, max: 15, label: '成长中', trunkW: 7, trunkH: 50, leaves: 6, canopy: 0, flowers: 0, fruit: 0 },
  { min: 16, max: 30, label: '茁壮', trunkW: 10, trunkH: 70, leaves: 0, canopy: 1, flowers: 0, fruit: 0 },
  { min: 31, max: 50, label: '枝繁叶茂', trunkW: 13, trunkH: 85, leaves: 0, canopy: 2, flowers: 0, fruit: 0 },
  { min: 51, max: 100, label: '大树', trunkW: 16, trunkH: 95, leaves: 0, canopy: 3, flowers: 7, fruit: 0 },
  { min: 101, max: 224, label: '参天大树', trunkW: 18, trunkH: 105, leaves: 0, canopy: 4, flowers: 0, fruit: 9 },
];

function getStageIndex(count) {
  const idx = STAGES.findIndex((s) => count >= s.min && count <= s.max);
  return idx === -1 ? STAGES.length - 1 : idx;
}

function TreeSvg({ cfg }) {
  const groundY = 192;
  const trunkTopY = groundY - cfg.trunkH;
  const canopyCenterY = trunkTopY - 8;

  return (
    <svg viewBox="0 0 200 200" width="100%" height="180" role="img" aria-label={cfg.label}>
      <ellipse cx="100" cy={groundY} rx="70" ry="6" fill="#EDE8DF" />

      {cfg.seed ? (
        <ellipse cx="100" cy={groundY - 6} rx="7" ry="9" fill={TRUNK} />
      ) : (
        <>
          <rect
            x={100 - cfg.trunkW / 2}
            y={trunkTopY}
            width={cfg.trunkW}
            height={cfg.trunkH}
            rx={Math.max(cfg.trunkW / 3, 2)}
            fill={TRUNK}
          />

          {cfg.leaves > 0 &&
            Array.from({ length: cfg.leaves }).map((_, i) => {
              const angle = (i / cfg.leaves) * Math.PI * 2;
              const r = 16;
              const cx = 100 + Math.cos(angle) * r;
              const cy = trunkTopY + Math.sin(angle) * r * 0.5;
              const rot = (angle * 180) / Math.PI;
              return (
                <ellipse
                  key={i}
                  cx={cx}
                  cy={cy}
                  rx="10"
                  ry="6"
                  fill={LEAF}
                  transform={`rotate(${rot} ${cx} ${cy})`}
                />
              );
            })}

          {cfg.canopy > 0 &&
            Array.from({ length: 3 + cfg.canopy * 2 }).map((_, i) => {
              const count = 3 + cfg.canopy * 2;
              const spread = 18 + cfg.canopy * 9;
              const angle = (i / count) * Math.PI * 2;
              const rr = spread * (0.55 + (i % 3) * 0.22);
              const cx = 100 + Math.cos(angle) * rr;
              const cy = canopyCenterY + Math.sin(angle) * rr * 0.65 - cfg.canopy * 4;
              return <circle key={i} cx={cx} cy={cy} r={13 + cfg.canopy * 2.5} fill={LEAF} opacity="0.92" />;
            })}

          {cfg.flowers > 0 &&
            Array.from({ length: cfg.flowers }).map((_, i) => {
              const angle = (i / cfg.flowers) * Math.PI * 2 + 0.3;
              const rr = 26;
              const cx = 100 + Math.cos(angle) * rr;
              const cy = canopyCenterY + Math.sin(angle) * rr * 0.6 - 10;
              return <circle key={i} cx={cx} cy={cy} r="4" fill={ACCENT} />;
            })}

          {cfg.fruit > 0 &&
            Array.from({ length: cfg.fruit }).map((_, i) => {
              const angle = (i / cfg.fruit) * Math.PI * 2 + 0.5;
              const rr = 30;
              const cx = 100 + Math.cos(angle) * rr;
              const cy = canopyCenterY + Math.sin(angle) * rr * 0.6 - 2;
              return <circle key={i} cx={cx} cy={cy} r="5" fill={ACCENT} />;
            })}
        </>
      )}
    </svg>
  );
}

export default function GrowthTree({ stampCount }) {
  const stageIndex = getStageIndex(stampCount);
  const stage = STAGES[stageIndex];
  const isSeedStage = stageIndex === 0;
  const isMaxStage = stageIndex === STAGES.length - 1;
  const progressPercent = isSeedStage ? 0 : Math.min(100, Math.round((stampCount / stage.max) * 100));

  return (
    <section>
      <h2 className="text-base font-bold text-ink text-left mb-3">我的成长树</h2>
      <div className="rounded-xl p-4" style={{ backgroundColor: '#F9F6F0', borderRadius: 12 }}>
        <TreeSvg cfg={stage} />
        <p className="text-sm text-ink/70 text-center mt-2">已积累 {stampCount} 枚策印</p>
        {!isSeedStage && (
          <>
            <div className="mt-3 h-1.5 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${progressPercent}%`, backgroundColor: ACCENT }} />
            </div>
            <p className="text-xs text-ink/40 text-center mt-1">
              {stampCount}/{stage.max}
            </p>
          </>
        )}
        <p className="text-xs text-ink/40 text-center mt-2">
          {isMaxStage ? '你的成长树已长成参天大树' : isSeedStage ? '再 1 枚，你的种子会发芽' : `再 ${stage.max - stampCount} 枚，你的树会继续生长`}
        </p>
      </div>
    </section>
  );
}
