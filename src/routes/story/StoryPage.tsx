import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../index.css";
import {
  Rocket, Users, CheckCircle2, CalendarCheck, DollarSign, Target,
  ChevronRight, GitBranch
} from "lucide-react";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import Nav from "../../components/SiteNav";
import ButtonCSS from "../../components/ButtonCss";
import { useAuth } from "../../components/AuthProvider";
import Footer from "../../components/Footer";

/**
 * StoryPage
 * - Hero with Loom video demo
 * - “Why it matters” callouts (daily standup, contribution visibility, motivation via $)
 * - Scroll-animated timeline (6 steps)
 * - CTA
 *
 * Tailwind v4 styles. Responsive and performant (reduced filters, use will-change).
 */

const LOOM_EMBED_URL = "https://www.loom.com/embed/your-video-id?hide_owner=true&hide_share=true&hide_title=true"; // TODO: replace with your Loom URL

const steps = [
  { id: 1, title: "Create your project", icon: Rocket, desc: "Spin up a project with a name, logo, and defaults that set the tone for your workflow." },
  { id: 2, title: "Assemble your team", icon: Users, desc: "Invite collaborators and define who’s in. Everyone sees the same goals and cadence." },
  { id: 3, title: "Establish commitments", icon: CalendarCheck, desc: "Set expectations for daily standups, weekly milestones, and equity formulas." },
  { id: 4, title: "Log your progress", icon: GitBranch, desc: "Ship, check in daily, and capture what moved the needle. Celebrate momentum, not hours." },
  { id: 5, title: "Get funded", icon: DollarSign, desc: "Your timeline and dashboard signal traction to investors—turn sweat into opportunity." },
  { id: 6, title: "Achieve your goals", icon: Target, desc: "Track outcomes, not just output. Rally the team around real wins that compound." },
];

const container = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } },
};

export default function StoryPage() {

  const { user, loading } = useAuth();
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#05060A] text-white selection:bg-white/10 selection:text-white">
      <BackgroundFX />
      <ButtonCSS /> {/* Mount the hook-using component properly */}
      <Nav scrolled={scrolled} isLoggedIn={isLoggedIn} loadingAuth={loading} />

      {/* HERO */}
      <section className="relative pt-24 pb-12 overflow-hidden md:pt-28 md:pb-16">
        <div className="px-4 mx-auto max-w-7xl sm:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 text-xs font-medium text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Built for founders and fast-moving teams
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Your product story,
                <br className="hidden sm:block" /> told through shipped work.
              </h1>
              <p className="max-w-xl mt-4 text-base sm:text-lg md:text-xl text-white/80">
                Sweaty.dev keeps your team aligned and motivated with a daily standup,
                transparent contribution tracking, and a dashboard that translates momentum into dollars.
              </p>

              <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:items-center">
                <a
                  href="/onboarding"
                  className="inline-flex justify-center items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white text-black hover:bg-white/90 transition shadow-[0_8px_30px_-10px_rgba(255,255,255,0.35)]"
                >
                  Get Started <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="#timeline"
                  className="inline-flex justify-center items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-md transition"
                >
                  See how it works
                </a>
              </div>
            </motion.div>

            {/* Loom Video */}
            <motion.div
              variants={container}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, amount: 0.2 }}
              className="relative"
            >
              <div className="absolute hidden pointer-events-none -right-5 -bottom-6 md:block">
                <Glow size={280} />
              </div>
              <div className="relative rounded-3xl border border-white/12 bg-white/[0.04] overflow-hidden shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]">
                <div className="aspect-video">
                  <iframe
                    src={LOOM_EMBED_URL}
                    title="Sweaty.dev demo"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-fuchsia-500/10 via-transparent to-cyan-400/10" />
              </div>
              <p className="mt-3 text-xs text-white/60">
                Quick tour: creating a project, daily check-ins, and tracking equity-based contributions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="relative py-16 md:py-20">
        <div className="max-w-6xl px-4 mx-auto sm:px-6">
          <div className="grid gap-4 md:grid-cols-3 sm:gap-5">
            <Callout
              icon={CalendarCheck}
              title="Daily standup that actually ships"
              text="Lightweight daily check-ins focus on outcomes, not ceremony. See what moved forward and what’s blocked—without meetings that drain momentum."
            />
            <Callout
              icon={CheckCircle2}
              title="Clear contributions, fair equity"
              text="See exactly how much each teammate has contributed over time. It’s transparent and motivates everyone to pull together."
            />
            <Callout
              icon={DollarSign}
              title="Motivation, quantified"
              text="The dashboard shows how much money you’re effectively earning by working—or missing out on by not working. It keeps speed top of mind."
            />
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <Timeline />

      {/* CTA */}
      <section className="relative py-20 sm:py-24">
        <div className="max-w-4xl px-4 mx-auto text-center sm:px-6">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Turn sweat into momentum—and momentum into funding.
          </h2>
          <p className="mt-3 text-white/80">
            Create your project, invite the team, and start logging progress today.
          </p>
          <div className="flex flex-col justify-center gap-3 mt-6 sm:flex-row">
            <a
              href="/onboarding"
              className="inline-flex justify-center items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white text-black hover:bg-white/90 transition"
            >
              Get Started
            </a>
            <a
              href="/dashboard"
              className="inline-flex justify-center items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-md transition"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

/* -------------------- Components -------------------- */

function Callout(props: { icon: React.ElementType; title: string; text: string }) {
  const { icon: Icon, title, text } = props;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="inline-flex items-center justify-center w-10 h-10 mb-3 border rounded-xl bg-white/10 border-white/10">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-white/75">{text}</p>
    </motion.div>
  );
}

function Timeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 60%", "end 60%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 18, mass: 0.4 });
  const fill = useTransform(smooth, v => `${Math.min(100, Math.max(0, v * 100))}%`);

  return (
    <section id="timeline" className="relative py-20 md:py-28">
      <div className="max-w-6xl px-4 mx-auto sm:px-6">
        <div className="mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            The journey
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Build. Log. Prove. Fund. Win.
          </h2>
          <p className="max-w-2xl mt-2 text-white/75">
            A uniquely styled timeline that mirrors how teams actually ship. Each step reveals more as you scroll.
          </p>
        </div>

        {/* One flow container with a centered rail */}
        <div ref={ref} className="relative">
          {/* Rail background (mobile: far left of screen, lg+: centered) */}
          <div
            className="
              absolute top-0 h-full w-[4px] rounded-full bg-white/10
              left-0 -translate-x-4
              lg:left-1/2 lg:-translate-x-1/2
            "
          />
          {/* Progress fill (mobile: far left, lg+: centered) */}
          <motion.div
            className="
              absolute top-0 w-[4px] rounded-full
              left-0 -translate-x-4
              lg:left-1/2 lg:-translate-x-1/2
            "
            style={{
              height: fill,
              background: "linear-gradient(180deg, rgba(236,72,153,0.9), rgba(34,211,238,0.9))",
              willChange: "height",
            }}
          />
          <div className="space-y-6">
            {steps.map((s, i) => (
              <TimelineItem key={s.id} step={s} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineItem({
  step,
  index,
}: {
  step: { id: number; title: string; desc: string; icon: React.ElementType };
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const placeRight = index % 2 === 0;

  return (
    <div
      ref={ref}
      className="
        relative grid items-start
        grid-cols-[24px_1fr] lg:grid-cols-[1fr_auto_1fr]
        gap-3 lg:gap-4
      "
    >
      {/* Center node */}
      <div className="flex items-center justify-center order-1 lg:order-none lg:col-start-2">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.04 }}
          className="w-4 h-4 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.08)]"
        />
      </div>

      {/* Content card: right on even indices (1,3,5 steps), left on odd indices */}
      <motion.div
        initial={{ opacity: 0, y: 16, x: placeRight ? 16 : -16 }}
        animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className={`${placeRight ? "lg:col-start-3" : "lg:col-start-1"} col-start-2 order-2 lg:order-none`}
      >
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="grid w-10 h-10 border rounded-xl bg-white/10 border-white/10 place-items-center">
              <step.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm font-semibold text-white/70">Step {step.id}</div>
          </div>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="mt-1.5 text-sm text-white/75">{step.desc}</p>

          {/* ...keep your extra context blocks here... */}
        </div>
      </motion.div>
    </div>
  );
}

/* -------------------- Background FX -------------------- */

function BackgroundFX() {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10">
      <div className="absolute -top-24 -left-16 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/25 blur-[60px] will-change-transform" />
      <div className="absolute top-24 -right-20 h-[22rem] w-[22rem] rounded-full bg-cyan-400/25 blur-[60px] will-change-transform" />
      <div className="fixed inset-0 opacity-60 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
      </div>
    </div>
  );
}

function Glow({ size = 260 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="absolute rounded-full pointer-events-none -z-10 bg-gradient-to-tr from-fuchsia-400/30 via-rose-300/20 to-cyan-300/30 blur-3xl"
    />
  );
}