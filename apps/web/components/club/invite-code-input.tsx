'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Reusable invite code input with two 4-char fields,
 * auto-advance, paste handling, and submit button.
 */
export function InviteCodeInput() {
  const router = useRouter();
  const [codePart1, setCodePart1] = useState('');
  const [codePart2, setCodePart2] = useState('');
  const part1Ref = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);

  function handleCodePart1Change(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const value = input.value;
    const cursorPos = input.selectionStart ?? value.length;

    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const beforeCursor = value.slice(0, cursorPos);
    const cleanedCursorPos = beforeCursor.replace(/[^a-zA-Z0-9]/g, '').length;

    const currentTotal = codePart1.length + codePart2.length;
    if (currentTotal === 8 && cleaned.length > codePart1.length) {
      const charsAdded = cleaned.length - codePart1.length;
      const pos = Math.max(0, cleanedCursorPos - charsAdded);
      queueMicrotask(() => {
        input.setSelectionRange(pos, pos);
      });
      return;
    }

    const maxAllowedInField1 = 8 - codePart2.length;
    const cappedCleaned = cleaned.slice(0, maxAllowedInField1);
    const contentShrunk = cappedCleaned.length < codePart1.length;

    if (contentShrunk && codePart2.length > 0) {
      const combined = cappedCleaned + codePart2;
      setCodePart1(combined.slice(0, 4));
      setCodePart2(combined.slice(4));

      const newCursorPos = Math.min(cleanedCursorPos, combined.slice(0, 4).length);
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      });
    } else if (cappedCleaned.length > 4) {
      const newPart1 = cappedCleaned.slice(0, 4);
      const overflow = cappedCleaned.slice(4);
      const newPart2 = (overflow + codePart2).slice(0, 4);

      setCodePart1(newPart1);
      setCodePart2(newPart2);

      requestAnimationFrame(() => {
        if (cleanedCursorPos <= 4) {
          input.setSelectionRange(cleanedCursorPos, cleanedCursorPos);
        } else {
          part2Ref.current?.focus();
          const field2Pos = cleanedCursorPos - 4;
          part2Ref.current?.setSelectionRange(field2Pos, field2Pos);
        }
      });
    } else {
      setCodePart1(cappedCleaned);

      const isAddition = cappedCleaned.length > codePart1.length;
      const wasTypedAtEnd = isAddition && cappedCleaned.startsWith(codePart1);

      if (cappedCleaned.length === 4 && wasTypedAtEnd) {
        requestAnimationFrame(() => {
          part2Ref.current?.focus();
          part2Ref.current?.setSelectionRange(0, 0);
        });
      } else if (cleanedCursorPos < cappedCleaned.length) {
        requestAnimationFrame(() => {
          input.setSelectionRange(cleanedCursorPos, cleanedCursorPos);
        });
      }
    }
  }

  function handleCodePart2Change(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const value = input.value;
    const cursorPos = input.selectionStart ?? value.length;

    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const beforeCursor = value.slice(0, cursorPos);
    const cleanedCursorPos = beforeCursor.replace(/[^a-zA-Z0-9]/g, '').length;

    const currentTotal = codePart1.length + codePart2.length;
    if (currentTotal === 8 && cleaned.length > codePart2.length) {
      const charsAdded = cleaned.length - codePart2.length;
      const pos = Math.max(0, cleanedCursorPos - charsAdded);
      queueMicrotask(() => {
        input.setSelectionRange(pos, pos);
      });
      return;
    }

    if (codePart1.length < 4) {
      const spaceInField1 = 4 - codePart1.length;
      const forField1 = cleaned.slice(0, spaceInField1);
      const forField2 = cleaned.slice(spaceInField1, spaceInField1 + 4);

      setCodePart1(codePart1 + forField1);
      setCodePart2(forField2);

      requestAnimationFrame(() => {
        part1Ref.current?.focus();
        const newPos = codePart1.length + forField1.length;
        part1Ref.current?.setSelectionRange(newPos, newPos);
      });
    } else {
      const cappedCleaned = cleaned.slice(0, 4);
      const newCursorPos = Math.min(cleanedCursorPos, cappedCleaned.length);

      setCodePart2(cappedCleaned);

      if (newCursorPos < cappedCleaned.length) {
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = e.clipboardData.getData('text');
    const cleaned = pastedText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (cleaned.length >= 8) {
      e.preventDefault();
      setCodePart1(cleaned.slice(0, 4));
      setCodePart2(cleaned.slice(4, 8));
      part2Ref.current?.focus();
    } else if (cleaned.length > 4) {
      e.preventDefault();
      setCodePart1(cleaned.slice(0, 4));
      setCodePart2(cleaned.slice(4));
      part2Ref.current?.focus();
    }
  }

  function handleJoinWithCode() {
    const fullCode = codePart1 + codePart2;
    if (fullCode.length === 8) {
      router.push(`/join/${codePart1}-${codePart2}`);
    }
  }

  function handlePart1KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && codePart1.length + codePart2.length === 8) {
      handleJoinWithCode();
    }

    if (e.key === 'ArrowRight') {
      const input = e.target as HTMLInputElement;
      const selectionStart = input.selectionStart ?? 0;
      const selectionEnd = input.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;

      if (selectionStart === codePart1.length && !hasSelection) {
        e.preventDefault();
        part2Ref.current?.focus();
        part2Ref.current?.setSelectionRange(0, 0);
      }
    }
  }

  function handlePart2Focus() {
    if (codePart1.length < 4) {
      part1Ref.current?.focus();
      requestAnimationFrame(() => {
        part1Ref.current?.setSelectionRange(codePart1.length, codePart1.length);
      });
    }
  }

  function handlePart2KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && codePart1.length + codePart2.length === 8) {
      handleJoinWithCode();
    }

    const input = e.target as HTMLInputElement;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasSelection = selectionStart !== selectionEnd;

    if (e.key === 'ArrowLeft' && selectionStart === 0 && !hasSelection) {
      e.preventDefault();
      part1Ref.current?.focus();
      const endPos = codePart1.length;
      part1Ref.current?.setSelectionRange(endPos, endPos);
    }

    if (e.key === 'Backspace' && codePart1.length > 0 && selectionStart === 0 && !hasSelection) {
      e.preventDefault();

      const newPart1Content = codePart1.slice(0, -1);
      const combined = newPart1Content + codePart2;

      setCodePart1(combined.slice(0, 4));
      setCodePart2(combined.slice(4));

      requestAnimationFrame(() => {
        part1Ref.current?.focus();
        const newCursorPos = newPart1Content.length;
        part1Ref.current?.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  }

  const isComplete = codePart1.length + codePart2.length === 8;

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={part1Ref}
        placeholder="XXXX"
        value={codePart1}
        onChange={handleCodePart1Change}
        onKeyDown={handlePart1KeyDown}
        onPaste={handlePaste}
        className="font-mono text-lg tracking-wider w-[9ch] px-[2.1ch] box-border"
        autoComplete="off"
      />
      <span className="text-xl font-mono text-muted-foreground">-</span>
      <Input
        ref={part2Ref}
        placeholder="XXXX"
        value={codePart2}
        onChange={handleCodePart2Change}
        onKeyDown={handlePart2KeyDown}
        onFocus={handlePart2Focus}
        onPaste={handlePaste}
        className="font-mono text-lg tracking-wider w-[9ch] px-[2.1ch] box-border"
        autoComplete="off"
      />
      <Button onClick={handleJoinWithCode} disabled={!isComplete} className="gap-2">
        Einlösen
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
