"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label: string;
};

export default function BackButton({ label }: BackButtonProps) {
  const router = useRouter();

  const onBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-200/60 hover:bg-white/5 hover:text-cyan-100"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M14 6L8 12L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
