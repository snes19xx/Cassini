// Shared slider and readout markup for the finale debug panels.

export interface PanelTheme {
  accent: string;
  labelWidth: number;
  valueWidth: number;
  fontSize: number;
  sliderHeight?: number;
  rowGap: number;
  rowMargin: number;
  precision: number;
}

export const WIDE_THEME: PanelTheme = {
  accent: "#ffb454",
  labelWidth: 92,
  valueWidth: 42,
  fontSize: 11,
  rowGap: 6,
  rowMargin: 3,
  precision: 1,
};

export const COMPACT_THEME: PanelTheme = {
  accent: "#ff9a4a",
  labelWidth: 56,
  valueWidth: 30,
  fontSize: 9.5,
  sliderHeight: 11,
  rowGap: 4,
  rowMargin: 1,
  precision: 2,
};

function format(val: number, precision: number): string {
  return Number.isInteger(val) ? String(val) : val.toFixed(precision);
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  theme: PanelTheme;
  onChange: (next: number) => void;
  // Fires on pointer release for values behind an expensive rebuild.
  onCommit?: () => void;
}

// One labelled range row with its live value.
export function DebugSlider({
  label,
  min,
  max,
  step,
  value,
  theme,
  onChange,
  onCommit,
}: SliderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.rowGap,
        marginBottom: theme.rowMargin,
      }}
    >
      <label style={{ width: theme.labelWidth, fontSize: theme.fontSize }}>
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        style={{
          flex: 1,
          height: theme.sliderHeight,
          accentColor: theme.accent,
        }}
      />
      <span
        style={{
          width: theme.valueWidth,
          textAlign: "right",
          fontSize: theme.fontSize,
        }}
      >
        {format(value, theme.precision)}
      </span>
    </div>
  );
}

interface ReadoutProps {
  value: string;
  height: number;
  background: string;
  color: string;
  border: string;
  fontSize: number;
  marginTop: number;
}

// Click-to-select textarea holding the panel's current values.
export function DebugReadout({
  value,
  height,
  background,
  color,
  border,
  fontSize,
  marginTop,
}: ReadoutProps) {
  return (
    <textarea
      readOnly
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      style={{
        width: "100%",
        height,
        marginTop,
        background,
        color,
        border,
        borderRadius: 4,
        fontFamily: "inherit",
        fontSize,
        resize: "none",
      }}
    />
  );
}
