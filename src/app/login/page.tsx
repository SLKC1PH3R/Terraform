"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * TFGen — page de connexion (direction 3a).
 * Un seul champ : le mot de passe d'équipe. Carte de verre dépoli centrée
 * sur deux nappes de lumière lentes.
 *
 * Prérequis :
 *  - `public/logo-its.png` : le PNG détouré (fond transparent).
 *  - les keyframes de `login-animations.css`, collées dans `globals.css`.
 */

function EyeIcon({ shut }: { shut: boolean }) {
  return (
    <svg viewBox="0 0 256 256" width={16} height={16} fill="currentColor">
      {shut ? (
        <path d="M228,175a8,8,0,0,1-10.92-3l-19-33.2A123.23,123.23,0,0,1,162,155.46l5.87,35.22a8,8,0,0,1-6.58,9.21A8.4,8.4,0,0,1,160,200a8,8,0,0,1-7.88-6.69l-5.77-34.58a133.06,133.06,0,0,1-36.68,0L103.9,193.31A8,8,0,0,1,96,200a8.4,8.4,0,0,1-1.32-.11,8,8,0,0,1-6.58-9.21L94,155.46a123.23,123.23,0,0,1-36.06-16.69L38.94,172A8,8,0,0,1,28,175a8,8,0,0,1-3-10.92l20-35A153.47,153.47,0,0,1,29.51,113.2a8,8,0,1,1,11-11.62c14.72,14,37.14,30.42,87.48,30.42s72.76-16.47,87.48-30.42a8,8,0,1,1,11,11.62A153.47,153.47,0,0,1,211,129.05l20,35A8,8,0,0,1,228,175Z" />
      ) : (
        <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,94,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
      )}
    </svg>
  );
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0B] text-[14px] tracking-[-0.003em] text-foreground">
      {/* — fond : deux nappes de lumière + grille — */}
      <div
        aria-hidden
        className="tfgen-aurora pointer-events-none absolute inset-[-20%] bg-[radial-gradient(closest-side,rgba(233,162,59,0.30),transparent_70%)] blur-[70px]"
      />
      <div
        aria-hidden
        className="tfgen-aurora-2 pointer-events-none absolute inset-[-25%] bg-[radial-gradient(closest-side,rgba(168,68,60,0.26),transparent_70%)] blur-[80px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[length:34px_34px]"
      />

      {/* — carte de verre — */}
      <div className="relative grid min-h-screen place-items-center p-8">
        <form
          onSubmit={handleSubmit}
          className="tfgen-rise flex w-[372px] max-w-full flex-col gap-4.5 rounded-[18px] border border-foreground/10 bg-[rgba(24,22,20,0.62)] px-7.5 pb-7 pt-8 shadow-[0_24px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[22px] backdrop-saturate-[1.4]"
        >
          <div className="flex flex-col items-center gap-3.5">
            <Image
              src="/logo-its.png"
              alt="ITS Integra"
              width={202}
              height={249}
              priority
              className="h-auto w-[66px] drop-shadow-[0_0_24px_rgba(233,162,59,0.26)]"
            />
            <div className="flex flex-col items-center gap-1">
              <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em]">TFGen</h1>
              <p className="m-0 text-pretty text-center text-[12.5px] text-muted-foreground">
                Générateur de <span className="font-mono text-[#F3C88C]">.tfvars</span> — accès
                équipe infra
              </p>
            </div>
          </div>

          <div
            aria-hidden
            className="h-px bg-[linear-gradient(90deg,transparent,rgba(245,242,237,0.13)_18%,rgba(245,242,237,0.13)_82%,transparent)]"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[11.5px] font-medium text-secondary-foreground">
              Mot de passe
            </label>

            <div className="relative flex items-center">
              <input
                id="password"
                type={reveal ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                autoFocus
                aria-invalid={error}
                aria-describedby={error ? "password-error" : undefined}
                className={`h-[42px] w-full rounded-[11px] border bg-[rgba(10,10,11,0.55)] pl-3 pr-[42px] font-mono text-[13.5px] tracking-[0.06em] text-foreground transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/14 ${
                  error ? "border-destructive ring-[3px] ring-destructive/12" : "border-foreground/14"
                }`}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                title={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-1.5 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground"
              >
                <EyeIcon shut={reveal} />
              </button>
            </div>

            {error && (
              <div
                id="password-error"
                role="alert"
                className="tfgen-shake flex items-center gap-1.5 text-[11.5px] text-destructive"
              >
                <svg viewBox="0 0 256 256" width={13} height={13} fill="currentColor" className="shrink-0">
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z" />
                </svg>
                Mot de passe incorrect
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[11px] border border-primary/45 bg-primary/13 text-[13.5px] font-semibold text-[#9BE3B8] transition-colors hover:border-primary hover:bg-primary/22 disabled:cursor-default"
          >
            {loading && (
              <span className="size-3.5 animate-spin rounded-full border-[1.6px] border-[#9BE3B8]/30 border-t-[#9BE3B8]" />
            )}
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(95,208,138,0.16)]" />
            terraform.digitalstack.cloud
          </div>
        </form>
      </div>
    </div>
  );
}
