import type { CheckIn, Report } from '../types';
import type { MissionPhaseResearchContext } from './missionPhases';
import type { MissionDataSource } from './missionStatus';
import {
  getSimulationScenario,
  type SimulationScenarioId,
} from '../utils/simulatedTelemetry';

export type MissionEventKind =
  | 'simulation'
  | 'scenario'
  | 'anomaly'
  | 'phase'
  | 'check-in'
  | 'report'
  | 'research';

export interface MissionEvent {
  id: string;
  timestampIso: string;
  kind: MissionEventKind;
  typeLabel: string;
  description: string;
  source: MissionDataSource;
  link?: string;
  linkLabel?: string;
  simulatedSecond?: number;
}

export interface MissionSimulationTimelineInput {
  id: string;
  type:
    | 'start'
    | 'scenario'
    | 'speed'
    | 'duration'
    | 'pause'
    | 'resume'
    | 'reset'
    | 'complete'
    | 'bp';
  label: string;
  atIso: string;
  simulatedSecond: number;
  scenario: SimulationScenarioId;
  astronautId?: string | null;
}

export interface MissionPhaseChangeInput {
  id: string;
  atIso: string;
  previousLabel: string;
  nextLabel: string;
}

export interface MissionResearchContextInput {
  phaseId: string;
  phaseLabel: string;
  research: MissionPhaseResearchContext;
}

export interface MissionEventFeedInput {
  astronautId: string;
  simulationEvents: MissionSimulationTimelineInput[];
  phaseChanges: MissionPhaseChangeInput[];
  checkIns: CheckIn[];
  reports: Report[];
  research: MissionResearchContextInput;
  researchRetrievedAtIso: string;
  limit?: number;
}

export interface MissionEventFeedResult {
  events: MissionEvent[];
  totalCount: number;
  truncated: boolean;
}

const REPORT_FORMAT_LABELS: Record<Report['format'], string> = {
  flight_surgeon_sbar: 'Flight-surgeon SBAR',
  daily_summary: 'Daily summary',
  anomaly_brief: 'Anomaly brief',
};

function describeSimulationEvent(
  event: MissionSimulationTimelineInput
): Pick<MissionEvent, 'kind' | 'typeLabel' | 'description'> {
  const scenarioLabel = getSimulationScenario(event.scenario).label;

  switch (event.type) {
    case 'start':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: `Simulated session started in the ${scenarioLabel} scenario.`,
      };
    case 'pause':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: 'Simulated session paused.',
      };
    case 'resume':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: 'Simulated session resumed.',
      };
    case 'reset':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: 'Simulated session reset; in-memory samples cleared.',
      };
    case 'complete':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: 'Simulated session reached its selected duration and completed.',
      };
    case 'scenario':
      if (event.scenario === 'synthetic_anomaly') {
        return {
          kind: 'anomaly',
          typeLabel: 'Synthetic anomaly',
          description:
            'Synthetic anomaly scenario activated for interface testing; not a diagnosis or clinical alarm.',
        };
      }
      return {
        kind: 'scenario',
        typeLabel: 'Scenario',
        description: `Simulation scenario changed to ${scenarioLabel}.`,
      };
    case 'speed': {
      const value = event.label.split('→')[1]?.trim();
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: value
          ? `Simulation speed changed to ${value}.`
          : 'Simulation speed changed.',
      };
    }
    case 'duration': {
      const value = event.label.split('→')[1]?.trim();
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: value
          ? `Simulated session duration changed to ${value}.`
          : 'Simulated session duration changed.',
      };
    }
    case 'bp':
      return {
        kind: 'simulation',
        typeLabel: 'Simulation',
        description: 'Simulated blood-pressure cuff sample captured.',
      };
  }
}

function buildSimulationEvents(input: MissionEventFeedInput): MissionEvent[] {
  return input.simulationEvents
    .filter(
      (event) =>
        event.astronautId === input.astronautId ||
        (event.astronautId === null && event.type === 'scenario')
    )
    .map((event) => ({
      id: `sim-${event.id}`,
      timestampIso: event.atIso,
      simulatedSecond: event.simulatedSecond,
      source: 'simulated' as const,
      link: '/',
      linkLabel: 'Dashboard',
      ...describeSimulationEvent(event),
    }));
}

function buildPhaseEvents(input: MissionEventFeedInput): MissionEvent[] {
  return input.phaseChanges.map((change) => ({
    id: change.id,
    timestampIso: change.atIso,
    kind: 'phase',
    typeLabel: 'Mission phase',
    description: `Mission phase changed from ${change.previousLabel} to ${change.nextLabel}. Simulated transit context only.`,
    source: 'simulated',
  }));
}

function buildCheckInEvents(input: MissionEventFeedInput): MissionEvent[] {
  return input.checkIns
    .filter((checkIn) => checkIn.astronautId === input.astronautId)
    .map((checkIn) => ({
      id: `checkin-${checkIn.id}`,
      timestampIso: checkIn.timestampIso,
      kind: 'check-in' as const,
      typeLabel: 'Check-in',
      description: `Check-in recorded for mission day ${checkIn.missionDay}.`,
      source: 'recorded' as const,
      link: '/check-in',
      linkLabel: 'Check-In',
    }));
}

function buildReportEvents(input: MissionEventFeedInput): MissionEvent[] {
  return input.reports
    .filter((report) => report.astronautId === input.astronautId)
    .map((report) => {
      const formatLabel = REPORT_FORMAT_LABELS[report.format] ?? 'Mission report';
      const period = report.periodLabel ? ` (${report.periodLabel})` : '';
      return {
        id: `report-${report.id}`,
        timestampIso: report.createdAtIso,
        kind: 'report' as const,
        typeLabel: 'Report',
        description: `${formatLabel} generated for mission day ${report.missionDay}${period}.`,
        source: 'recorded' as const,
        link: '/reports',
        linkLabel: 'Reports',
      };
    });
}

function buildResearchEvent(input: MissionEventFeedInput): MissionEvent {
  const { phaseId, phaseLabel, research } = input.research;
  const description =
    research.status === 'not-represented'
      ? `NASA OSD-575 has no bundled sample for ${phaseLabel}. Research context only; not this crew.`
      : `NASA OSD-575 ${research.badgeLabel.toLowerCase()} for ${phaseLabel}. Archived data; not this crew's measurements.`;

  return {
    id: `research-${phaseId}-${input.researchRetrievedAtIso}`,
    timestampIso: input.researchRetrievedAtIso,
    kind: 'research',
    typeLabel: 'Research context',
    description,
    source: 'research',
    link: '/research',
    linkLabel: 'Research Context',
  };
}

function compareEvents(a: MissionEvent, b: MissionEvent): number {
  const byTime = Date.parse(a.timestampIso) - Date.parse(b.timestampIso);
  return Number.isNaN(byTime) ? 0 : byTime;
}

/**
 * Merges the volatile simulation timeline with browser-local records and archived
 * research context. Nothing here is persisted or transmitted; callers own the phase-change
 * history so this function stays pure.
 */
export function buildMissionEventFeed(
  input: MissionEventFeedInput
): MissionEventFeedResult {
  const limit = Math.min(50, Math.max(1, Math.round(input.limit ?? 20)));
  const allEvents = [
    ...buildSimulationEvents(input),
    ...buildPhaseEvents(input),
    ...buildCheckInEvents(input),
    ...buildReportEvents(input),
    buildResearchEvent(input),
  ].sort(compareEvents);

  return {
    events: allEvents.slice(-limit).reverse(),
    totalCount: allEvents.length,
    truncated: allEvents.length > limit,
  };
}
