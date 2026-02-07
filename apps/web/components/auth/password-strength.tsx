'use client';

import { useEffect, useState } from 'react';
import { checkPasswordStrength } from '@/lib/password-validation';

interface PasswordStrengthProps {
  password: string;
  userInputs?: string[]; // email, name for context
}

const strengthLabels = ['Sehr schwach', 'Schwach', 'Mäßig', 'Stark', 'Sehr stark'];
const strengthColors = [
  'hsl(var(--destructive))',
  '#f97316',
  '#eab308',
  '#84cc16',
  'hsl(var(--success))',
];

export function PasswordStrength({ password, userInputs = [] }: PasswordStrengthProps) {
  const [result, setResult] = useState({
    score: 0,
    warning: undefined as string | undefined,
    suggestions: [] as string[],
  });

  useEffect(() => {
    if (password) {
      const analysis = checkPasswordStrength(password, userInputs);
      setResult({
        score: analysis.score,
        warning: analysis.warning,
        suggestions: analysis.suggestions,
      });
    } else {
      setResult({ score: 0, warning: undefined, suggestions: [] });
    }
  }, [password, userInputs]);

  if (!password) return null;

  const score = result.score;
  const percentage = ((score + 1) / 5) * 100; // 0-4 maps to 20%-100%
  const color = strengthColors[score];
  const label = strengthLabels[score];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Passwortstärke:</span>
        <span style={{ color }} className="font-medium">
          {label}
        </span>
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {result.warning && <p className="text-sm text-warning">{result.warning}</p>}

      {result.suggestions.length > 0 && (
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          {result.suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
