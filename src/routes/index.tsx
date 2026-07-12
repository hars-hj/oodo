import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroScene } from "@/components/three/Scene";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Users,
  Route as RouteIcon,
  Wrench,
  Fuel,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Gauge,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  {
    icon: Truck,
    title: "Vehicle Registry",
    desc: "Unique registration, load capacity, odometer, lifecycle status.",
  },
  {
    icon: Users,
    title: "Driver Management",
    desc: "Licenses, expiry tracking, safety scores and duty status.",
  },
  {
    icon: RouteIcon,
    title: "Trip Dispatch",
    desc: "Validated dispatch with automatic vehicle & driver transitions.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    desc: "Log shop work — vehicles auto-move to In Shop and out of dispatch.",
  },
  {
    icon: Fuel,
    title: "Fuel & Expenses",
    desc: "Track liters, tolls and costs with auto operational totals.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Fuel efficiency, utilization, ROI and CSV export.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative h-[92vh] min-h-[620px] w-full overflow-hidden">
        <HeroScene />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground glow">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TransitOps</span>
          </div>
          <nav className="flex items-center gap-2">
            {session ? (
              <Button asChild>
                <Link to="/dashboard">
                  Open Console <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex h-[calc(100%-88px)] max-w-7xl flex-col justify-center px-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary animate-pulse-ring">
              <ShieldCheck className="h-3.5 w-3.5" /> Business-rule enforced operations
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Command your <span className="text-gradient">entire fleet</span> from one console.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              TransitOps digitizes vehicles, drivers, dispatch, maintenance and expenses — with
              automatic status transitions and real-time operational insight.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="glow">
                <Link to={session ? "/dashboard" : "/auth"}>
                  {session ? "Go to dashboard" : "Launch the platform"}{" "}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Explore features</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Gauge className="h-4 w-4" /> Operations, unified
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Everything a modern fleet needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            No more spreadsheets and logbooks. From registration to ROI, every workflow lives in one
            blue-lit command center.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-rise glass group rounded-2xl p-6">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25 transition-transform group-hover:scale-110">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 to-accent/10 p-10 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="font-display text-2xl font-bold">Ready to take control?</h3>
            <p className="mt-1 text-muted-foreground">
              Spin up your operations console in seconds.
            </p>
          </div>
          <Button size="lg" asChild className="glow">
            <Link to={session ? "/dashboard" : "/auth"}>
              {session ? "Open console" : "Create your account"}{" "}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        TransitOps — Smart Transport Operations Platform
      </footer>
    </div>
  );
}
