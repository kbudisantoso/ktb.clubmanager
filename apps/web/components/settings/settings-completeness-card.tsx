'use client';

import { Circle, CircleCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SettingsCompletenessResult } from '@/lib/settings-completeness';

interface SettingsCompletenessCardProps {
  completeness: SettingsCompletenessResult;
}

function getSubtitle(percentage: number): string {
  if (percentage === 0) {
    return 'Ergänze noch ein paar Details, damit dein Verein startklar ist.';
  }
  if (percentage === 100) {
    return 'Komplett — dein Verein ist startklar!';
  }
  if (percentage >= 75) {
    return 'Fast geschafft — nur noch ein paar Felder offen.';
  }
  return 'Sieht gut aus! Fülle weitere Felder aus.';
}

function ProgressRing({ percentage }: { percentage: number }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  const isComplete = percentage === 100;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={isComplete ? 'text-success' : 'text-primary'}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className={`fill-current text-xs font-semibold ${isComplete ? 'text-success' : 'text-foreground'}`}
      >
        {percentage}%
      </text>
    </svg>
  );
}

export function SettingsCompletenessCard({ completeness }: SettingsCompletenessCardProps) {
  const { sections, percentage } = completeness;

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <ProgressRing percentage={percentage} />
          <div>
            <CardTitle className="text-sm">Dein Vereinsprofil</CardTitle>
            <CardDescription className="text-xs">{getSubtitle(percentage)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/50"
              >
                {section.complete ? (
                  <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <span className={section.complete ? 'text-foreground' : 'font-medium'}>
                    {section.label}
                  </span>
                  {!section.complete && section.hint && (
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      {section.hint}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
