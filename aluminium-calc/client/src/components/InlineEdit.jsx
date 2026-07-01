import { useState, useEffect } from 'react';

const EditIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function InlineEdit({ value, onSave, suffix = '', min = 0 }) {
  const [editing, setEditing] = useState(false);
  const [local,   setLocal]   = useState(String(value));

  useEffect(() => { setLocal(String(value)); }, [value]);

  const commit = () => {
    const n = parseFloat(local);
    if (!isNaN(n) && n >= min) { onSave(n); }
    else { setLocal(String(value)); }
    setEditing(false);
  };

  if (editing) return (
    <span className="inline-edit-active">
      <input
        className="inline-input mono"
        value={local}
        autoFocus
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setLocal(String(value)); setEditing(false); }
        }}
        style={{ width: `${Math.max(local.length + 1, 4)}ch` }}
      />
      {suffix}
    </span>
  );

  return (
    <button className="inline-edit-btn mono" onClick={() => setEditing(true)} title="Click to edit">
      {value}{suffix} <EditIcon />
    </button>
  );
}
