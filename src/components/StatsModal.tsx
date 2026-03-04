/**
 * StatsModal component - displays OPR guideline compliance in a modal.
 */

import type { MapStats } from '../lib/types';
import { getComplianceStatus, isOPRCompliant } from '../lib/stats';

interface StatsModalProps {
  stats: MapStats;
  onClose: () => void;
}

export function StatsModal({ stats, onClose }: StatsModalProps) {
  const status = getComplianceStatus(stats);
  const compliant = isOPRCompliant(stats);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Map Statistics</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Compliance Summary */}
        <div
          className={`mb-4 p-3 rounded-lg ${compliant ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-lg ${compliant ? 'text-green-600' : 'text-yellow-600'}`}>
              {compliant ? '✓' : '⚠'}
            </span>
            <span className={`font-medium ${compliant ? 'text-green-700' : 'text-yellow-700'}`}>
              {compliant ? 'OPR Compliant' : 'Not Fully Compliant'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Based on OPR terrain placement guidelines</p>
        </div>

        <div className="space-y-3">
          {/* Terrain Composition */}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Terrain Composition
          </div>

          <StatRow
            label="Coverage"
            value={`${(stats.coverage * 100).toFixed(1)}%`}
            target="≥25%"
            status={status.coverage}
          />

          <StatRow
            label="Blocking"
            value={`${(stats.blockingPercent * 100).toFixed(1)}%`}
            target="≥50%"
            status={status.blocking}
          />

          {stats.impassablePercent > 0 && (
            <StatRow
              label="Impassable"
              value={`${(stats.impassablePercent * 100).toFixed(1)}%`}
              target="—"
              status={status.impassable}
            />
          )}

          <StatRow
            label="Cover"
            value={`${(stats.coverPercent * 100).toFixed(1)}%`}
            target="≥33%"
            status={status.cover}
          />

          <StatRow
            label="Difficult"
            value={`${(stats.difficultPercent * 100).toFixed(1)}%`}
            target="≥33%"
            status={status.difficult}
          />

          <StatRow
            label="Dangerous"
            value={`${stats.dangerousCount} hexes`}
            target="≥2"
            status={status.dangerous}
          />

          {/* LOS & Gaps */}
          <div className="border-t pt-3 mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Line of Sight & Gaps
            </div>

            <StatRow
              label="LOS Blocked"
              value={stats.losBlocked ? 'Yes ✓' : 'No ✗'}
              target="Yes"
              status={status.los}
            />

            <StatRow
              label="Widest Corridor"
              value={`${stats.widestCorridor} cols`}
              target="<6"
              status={stats.widestCorridor < 6 ? 'good' : 'bad'}
            />

            <StatRow
              label="Max Gap"
              value={`${stats.maxGap} hexes`}
              target="≤12"
              status={status.maxGap}
            />

            <StatRow
              label="Min Passage"
              value={`${stats.minPassage} hexes`}
              target="≥6 (rec)"
              status={status.minPassage}
            />
          </div>

          {/* Balance */}
          <div className="border-t pt-3 mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Balance (Top / Bottom)
            </div>
            <BalanceRow
              label="Terrain"
              top={stats.balance.topTerrain}
              bottom={stats.balance.bottomTerrain}
            />
            <BalanceRow
              label="Blocking"
              top={stats.balance.topBlocking}
              bottom={stats.balance.bottomBlocking}
            />
            <BalanceRow
              label="Cover"
              top={stats.balance.topCover}
              bottom={stats.balance.bottomCover}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  target,
  status,
}: {
  label: string;
  value: string;
  target: string;
  status: 'good' | 'warning' | 'bad';
}) {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    bad: 'text-red-600',
  };

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">{target}</span>
        <span className={`font-medium ${statusColors[status]}`}>{value}</span>
      </div>
    </div>
  );
}

function BalanceRow({ label, top, bottom }: { label: string; top: number; bottom: number }) {
  const diff = Math.abs(top - bottom);
  const total = top + bottom;
  // Consider balanced if difference is ≤10% of total or ≤3 hexes
  const isBalanced = total === 0 || diff <= Math.max(3, total * 0.1);

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
        {top} / {bottom}
      </span>
    </div>
  );
}
