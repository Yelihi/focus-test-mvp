"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/shared/ui";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/lib/supabase";

export function LoginCard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/session");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = async () => {
    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  };

  const handleGuestStart = () => {
    router.push("/session");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Logo size="lg" />

        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">시작하기</h2>
          <p className="mt-1 text-sm text-zinc-500">
            소셜 계정으로 간편하게 시작하세요
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 계속하기
            </button>

            {/* Guest */}
            <button
              onClick={handleGuestStart}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100"
            >
              게스트로 시작
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          계속 진행하면{" "}
          <span className="underline cursor-pointer">이용약관</span> 및{" "}
          <span className="underline cursor-pointer">개인정보처리방침</span>에
          동의하는 것으로 간주됩니다.
        </p>

        <p className="text-xs text-zinc-400">
          &copy; 2026 Focus Monitor. All rights reserved.
        </p>
      </div>
    </div>
  );
}
