"use client"

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="de">
      <body>
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Fehler</h1>
            <p className="text-gray-600">
              Ein unerwarteter Fehler ist aufgetreten.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
