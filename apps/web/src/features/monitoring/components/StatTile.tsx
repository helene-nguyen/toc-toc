//~ One figure with its label and unit — "–" while there is nothing to say yet
export const StatTile = ({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) => (
  <div className="rhythm__tile">
    <span className="rhythm__label">{label}</span>
    <span className="rhythm__value">
      {value ?? '–'}
      {value !== null && unit && <small>{unit}</small>}
    </span>
  </div>
);
