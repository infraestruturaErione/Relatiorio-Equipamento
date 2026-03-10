import { useMemo, useState } from 'react';

export default function MaskedText({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const masked = useMemo(() => '•'.repeat(Math.max(value.length, 8)), [value]);

  return (
    <span className="masked-text">
      <code>{visible ? value : masked}</code>
      <button type="button" className="link-btn" onClick={() => setVisible((current) => !current)}>
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </span>
  );
}
