'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableDescriptionProps {
  children: React.ReactNode;
}

/**
 * Renders text with 2-line clamp and an expand/collapse toggle.
 * Overrides TableCell's whitespace-nowrap with whitespace-normal.
 * The toggle only appears when text actually overflows 2 lines.
 */
export function ExpandableDescription({ children }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const checkClamped = useCallback(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, []);

  useEffect(() => {
    setExpanded(false);
    checkClamped();
  }, [checkClamped, children]);

  return (
    <div className="max-w-xs">
      <p
        ref={textRef}
        className={cn(
          'whitespace-normal text-muted-foreground',
          expanded ? 'line-clamp-none' : 'line-clamp-2'
        )}
      >
        {children}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs text-primary hover:underline mt-0.5 inline-flex items-center gap-0.5"
        >
          {expanded ? (
            <>
              weniger <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              mehr <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
