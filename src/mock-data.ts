/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import { DEFAULT_RALLY_CONTEXT } from '@customagile/widget-ai/types/rally-context';
import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import type { CfdDataProvider, CfdData } from './types';

// ── Mock scenario ──────────────────────────────────────────────────────
//
// 8-week sprint: 2026-03-02 through 2026-04-24
// Artifact type: HierarchicalRequirement (User Stories)
// Group by: ScheduleState
// Metric: Count
//
// Series (bottom to top): Defined → In-Progress → Completed → Accepted
//
// The scenario shows healthy sprint progression:
// - Stories start in Defined, gradually move through In-Progress → Completed → Accepted
// - By the end ~70% are Accepted, reflecting a healthy delivery cadence

const SERIES = ['Defined', 'In-Progress', 'Completed', 'Accepted'];

type DayEntry = [string, number, number, number, number]; // [date, Defined, In-Progress, Completed, Accepted]

const RAW_DATA: DayEntry[] = [
  // Week 1: work starts — most in Defined
  ['2026-03-02', 40, 2, 0, 0],
  ['2026-03-03', 38, 4, 0, 0],
  ['2026-03-04', 36, 5, 1, 0],
  ['2026-03-05', 34, 6, 2, 0],
  ['2026-03-06', 32, 8, 2, 0],
  // Week 2: in-progress grows
  ['2026-03-09', 30, 10, 2, 0],
  ['2026-03-10', 28, 11, 3, 0],
  ['2026-03-11', 26, 12, 3, 1],
  ['2026-03-12', 24, 13, 4, 1],
  ['2026-03-13', 22, 13, 5, 2],
  // Week 3: completions accelerate
  ['2026-03-16', 20, 13, 6, 3],
  ['2026-03-17', 18, 13, 7, 4],
  ['2026-03-18', 16, 12, 8, 6],
  ['2026-03-19', 14, 12, 9, 7],
  ['2026-03-20', 12, 11, 10, 9],
  // Week 4: acceptance ramps up
  ['2026-03-23', 10, 10, 11, 11],
  ['2026-03-24', 8, 10, 12, 12],
  ['2026-03-25', 7, 9, 12, 14],
  ['2026-03-26', 6, 8, 12, 16],
  ['2026-03-27', 5, 7, 12, 18],
  // Week 5: defined shrinks as backlog clears
  ['2026-03-30', 4, 7, 11, 20],
  ['2026-03-31', 3, 6, 11, 22],
  ['2026-04-01', 3, 5, 11, 23],
  ['2026-04-02', 2, 5, 10, 25],
  ['2026-04-03', 2, 4, 10, 26],
  // Week 6: strong delivery
  ['2026-04-06', 2, 3, 9, 28],
  ['2026-04-07', 2, 3, 8, 29],
  ['2026-04-08', 1, 2, 8, 31],
  ['2026-04-09', 1, 2, 7, 32],
  ['2026-04-10', 1, 1, 7, 33],
  // Week 7: final push
  ['2026-04-13', 1, 1, 6, 34],
  ['2026-04-14', 1, 1, 5, 35],
  ['2026-04-15', 0, 1, 5, 36],
  ['2026-04-16', 0, 0, 5, 37],
  ['2026-04-17', 0, 0, 4, 38],
  // Week 8: sprint close
  ['2026-04-20', 0, 0, 3, 39],
  ['2026-04-21', 0, 0, 2, 40],
  ['2026-04-22', 0, 0, 1, 41],
  ['2026-04-23', 0, 0, 1, 41],
  ['2026-04-24', 0, 0, 0, 42],
];

function buildMockCfdData(): CfdData {
  const points = RAW_DATA.map(([date, defined, inProgress, completed, accepted]) => ({
    date,
    values: {
      'Defined': defined,
      'In-Progress': inProgress,
      'Completed': completed,
      'Accepted': accepted,
    },
  }));

  return { points, series: SERIES };
}

// ── Mock provider ──────────────────────────────────────────────────────

export const mockProvider: CfdDataProvider = {
  fetchAllowedValues: async ({ fieldName }) => {
    if (fieldName === 'ScheduleState') return SERIES;
    if (fieldName === 'FlowState') return ['Backlog', 'In Progress', 'Done'];
    return ['None', 'Option A', 'Option B'];
  },

  fetchFilteredOids: async () => [],

  fetchCfdData: async () => buildMockCfdData(),
};

// ── Mock context ──────────────────────────────────────────────────────

export const mockContext: RallyContext = {
  ...DEFAULT_RALLY_CONTEXT,
  User: {
    _ref: '/user/999',
    DisplayName: 'Mock User',
    EmailAddress: 'mock@example.com',
    UserName: 'mockuser',
    ObjectID: 999,
  },
  WidgetName: 'Super Customizable CFD',
  WidgetUUID: 'mock-cfd-uuid',
  isEditMode: false,
  Settings: {
    artifactType: 'HierarchicalRequirement',
    groupByField: 'ScheduleState',
    metricField: 'Count',
    startDate: '2026-03-02',
    endDate: '2026-04-24',
    queryString: '',
  },
};
