import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Info,
  RotateCcw,
  Share2,
  ShieldAlert,
} from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import { buildStructuredReport } from '../engine/reportGenerator';
import { evaluateHealthAssessment } from '../engine/healthEngine';
import { SAFETY_DISCLAIMER, STATUS_META } from '../engine/thresholds';
import type { AppetiteLevel, PainLevel, SymptomTag } from '../types';
import {
  celsiusToFahrenheit,
  cupsToLiters,
  fahrenheitToCelsius,
  kgToLb,
  lbToKg,
  litersToCups,
  mgDlToMmolL,
  mmolLToMgDl,
} from '../utils/unitConversions';
import {
  AstronautAvatar,
  Button,
  Card,
  EmptyState,
  StatusPill,
  healthStatusToTone,
} from '../components/ui';

type StepNumber = 1 | 2 | 3 | 4;

interface CheckInDraft {
  step: StepNumber;
  moodScore: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  fatigueLevel: 1 | 2 | 3 | 4 | 5;
  painLevel: PainLevel;
  sleepHours: string;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  appetite: AppetiteLevel;
  hydrationUnit: 'liters' | 'cups';
  hydrationValue: string;
  exerciseMinutes: string;
  resistanceMinutes: string;
  symptoms: SymptomTag[];
  heartRateBpm: string;
  systolicBpMmHg: string;
  diastolicBpMmHg: string;
  tempUnit: 'C' | 'F';
  bodyTempValue: string;
  glucoseUnit: 'mg/dL' | 'mmol/L';
  bloodGlucoseValue: string;
  massUnit: 'kg' | 'lb';
  bodyMassValue: string;
  dailyRadiationMsv: string;
  spo2Percent: string;
  crewNotes: string;
  shareWithMedicalLead: boolean;
  savedAtIso: string;
}

const PAIN_TO_SCORE: Record<PainLevel, number> = {
  none: 0,
  mild: 2,
  moderate: 5,
  severe: 8,
};

const SYMPTOM_CHIPS: Array<{ id: SymptomTag; label: string; caution?: boolean }> = [
  { id: 'headache', label: 'Headache' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'visual_blur', label: 'Vision changes' },
  { id: 'shortness_of_breath', label: 'Shortness of breath', caution: true },
  { id: 'chest_pain', label: 'Chest discomfort', caution: true },
  { id: 'muscle_soreness', label: 'Muscle or joint pain' },
  { id: 'back_pain', label: 'Back pain' },
  { id: 'skin_irritation', label: 'Skin irritation' },
  { id: 'poor_concentration', label: 'Poor concentration' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'low_mood', label: 'Low mood' },
  { id: 'fever_chills', label: 'Feverish feeling', caution: true },
  { id: 'severe_shortness_of_breath', label: 'Severe shortness of breath', caution: true },
  { id: 'fainting', label: 'Fainting / syncope', caution: true },
  { id: 'severe_allergic_reaction', label: 'Severe allergic reaction', caution: true },
  { id: 'rapidly_worsening', label: 'Rapidly worsening symptoms', caution: true },
];

const STEPS: Array<{ step: StepNumber; title: string; subtitle: string }> = [
  { step: 1, title: '1. Daily State', subtitle: 'Sleep, mood & activity' },
  { step: 2, title: '2. Symptoms', subtitle: 'Quick chip screening' },
  { step: 3, title: '3. Measurements', subtitle: 'Optional telemetry' },
  { step: 4, title: '4. Notes & Share', subtitle: 'Context & medical brief' },
];

function scoreToPainLevel(score?: number): PainLevel {
  if (!score || score <= 0) return 'none';
  if (score <= 3) return 'mild';
  if (score <= 6) return 'moderate';
  return 'severe';
}

function WhyMatters({ text }: { text: string }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--arogya-text-secondary)]">
      <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
      <span>
        <strong className="font-medium text-[var(--arogya-text-primary)]">Why this matters:</strong>{' '}
        {text}
      </span>
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-[var(--arogya-critical-text)]">
      {message}
    </p>
  );
}

export function CheckInPage() {
  const { astronaut, mission, checkIns14d, vitals14d, assessment } = useActiveAssessment();
  const addCheckIn = useArogyaStore((s) => s.addCheckIn);
  const addVitals = useArogyaStore((s) => s.addVitals);
  const addReport = useArogyaStore((s) => s.addReport);
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);

  const draftKey = `arogya-checkin-draft-${astronaut.id}-D${mission.currentDay}`;
  const latestCheckIn = checkIns14d[checkIns14d.length - 1];
  const todayVital = vitals14d.find((v) => v.missionDay === mission.currentDay);

  const buildDefaultDraft = (): CheckInDraft => ({
    step: 1,
    moodScore: latestCheckIn?.moodScore ?? 4,
    stressLevel: latestCheckIn?.stressLevel ?? 2,
    fatigueLevel: latestCheckIn?.fatigueLevel ?? 2,
    painLevel: latestCheckIn?.painLevel ?? scoreToPainLevel(latestCheckIn?.painScore),
    sleepHours: String(latestCheckIn?.sleepHours ?? astronaut.baseline.sleepTargetHours),
    sleepQuality: latestCheckIn?.sleepQuality ?? 4,
    appetite: latestCheckIn?.appetite ?? 'normal',
    hydrationUnit: 'liters',
    hydrationValue: String(
      latestCheckIn?.hydrationLiters ?? astronaut.baseline.hydrationTargetLiters
    ),
    exerciseMinutes: String(
      latestCheckIn?.exerciseMinutes ?? astronaut.baseline.exerciseTargetMinutes
    ),
    resistanceMinutes: String(
      latestCheckIn?.resistanceMinutes ??
        (latestCheckIn?.resistanceTrainingCompleted ? 30 : 0)
    ),
    symptoms:
      latestCheckIn?.symptoms && latestCheckIn.symptoms.length > 0
        ? latestCheckIn.symptoms
        : ['none'],
    heartRateBpm: '',
    systolicBpMmHg: '',
    diastolicBpMmHg: '',
    tempUnit: 'C',
    bodyTempValue: '',
    glucoseUnit: 'mg/dL',
    bloodGlucoseValue: '',
    massUnit: 'kg',
    bodyMassValue: '',
    dailyRadiationMsv: '',
    spo2Percent: '',
    crewNotes: latestCheckIn?.crewNotes ?? '',
    shareWithMedicalLead: latestCheckIn?.shareWithMedicalLead ?? false,
    savedAtIso: new Date().toISOString(),
  });

  const [draft, setDraft] = useState<CheckInDraft>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw) as CheckInDraft;
    } catch {
      // Ignore malformed local draft
    }
    return buildDefaultDraft();
  });

  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedState, setSubmittedState] = useState<{
    missionDay: number;
    readinessScore: number;
    status: keyof typeof STATUS_META;
    sharedReportId?: string;
    escalationRequired: boolean;
  } | null>(null);

  // Reload astronaut-specific draft when switching crew member or mission day
  useEffect(() => {
    setSubmittedState(null);
    setErrors({});
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        setDraft(JSON.parse(raw) as CheckInDraft);
        setHasSavedDraft(true);
        return;
      }
    } catch {
      // Ignore parse failure
    }
    setDraft(buildDefaultDraft());
    setHasSavedDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Auto-save draft locally on every edit
  useEffect(() => {
    if (submittedState) return;
    try {
      const payload = { ...draft, savedAtIso: new Date().toISOString() };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setHasSavedDraft(true);
    } catch {
      // Ignore storage quota issues
    }
  }, [draft, draftKey, submittedState]);

  const updateField = <K extends keyof CheckInDraft>(key: K, value: CheckInDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  // Unit conversion toggles that preserve numeric equivalence
  const handleHydrationUnitSwitch = (targetUnit: 'liters' | 'cups') => {
    if (targetUnit === draft.hydrationUnit) return;
    const num = Number(draft.hydrationValue);
    const converted =
      draft.hydrationValue.trim() !== '' && !Number.isNaN(num)
        ? String(targetUnit === 'cups' ? litersToCups(num) : cupsToLiters(num))
        : draft.hydrationValue;
    setDraft((prev) => ({ ...prev, hydrationUnit: targetUnit, hydrationValue: converted }));
  };

  const handleTempUnitSwitch = (targetUnit: 'C' | 'F') => {
    if (targetUnit === draft.tempUnit) return;
    const num = Number(draft.bodyTempValue);
    const converted =
      draft.bodyTempValue.trim() !== '' && !Number.isNaN(num)
        ? String(targetUnit === 'F' ? celsiusToFahrenheit(num) : fahrenheitToCelsius(num))
        : draft.bodyTempValue;
    setDraft((prev) => ({ ...prev, tempUnit: targetUnit, bodyTempValue: converted }));
  };

  const handleGlucoseUnitSwitch = (targetUnit: 'mg/dL' | 'mmol/L') => {
    if (targetUnit === draft.glucoseUnit) return;
    const num = Number(draft.bloodGlucoseValue);
    const converted =
      draft.bloodGlucoseValue.trim() !== '' && !Number.isNaN(num)
        ? String(targetUnit === 'mmol/L' ? mgDlToMmolL(num) : mmolLToMgDl(num))
        : draft.bloodGlucoseValue;
    setDraft((prev) => ({ ...prev, glucoseUnit: targetUnit, bloodGlucoseValue: converted }));
  };

  const handleMassUnitSwitch = (targetUnit: 'kg' | 'lb') => {
    if (targetUnit === draft.massUnit) return;
    const num = Number(draft.bodyMassValue);
    const converted =
      draft.bodyMassValue.trim() !== '' && !Number.isNaN(num)
        ? String(targetUnit === 'lb' ? kgToLb(num) : lbToKg(num))
        : draft.bodyMassValue;
    setDraft((prev) => ({ ...prev, massUnit: targetUnit, bodyMassValue: converted }));
  };

  const toggleSymptom = (tag: SymptomTag) => {
    if (tag === 'none') {
      updateField('symptoms', ['none']);
      return;
    }
    const current = draft.symptoms.filter((s) => s !== 'none');
    const next = current.includes(tag)
      ? current.filter((s) => s !== tag)
      : [...current, tag];
    updateField('symptoms', next.length > 0 ? next : ['none']);
  };

  const validateStep = (step: StepNumber): boolean => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      const sleep = Number(draft.sleepHours);
      if (draft.sleepHours.trim() === '' || Number.isNaN(sleep) || sleep < 0 || sleep > 16) {
        nextErrors.sleepHours = 'Enter sleep duration between 0 and 16 hours.';
      }

      const hydro = Number(draft.hydrationValue);
      const hydroMax = draft.hydrationUnit === 'liters' ? 8 : 34;
      if (draft.hydrationValue.trim() === '' || Number.isNaN(hydro) || hydro < 0 || hydro > hydroMax) {
        nextErrors.hydrationValue = `Enter hydration between 0 and ${hydroMax} ${draft.hydrationUnit}.`;
      }

      const ex = Number(draft.exerciseMinutes);
      if (draft.exerciseMinutes.trim() === '' || Number.isNaN(ex) || ex < 0 || ex > 300) {
        nextErrors.exerciseMinutes = 'Enter exercise time between 0 and 300 minutes.';
      }

      const res = Number(draft.resistanceMinutes);
      if (draft.resistanceMinutes.trim() === '' || Number.isNaN(res) || res < 0 || res > 180) {
        nextErrors.resistanceMinutes = 'Enter resistance-training time between 0 and 180 minutes.';
      }
    }

    if (step === 3) {
      const validateOpt = (
        raw: string,
        key: string,
        min: number,
        max: number,
        label: string
      ) => {
        if (raw.trim() === '') return;
        const val = Number(raw);
        if (Number.isNaN(val) || val < min || val > max) {
          nextErrors[key] = `${label} must be between ${min} and ${max}.`;
        }
      };

      validateOpt(draft.heartRateBpm, 'heartRateBpm', 30, 220, 'Resting heart rate (bpm)');
      validateOpt(draft.systolicBpMmHg, 'systolicBpMmHg', 60, 240, 'Systolic BP (mmHg)');
      validateOpt(draft.diastolicBpMmHg, 'diastolicBpMmHg', 35, 150, 'Diastolic BP (mmHg)');

      if (draft.systolicBpMmHg.trim() !== '' && draft.diastolicBpMmHg.trim() !== '') {
        if (Number(draft.diastolicBpMmHg) >= Number(draft.systolicBpMmHg)) {
          nextErrors.diastolicBpMmHg = 'Diastolic BP must be lower than systolic BP.';
        }
      }

      if (draft.tempUnit === 'C') {
        validateOpt(draft.bodyTempValue, 'bodyTempValue', 33, 42, 'Temperature (°C)');
      } else {
        validateOpt(draft.bodyTempValue, 'bodyTempValue', 91.4, 107.6, 'Temperature (°F)');
      }

      if (draft.glucoseUnit === 'mg/dL') {
        validateOpt(draft.bloodGlucoseValue, 'bloodGlucoseValue', 25, 500, 'Blood glucose (mg/dL)');
      } else {
        validateOpt(draft.bloodGlucoseValue, 'bloodGlucoseValue', 1.4, 27.8, 'Blood glucose (mmol/L)');
      }

      if (draft.massUnit === 'kg') {
        validateOpt(draft.bodyMassValue, 'bodyMassValue', 35, 160, 'Body mass (kg)');
      } else {
        validateOpt(draft.bodyMassValue, 'bodyMassValue', 77, 353, 'Body mass (lb)');
      }

      validateOpt(draft.dailyRadiationMsv, 'dailyRadiationMsv', 0, 50, 'Radiation dose (mSv)');
      validateOpt(draft.spo2Percent, 'spo2Percent', 70, 100, 'SpO₂ (%)');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoStep = (target: StepNumber) => {
    if (target > draft.step && !validateStep(draft.step)) return;
    updateField('step', target);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    setDraft(buildDefaultDraft());
    setErrors({});
    setHasSavedDraft(false);
  };

  const normalizedHydrationLiters = useMemo(() => {
    const num = Number(draft.hydrationValue);
    if (Number.isNaN(num)) return 0;
    return draft.hydrationUnit === 'cups' ? cupsToLiters(num) : num;
  }, [draft.hydrationUnit, draft.hydrationValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(3)) return;

    const sleepHours = Number(draft.sleepHours);
    const exerciseMinutes = Number(draft.exerciseMinutes);
    const resistanceMinutes = Number(draft.resistanceMinutes);

    // Adjust estimated daily intake hint from appetite while keeping existing calorie/protein structure
    const baseCalories = astronaut.baseline.calorieTargetKcal;
    const caloriesKcal =
      draft.appetite === 'poor'
        ? Math.round(baseCalories * 0.78)
        : draft.appetite === 'increased'
        ? Math.round(baseCalories * 1.1)
        : baseCalories;
    const proteinGrams = draft.appetite === 'poor' ? 72 : 95;

    // 1. Save Check-In to Zustand store
    const checkInPayload = {
      astronautId: astronaut.id,
      missionDay: mission.currentDay,
      sleepHours,
      sleepQuality: draft.sleepQuality,
      moodScore: draft.moodScore,
      stressLevel: draft.stressLevel,
      cognitiveFocus: draft.symptoms.includes('poor_concentration') ? (2 as const) : (4 as const),
      fatigueLevel: draft.fatigueLevel,
      hydrationLiters: normalizedHydrationLiters,
      caloriesKcal,
      proteinGrams,
      exerciseMinutes,
      exerciseCompleted: exerciseMinutes >= 30,
      resistanceTrainingCompleted: resistanceMinutes >= 15,
      resistanceMinutes,
      painScore: PAIN_TO_SCORE[draft.painLevel],
      painLevel: draft.painLevel,
      appetite: draft.appetite,
      symptoms: draft.symptoms,
      crewNotes: draft.crewNotes.trim(),
      shareWithMedicalLead: draft.shareWithMedicalLead,
    };

    addCheckIn(checkInPayload);

    // 2. If any Step 3 optional telemetry was entered, merge into today's VitalReading
    const hasOptionalMeasurements = [
      draft.heartRateBpm,
      draft.systolicBpMmHg,
      draft.diastolicBpMmHg,
      draft.bodyTempValue,
      draft.bloodGlucoseValue,
      draft.bodyMassValue,
      draft.dailyRadiationMsv,
      draft.spo2Percent,
    ].some((v) => v.trim() !== '');

    if (hasOptionalMeasurements) {
      const parseOrKeep = (raw: string, fallback: number | null) =>
        raw.trim() !== '' ? Number(raw) : fallback;

      const bodyTempC =
        draft.bodyTempValue.trim() !== ''
          ? draft.tempUnit === 'F'
            ? fahrenheitToCelsius(Number(draft.bodyTempValue))
            : Number(draft.bodyTempValue)
          : (todayVital?.bodyTempC ?? null);

      const bloodGlucoseMgDl =
        draft.bloodGlucoseValue.trim() !== ''
          ? draft.glucoseUnit === 'mmol/L'
            ? mmolLToMgDl(Number(draft.bloodGlucoseValue))
            : Number(draft.bloodGlucoseValue)
          : (todayVital?.bloodGlucoseMgDl ?? null);

      const bodyMassKg =
        draft.bodyMassValue.trim() !== ''
          ? draft.massUnit === 'lb'
            ? lbToKg(Number(draft.bodyMassValue))
            : Number(draft.bodyMassValue)
          : (todayVital?.bodyMassKg ?? null);

      addVitals({
        astronautId: astronaut.id,
        missionDay: mission.currentDay,
        heartRateBpm: parseOrKeep(draft.heartRateBpm, todayVital?.heartRateBpm ?? null),
        hrvMs: todayVital?.hrvMs ?? null,
        systolicBpMmHg: parseOrKeep(draft.systolicBpMmHg, todayVital?.systolicBpMmHg ?? null),
        diastolicBpMmHg: parseOrKeep(draft.diastolicBpMmHg, todayVital?.diastolicBpMmHg ?? null),
        spo2Percent: parseOrKeep(draft.spo2Percent, todayVital?.spo2Percent ?? null),
        respiratoryRateBpm: todayVital?.respiratoryRateBpm ?? null,
        bodyTempC,
        bloodGlucoseMgDl,
        bodyMassKg,
        dailyRadiationMsv: parseOrKeep(
          draft.dailyRadiationMsv,
          todayVital?.dailyRadiationMsv ?? null
        ),
        source: 'manual_entry',
      });
    }

    // Read fresh store slices synchronously after Zustand updates
    const freshState = useArogyaStore.getState();
    const updatedCheckIns = freshState.checkInsByAstronaut[astronaut.id] ?? [];
    const updatedVitals = freshState.vitalsByAstronaut[astronaut.id] ?? [];
    const updatedAssessment = evaluateHealthAssessment(
      astronaut,
      updatedCheckIns,
      updatedVitals,
      mission
    );

    let sharedReportId: string | undefined;
    if (draft.shareWithMedicalLead) {
      const report = buildStructuredReport({
        astronaut,
        assessment: updatedAssessment,
        mission,
        vitalsWindow: updatedVitals,
        checkInsWindow: updatedCheckIns,
        format: 'daily_summary',
        preparedForRole: 'Crew Medical Officer',
      });
      addReport(report);
      sharedReportId = report.id;
    }

    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    setHasSavedDraft(false);
    setSubmittedState({
      missionDay: mission.currentDay,
      readinessScore: updatedAssessment.overallReadinessScore,
      status: updatedAssessment.overallStatus,
      sharedReportId,
      escalationRequired: updatedAssessment.escalationRequired,
    });
  };

  if (submittedState) {
    const tone = healthStatusToTone(submittedState.status);
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <Card variant="elevated" padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="arogya-display text-[var(--arogya-text-primary)]">
                  Mission Day {submittedState.missionDay} Check-In Recorded
                </h1>
                <p className="mt-1 text-sm text-[var(--arogya-text-secondary)]">
                  Dashboard, Vitals, and Reports have been updated for{' '}
                  <strong className="text-[var(--arogya-text-primary)]">{astronaut.fullName}</strong>.
                </p>
              </div>
            </div>
            <StatusPill tone={tone} size="md" />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--arogya-text-secondary)]">Updated Readiness Score</p>
              <p className="mt-1 font-mono-tabular text-3xl font-bold text-[var(--arogya-text-primary)]">
                {submittedState.readinessScore}{' '}
                <span className="text-sm font-normal text-[var(--arogya-text-secondary)]">/ 100</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--arogya-text-secondary)]">Medical Lead Summary</p>
              <p className="mt-1 text-sm font-medium text-[var(--arogya-text-primary)]">
                {submittedState.sharedReportId
                  ? `Brief ${submittedState.sharedReportId} added to Reports`
                  : 'Stored locally (not queued to medical lead)'}
              </p>
            </div>
          </div>

          {submittedState.escalationRequired && (
            <div
              role="alert"
              className="flex flex-col gap-2.5 rounded-xl border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] p-3.5 text-xs text-[var(--arogya-critical-text)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-[var(--arogya-critical-text)]">Urgent Medical Escalation:</strong>{' '}
                  Based on today’s inputs, contact the Crew Medical Officer or Ground Flight Surgeon immediately.
                </span>
              </div>
              <Link
                to="/reports?escalate=1"
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C]"
              >
                <span>Open Urgent SBAR Brief</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-lg bg-[#1E3A5F] px-4 text-xs font-semibold text-white hover:bg-[#2D4A6F]"
            >
              View Dashboard
            </Link>
            <Link
              to="/vitals"
              className="inline-flex h-10 items-center rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-4 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
            >
              View Vitals
            </Link>
            <Link
              to="/reports"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] px-4 text-xs font-medium text-[var(--arogya-text-primary)] hover:bg-[var(--arogya-bg)]"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View Reports</span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setSubmittedState(null)}
            >
              Edit Today’s Check-In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--arogya-info)]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono-tabular uppercase tracking-wider">
              60–90 Second Guided Check-In · Sol {mission.currentDay}
            </span>
          </div>
          <div className="mt-1 flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              <AstronautAvatar
                astronautId={astronaut.id}
                fullName={astronaut.fullName}
                status={assessment.overallStatus}
                size="md"
                active
              />
            </span>
            <div className="min-w-0">
              <h1 className="arogya-display text-[var(--arogya-text-primary)]">
                Daily Crew Check-In
              </h1>
              <p className="mt-0.5 text-sm font-medium text-[var(--arogya-text-secondary)]">
                {astronaut.fullName}
              </p>
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--arogya-text-secondary)]">
            {SAFETY_DISCLAIMER}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill tone={healthStatusToTone(assessment.overallStatus)} size="sm" />
          {hasSavedDraft && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-2.5 py-1.5 text-[11px] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Step Progress Navigation */}
      <nav aria-label="Check-in steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((item) => {
          const active = draft.step === item.step;
          const completed = draft.step > item.step;
          return (
            <button
              key={item.step}
              type="button"
              aria-current={active ? 'step' : undefined}
              onClick={() => handleGoStep(item.step)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-[#1E3A5F] bg-[var(--arogya-selected-bg)] text-[#1E3A5F]'
                  : completed
                  ? 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]'
                  : 'border-[var(--arogya-border)] bg-[var(--arogya-surface)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
              }`}
            >
              <p className="text-xs font-semibold">{item.title}</p>
              <p className="mt-0.5 text-[11px] opacity-80">{item.subtitle}</p>
            </button>
          );
        })}
      </nav>

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg" className="space-y-6">
          {/* STEP 1: How do you feel today? */}
          {draft.step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
                  Step 1 — How do you feel today?
                </h3>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  Required core check-in. Compare sleep, energy, hydration, and countermeasure activity against your personal targets.
                </p>
              </div>

              {/* 1–5 Rating Scales */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {(
                  [
                    {
                      key: 'moodScore' as const,
                      label: 'Mood (1 = very low, 5 = steady/positive)',
                      val: draft.moodScore,
                      why: 'Tracks isolation, confinement, and workload impacts on emotional well-being over long transits.',
                    },
                    {
                      key: 'stressLevel' as const,
                      label: 'Stress (1 = calm, 5 = high strain)',
                      val: draft.stressLevel,
                      why: 'Sustained high stress elevates cortisol and can disrupt sleep quality and blood glucose.',
                    },
                    {
                      key: 'fatigueLevel' as const,
                      label: 'Fatigue (1 = rested, 5 = exhausted)',
                      val: draft.fatigueLevel,
                      why: 'Early fatigue shifts help detect circadian misalignment or recovery shortfalls before EVA tasks.',
                    },
                    {
                      key: 'sleepQuality' as const,
                      label: 'Sleep Quality (1 = fragmented, 5 = restorative)',
                      val: draft.sleepQuality,
                      why: 'Light cycles and cabin noise can fragment rest even when total time in bunk looks adequate.',
                    },
                  ] as const
                ).map((scale) => (
                  <fieldset key={scale.key} className="space-y-1.5">
                    <legend className="text-xs font-medium text-[var(--arogya-text-primary)]">
                      {scale.label}
                    </legend>
                    <div className="flex gap-1.5" role="radiogroup" aria-label={scale.label}>
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={scale.val === n}
                          onClick={() => updateField(scale.key, n)}
                          className={`h-10 flex-1 rounded-lg border font-mono-tabular text-xs font-semibold transition-colors ${
                            scale.val === n
                              ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                              : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <WhyMatters text={scale.why} />
                  </fieldset>
                ))}
              </div>

              {/* Pain Level & Appetite */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <fieldset className="space-y-1.5">
                  <legend className="text-xs font-medium text-[var(--arogya-text-primary)]">
                    Pain / Physical Discomfort Level
                  </legend>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['none', 'mild', 'moderate', 'severe'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        aria-pressed={draft.painLevel === lvl}
                        onClick={() => updateField('painLevel', lvl)}
                        className={`h-10 rounded-lg border text-xs font-medium capitalize transition-colors ${
                          draft.painLevel === lvl
                            ? lvl === 'severe'
                              ? 'border-[var(--arogya-critical)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]'
                              : 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                            : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <WhyMatters text="Microgravity spinal lengthening and suit chafing can cause pain that limits countermeasure training." />
                </fieldset>

                <fieldset className="space-y-1.5">
                  <legend className="text-xs font-medium text-[var(--arogya-text-primary)]">
                    Appetite Today
                  </legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['poor', 'normal', 'increased'] as const).map((app) => (
                      <button
                        key={app}
                        type="button"
                        aria-pressed={draft.appetite === app}
                        onClick={() => updateField('appetite', app)}
                        className={`h-10 rounded-lg border text-xs font-medium capitalize transition-colors ${
                          draft.appetite === app
                            ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                            : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  <WhyMatters text="Fluid shifts alter taste perception in spaceflight; reduced appetite can cause unintended lean-mass loss." />
                </fieldset>
              </div>

              {/* Numeric Inputs with Units & Hydration Converter */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ci-sleep-hours"
                    className="block text-xs font-medium text-[var(--arogya-text-primary)]"
                  >
                    Sleep Hours (target {astronaut.baseline.sleepTargetHours} h)
                  </label>
                  <input
                    id="ci-sleep-hours"
                    type="number"
                    step="0.1"
                    min="0"
                    max="16"
                    value={draft.sleepHours}
                    onChange={(e) => updateField('sleepHours', e.target.value)}
                    aria-invalid={Boolean(errors.sleepHours)}
                    aria-describedby={errors.sleepHours ? 'err-sleepHours' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-sleepHours" message={errors.sleepHours} />
                  <WhyMatters text="Cumulative sleep debt degrades reaction time, mood stability, and neuro-ocular recovery." />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ci-hydration"
                      className="text-xs font-medium text-[var(--arogya-text-primary)]"
                    >
                      Hydration (goal {astronaut.baseline.hydrationTargetLiters} L)
                    </label>
                    <div className="inline-flex rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-0.5 text-[11px]">
                      {(['liters', 'cups'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => handleHydrationUnitSwitch(unit)}
                          className={`min-h-[36px] rounded px-2.5 capitalize ${
                            draft.hydrationUnit === unit
                              ? 'bg-[#1E3A5F] font-semibold text-white'
                              : 'text-[var(--arogya-text-secondary)]'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="ci-hydration"
                      type="number"
                      step="0.1"
                      min="0"
                      value={draft.hydrationValue}
                      onChange={(e) => updateField('hydrationValue', e.target.value)}
                      aria-invalid={Boolean(errors.hydrationValue)}
                      aria-describedby={errors.hydrationValue ? 'err-hydration' : undefined}
                      className="h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 pr-16 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
                      {draft.hydrationUnit === 'liters' ? 'L' : 'cups'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono-tabular text-[11px] text-[var(--arogya-info)]">
                    Converted: {normalizedHydrationLiters.toFixed(2)} L (
                    {litersToCups(normalizedHydrationLiters)} US cups)
                  </p>
                  <FieldError id="err-hydration" message={errors.hydrationValue} />
                  <WhyMatters text="Microgravity blunts thirst signals while bone calcium turnover raises kidney stone risk." />
                </div>

                <div>
                  <label
                    htmlFor="ci-exercise-min"
                    className="block text-xs font-medium text-[var(--arogya-text-primary)]"
                  >
                    Exercise Minutes (target {astronaut.baseline.exerciseTargetMinutes} min)
                  </label>
                  <input
                    id="ci-exercise-min"
                    type="number"
                    min="0"
                    max="300"
                    value={draft.exerciseMinutes}
                    onChange={(e) => updateField('exerciseMinutes', e.target.value)}
                    aria-invalid={Boolean(errors.exerciseMinutes)}
                    aria-describedby={errors.exerciseMinutes ? 'err-exercise' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-exercise" message={errors.exerciseMinutes} />
                  <WhyMatters text="Daily aerobic loading preserves plasma volume, cardiovascular capacity, and circadian rhythm." />
                </div>

                <div>
                  <label
                    htmlFor="ci-resistance-min"
                    className="block text-xs font-medium text-[var(--arogya-text-primary)]"
                  >
                    Resistance-Training Minutes (ARED / load)
                  </label>
                  <input
                    id="ci-resistance-min"
                    type="number"
                    min="0"
                    max="180"
                    value={draft.resistanceMinutes}
                    onChange={(e) => updateField('resistanceMinutes', e.target.value)}
                    aria-invalid={Boolean(errors.resistanceMinutes)}
                    aria-describedby={errors.resistanceMinutes ? 'err-resistance' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-resistance" message={errors.resistanceMinutes} />
                  <WhyMatters text="Resistive loading is the primary defense against microgravity bone loss and muscle atrophy." />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Symptoms */}
          {draft.step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
                  Step 2 — Symptoms
                </h3>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  Select any physical or cognitive symptoms noticed today, or leave as None.
                </p>
              </div>

              <WhyMatters text="Pairing symptoms with cabin air, radiation, and biometric trends helps distinguish harmless fluid-shift adaptation from issues needing medical officer review." />

              <div className="flex flex-wrap gap-2" role="group" aria-label="Symptom chips">
                <button
                  type="button"
                  aria-pressed={draft.symptoms.includes('none')}
                  onClick={() => toggleSymptom('none')}
                  className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                    draft.symptoms.includes('none')
                      ? 'border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] text-[var(--arogya-success-text)]'
                      : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                  }`}
                >
                  None today
                </button>

                {SYMPTOM_CHIPS.map((chip) => {
                  const selected = draft.symptoms.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSymptom(chip.id)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                        selected
                          ? chip.caution
                            ? 'border-[var(--arogya-critical)] bg-[var(--arogya-critical-soft)] text-[var(--arogya-critical-text)]'
                            : 'border-[var(--arogya-caution-border)] bg-[var(--arogya-caution-soft)] text-[var(--arogya-caution-text)]'
                          : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                      }`}
                    >
                      <span>{chip.label}</span>
                      {chip.caution && (
                        <span className="font-mono-tabular text-[10px] uppercase tracking-wider opacity-85">
                          (Urgent)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {(draft.symptoms.includes('chest_pain') ||
                draft.symptoms.includes('shortness_of_breath') ||
                draft.symptoms.includes('severe_shortness_of_breath') ||
                draft.symptoms.includes('fainting') ||
                draft.symptoms.includes('severe_allergic_reaction') ||
                draft.symptoms.includes('rapidly_worsening')) && (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-xl border border-[var(--arogya-critical-border)] bg-[var(--arogya-critical-soft)] p-4 text-xs text-[var(--arogya-critical-text)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--arogya-critical-text)]">
                        Urgent Escalation Required — Contact Crew Medical Lead / Flight Surgeon Now
                      </p>
                      <p className="leading-relaxed text-[var(--arogya-text-primary)]">
                        Chest pain, severe shortness of breath, fainting, severe allergic reaction, or rapidly worsening symptoms require immediate evaluation by the onboard Crew Medical Officer or Ground Flight Surgeon. Do not wait for routine end-of-day review.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/reports?escalate=1"
                    className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C]"
                  >
                    <span>Prepare Urgent Medical Brief</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Optional Measurements */}
          {draft.step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
                  Step 3 — Optional Measurements
                </h3>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  All fields below are <strong className="text-[var(--arogya-info)]">Optional</strong>. Leave blank if not measured today—blank values remain marked missing and are never assumed normal.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="opt-hr" className="block text-xs font-medium text-[var(--arogya-text-primary)]">
                    Resting Heart Rate (bpm) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                  </label>
                  <input
                    id="opt-hr"
                    type="number"
                    placeholder={todayVital?.heartRateBpm != null ? `Latest: ${todayVital.heartRateBpm}` : 'e.g. 64'}
                    value={draft.heartRateBpm}
                    onChange={(e) => updateField('heartRateBpm', e.target.value)}
                    aria-invalid={Boolean(errors.heartRateBpm)}
                    aria-describedby={errors.heartRateBpm ? 'err-hr' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-hr" message={errors.heartRateBpm} />
                  <WhyMatters text="Elevated resting HR vs. personal baseline can indicate dehydration, stress, or illness onset." />
                </div>

                <div>
                  <label htmlFor="opt-spo2" className="block text-xs font-medium text-[var(--arogya-text-primary)]">
                    Oxygen Saturation SpO₂ (%) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                  </label>
                  <input
                    id="opt-spo2"
                    type="number"
                    placeholder={todayVital?.spo2Percent != null ? `Latest: ${todayVital.spo2Percent}` : 'e.g. 98'}
                    value={draft.spo2Percent}
                    onChange={(e) => updateField('spo2Percent', e.target.value)}
                    aria-invalid={Boolean(errors.spo2Percent)}
                    aria-describedby={errors.spo2Percent ? 'err-spo2' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-spo2" message={errors.spo2Percent} />
                  <WhyMatters text="Confirms healthy oxygen delivery alongside closed-loop cabin O₂ and CO₂ levels." />
                </div>

                <div>
                  <label htmlFor="opt-sys" className="block text-xs font-medium text-[var(--arogya-text-primary)]">
                    Systolic Blood Pressure (mmHg) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                  </label>
                  <input
                    id="opt-sys"
                    type="number"
                    placeholder={todayVital?.systolicBpMmHg != null ? `Latest: ${todayVital.systolicBpMmHg}` : 'e.g. 118'}
                    value={draft.systolicBpMmHg}
                    onChange={(e) => updateField('systolicBpMmHg', e.target.value)}
                    aria-invalid={Boolean(errors.systolicBpMmHg)}
                    aria-describedby={errors.systolicBpMmHg ? 'err-sys' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-sys" message={errors.systolicBpMmHg} />
                  <WhyMatters text="Tracks vascular load and cephalad fluid-shift pressure across consecutive mission days." />
                </div>

                <div>
                  <label htmlFor="opt-dia" className="block text-xs font-medium text-[var(--arogya-text-primary)]">
                    Diastolic Blood Pressure (mmHg) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                  </label>
                  <input
                    id="opt-dia"
                    type="number"
                    placeholder={todayVital?.diastolicBpMmHg != null ? `Latest: ${todayVital.diastolicBpMmHg}` : 'e.g. 76'}
                    value={draft.diastolicBpMmHg}
                    onChange={(e) => updateField('diastolicBpMmHg', e.target.value)}
                    aria-invalid={Boolean(errors.diastolicBpMmHg)}
                    aria-describedby={errors.diastolicBpMmHg ? 'err-dia' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-dia" message={errors.diastolicBpMmHg} />
                  <WhyMatters text="Helps spot sustained resting vascular resistance trends alongside systolic pressure." />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="opt-temp" className="text-xs font-medium text-[var(--arogya-text-primary)]">
                      Body Temperature ({draft.tempUnit === 'C' ? '°C' : '°F'}) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                    </label>
                    <div className="inline-flex rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-0.5 text-[11px]">
                      {(['C', 'F'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleTempUnitSwitch(u)}
                          className={`min-h-[36px] rounded px-2.5 ${
                            draft.tempUnit === u
                              ? 'bg-[#1E3A5F] font-semibold text-white'
                              : 'text-[var(--arogya-text-secondary)]'
                          }`}
                        >
                          °{u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="opt-temp"
                    type="number"
                    step="0.1"
                    placeholder={draft.tempUnit === 'C' ? 'e.g. 36.7' : 'e.g. 98.1'}
                    value={draft.bodyTempValue}
                    onChange={(e) => updateField('bodyTempValue', e.target.value)}
                    aria-invalid={Boolean(errors.bodyTempValue)}
                    aria-describedby={errors.bodyTempValue ? 'err-temp' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-temp" message={errors.bodyTempValue} />
                  <WhyMatters text="Fever paired with systemic symptoms warrants prompt infection isolation and medical officer guidance." />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="opt-glucose" className="text-xs font-medium text-[var(--arogya-text-primary)]">
                      Blood Glucose ({draft.glucoseUnit}) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                    </label>
                    <div className="inline-flex rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-0.5 text-[11px]">
                      {(['mg/dL', 'mmol/L'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleGlucoseUnitSwitch(u)}
                          className={`min-h-[36px] rounded px-2.5 ${
                            draft.glucoseUnit === u
                              ? 'bg-[#1E3A5F] font-semibold text-white'
                              : 'text-[var(--arogya-text-secondary)]'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="opt-glucose"
                    type="number"
                    step={draft.glucoseUnit === 'mmol/L' ? '0.1' : '1'}
                    placeholder={draft.glucoseUnit === 'mg/dL' ? 'e.g. 92' : 'e.g. 5.1'}
                    value={draft.bloodGlucoseValue}
                    onChange={(e) => updateField('bloodGlucoseValue', e.target.value)}
                    aria-invalid={Boolean(errors.bloodGlucoseValue)}
                    aria-describedby={errors.bloodGlucoseValue ? 'err-glucose' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-glucose" message={errors.bloodGlucoseValue} />
                  <WhyMatters text="Sleep debt and stress hormones can alter glucose regulation and metabolic stability." />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="opt-mass" className="text-xs font-medium text-[var(--arogya-text-primary)]">
                      Body Mass ({draft.massUnit}) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                    </label>
                    <div className="inline-flex rounded-md border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-0.5 text-[11px]">
                      {(['kg', 'lb'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleMassUnitSwitch(u)}
                          className={`min-h-[36px] rounded px-2.5 ${
                            draft.massUnit === u
                              ? 'bg-[#1E3A5F] font-semibold text-white'
                              : 'text-[var(--arogya-text-secondary)]'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="opt-mass"
                    type="number"
                    step="0.1"
                    placeholder={draft.massUnit === 'kg' ? 'e.g. 72.5' : 'e.g. 159.8'}
                    value={draft.bodyMassValue}
                    onChange={(e) => updateField('bodyMassValue', e.target.value)}
                    aria-invalid={Boolean(errors.bodyMassValue)}
                    aria-describedby={errors.bodyMassValue ? 'err-mass' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-mass" message={errors.bodyMassValue} />
                  <WhyMatters text="Tracks gradual nutritional lean-mass loss or rapid fluid-shift changes." />
                </div>

                <div>
                  <label htmlFor="opt-rad" className="block text-xs font-medium text-[var(--arogya-text-primary)]">
                    Radiation Dose (mSv) <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                  </label>
                  <input
                    id="opt-rad"
                    type="number"
                    step="0.01"
                    placeholder={todayVital?.dailyRadiationMsv != null ? `Latest: ${todayVital.dailyRadiationMsv}` : 'e.g. 0.55'}
                    value={draft.dailyRadiationMsv}
                    onChange={(e) => updateField('dailyRadiationMsv', e.target.value)}
                    aria-invalid={Boolean(errors.dailyRadiationMsv)}
                    aria-describedby={errors.dailyRadiationMsv ? 'err-rad' : undefined}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 font-mono-tabular text-sm text-[var(--arogya-text-primary)]"
                  />
                  <FieldError id="err-rad" message={errors.dailyRadiationMsv} />
                  <WhyMatters text="Monitors daily ionizing exposure against the mission ALARA budget and storm-shelter alerts." />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Notes and Sharing */}
          {draft.step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
                  Step 4 — Notes and Sharing
                </h3>
                <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
                  Add operational context (EVA workload, cabin airflow, sleep disturbances) and decide whether to queue a summary for the crew medical lead.
                </p>
              </div>

              <div>
                <label
                  htmlFor="ci-notes"
                  className="block text-xs font-medium text-[var(--arogya-text-primary)]"
                >
                  Free-Text Crew Note <span className="text-[11px] text-[var(--arogya-info)]">· Optional</span>
                </label>
                <textarea
                  id="ci-notes"
                  rows={4}
                  value={draft.crewNotes}
                  onChange={(e) => updateField('crewNotes', e.target.value)}
                  placeholder="Note sleep interruptions, suit discomfort, hydration shifts, or cabin observations..."
                  className="mt-1.5 w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-3 text-sm text-[var(--arogya-text-primary)] placeholder:text-[var(--arogya-text-muted)]"
                />
                <WhyMatters text="Plain-language context explains why a metric shifted (for example, delayed sleep due to EVA prep) when reviewed later." />
              </div>

              <div className="rounded-xl border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] p-4">
                <label className="flex cursor-pointer items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
                    <div>
                      <span className="block text-sm font-medium text-[var(--arogya-text-primary)]">
                        Share summary with crew medical lead?
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--arogya-text-secondary)]">
                        Automatically generates a structured SBAR summary in Reports for the onboard crew medical lead.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.shareWithMedicalLead}
                    onChange={(e) => updateField('shareWithMedicalLead', e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--arogya-border-strong)] bg-[var(--arogya-surface)] accent-[#1E3A5F]"
                  />
                </label>
                <WhyMatters text="Structured crew-approved sharing prepares factual SBAR summaries across light-time communication delays." />
              </div>
            </div>
          )}

          {/* Step Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--arogya-border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={draft.step === 1}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => updateField('step', Math.max(1, draft.step - 1) as StepNumber)}
            >
              Previous
            </Button>

            {draft.step < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => handleGoStep((draft.step + 1) as StepNumber)}
              >
                Continue to Step {draft.step + 1}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Submit Daily Check-In
              </Button>
            )}
          </div>
        </Card>
      </form>

      {/* Astronaut-Scoped Check-In History */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--arogya-border)] pb-3">
          <div>
            <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
              Check-In History — {astronaut.fullName}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--arogya-text-secondary)]">
              Recent self-reported mission days ({checkIns14d.length} logs recorded)
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-[var(--arogya-info)]">{astronaut.callSign}</span>
        </div>

        {checkIns14d.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No Check-In Yet"
            description={`No daily check-in history is recorded yet for ${astronaut.fullName}. Submit today's guided check-in above or load the simulated demo mission dataset.`}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={resetDemoData}
              >
                Load Demo Mission
              </Button>
            }
            compact
          />
        ) : (
          <div className="divide-y divide-[var(--arogya-border)]">
            {[...checkIns14d]
              .sort((a, b) => b.missionDay - a.missionDay)
              .slice(0, 7)
              .map((entry) => {
                const activeSymptoms = entry.symptoms.filter((s) => s !== 'none');
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-1.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[var(--arogya-text-primary)]">
                        <span className="font-mono-tabular text-[var(--arogya-info)]">
                          Sol {entry.missionDay}
                        </span>{' '}
                        · Sleep {entry.sleepHours.toFixed(1)}h · Mood {entry.moodScore}/5 · Stress{' '}
                        {entry.stressLevel}/5 · Fatigue {entry.fatigueLevel}/5
                      </p>
                      {entry.crewNotes && (
                        <p className="text-[11px] text-[var(--arogya-text-secondary)]">
                          {entry.crewNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
                      <span>{entry.hydrationLiters.toFixed(1)} L</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.exerciseMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activeSymptoms.length > 0
                          ? activeSymptoms.map((s) => s.replace(/_/g, ' ')).join(', ')
                          : 'No symptoms'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}
