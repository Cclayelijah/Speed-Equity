import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion"
import { Rocket, Gauge, Coins, Users, GitBranch, Github, ExternalLink, PlayCircle, ArrowRight, ChevronDown } from "lucide-react"
import { useAuth } from "../../components/AuthProvider"  // <-- real auth hook
import "../../index.css";
import heroGraphic from "../../assets/hero-section-transparent-generated-image.png";
import ButtonCSS from "../../components/ButtonCss";
import Nav from "../../components/SiteNav";
import Footer from "../../components/Footer";

/**
 * Sweaty.dev — Cinematic Landing Page
 * -------------------------------------------------------------
 * - Single-file React component designed for Next.js/Vite.
 * - TailwindCSS required. (Add the classes to your Tailwind config.)
 * - Uses framer-motion for buttery scroll/hover animations.
 * - Transparent nav that solidifies on scroll.
 * - Hero with WOW-factor background and CTA.
 * - Sticky, cinematic scroll story section.
 * - Feature grid, contribution heatmap, social proof, FAQ, footer.
 * - Wire up real auth by toggling `isLoggedIn` via your auth state.
 * - Drop in Canva imagery where noted (hero, badges, device frames, etc.).
 */

export default function LandingPage() {
  // Real auth integration
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
      <Hero isLoggedIn={isLoggedIn} />
      <CinematicStory />
      <Features />
      <Heatmap />
      <SocialProof />
      <CTASection />
      <FAQ />
      <Footer />
    </div>
  )
}



/** HERO */
function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 80 } } }

  return (
    <section id="top" className="relative pb-24 overflow-hidden pt-28 md:pt-36 md:pb-40">
      {/* Hero BG Orbs (drop Canva render here if desired) */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-16 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute top-20 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <Noise />
      </div>

      <div className="grid items-center gap-10 px-5 mx-auto max-w-7xl md:grid-cols-2">
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10">
          <motion.h1 variants={item} className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Build <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-rose-300 to-cyan-300">Sweat Equity</span>.
            <br/>Get <span className="underline decoration-cyan-400/60 decoration-4 underline-offset-8">Funded</span>.
          </motion.h1>
          <motion.p variants={item} className="max-w-xl mt-6 text-lg md:text-xl text-white/80">
            Sweaty.dev motivates software teams to ship. Document your journey, track who did what, and show investors momentum—so your startup can go from idea to <em>inevitable</em>.
          </motion.p>
          <motion.div variants={item} className="flex flex-wrap items-center gap-3 mt-8">
            <a id="get-started" href={isLoggedIn ? "/dashboard" : "/onboarding"} className="inline-flex gap-2 text-base btn primary">
              {isLoggedIn ? "Open Dashboard" : "Get Started"} <ArrowRight className="w-4 h-4"/>
            </a>
            <a href="https://github.com/Cclayelijah/Speed-Equity" target="_blank" rel="noreferrer" className="inline-flex gap-2 text-base btn muted">
              <Github className="w-4 h-4"/> Star on GitHub
            </a>
            <a href="story" className="inline-flex gap-2 text-base btn ghost"><PlayCircle className="w-4 h-4"/> How it works</a>
          </motion.div>

          <motion.div variants={item} className="flex items-center gap-4 mt-10 opacity-90">
            <Badge>For Startups & OSS Teams</Badge>
            <Badge>Silicon Valley Ready</Badge>
            <Badge>Investor Friendly</Badge>
          </motion.div>
        </motion.div>

        {/* Device mock — replace with Canva export for extra WOW */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          {/* Canva drop‑in image */}
          <div className="relative">
            <img
              src={heroGraphic}
              alt="Sweaty.dev product hero"
              className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
              draggable={false}
            />
            {/* Optional subtle gradient overlay for contrast */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-tr from-fuchsia-500/10 via-transparent to-cyan-400/10 mix-blend-screen" />
          </div>

          {/* Fallback (kept for future / can remove if not needed) */}
          <div className="sr-only">
            <div className="overflow-hidden border shadow-2xl backdrop-blur-xl bg-white/5 rounded-3xl border-white/10">
              <div className="p-6 text-sm text-white/70">
                Fallback metrics mock if hero image not loaded.
              </div>
            </div>
          </div>

          <div className="absolute hidden pointer-events-none -right-6 -bottom-6 md:block">
            <Glow size={240} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/** CINEMATIC STORY — sticky narrative */
function CinematicStory() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 18, mass: 0.4 })
  const reduce = useReducedMotion();
  const y1 = useTransform(reduce ? scrollYProgress.map(()=>0) : smooth, [0,1],[0,-90])
  const y2 = useTransform(smooth, [0, 1], [0, -160])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  return (
    <section id="story" ref={ref} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Parallax backdrops */}
        <motion.div style={{ y: y1, scale }} className="absolute inset-0 -z-10 opacity-[0.35]">
          <GridBackdrop />
        </motion.div>
        <motion.div style={{ y: y2 }} className="absolute inset-0 -z-10">
          <GradientBackdrop />
        </motion.div>

        <div className="grid h-full max-w-5xl px-5 mx-auto place-items-center">
          <div className="space-y-16">
            <StoryCard
              icon={<Rocket className="w-6 h-6"/>}
              title="Document the journey"
              body="Turn commits, PRs, chats and demo clips into a living story investors can skim in minutes."
              tag="Narrative"
            />
            <StoryCard
              icon={<Users className="w-6 h-6"/>}
              title="Track real contributions"
              body="Attribute work precisely. Celebrate output, not politics. Let data speak for the team."
              tag="Attribution"
            />
            <StoryCard
              icon={<Coins className="w-6 h-6"/>}
              title="Maximise motivation"
              body="Watch your sweat convert to equity projections in real time. See the money you’re leaving on the table when you procrastinate."
              tag="Motivation"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/** FEATURES */
function Features() {
  const items = [
    { icon: <Gauge className="w-5 h-5"/>, title: "Momentum Dashboard", body: "Weekly velocity, burn, and ship cadence — distilled for investors and teammates."},
    { icon: <GitBranch className="w-5 h-5"/>, title: "Git-native Signals", body: "Auto-pull commits, PRs, issues from GitHub/GitLab with zero fuss."},
    { icon: <Users className="w-5 h-5"/>, title: "Contributor Ledger", body: "Fair attribution by repo, task, and week. See who’s carrying, who’s stuck."},
    { icon: <Coins className="w-5 h-5"/>, title: "Sweat → Equity Model", body: "Map activity to projected valuation based on your runway + goals."},
  ]

  return (
    <section id="features" className="relative py-24 md:py-36">
      <div className="px-5 mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight md:text-5xl">Everything you need to <span className="text-cyan-300">ship</span> and get <span className="text-fuchsia-300">funded</span>.</h2>
          <p className="mt-4 text-white/80">Designed for Silicon Valley speed. Built for remote teams. Loved by founders who sweat the craft.</p>
        </div>

        <div className="grid gap-5 mt-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div key={i} whileHover={{ y: -6 }} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <div className="grid w-10 h-10 border rounded-xl place-items-center bg-white/5 border-white/10">
                {it.icon}
              </div>
              <h3 className="mt-4 font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-white/75">{it.body}</p>
              <div className="inline-flex items-center gap-1 mt-4 text-xs transition-opacity opacity-0 text-white/60 group-hover:opacity-100">
                Learn more <ExternalLink className="h-3.5 w-3.5"/>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** SIMPLE HEATMAP (GitHub-style) */
function Heatmap() {
  // generate faux contribution data
  const days = 7 * 12 // 12 weeks
  const data = useMemo(() => Array.from({ length: days }, (_, i) => Math.floor(Math.sin(i/3) * 2 + Math.random()*4 + 2)), [days])
  const max = Math.max(...data)

  return (
    <section id="heatmap" className="relative py-24 md:py-28">
      <div className="px-5 mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight md:text-4xl">Make progress impossible to ignore.</h2>
            <p className="max-w-xl mt-3 text-white/80">Your public graph tells a story. Show consistent output and compounding effort. Investors love this view.</p>
          </div>
          <a href="/onboarding" className="btn primary">Start Tracking</a>
        </div>

        <div className="mt-8 rounded-2xl p-6 border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-[repeat(12,1fr)] gap-2">
            {Array.from({ length: 12 }).map((_, col) => (
              <div key={col} className="grid gap-2 grid-rows-7">
                {Array.from({ length: 7 }).map((_, row) => {
                  const idx = col*7 + row
                  const val = data[idx]
                  const intensity = val/max
                  return (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx*0.01 }}
                      className="w-full h-5 rounded-md"
                      style={{ background: `linear-gradient(135deg, rgba(236,72,153,${0.15+0.6*intensity}), rgba(34,211,238,${0.15+0.6*intensity}))` }}
                      title={`${val} units`}
                    />
                  )
                })}
              </div>
            ))}

          </div>
          <div className="mt-4 text-xs text-white/70">12 weeks of commits, PRs, docs, reviews, demos.</div>
        </div>
      </div>
    </section>
  )
}

/** SOCIAL PROOF */
function SocialProof() {
  const quotes = [
    {
      name: "Ivy — Founding Engineer",
      quote: "This finally gave our team an honest scoreboard. The motivation loop is addictive.",
    },
    {
      name: "Leo — OSS Maintainer",
      quote: "Investors understood our momentum in 30 seconds. Fundraising calls changed overnight.",
    },
    {
      name: "Maya — YC Founder",
      quote: "We replaced status meetings with Sweaty. More building, less talking.",
    },
  ]

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-6xl px-5 mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-center md:text-5xl">Loved by builders who ship.</h2>
        <div className="grid gap-5 mt-10 md:grid-cols-3">
          {quotes.map((q, i) => (
            <motion.figure key={i} whileHover={{ y: -6 }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <blockquote className="text-white/85">“{q.quote}”</blockquote>
              <figcaption className="mt-4 text-sm text-white/60">{q.name}</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/** CTA */
function CTASection() {
  return (
    <section className="relative py-20">
      <div className="max-w-6xl px-5 mx-auto">
        <div className="relative p-10 overflow-hidden text-center border rounded-3xl border-white/10 bg-gradient-to-br from-fuchsia-600/30 via-purple-600/20 to-cyan-500/20">
          <Glow size={360} />
          <h3 className="text-2xl font-black tracking-tight md:text-4xl">Ready to get sweaty?</h3>
          <p className="mt-3 text-white/85">Turn your team’s effort into unmistakable momentum — then turn momentum into money.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <a href="/onboarding" className="text-base btn primary">Get Started</a>
            <a href="/demo" className="text-base btn ghost">Watch Demo</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/** FAQ */
function FAQ() {
  const faqs = [
    { q: "Who is this for?", a: "Software startups, OSS teams, and ambitious solo builders who want to show progress and raise money." },
    { q: "How do you track contributions?", a: "We ingest signals from Git, issues, reviews, docs and timeboxed goals, then attribute by person and repo." },
    { q: "Can investors see my progress?", a: "Yes. Share a live read‑only dashboard link that updates automatically." },
    { q: "What is the most important thing for any startup?", a: "Speed. The sweatier you get, the faster you go, dipshit!"}
  ]

  return (
    <section id="faq" className="relative py-20">
      <div className="max-w-4xl px-5 mx-auto">
        <h3 className="text-2xl font-black tracking-tight md:text-4xl">FAQs</h3>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group border-b border-white/10 last:border-b-0 px-6 py-4 open:bg-white/[0.02] transition-colors"
            >
              <summary
                className="flex items-center justify-between gap-4 py-1 list-none outline-none cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 rounded-xl"
              >
                <span className="font-medium text-white/90 group-open:text-white">
                  {f.q}
                </span>
                <ChevronDown
                  className="w-5 h-5 transition-transform duration-300 text-white/55 group-open:rotate-180 group-hover:text-white/80"
                />
              </summary>
              <p className="pr-1 mt-3 text-sm text-white/75">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ---------------------- UI Fragments ---------------------- */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}

function StoryCard({ icon, title, body, tag }: { icon: React.ReactNode; title: string; body: string; tag: string }) {
  return (
    <motion.div initial={{ y: 24, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 80 }} className="grid md:grid-cols-[56px_1fr] gap-5 items-start">
      <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.06] grid place-items-center">{icon}</div>
      <div>
        <div className="mb-1 text-xs text-white/60">{tag}</div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1.5 text-white/75 max-w-2xl">{body}</p>
      </div>
    </motion.div>
  )
}

function BackgroundFX() {
  return (
    <>
      {/* subtle vignette */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent)]" />
      {/* starfield speckles */}
      <div className="fixed inset-0 opacity-50 pointer-events-none -z-10" style={{ backgroundImage: "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,.2), rgba(255,255,255,0)), radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,.2), rgba(255,255,255,0)), radial-gradient(1px 1px at 130px 90px, rgba(255,255,255,.2), rgba(255,255,255,0))"}} />
    </>
  )
}

function Noise() {
  return <div className={`absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.035\"/></svg>')]`} />
}

function Glow({ size = 260 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="absolute rounded-full pointer-events-none -z-10 bg-gradient-to-tr from-fuchsia-400/30 via-rose-300/20 to-cyan-300/30 blur-3xl" />
  )
}

function GridBackdrop() {
  return (
    <div className="absolute inset-0 opacity-60">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
    </div>
  )
}

function GradientBackdrop() {
  return (
    <div className="absolute inset-0 bg-[conic-gradient(at_30%_50%,rgba(236,72,153,0.22),rgba(34,211,238,0.22),transparent_60%)]" />
  )
}

