import { motion } from 'framer-motion';
import { AgentInsight, CoordinatorResponse } from '../api/client';
import { GlassCard, AgentTag, RiskBadge, ConfidenceRing } from './ui';

interface InsightPanelProps {
  result: CoordinatorResponse;
}

export function InsightPanel({ result }: InsightPanelProps) {
  return (
    <div className="space-y-6">
      <GlassCard glow="moss" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-moss-400 font-medium uppercase tracking-wider mb-2">
              Session {result.session_id} · {result.total_latency_ms.toFixed(0)}ms
            </p>
            <h3 className="font-display text-xl font-semibold text-gray-100 leading-relaxed">
              {result.summary}
            </h3>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {result.insights.map((insight, i) => (
          <InsightCard key={`${insight.agent}-${i}`} insight={insight} delay={i * 0.08} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight, delay }: { insight: AgentInsight; delay: number }) {
  return (
    <GlassCard delay={delay} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <AgentTag agent={insight.agent} />
        <div className="flex items-center gap-3">
          <ConfidenceRing value={Math.round(insight.confidence)} size={48} />
          <RiskBadge risk={insight.risk} />
        </div>
      </div>

      {insight.problem && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Problem</p>
          <p className="text-sm font-medium text-gray-200">{insight.problem}</p>
        </div>
      )}

      {insight.cause && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Cause</p>
          <p className="text-sm text-gray-400">{insight.cause}</p>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Recommendation</p>
        <p className="text-sm text-moss-400 leading-relaxed">{insight.recommendation}</p>
      </div>
    </GlassCard>
  );
}
