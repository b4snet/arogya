import provenance from '../../data/programmeErizonProvenance.json';

export function ProgrammeErizonAttribution() {
  return (
    <p
      data-programme-erizon-attribution
      className="text-[11px] leading-relaxed text-[var(--arogya-text-muted)]"
    >
      <span className="font-semibold text-[var(--arogya-text-secondary)]">Flight vehicle 3D model:</span>{' '}
      <a
        href={provenance.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--arogya-info)] underline"
      >
        {provenance.title}
      </a>{' '}
      by{' '}
      <a
        href={provenance.creatorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--arogya-info)] underline"
      >
        {provenance.creator}
      </a>
      . Licensed under{' '}
      <a
        href={provenance.licenseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--arogya-info)] underline"
      >
        {provenance.licenseShortName}
      </a>
      ; served unmodified for this non-commercial demonstration. The model is separately licensed
      and is not covered by Arogya&apos;s MIT code license.
    </p>
  );
}
