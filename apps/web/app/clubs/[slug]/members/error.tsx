'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto py-12 text-center">
      <h2 className="text-xl font-semibold">Fehler aufgetreten</h2>
      <p className="text-muted-foreground mt-2">
        {error.message || 'Ein unbekannter Fehler ist aufgetreten'}
      </p>
      <button onClick={reset} className="mt-4 text-primary hover:underline">
        Erneut versuchen
      </button>
    </div>
  );
}
