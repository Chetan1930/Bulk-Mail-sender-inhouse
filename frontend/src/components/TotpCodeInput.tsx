import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';

interface TotpCodeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function TotpCodeInput({
  id = 'totp',
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: TotpCodeInputProps) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const next = digits.map((d, i) => (i === index ? '' : d)).join('');
      onChange(next);
      return;
    }

    // Paste or multi-char: fill from this index
    const chars = cleaned.slice(0, 6 - index).split('');
    const nextDigits = [...digits];
    chars.forEach((ch, offset) => {
      nextDigits[index + offset] = ch;
    });
    const next = nextDigits.join('').slice(0, 6);
    onChange(next);
    const focusAt = Math.min(index + chars.length, 5);
    refs.current[focusAt]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.map((d, i) => (i === index - 1 ? '' : d)).join('');
      onChange(next);
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" role="group" aria-label="Authenticator code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          disabled={disabled}
          maxLength={1}
          value={digit}
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-semibold tabular-nums rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 focus:border-teal-400 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 focus:outline-none transition-colors disabled:opacity-50"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
