"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, getSupabaseBrowserClient } from "@/shared/lib/supabase";

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    href: "/session",
    label: "모니터링",
    description: "실시간 집중도 측정",
    requiresAuth: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    href: "/record",
    label: "개인 기록",
    description: "세션 히스토리 & 통계",
    requiresAuth: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
];

export function NavigationMenu({ isOpen, onClose }: NavigationMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "게스트";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const avatarInitial = displayName[0]?.toUpperCase() ?? "G";

  // shouldRender keeps DOM mounted during exit animation
  const [shouldRender, setShouldRender] = useState(isOpen);
  // visible drives the CSS transition
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // rAF ensures translate-x-full is painted before removing it
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-900">Focus Monitor</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="메뉴 닫기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User profile area */}
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {avatarInitial}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-zinc-900">{displayName}</p>
              <p className="text-xs text-zinc-400">
                {isAuthenticated ? "로그인됨" : "게스트 모드"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            메뉴
          </p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const isLocked = item.requiresAuth && !isAuthenticated;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : isLocked
                        ? "cursor-not-allowed text-zinc-300"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span className={isActive ? "text-white" : isLocked ? "text-zinc-300" : "text-zinc-400"}>
                    {item.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">{item.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{item.description}</p>
                  </div>
                  {isLocked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="my-3 border-t border-zinc-100" />

          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            앱 정보
          </p>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-zinc-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <div>
              <p className="text-sm font-medium text-zinc-700">Focus Monitor</p>
              <p className="text-xs text-zinc-400">v0.1.0 · AI 집중도 측정</p>
            </div>
          </div>
        </nav>

        {/* Footer — logout */}
        <div className="border-t border-zinc-100 px-3 py-3">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              로그아웃
            </button>
          ) : (
            <Link
              href="/"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              로그인
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
