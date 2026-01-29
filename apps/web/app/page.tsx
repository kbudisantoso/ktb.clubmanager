export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <h1 className="text-4xl font-display font-bold text-primary mb-4">
        ClubManager
      </h1>
      <p className="text-lg text-muted-foreground font-body mb-8">
        Open-source club management with integrated bookkeeping
      </p>
      <div className="flex gap-4">
        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Primary
        </div>
        <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
          Secondary
        </div>
        <div className="px-4 py-2 bg-accent text-accent-foreground rounded-md">
          Accent
        </div>
        <div className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md">
          Destructive
        </div>
        <div className="px-4 py-2 bg-success text-success-foreground rounded-md">
          Success
        </div>
      </div>
    </main>
  );
}
