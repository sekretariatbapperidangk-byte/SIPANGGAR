import React, { useState } from 'react';
import {
  ProgramCategory,
  ProgramRealizationItem,
  QuarterId,
  QuarterlyBudgetItem,
} from '../types/budget';
import { formatMiliarID, formatPercentID, formatRupiah } from '../data/sipanggarData';

interface QuarterlyBarChartProps {
  data: QuarterlyBudgetItem[];
  selectedQuarter: QuarterId;
  onSelectQuarter: (q: QuarterId) => void;
}

export const QuarterlyBarChart: React.FC<QuarterlyBarChartProps> = ({
  data,
  selectedQuarter,
  onSelectQuarter,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const yTicks = [100, 75, 50, 25, 0];

  const getBadgeStyle = (pct: number) => {
    if (pct >= 78) {
      return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
    }
    if (pct >= 70) {
      return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    }
    return 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]';
  };

  return (
    <div className="relative select-none">
      <div className="flex items-stretch gap-2 h-[228px]">
        {/* Y-Axis Title */}
        <div className="flex items-center justify-center w-5 shrink-0">
          <span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold text-slate-600 tracking-tight">
            Rp Miliar
          </span>
        </div>

        {/* Y-Axis Labels + Plot Area */}
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 flex">
            {/* Y Tick Numbers */}
            <div className="w-8 flex flex-col justify-between items-end pr-2 py-0.5 text-[11.5px] font-semibold text-slate-600 tabular-nums shrink-0">
              {yTicks.map((t) => (
                <span key={t} className="leading-none">
                  {t}
                </span>
              ))}
            </div>

            {/* Grid Lines & Grouped Bars */}
            <div className="relative flex-1 border-l border-b border-slate-300/90">
              {/* Horizontal & Vertical Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((t, i) => (
                  <div
                    key={t}
                    className={`w-full ${
                      i === yTicks.length - 1 ? '' : 'border-t border-slate-200/80'
                    }`}
                  />
                ))}
              </div>

              {/* Vertical dividers */}
              <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                {data.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`${idx < 3 ? 'border-r border-slate-200/60' : ''}`}
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="relative z-10 h-full grid grid-cols-4 items-end px-2 sm:px-4 gap-2">
                {data.map((q, idx) => {
                  const anggaranH = Math.min(100, Math.max(4, q.anggaranMiliar));
                  const realisasiH = Math.min(100, Math.max(4, q.realisasiMiliar));
                  const isSelected = selectedQuarter === q.id;
                  const isHovered = hoveredIdx === idx;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onSelectQuarter(q.id)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`group relative h-full flex flex-col justify-end items-center pb-0 pt-2 rounded-t-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        isSelected ? 'bg-blue-50/45' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 w-44 bg-[#0D2B5C] text-white rounded-lg p-2.5 shadow-lg text-left pointer-events-none">
                          <div className="text-[11px] font-bold text-blue-200">
                            {q.label} {q.months}
                          </div>
                          <div className="mt-1 flex justify-between text-[11px] tabular-nums">
                            <span className="text-slate-300">Anggaran:</span>
                            <span className="font-semibold">{formatMiliarID(q.anggaranMiliar)} M</span>
                          </div>
                          <div className="flex justify-between text-[11px] tabular-nums">
                            <span className="text-slate-300">Realisasi:</span>
                            <span className="font-semibold text-emerald-300">
                              {formatMiliarID(q.realisasiMiliar)} M
                            </span>
                          </div>
                          <div className="mt-1 pt-1 border-t border-white/15 flex justify-between text-[11px] tabular-nums">
                            <span className="text-slate-300">Serapan:</span>
                            <span className="font-bold">{formatPercentID(q.persentase)}</span>
                          </div>
                        </div>
                      )}

                      {/* Floating % Pill */}
                      <div
                        className={`mb-auto mt-3 sm:mt-4 px-2 py-0.5 rounded-md border text-[11px] font-bold tabular-nums shadow-2xs transition-transform duration-150 group-hover:scale-105 ${getBadgeStyle(
                          q.persentase
                        )}`}
                      >
                        {formatPercentID(q.persentase)}
                      </div>

                      {/* Two Bars side-by-side */}
                      <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-[64%]">
                        {/* Anggaran Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-6 sm:w-8">
                          <span className="text-[11px] font-bold text-[#0E264D] tabular-nums mb-1 leading-none">
                            {formatMiliarID(q.anggaranMiliar)}
                          </span>
                          <div
                            className="w-full rounded-t-[5px] transition-all duration-300"
                            style={{
                              height: `${anggaranH * 1.48}%`,
                              background: 'linear-gradient(180deg, #1683FF 0%, #0D67D8 100%)',
                            }}
                          />
                        </div>

                        {/* Realisasi Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-6 sm:w-8">
                          <span className="text-[11px] font-bold text-[#0E264D] tabular-nums mb-1 leading-none">
                            {formatMiliarID(q.realisasiMiliar)}
                          </span>
                          <div
                            className="w-full rounded-t-[5px] transition-all duration-300"
                            style={{
                              height: `${realisasiH * 1.48}%`,
                              background: 'linear-gradient(180deg, #1FB655 0%, #158E3F 100%)',
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-Axis Labels */}
          <div className="pl-8 grid grid-cols-4 pt-2">
            {data.map((q) => {
              const isSelected = selectedQuarter === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuarter(q.id)}
                  className="text-center cursor-pointer focus-visible:outline-none"
                >
                  <div
                    className={`text-[12px] font-bold leading-tight ${
                      isSelected ? 'text-[#0E76F4]' : 'text-[#0E264D]'
                    }`}
                  >
                    {q.shortLabel}
                  </div>
                  <div className="text-[10.5px] font-medium text-slate-500 leading-tight">
                    {q.months}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProgramDonutChartProps {
  programs: ProgramRealizationItem[];
  totalPercent: number;
  selectedProgram: ProgramCategory;
  onSelectProgram: (program: ProgramCategory) => void;
}

export const ProgramDonutChart: React.FC<ProgramDonutChartProps> = ({
  programs,
  totalPercent,
  selectedProgram,
  onSelectProgram,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const totalPagu = programs.reduce((acc, p) => acc + p.pagu, 0);
  const radius = 58;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Build SVG arc segments starting at top (-90deg)
  let cumulativeFraction = 0;
  const segments = programs.map((p) => {
    const fraction = totalPagu > 0 ? p.pagu / totalPagu : 0.25;
    const gap = 0.012;
    const dashLength = Math.max(0, (fraction - gap) * circumference);
    const dashOffset = -cumulativeFraction * circumference;
    cumulativeFraction += fraction;
    return {
      ...p,
      dashLength,
      dashOffset,
    };
  });

  const activeItem =
    programs.find((p) => p.id === hoveredId) ??
    (selectedProgram !== 'Semua Program'
      ? programs.find((p) => p.id === selectedProgram)
      : null);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-full py-1">
      {/* Donut SVG */}
      <div className="relative w-[176px] h-[176px] shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 overflow-visible">
          {segments.map((seg) => {
            const isHighlighted =
              hoveredId === seg.id ||
              (selectedProgram !== 'Semua Program' && selectedProgram === seg.id);
            const isDimmed =
              (hoveredId !== null && hoveredId !== seg.id) ||
              (hoveredId === null &&
                selectedProgram !== 'Semua Program' &&
                selectedProgram !== seg.id);

            return (
              <circle
                key={seg.id}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHighlighted ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() =>
                  onSelectProgram(selectedProgram === seg.id ? 'Semua Program' : seg.id)
                }
                className="cursor-pointer transition-all duration-200"
                style={{ opacity: isDimmed ? 0.38 : 1 }}
              />
            );
          })}
        </svg>

        {/* Center Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[24px] font-extrabold text-[#0E264D] tabular-nums leading-none tracking-tight">
            {formatPercentID(activeItem ? activeItem.persentase : totalPercent)}
          </span>
          <span className="mt-1 text-[11px] font-semibold text-slate-600 leading-tight max-w-[92px] truncate">
            {activeItem ? activeItem.name : 'Total Realisasi'}
          </span>
        </div>
      </div>

      {/* Right Program Legend */}
      <div className="flex-1 w-full space-y-2.5">
        {programs.map((prog) => {
          const isSelected = selectedProgram === prog.id;
          return (
            <button
              key={prog.id}
              type="button"
              onMouseEnter={() => setHoveredId(prog.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() =>
                onSelectProgram(selectedProgram === prog.id ? 'Semua Program' : prog.id)
              }
              title={`Filter kegiatan program ${prog.name} (${formatRupiah(prog.realisasi)})`}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 ring-1 ring-blue-200'
                  : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-[4px] shrink-0"
                  style={{ backgroundColor: prog.color }}
                />
                <span className="text-[13px] font-semibold text-[#0E264D] truncate">
                  {prog.name}
                </span>
              </span>
              <span className="text-[13.5px] font-extrabold text-[#0E264D] tabular-nums shrink-0">
                {formatPercentID(prog.persentase)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface TrendLineChartProps {
  data: QuarterlyBudgetItem[];
  currentYear: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, currentYear }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 460;
  const height = 165;
  const padLeft = 42;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (data.length > 1 ? (idx / (data.length - 1)) * plotW : plotW / 2);
  const getY = (val: number) => padTop + ((100 - val) / 100) * plotH;

  const currentPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.trendYearPercent), d }));
  const prevPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.prevYearPercent), d }));

  const toPolyline = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const yTicks = [100, 75, 50, 25, 0];

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[168px] overflow-visible"
        role="img"
        aria-label={`Grafik Tren Realisasi Anggaran ${currentYear} dibandingkan ${currentYear - 1}`}
      >
        {/* Horizontal Grid Lines & Y-Axis Labels */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={tick === 0 ? '#CBD5E1' : '#E2E8F0'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10.5"
                fontWeight="600"
                fill="#475569"
                className="tabular-nums"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Vertical Grid Lines */}
        {currentPoints.map((pt, i) => (
          <line
            key={pt.d.id}
            x1={pt.x}
            y1={padTop}
            x2={pt.x}
            y2={height - padBottom}
            stroke={hoveredIdx === i ? '#93C5FD' : '#E2E8F0'}
            strokeWidth={hoveredIdx === i ? '1.5' : '1'}
          />
        ))}

        {/* Previous Year Dashed Line */}
        <polyline
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeDasharray="4 4"
          points={toPolyline(prevPoints)}
        />

        {/* Current Year Solid Blue Line */}
        <polyline
          fill="none"
          stroke="#0E76F4"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={toPolyline(currentPoints)}
        />

        {/* Previous Year Dots */}
        {prevPoints.map((pt, i) => (
          <circle
            key={`prev-${pt.d.id}`}
            cx={pt.x}
            cy={pt.y}
            r={hoveredIdx === i ? 4.5 : 3.5}
            fill="#94A3B8"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}

        {/* Current Year Dots & Percentage Labels */}
        {currentPoints.map((pt, i) => {
          const labelOffsetY = i === 0 ? -9 : -10;
          return (
            <g key={`curr-${pt.d.id}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 5.5 : 4.2}
                fill="#0E76F4"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={pt.x + (i === 0 ? 12 : 0)}
                y={pt.y + labelOffsetY}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#0A58CA"
                className="tabular-nums"
              >
                {formatPercentID(pt.d.trendYearPercent)}
              </text>
            </g>
          );
        })}

        {/* X-Axis Quarter Labels */}
        {currentPoints.map((pt) => (
          <text
            key={`xlabel-${pt.d.id}`}
            x={pt.x}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#1E293B"
          >
            {pt.d.label}
          </text>
        ))}

        {/* Interactive Hover Columns */}
        {currentPoints.map((pt, i) => (
          <rect
            key={`hit-${pt.d.id}`}
            x={pt.x - 36}
            y={padTop - 8}
            width={72}
            height={plotH + 24}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute top-1 right-2 bg-[#0D2B5C] text-white rounded-lg px-3 py-2 shadow-md text-[11px] pointer-events-none z-20"
        >
          <div className="font-bold text-blue-200 mb-0.5">{data[hoveredIdx].label}</div>
          <div className="flex items-center justify-between gap-4 tabular-nums">
            <span>Realisasi {currentYear}:</span>
            <span className="font-bold">{formatPercentID(data[hoveredIdx].trendYearPercent)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 tabular-nums text-slate-300">
            <span>Realisasi {currentYear - 1}:</span>
            <span className="font-semibold">{formatPercentID(data[hoveredIdx].prevYearPercent)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
