const Loading = () => {
  return (
    <section className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 right-1/3 h-64 w-64 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-secondary/30 blur-[110px]" />
        <div className="absolute inset-x-12 top-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 rounded-full border border-border bg-muted/40 px-5 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
          Loading
        </div>

        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border border-border/60" />
          <div className="absolute inset-2 rounded-full border-2 border-muted" />
          <div
            className="absolute inset-4 rounded-full border-2 border-t-transparent border-primary"
            style={{ animation: 'spin 1.4s linear infinite' }}
          />
          <div className="absolute inset-6 rounded-full bg-primary/10 blur-sm" />
          <div className="absolute inset-[30%] rounded-full bg-foreground/10 blur-3xl" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium">Just a moment…</p>
        </div>

        <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-muted/60">
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-primary via-secondary to-primary/60"
            style={{ animation: 'progress 1.8s ease-in-out infinite' }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes progress {
          0% {
            transform: translateX(-30%);
          }
          100% {
            transform: translateX(140%);
          }
        }
      `}</style>
    </section>
  );
};

export default Loading;
