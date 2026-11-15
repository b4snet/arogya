import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface ReportBarcodeProps {
  /** Encodes the report identifier only — never names, values, or diagnoses. */
  value: string;
}

/**
 * Code 128 barcode of the report ID, rendered as an inline SVG so it survives printing and
 * never depends on canvas rasterisation.
 */
export function ReportBarcode({ value }: ReportBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      const svg = svgRef.current;
      JsBarcode(svg, value, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 10,
        textMargin: 2,
        height: 46,
        width: 1.5,
        margin: 2,
        background: '#FFFFFF',
        lineColor: '#0F172A',
      });

      // Scale the symbol to the container instead of clipping a fixed pixel width on mobile.
      const width = Number(svg.getAttribute('width'));
      const height = Number(svg.getAttribute('height'));
      if (width > 0 && height > 0) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('width', '100%');
        svg.style.height = 'auto';
        svg.style.maxWidth = `${width}px`;
      }
      setFailed(false);
    } catch {
      // A payload that cannot be encoded must not silently print a wrong symbol.
      setFailed(true);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--arogya-text-muted)]">
        Report ID (scannable)
      </span>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Code 128 barcode encoding report identifier ${value}`}
        className="mt-1 w-full max-w-[340px]"
      />
      {failed && (
        <span className="mt-1 text-[10px] text-[var(--arogya-warning-text)]">
          Barcode could not be encoded for this identifier.
        </span>
      )}
    </div>
  );
}
