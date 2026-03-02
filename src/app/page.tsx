import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          Focus MVP
        </h1>
        <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
          Browser-based focus detection using MediaPipe Face Landmarker.
          Track your attention in real-time.
        </p>
        <Link
          href="/session"
          className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Start Session
        </Link>
      </main>
    </div>
  );
}
