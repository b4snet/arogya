import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Database, RotateCcw, ShieldCheck } from 'lucide-react';
import { useActiveAssessment } from '../hooks/useActiveAssessment';
import { useArogyaStore } from '../store/useArogyaStore';
import {
  AstronautAvatar,
  Button,
  Card,
  CardHeader,
  FormField,
  NumberInput,
  ToggleSwitch,
} from '../components/ui';

export function SettingsPage() {
  const { astronaut } = useActiveAssessment();
  const updateAstronautBaseline = useArogyaStore((s) => s.updateAstronautBaseline);
  const preferences = useArogyaStore((s) => s.preferences);
  const setPreferences = useArogyaStore((s) => s.setPreferences);
  const resetDemoData = useArogyaStore((s) => s.resetDemoData);
  const clearDriveCache = useArogyaStore((s) => s.clearDriveCache);

  const [hrBaseline, setHrBaseline] = useState(astronaut.baseline.restingHeartRateBpm);
  const [sleepTarget, setSleepTarget] = useState(astronaut.baseline.sleepTargetHours);
  const [hydrationTarget, setHydrationTarget] = useState(
    astronaut.baseline.hydrationTargetLiters
  );
  const [exerciseTarget, setExerciseTarget] = useState(
    astronaut.baseline.exerciseTargetMinutes
  );
  const [radiationBudget, setRadiationBudget] = useState(
    astronaut.baseline.radiationBudgetMsv
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setHrBaseline(astronaut.baseline.restingHeartRateBpm);
    setSleepTarget(astronaut.baseline.sleepTargetHours);
    setHydrationTarget(astronaut.baseline.hydrationTargetLiters);
    setExerciseTarget(astronaut.baseline.exerciseTargetMinutes);
    setRadiationBudget(astronaut.baseline.radiationBudgetMsv);
    setSavedNotice(false);
  }, [astronaut.id, astronaut.baseline]);

  const handleSaveBaseline = (e: FormEvent) => {
    e.preventDefault();
    updateAstronautBaseline(astronaut.id, {
      restingHeartRateBpm: hrBaseline,
      sleepTargetHours: sleepTarget,
      hydrationTargetLiters: hydrationTarget,
      exerciseTargetMinutes: exerciseTarget,
      radiationBudgetMsv: radiationBudget,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="arogya-display text-[var(--arogya-text-primary)]">
          Settings & Crew Profile
        </h1>
        <p className="mt-1 text-sm text-[var(--arogya-text-secondary)]">
          Calibrate personal physiological baselines, review how data is stored, and adjust
          accessibility preferences.
        </p>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[var(--arogya-success-border)] bg-[var(--arogya-success-soft)] px-4 py-3 text-sm text-[var(--arogya-success-text)]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Astronaut baseline updated locally.</span>
        </div>
      )}

      <Card padding="lg">
        <form onSubmit={handleSaveBaseline} className="space-y-5">
          <div className="flex items-center gap-3 border-b border-[var(--arogya-border)] pb-4">
            <AstronautAvatar
              astronautId={astronaut.id}
              fullName={astronaut.fullName}
              size="lg"
              active
            />
            <CardHeader
              title={`${astronaut.fullName} (${astronaut.callSign})`}
              subtitle={`${astronaut.role} · Age ${astronaut.age} · Blood Type ${astronaut.bloodType} · EVA ${astronaut.evaHoursTotal} h`}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField id="base-hr" label="Baseline Resting HR (bpm)">
              <NumberInput
                id="base-hr"
                value={hrBaseline}
                onChange={(e) => setHrBaseline(Number(e.target.value))}
              />
            </FormField>
            <FormField id="base-sleep" label="Sleep Target (hours)">
              <NumberInput
                id="base-sleep"
                step="0.1"
                value={sleepTarget}
                onChange={(e) => setSleepTarget(Number(e.target.value))}
              />
            </FormField>
            <FormField id="base-hydro" label="Hydration Target (L/day)">
              <NumberInput
                id="base-hydro"
                step="0.1"
                value={hydrationTarget}
                onChange={(e) => setHydrationTarget(Number(e.target.value))}
              />
            </FormField>
            <FormField id="base-exercise" label="Exercise Target (min/day)">
              <NumberInput
                id="base-exercise"
                step="5"
                value={exerciseTarget}
                onChange={(e) => setExerciseTarget(Number(e.target.value))}
              />
            </FormField>
            <FormField id="base-rad" label="Mission Radiation Budget (mSv)">
              <NumberInput
                id="base-rad"
                step="10"
                value={radiationBudget}
                onChange={(e) => setRadiationBudget(Number(e.target.value))}
              />
            </FormField>
          </div>

          <Button type="submit" variant="primary" size="md">
            Save Personal Baseline
          </Button>
        </form>
      </Card>

      <Card padding="lg" className="space-y-4">
        <CardHeader
          title="Accessibility & Display"
          subtitle="Preferences are stored on this device and applied immediately across the console."
        />

        <ToggleSwitch
          id="toggle-high-contrast"
          label="High-Contrast Mode"
          description="Deepen space background and elevate border/text contrast for bright or low-light environments."
          checked={preferences.highContrast}
          onChange={(checked) => setPreferences({ highContrast: checked })}
        />

        {import.meta.env.MODE === 'release' ? (
          <p role="note" className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 text-xs text-[var(--arogya-text-secondary)]">
            Dashboard backdrop: static CSS illustration in this public release. The unverified local video remains available only in development builds.
          </p>
        ) : (
          <ToggleSwitch
            id="toggle-video-backdrop"
            label="Dashboard MP4 Video Backdrop"
            description="Play the synced Google Drive MP4 video behind the mission-control overview."
            checked={preferences.enableVideoBackdrop}
            onChange={(checked) => setPreferences({ enableVideoBackdrop: checked })}
          />
        )}

        <ToggleSwitch
          id="toggle-reduced-motion"
          label="Reduced Motion Override"
          description={import.meta.env.MODE === 'release'
            ? 'Disable transitions and automatic 3D animations; the public dashboard backdrop is already static.'
            : 'Disable CSS transitions, video backdrop playback, and automatic 3D animations.'}
          checked={preferences.reducedMotionOverride}
          onChange={(checked) => setPreferences({ reducedMotionOverride: checked })}
        />

        <dl className="grid grid-cols-1 gap-2 border-t border-[var(--arogya-border)] pt-3 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--arogya-bg)] px-3 py-2">
            <dt className="text-[var(--arogya-text-secondary)]">Contrast mode</dt>
            <dd className="font-semibold text-[var(--arogya-text-primary)]">
              {preferences.highContrast ? 'High contrast' : 'Standard'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--arogya-bg)] px-3 py-2">
            <dt className="text-[var(--arogya-text-secondary)]">Motion</dt>
            <dd className="font-semibold text-[var(--arogya-text-primary)]">
              {preferences.reducedMotionOverride ? 'Reduced' : 'System default'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card padding="lg" className="space-y-4">
        <CardHeader
          title="Privacy & Data"
          subtitle="What this console stores, what it never sends, and what leaves the device only when you ask it to."
        />

        <ul className="space-y-2.5 text-xs leading-relaxed text-[var(--arogya-text-secondary)]">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-success)]" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[var(--arogya-text-primary)]">Local-first.</strong>{' '}
              Check-ins, recorded vitals, reports, and preferences are stored in this browser’s
              IndexedDB. No account is required and no health data is uploaded to an Arogya
              server.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[var(--arogya-text-primary)]">Reports stay private by default.</strong>{' '}
              Free-text crew notes are excluded unless you explicitly include private notes on the{' '}
              <Link
                to="/reports"
                className="font-semibold text-[#1E3A5F] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2"
              >
                Reports
              </Link>{' '}
              page. Exports leave the device only when you start the download or Drive export.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-success)]" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[var(--arogya-text-primary)]">Separation is enforced.</strong>{' '}
              Simulated monitor values stay in memory and never enter recorded vitals or reports.
              NASA OSD-575 observations appear only as labelled research context, never as crew
              data.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--arogya-info)]" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[var(--arogya-text-primary)]">No client credentials.</strong>{' '}
              NASA data requests are proxied through a server-side endpoint, so no NASA key is
              bundled with this client. Optional Google Drive export signs in only when you open
              the Drive dialog.
            </span>
          </li>
        </ul>

        <p className="rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3 text-[11px] leading-relaxed text-[var(--arogya-text-muted)]">
          This is monitoring support, not a medical diagnosis or clinical clearance. Demonstration
          decision support only.
        </p>
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="arogya-h2 text-[var(--arogya-text-primary)]">
              Offline Storage & Demo Reset
            </h3>
            <p className="mt-1 text-xs text-[var(--arogya-text-secondary)]">
              Restore initial 14-day mission telemetry or clear locally cached Google Drive media blobs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void clearDriveCache()}
            >
              Clear Drive Media Cache
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={resetDemoData}
            >
              Load Demo Mission
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
