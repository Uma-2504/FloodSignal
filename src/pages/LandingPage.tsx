import { Link } from "react-router-dom";
import {
  AlertTriangle,
  LayoutDashboard,
  Languages,
  Clock,
  Copy,
  Mic,
  Brain,
  Bell,
  Shield,
  Globe,
  GitMerge,
  ClipboardList,
  ArrowRight,
  Waves,
  ChevronRight,
} from "lucide-react";

const problems = [
  {
    icon: Languages,
    title: "Language Barrier",
    description:
      "Flood victims speak Tamil, Hindi, Tanglish — existing systems only work in English.",
  },
  {
    icon: Clock,
    title: "Delayed Response",
    description:
      "Reports via phone calls get lost. Authorities lack real-time visibility.",
  },
  {
    icon: Copy,
    title: "Duplicate Reports",
    description:
      "Multiple reports for the same incident overwhelm responders.",
  },
];

const steps = [
  {
    icon: Mic,
    title: "Report",
    description:
      "Citizens report floods via voice or text in any language.",
  },
  {
    icon: Brain,
    title: "AI Processing",
    description:
      "AI translates, classifies severity, and deduplicates.",
  },
  {
    icon: Bell,
    title: "Alert",
    description:
      "Authorities get real-time alerts with verified incident data.",
  },
  {
    icon: Shield,
    title: "Respond",
    description:
      "Teams are dispatched with full context for faster response.",
  },
];

const features = [
  {
    icon: Mic,
    title: "Multilingual Voice Input",
    description: "Report in Tamil, English, Hindi, or Tanglish.",
  },
  {
    icon: LayoutDashboard,
    title: "Real-Time Dashboard",
    description: "Live incident map with severity filtering.",
  },
  {
    icon: Globe,
    title: "AI Translation",
    description: "Automatic translation to English for authorities.",
  },
  {
    icon: GitMerge,
    title: "Smart Deduplication",
    description: "AI groups duplicate reports automatically.",
  },
  {
    icon: AlertTriangle,
    title: "Severity Classification",
    description: "Automatic severity assessment from descriptions.",
  },
  {
    icon: ClipboardList,
    title: "Incident Management",
    description: "Complete workflow from report to resolution.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      {/* ───────── Hero Section ───────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4">
        {/* gradient mesh background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(6,182,212,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(59,130,246,0.10) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(6,182,212,0.08) 0%, transparent 50%)",
          }}
        />

        {/* decorative grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-400">
            <Waves className="h-4 w-4" />
            AI‑Powered Flood Management
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            AI‑Powered Flood Reporting{" "}
            <span className="text-cyan-400">for Every Community</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Multilingual citizens need a fast, reliable way to report floods.
            Authorities need real‑time visibility. FloodSignal bridges the gap
            with AI‑driven voice reporting, automatic translation, and smart
            deduplication — so help reaches the right place, faster.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 hover:shadow-cyan-400/30"
            >
              <AlertTriangle className="h-5 w-5" />
              Report a Flood
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-8 py-3.5 text-base font-semibold text-slate-300 backdrop-blur transition hover:border-cyan-500/40 hover:text-white"
            >
              <LayoutDashboard className="h-5 w-5" />
              View Live Dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Why FloodSignal ───────── */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Why <span className="text-cyan-400">FloodSignal</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
            Current flood‑reporting systems fail the people who need them most.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p) => (
              <div
                key={p.title}
                className="group rounded-2xl border border-slate-800 bg-white/[0.03] p-8 backdrop-blur-md transition hover:border-cyan-500/30 hover:bg-white/[0.06]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 transition group-hover:bg-cyan-500/20">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-400">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── How It Works ───────── */}
      <section className="relative px-4 py-24">
        {/* faint divider gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"
        />

        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            How It <span className="text-cyan-400">Works</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
            From citizen report to emergency response in four simple steps.
          </p>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* connecting line (desktop) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px lg:block"
              style={{
                background:
                  "linear-gradient(90deg, transparent 2%, rgba(6,182,212,0.25) 15%, rgba(6,182,212,0.25) 85%, transparent 98%)",
              }}
            />

            {steps.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                {/* number badge */}
                <div className="relative z-10 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-800 bg-[#0e1429] shadow-lg shadow-cyan-500/5">
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-slate-900">
                    {i + 1}
                  </span>
                  <s.icon className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 max-w-[220px] text-sm leading-relaxed text-slate-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Platform Features ───────── */}
      <section className="relative px-4 py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"
        />

        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Platform <span className="text-cyan-400">Features</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
            Everything you need for intelligent flood management.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-800 bg-white/[0.03] p-8 backdrop-blur-md transition hover:border-cyan-500/30 hover:bg-white/[0.06]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 transition group-hover:bg-cyan-500/20">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-[#0e1429] p-1">
          {/* gradient border illusion */}
          <div className="rounded-[22px] bg-[#0c1225] px-8 py-16 text-center sm:px-14">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to make your community{" "}
              <span className="text-cyan-400">flood‑ready</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-400">
              Start reporting incidents and empower authorities with real‑time,
              AI‑verified flood data.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 hover:shadow-cyan-400/30"
              >
                <AlertTriangle className="h-5 w-5" />
                Report a Flood
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-8 py-3.5 text-base font-semibold text-slate-300 backdrop-blur transition hover:border-cyan-500/40 hover:text-white"
              >
                <LayoutDashboard className="h-5 w-5" />
                View Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Demo Disclaimer Banner ───────── */}
      <section className="px-4 pb-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-6 py-5 text-center backdrop-blur">
          <p className="text-sm leading-relaxed text-amber-300/90 sm:text-base">
            📋 This is a demonstration platform showcasing AI‑powered flood
            management capabilities. All data shown is simulated for
            demonstration purposes.
          </p>
        </div>
      </section>
    </div>
  );
}
