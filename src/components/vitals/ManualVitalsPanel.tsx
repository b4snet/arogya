import { useEffect, useState, type FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Card, FormField, NumberInput } from '../ui';
import type { Astronaut, VitalReading } from '../../types';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kgToLb,
  lbToKg,
  mgDlToMmolL,
  mmolLToMgDl,
} from '../../utils/unitConversions';

interface ManualVitalsPanelProps {
  astronaut: Astronaut;
  currentMissionDay: number;
  latestReading?: VitalReading;
  units: 'metric' | 'imperial';
  onSave: (reading: {
    missionDay: number;
    heartRateBpm: number | null;
    hrvMs: number | null;
    systolicBpMmHg: number | null;
    diastolicBpMmHg: number | null;
    spo2Percent: number | null;
    respiratoryRateBpm: number | null;
    bodyTempC: number | null;
    bloodGlucoseMgDl: number | null;
    bodyMassKg: number | null;
    dailyRadiationMsv: number | null;
  }) => void;
  onClose: () => void;
}

interface FormState {
  missionDay: string;
  heartRateBpm: string;
  systolicBpMmHg: string;
  diastolicBpMmHg: string;
  bodyTemp: string;
  bloodGlucose: string;
  bodyMass: string;
  dailyRadiationMsv: string;
  spo2Percent: string;
  hrvMs: string;
  respiratoryRateBpm: string;
}

function parseOptional(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : Number.NaN;
}

export function ManualVitalsPanel({
  astronaut,
  currentMissionDay,
  latestReading,
  units,
  onSave,
  onClose,
}: ManualVitalsPanelProps) {
  const isImperial = units === 'imperial';

  const buildInitial = (): FormState => ({
    missionDay: String(currentMissionDay),
    heartRateBpm:
      latestReading?.heartRateBpm != null ? String(latestReading.heartRateBpm) : '',
    systolicBpMmHg:
      latestReading?.systolicBpMmHg != null ? String(latestReading.systolicBpMmHg) : '',
    diastolicBpMmHg:
      latestReading?.diastolicBpMmHg != null ? String(latestReading.diastolicBpMmHg) : '',
    bodyTemp:
      latestReading?.bodyTempC != null
        ? String(isImperial ? celsiusToFahrenheit(latestReading.bodyTempC) : latestReading.bodyTempC)
        : '',
    bloodGlucose:
      latestReading?.bloodGlucoseMgDl != null
        ? String(
            isImperial ? mgDlToMmolL(latestReading.bloodGlucoseMgDl) : latestReading.bloodGlucoseMgDl
          )
        : '',
    bodyMass:
      latestReading?.bodyMassKg != null
        ? String(isImperial ? kgToLb(latestReading.bodyMassKg) : latestReading.bodyMassKg)
        : '',
    dailyRadiationMsv:
      latestReading?.dailyRadiationMsv != null ? String(latestReading.dailyRadiationMsv) : '',
    spo2Percent:
      latestReading?.spo2Percent != null ? String(latestReading.spo2Percent) : '',
    hrvMs: latestReading?.hrvMs != null ? String(latestReading.hrvMs) : '',
    respiratoryRateBpm:
      latestReading?.respiratoryRateBpm != null ? String(latestReading.respiratoryRateBpm) : '',
  });

  const [form, setForm] = useState<FormState>(buildInitial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(buildInitial());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [astronaut.id, currentMissionDay, units]);

  const setField = (key: keyof FormState, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    const missionDay = Number(form.missionDay);
    if (!Number.isInteger(missionDay) || missionDay < 1 || missionDay > 1000) {
      nextErrors.missionDay = 'Enter a mission day between 1 and 1000.';
    }

    const hr = parseOptional(form.heartRateBpm);
    if (hr !== null && (Number.isNaN(hr) || hr < 30 || hr > 220)) {
      nextErrors.heartRateBpm = 'Heart rate must be between 30 and 220 bpm (or leave blank).';
    }

    const sys = parseOptional(form.systolicBpMmHg);
    if (sys !== null && (Number.isNaN(sys) || sys < 60 || sys > 250)) {
      nextErrors.systolicBpMmHg = 'Systolic BP must be between 60 and 250 mmHg (or leave blank).';
    }

    const dia = parseOptional(form.diastolicBpMmHg);
    if (dia !== null && (Number.isNaN(dia) || dia < 35 || dia > 150)) {
      nextErrors.diastolicBpMmHg = 'Diastolic BP must be between 35 and 150 mmHg (or leave blank).';
    }
    if (sys !== null && dia !== null && !Number.isNaN(sys) && !Number.isNaN(dia) && dia >= sys) {
      nextErrors.diastolicBpMmHg = 'Diastolic BP should be lower than Systolic BP.';
    }

    const rawTemp = parseOptional(form.bodyTemp);
    const bodyTempC =
      rawTemp === null
        ? null
        : Number.isNaN(rawTemp)
        ? Number.NaN
        : isImperial
        ? fahrenheitToCelsius(rawTemp)
        : rawTemp;
    if (bodyTempC !== null && (Number.isNaN(bodyTempC) || bodyTempC < 33 || bodyTempC > 42.5)) {
      nextErrors.bodyTemp = isImperial
        ? 'Temperature must be between 91.4 and 108.5 °F (or leave blank).'
        : 'Temperature must be between 33.0 and 42.5 °C (or leave blank).';
    }

    const rawGlucose = parseOptional(form.bloodGlucose);
    const bloodGlucoseMgDl =
      rawGlucose === null
        ? null
        : Number.isNaN(rawGlucose)
        ? Number.NaN
        : isImperial
        ? mmolLToMgDl(rawGlucose)
        : Math.round(rawGlucose);
    if (
      bloodGlucoseMgDl !== null &&
      (Number.isNaN(bloodGlucoseMgDl) || bloodGlucoseMgDl < 25 || bloodGlucoseMgDl > 500)
    ) {
      nextErrors.bloodGlucose = isImperial
        ? 'Glucose must be between 1.4 and 27.8 mmol/L (or leave blank).'
        : 'Glucose must be between 25 and 500 mg/dL (or leave blank).';
    }

    const rawMass = parseOptional(form.bodyMass);
    const bodyMassKg =
      rawMass === null
        ? null
        : Number.isNaN(rawMass)
        ? Number.NaN
        : isImperial
        ? lbToKg(rawMass)
        : rawMass;
    if (bodyMassKg !== null && (Number.isNaN(bodyMassKg) || bodyMassKg < 35 || bodyMassKg > 160)) {
      nextErrors.bodyMass = isImperial
        ? 'Body mass must be between 77 and 352 lb (or leave blank).'
        : 'Body mass must be between 35 and 160 kg (or leave blank).';
    }

    const dailyRad = parseOptional(form.dailyRadiationMsv);
    if (dailyRad !== null && (Number.isNaN(dailyRad) || dailyRad < 0 || dailyRad > 50)) {
      nextErrors.dailyRadiationMsv = 'Daily dose must be between 0 and 50 mSv (or leave blank).';
    }

    const spo2 = parseOptional(form.spo2Percent);
    if (spo2 !== null && (Number.isNaN(spo2) || spo2 < 60 || spo2 > 100)) {
      nextErrors.spo2Percent = 'SpO₂ must be between 60 and 100% (or leave blank).';
    }

    const hrv = parseOptional(form.hrvMs);
    if (hrv !== null && (Number.isNaN(hrv) || hrv < 5 || hrv > 200)) {
      nextErrors.hrvMs = 'HRV must be between 5 and 200 ms (or leave blank).';
    }

    const resp = parseOptional(form.respiratoryRateBpm);
    if (resp !== null && (Number.isNaN(resp) || resp < 6 || resp > 50)) {
      nextErrors.respiratoryRateBpm = 'Respiratory rate must be between 6 and 50 /min (or leave blank).';
    }

    const hasAnyValue = [
      hr,
      sys,
      dia,
      bodyTempC,
      bloodGlucoseMgDl,
      bodyMassKg,
      dailyRad,
      spo2,
      hrv,
      resp,
    ].some((v) => v !== null);

    if (!hasAnyValue) {
      nextErrors.form = 'Enter at least one biometric measurement or leave individual unmeasured sensors blank.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      missionDay,
      heartRateBpm: hr !== null ? Math.round(hr) : null,
      hrvMs: hrv !== null ? Math.round(hrv) : null,
      systolicBpMmHg: sys !== null ? Math.round(sys) : null,
      diastolicBpMmHg: dia !== null ? Math.round(dia) : null,
      spo2Percent: spo2 !== null ? Math.round(spo2) : null,
      respiratoryRateBpm: resp !== null ? Math.round(resp) : null,
      bodyTempC: bodyTempC !== null ? Number(bodyTempC.toFixed(1)) : null,
      bloodGlucoseMgDl,
      bodyMassKg: bodyMassKg !== null ? Number(bodyMassKg.toFixed(1)) : null,
      dailyRadiationMsv: dailyRad !== null ? Number(dailyRad.toFixed(2)) : null,
    });
  };

  return (
    <Card variant="elevated" padding="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--arogya-border)] pb-4">
          <div>
            <h2 className="arogya-h2 text-[var(--arogya-text-primary)]">
              Manual Vital Reading Entry — {astronaut.fullName}
            </h2>
            <p className="mt-1 text-xs text-[var(--arogya-text-secondary)]">
              Leave any unmeasured sensor blank to record it explicitly as MISSING (never assumed normal).
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            leftIcon={<X className="h-4 w-4" />}
          >
            Close
          </Button>
        </div>

        {(errors.form || Object.keys(errors).length > 0) && (
          <div
            role="alert"
            className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#FCA5A5]"
          >
            {errors.form ? (
              <p>{errors.form}</p>
            ) : (
              <p>
                Please review {Object.keys(errors).length}{' '}
                {Object.keys(errors).length === 1 ? 'highlighted field' : 'highlighted fields'} below before saving.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="vital-day" label="Mission Day" error={errors.missionDay}>
            <NumberInput
              id="vital-day"
              min={1}
              max={1000}
              step={1}
              value={form.missionDay}
              aria-invalid={Boolean(errors.missionDay)}
              onChange={(e) => setField('missionDay', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-hr"
            label="Resting Heart Rate (bpm)"
            hint={`Personal baseline: ${astronaut.baseline.restingHeartRateBpm} bpm`}
            error={errors.heartRateBpm}
          >
            <NumberInput
              id="vital-hr"
              min={30}
              max={220}
              step={1}
              placeholder="Optional (e.g. 64)"
              value={form.heartRateBpm}
              aria-invalid={Boolean(errors.heartRateBpm)}
              onChange={(e) => setField('heartRateBpm', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-sys"
            label="Systolic BP (mmHg)"
            hint={`Personal baseline: ${astronaut.baseline.systolicBpMmHg} mmHg`}
            error={errors.systolicBpMmHg}
          >
            <NumberInput
              id="vital-sys"
              min={60}
              max={250}
              step={1}
              placeholder="Optional (e.g. 118)"
              value={form.systolicBpMmHg}
              aria-invalid={Boolean(errors.systolicBpMmHg)}
              onChange={(e) => setField('systolicBpMmHg', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-dia"
            label="Diastolic BP (mmHg)"
            hint={`Personal baseline: ${astronaut.baseline.diastolicBpMmHg} mmHg`}
            error={errors.diastolicBpMmHg}
          >
            <NumberInput
              id="vital-dia"
              min={35}
              max={150}
              step={1}
              placeholder="Optional (e.g. 76)"
              value={form.diastolicBpMmHg}
              aria-invalid={Boolean(errors.diastolicBpMmHg)}
              onChange={(e) => setField('diastolicBpMmHg', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-temp"
            label={`Temperature (${isImperial ? '°F' : '°C'})`}
            hint={`Personal baseline: ${
              isImperial
                ? `${celsiusToFahrenheit(astronaut.baseline.bodyTempC).toFixed(1)} °F`
                : `${astronaut.baseline.bodyTempC.toFixed(1)} °C`
            }`}
            error={errors.bodyTemp}
          >
            <NumberInput
              id="vital-temp"
              step={0.1}
              placeholder={isImperial ? 'Optional (e.g. 98.1)' : 'Optional (e.g. 36.8)'}
              value={form.bodyTemp}
              aria-invalid={Boolean(errors.bodyTemp)}
              onChange={(e) => setField('bodyTemp', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-glucose"
            label={`Blood Glucose (${isImperial ? 'mmol/L' : 'mg/dL'})`}
            hint={`Personal fasting: ${
              isImperial
                ? `${mgDlToMmolL(astronaut.baseline.fastingGlucoseMgDl).toFixed(1)} mmol/L`
                : `${astronaut.baseline.fastingGlucoseMgDl} mg/dL`
            }`}
            error={errors.bloodGlucose}
          >
            <NumberInput
              id="vital-glucose"
              step={isImperial ? 0.1 : 1}
              placeholder={isImperial ? 'Optional (e.g. 5.1)' : 'Optional (e.g. 92)'}
              value={form.bloodGlucose}
              aria-invalid={Boolean(errors.bloodGlucose)}
              onChange={(e) => setField('bloodGlucose', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-mass"
            label={`Body Mass (${isImperial ? 'lb' : 'kg'})`}
            hint={
              astronaut.baseline.bodyMassKg != null
                ? `Pre-flight: ${
                    isImperial
                      ? `${kgToLb(astronaut.baseline.bodyMassKg).toFixed(1)} lb`
                      : `${astronaut.baseline.bodyMassKg.toFixed(1)} kg`
                  }`
                : 'Optional inertial mass check'
            }
            error={errors.bodyMass}
          >
            <NumberInput
              id="vital-mass"
              step={0.1}
              placeholder="Optional"
              value={form.bodyMass}
              aria-invalid={Boolean(errors.bodyMass)}
              onChange={(e) => setField('bodyMass', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-rad"
            label="Daily Radiation Dose (mSv)"
            hint="Cruise watch threshold: < 1.20 mSv/day"
            error={errors.dailyRadiationMsv}
          >
            <NumberInput
              id="vital-rad"
              min={0}
              max={50}
              step={0.01}
              placeholder="Optional (e.g. 0.48)"
              value={form.dailyRadiationMsv}
              aria-invalid={Boolean(errors.dailyRadiationMsv)}
              onChange={(e) => setField('dailyRadiationMsv', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-spo2"
            label="Oxygen Saturation SpO₂ (%) — Optional"
            hint={`If available · Baseline: ${astronaut.baseline.spo2Percent}%`}
            error={errors.spo2Percent}
          >
            <NumberInput
              id="vital-spo2"
              min={60}
              max={100}
              step={1}
              placeholder="Optional (if available)"
              value={form.spo2Percent}
              aria-invalid={Boolean(errors.spo2Percent)}
              onChange={(e) => setField('spo2Percent', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-hrv"
            label="HRV RMSSD (ms) — Optional"
            error={errors.hrvMs}
          >
            <NumberInput
              id="vital-hrv"
              min={5}
              max={200}
              step={1}
              placeholder="Optional (e.g. 54)"
              value={form.hrvMs}
              aria-invalid={Boolean(errors.hrvMs)}
              onChange={(e) => setField('hrvMs', e.target.value)}
            />
          </FormField>

          <FormField
            id="vital-resp"
            label="Respiratory Rate (/min) — Optional"
            error={errors.respiratoryRateBpm}
          >
            <NumberInput
              id="vital-resp"
              min={6}
              max={50}
              step={1}
              placeholder="Optional (e.g. 15)"
              value={form.respiratoryRateBpm}
              aria-invalid={Boolean(errors.respiratoryRateBpm)}
              onChange={(e) => setField('respiratoryRateBpm', e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--arogya-border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm({
                missionDay: String(currentMissionDay),
                heartRateBpm: '',
                systolicBpMmHg: '',
                diastolicBpMmHg: '',
                bodyTemp: '',
                bloodGlucose: '',
                bodyMass: '',
                dailyRadiationMsv: '',
                spo2Percent: '',
                hrvMs: '',
                respiratoryRateBpm: '',
              })
            }
          >
            Clear All Values
          </Button>
          <Button type="submit" variant="primary" size="md" leftIcon={<Save className="h-4 w-4" />}>
            Save Biometric Reading
          </Button>
        </div>
      </form>
    </Card>
  );
}
