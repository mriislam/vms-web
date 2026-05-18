import { useState, useCallback } from 'react';

/**
 * useColumnPicker
 * @param {string} storageKey   – unique key per page, persisted in localStorage
 * @param {Array}  allColumns   – full column definitions; set `defaultVisible: false` to hide by default
 * @returns {{ visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns }}
 */
export function useColumnPicker(storageKey, allColumns) {
  const defaultKeys = new Set(
    allColumns.filter((c) => c.defaultVisible !== false).map((c) => c.key)
  );

  const [visibleKeys, setVisibleKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(`vms-cols-${storageKey}`);
      if (saved) {
        const parsed = new Set(JSON.parse(saved));
        // keep only keys that still exist in allColumns
        const valid = new Set([...parsed].filter((k) => allColumns.some((c) => c.key === k)));
        if (valid.size > 0) return valid;
      }
    } catch { /* ignore */ }
    return defaultKeys;
  });

  const setVisible = useCallback((keys) => {
    // always keep at least one column
    if (keys.size === 0) return;
    setVisibleKeys(keys);
    localStorage.setItem(`vms-cols-${storageKey}`, JSON.stringify([...keys]));
  }, [storageKey]);

  const resetToDefault = useCallback(() => {
    setVisibleKeys(defaultKeys);
    localStorage.removeItem(`vms-cols-${storageKey}`);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleColumns = allColumns.filter((c) => visibleKeys.has(c.key));

  return { visibleColumns, visibleKeys, setVisible, resetToDefault, allColumns };
}
