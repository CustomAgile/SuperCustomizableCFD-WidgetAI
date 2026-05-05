/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import type { WidgetSettings } from '@customagile/widget-ai/components/settings';

export interface CfdDataPoint {
  date: string;
  values: Record<string, number>;
}

export interface CfdData {
  points: CfdDataPoint[];
  series: string[];
}

export interface CfdSettings extends WidgetSettings {
  artifactType: string;
  groupByField: string;
  metricField: string;
  startDate: string;
  endDate: string;
  queryString: string;
}

export interface CfdDataProvider {
  fetchCfdData(params: {
    artifactType: string;
    groupByField: string;
    metricField: string;
    startDate: string;
    endDate: string;
    allowedOids: number[];
    projectOid: number | null;
  }): Promise<CfdData>;

  fetchAllowedValues(params: {
    artifactType: string;
    fieldName: string;
  }): Promise<string[]>;

  fetchFilteredOids(params: {
    artifactType: string;
    queryString: string;
    projectOid: number | null;
    projectScopeDown: boolean;
  }): Promise<number[]>;
}
