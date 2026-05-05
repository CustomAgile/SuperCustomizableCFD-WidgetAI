/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import '@customagile/widget-ai/styles/rally-app-tokens.css';

import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import { AppHeader } from '@customagile/widget-ai/components/AppHeader';
import { EditModePanel, SettingRow } from '@customagile/widget-ai/components/EditModePanel';
import { useWidgetSettings, defineWidgetSettings } from '@customagile/widget-ai/components/settings';

import type { CfdDataProvider, CfdData, CfdSettings } from './types';
import { CFDChart } from './components/CFDChart';

// ── Constants ──────────────────────────────────────────────────────────

const SETTINGS_DEFAULTS = defineWidgetSettings<CfdSettings>({
  artifactType: 'HierarchicalRequirement',
  groupByField: 'ScheduleState',
  metricField: 'Count',
  startDate: '',
  endDate: 'today',
  queryString: '',
});

const ARTIFACT_TYPE_OPTIONS = [
  { value: 'HierarchicalRequirement', label: 'User Story' },
  { value: 'Defect', label: 'Defect' },
  { value: 'Task', label: 'Task' },
  { value: 'PortfolioItem/Feature', label: 'Feature' },
  { value: 'PortfolioItem/Epic', label: 'Epic' },
  { value: 'TestCase', label: 'Test Case' },
];

const GROUP_BY_SUGGESTIONS: Record<string, string[]> = {
  HierarchicalRequirement: ['ScheduleState', 'State', 'Iteration', 'Owner'],
  Defect: ['State', 'Priority', 'Severity', 'Owner'],
  Task: ['State', 'Owner'],
  'PortfolioItem/Feature': ['State', 'Owner'],
  'PortfolioItem/Epic': ['State', 'Owner'],
  TestCase: ['LastVerdict', 'Owner'],
};

const METRIC_OPTIONS = [
  { value: 'Count', label: 'Count' },
  { value: 'PlanEstimate', label: 'Plan Estimate (Story Points)' },
  { value: 'TaskEstimateTotal', label: 'Task Estimate Total' },
  { value: 'TaskRemainingTotal', label: 'Task Remaining Total' },
  { value: 'TaskActualTotal', label: 'Task Actual Total' },
];

// Colorblind-safe palette — must match CFDChart's SERIES_COLORS order
const LEGEND_COLORS = [
  '#E5E7EB', '#93C5FD', '#3B82F6', '#1E3A8A',
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getProjectOid(ctx: RallyContext): number | null {
  const proj = ctx.GlobalScope.Project;
  if (typeof proj === 'object' && proj.ObjectID != null) return proj.ObjectID as number;
  if (typeof proj === 'string') {
    const m = proj.match(/\/project\/(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 8px',
  fontSize: 'var(--ca-font-size-sm)',
  color: 'var(--ca-text-primary)',
  backgroundColor: 'var(--ca-surface-raised)',
  border: '1px solid var(--ca-border-default)',
  borderRadius: 'var(--ca-radius-xs)',
};

// ── App component ──────────────────────────────────────────────────────

interface AppProps {
  rallyContext: RallyContext;
  data: CfdDataProvider;
}

export default function App({ rallyContext, data }: AppProps) {
  const { settings, updateSetting, updateSettings } = useWidgetSettings<CfdSettings>(
    rallyContext,
    SETTINGS_DEFAULTS,
  );

  const projectOid = getProjectOid(rallyContext);
  const projectScopeDown = rallyContext.GlobalScope.ProjectScopeDown;

  // Resolve "today" token at render time
  const resolvedEnd = settings.endDate === 'today' || !settings.endDate ? todayIso() : settings.endDate;

  // ── Inline data fetch ──────────────────────────────────────────────
  const [cfdData, setCfdData] = useState<CfdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!settings.artifactType || !settings.groupByField || !settings.startDate || !resolvedEnd) {
      setCfdData(null);
      setLoading(false);
      setError('Configure artifact type, group-by field, and date range in Settings.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        let allowedOids: number[] = [];
        if (settings.queryString) {
          allowedOids = await data.fetchFilteredOids({
            artifactType: settings.artifactType,
            queryString: settings.queryString,
            projectOid,
            projectScopeDown,
          });
          if (allowedOids.length === 0) {
            if (!cancelled) { setCfdData({ points: [], series: [] }); setLoading(false); }
            return;
          }
        }

        const result = await data.fetchCfdData({
          artifactType: settings.artifactType,
          groupByField: settings.groupByField,
          metricField: settings.metricField || 'Count',
          startDate: settings.startDate,
          endDate: resolvedEnd,
          allowedOids,
          projectOid,
        });

        if (!cancelled) { setCfdData(result); setLoading(false); }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load CFD data');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, settings.artifactType, settings.groupByField, settings.metricField, settings.startDate, resolvedEnd, settings.queryString, projectOid, projectScopeDown, tick]);

  // ── EditMode ───────────────────────────────────────────────────────
  if (rallyContext.isEditMode) {
    const groupBySuggestions = GROUP_BY_SUGGESTIONS[settings.artifactType] ?? [];
    return (
      <EditModePanel
        appName="Super Customizable CFD"
        version="0.1.0"
        appSlug="super-customizable-cfd"
        settings={settings as unknown as Record<string, unknown>}
        onSave={(dirty: Partial<CfdSettings>) => updateSettings(dirty)}
        onClose={() => { /* Rally controls EditMode exit */ }}
      >
        <SettingRow label="Artifact Type" settingKey="artifactType">
          <select value={settings.artifactType} onChange={(e) => updateSetting('artifactType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {ARTIFACT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>

        <SettingRow label="Group By Field" settingKey="groupByField">
          <input type="text" list="group-by-options" value={settings.groupByField} onChange={(e) => updateSetting('groupByField', e.target.value)} placeholder="e.g. ScheduleState" style={inputStyle} />
          <datalist id="group-by-options">
            {groupBySuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ca-text-secondary)' }}>
            Must be a constrained field (State, Status, BOOLEAN).
          </div>
        </SettingRow>

        <SettingRow label="Measure" settingKey="metricField">
          <select value={settings.metricField} onChange={(e) => updateSetting('metricField', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {METRIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>

        <SettingRow label="Start Date" settingKey="startDate">
          <input type="date" value={settings.startDate} onChange={(e) => updateSetting('startDate', e.target.value)} style={inputStyle} />
        </SettingRow>

        <SettingRow label="End Date" settingKey="endDate">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ca-font-size-sm)', cursor: 'pointer' }}>
              <input type="radio" name="enddate" checked={settings.endDate === 'today'} onChange={() => updateSetting('endDate', 'today')} />
              Today
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ca-font-size-sm)', cursor: 'pointer' }}>
              <input type="radio" name="enddate" checked={settings.endDate !== 'today' && settings.endDate !== 'timebox'} onChange={() => updateSetting('endDate', todayIso())} />
              Specific Date
            </label>
          </div>
          {settings.endDate !== 'today' && settings.endDate !== 'timebox' && (
            <input type="date" value={settings.endDate} onChange={(e) => updateSetting('endDate', e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          )}
        </SettingRow>

        <SettingRow label="Additional Filter (WSAPI Query)" settingKey="queryString">
          <textarea value={settings.queryString} onChange={(e) => updateSetting('queryString', e.target.value)} placeholder='e.g. (Project.Name = "My Project")' rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ca-text-secondary)' }}>
            Only items matching this query will be included.
          </div>
        </SettingRow>
      </EditModePanel>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────
  const typeLabel = ARTIFACT_TYPE_OPTIONS.find((o) => o.value === settings.artifactType)?.label ?? settings.artifactType;
  const metricLabel = METRIC_OPTIONS.find((o) => o.value === (settings.metricField || 'Count'))?.label ?? (settings.metricField || 'Count');
  const chartTitle = settings.queryString ? '' : `${typeLabel} grouped by ${settings.groupByField}`;

  function handleExport() {
    if (!cfdData || cfdData.points.length === 0) return;
    const rows = [
      ['Date', ...cfdData.series].join(','),
      ...cfdData.points.map((pt) => [pt.date, ...cfdData.series.map((s) => String(pt.values[s] ?? 0))].join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cfd.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--ca-font-family)', backgroundColor: 'var(--ca-surface-page)', color: 'var(--ca-text-primary)', overflow: 'hidden' }}>
      <AppHeader
        title="Super Customizable CFD"
        help={{
          content: (
            <>
              <p>A Cumulative Flow Diagram showing how {typeLabel.toLowerCase()}s flow through states over time. The stacked bands represent the count (or measure) of work in each state on each day.</p>
              <p><strong>Reading the chart:</strong> Thick bands indicate work accumulating. A band that is not growing means the upstream states are delivering at the same rate downstream states are consuming.</p>
              <p>Use Edit Mode to change the artifact type, group-by field, date range, or add a custom query filter.</p>
            </>
          ),
        }}
      />

      {error && (
        <div role="alert" style={{ margin: 'var(--ca-space-2)', padding: 'var(--ca-space-2)', backgroundColor: 'var(--ca-status-red-bg, #FEF2F2)', color: 'var(--ca-status-red, #DC2626)', borderRadius: 'var(--ca-radius-sm)', fontSize: 'var(--ca-font-size-sm)' }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div aria-live="polite" aria-busy="true" style={{ padding: 'var(--ca-space-4)', textAlign: 'center', color: 'var(--ca-text-secondary)', fontSize: 'var(--ca-font-size-sm)' }}>
          Loading…
        </div>
      )}

      {!loading && !error && cfdData && cfdData.points.length > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 var(--ca-space-2) var(--ca-space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--ca-space-2) 0', flexShrink: 0 }}>
            {chartTitle && <span style={{ fontSize: 'var(--ca-font-size-sm)', fontWeight: 600, color: 'var(--ca-text-secondary)' }}>{chartTitle}</span>}
            <button
              onClick={handleExport}
              title="Export to CSV"
              aria-label="Export chart data to CSV"
              style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12, cursor: 'pointer', backgroundColor: 'var(--ca-surface-raised)', color: 'var(--ca-text-primary)', border: '1px solid var(--ca-border-default)', borderRadius: 'var(--ca-radius-xs)' }}
            >
              ↓ Export CSV
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', minHeight: 200 }}>
            <CFDChart data={cfdData} metricLabel={metricLabel} />
          </div>

          {/* Inline legend */}
          {cfdData.series.length > 0 && (
            <div role="list" aria-label="Chart series legend" style={{ flexShrink: 0, paddingTop: 'var(--ca-space-2)', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 'var(--ca-font-size-sm)', color: 'var(--ca-text-primary)' }}>
              {cfdData.series.map((s, i) => (
                <div key={s} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: LEGEND_COLORS[i % LEGEND_COLORS.length], border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && (!cfdData || cfdData.points.length === 0) && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ca-text-secondary)', fontSize: 'var(--ca-font-size-sm)' }}>
          No data found. Check your date range and filters.
        </div>
      )}
    </div>
  );
}
