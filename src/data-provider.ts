/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import { queryLookback } from '@customagile/widget-ai/data/lookback';
import type { LookbackSnapshot } from '@customagile/widget-ai/data/lookback';
import { wsapiQueryAll } from '@customagile/widget-ai/data/wsapi';
import type { ArtifactTypeKey } from '@customagile/widget-ai/types/rally-registry';
import type { CfdDataProvider, CfdData, CfdDataPoint } from './types';

// ── CFD calculation ────────────────────────────────────────────────────

function addDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function computeCfd(
  snapshots: LookbackSnapshot[],
  groupByField: string,
  metricField: string,
  seriesOrder: string[],
  startDate: string,
  endDate: string,
): CfdData {
  const isCount = metricField === 'Count';

  const byOid = new Map<number, LookbackSnapshot[]>();
  for (const snap of snapshots) {
    const list = byOid.get(snap.ObjectID) ?? [];
    list.push(snap);
    byOid.set(snap.ObjectID, list);
  }

  const points: CfdDataPoint[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dayEnd = current + 'T23:59:59.999Z';
    const seriesTotals: Record<string, number> = {};
    for (const series of seriesOrder) seriesTotals[series] = 0;

    for (const [, snaps] of byOid) {
      const validSnaps = snaps.filter(
        (s) => s._ValidFrom <= dayEnd && s._ValidTo > current,
      );
      if (validSnaps.length === 0) continue;

      const latest = validSnaps.reduce((best, s) =>
        s._ValidFrom > best._ValidFrom ? s : best,
      );

      let groupValue = latest[groupByField];
      if (groupValue === null || groupValue === undefined) groupValue = 'None';
      const groupStr = String(groupValue);
      if (!(groupStr in seriesTotals)) continue;

      if (isCount) {
        seriesTotals[groupStr] += 1;
      } else {
        const numVal = Number(latest[metricField] ?? 0);
        seriesTotals[groupStr] += isNaN(numVal) ? 0 : numVal;
      }
    }

    points.push({ date: current, values: { ...seriesTotals } });
    current = addDay(current);
  }

  return { points, series: seriesOrder };
}

// ── Provider helpers ───────────────────────────────────────────────────

function getWorkspaceRef(ctx: RallyContext): string | undefined {
  const ws = ctx.GlobalScope.Workspace;
  if (typeof ws === 'string') return ws || undefined;
  return ws._ref || undefined;
}

// ── Provider factory ───────────────────────────────────────────────────

export function createRallyProvider(ctx: RallyContext): CfdDataProvider {
  const workspace = getWorkspaceRef(ctx);

  return {
    async fetchAllowedValues({ artifactType, fieldName }) {
      const results = await wsapiQueryAll('TypeDefinition' as ArtifactTypeKey, {
        fetch: 'Attributes',
        query: `(TypePath = "${artifactType}")`,
        workspace,
        pagesize: 1,
      });
      if (!results || results.length === 0) return [];

      const attrResults = await wsapiQueryAll('AttributeDefinition' as ArtifactTypeKey, {
        fetch: 'Name,AttributeType,AllowedValues',
        query: `(TypeDefinition.TypePath = "${artifactType}") AND (ElementName = "${fieldName}")`,
        workspace,
        pagesize: 10,
      });
      if (!attrResults || attrResults.length === 0) return [];

      const attrDef = attrResults[0] as Record<string, unknown>;
      if ((attrDef.AttributeType as string | undefined) === 'BOOLEAN') {
        return ['true', 'false'];
      }

      const allowedValResults = await wsapiQueryAll('AllowedAttributeValue' as ArtifactTypeKey, {
        fetch: 'StringValue',
        query: `(AttributeDefinition.ElementName = "${fieldName}") AND (AttributeDefinition.TypeDefinition.TypePath = "${artifactType}")`,
        workspace,
        pagesize: 100,
      });

      return allowedValResults
        .map((r) => (r as Record<string, unknown>).StringValue as string)
        .filter(Boolean);
    },

    async fetchFilteredOids({ artifactType, queryString, projectOid, projectScopeDown }) {
      if (!queryString) return [];
      const results = await wsapiQueryAll(artifactType as ArtifactTypeKey, {
        fetch: 'ObjectID',
        query: queryString,
        workspace,
        project: projectOid ? `/project/${projectOid}` : undefined,
        projectScopeDown,
        pagesize: 2000,
      });
      return results.map((r) => (r as Record<string, unknown>).ObjectID as number);
    },

    async fetchCfdData({ artifactType, groupByField, metricField, startDate, endDate, allowedOids, projectOid }): Promise<CfdData> {
      const allowedValues = await this.fetchAllowedValues({ artifactType, fieldName: groupByField });

      const findClause: Record<string, unknown> = {
        _TypeHierarchy: artifactType,
        _ValidFrom: { $lte: endDate + 'T23:59:59.999Z' },
        _ValidTo: { $gt: startDate + 'T00:00:00.000Z' },
      };

      if (/hierarchicalrequirement/i.test(artifactType)) findClause['Children'] = null;
      if (allowedOids.length > 0) findClause['ObjectID'] = { $in: allowedOids };
      if (projectOid != null) findClause['Project'] = projectOid;

      const fetchFields = [groupByField, '_ValidFrom', '_ValidTo', 'ObjectID'];
      if (metricField !== 'Count') fetchFields.push(metricField);

      const snapshots = await queryLookback(ctx, {
        find: findClause,
        fields: fetchFields,
        hydrate: [groupByField],
        compress: true,
        removeUnauthorizedSnapshots: true,
        pagesize: 500,
      });

      return computeCfd(snapshots, groupByField, metricField, allowedValues, startDate, endDate);
    },
  };
}
