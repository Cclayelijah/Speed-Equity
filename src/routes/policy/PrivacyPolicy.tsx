import React, { useEffect, useState } from "react";
import "../../index.css";
import Nav from "../../components/SiteNav";
import Footer from "../../components/Footer";
import ButtonCSS from "../../components/ButtonCss";
import { useAuth } from "../../components/AuthProvider";
import { Shield, Mail, Database, Lock, Scale, Clock, Globe, FileEdit } from "lucide-react";

/**
 * PrivacyPolicy
 * - Minimal data collection (primarily email).
 * - Clear, friendly copy aligned with Sweaty.dev’s 6-step story.
 * - Reuses Nav + Footer, dark aesthetic, Tailwind v4 classes.
 *
 * Update the COMPANY_* constants below as needed.
 */

const COMPANY_NAME = "Sweaty.dev";
const PRODUCT_NAME = "Speed Equity";
const CONTACT_EMAIL = "hello@sweaty.dev";
const EFFECTIVE_DATE = "October 8, 2025";

export default function PrivacyPolicy() {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#05060A] text-white selection:bg-white/10 selection:text-white">
      <BackgroundFX />
      <ButtonCSS />
      <Nav scrolled={scrolled} isLoggedIn={isLoggedIn} loadingAuth={loading} />

      {/* Header */}
      <header className="relative pt-24 pb-10 md:pt-28 md:pb-12">
        <div className="max-w-5xl px-4 mx-auto sm:px-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Privacy Policy
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Your privacy, kept simple.
          </h1>
          <p className="max-w-3xl mt-3 text-white/80">
            We collect as little as possible—primarily your email—so you can use {PRODUCT_NAME} to build,
            track progress, and stay aligned. This page explains what we collect, why, and how you stay in control.
          </p>
          <p className="mt-2 text-xs text-white/60">Effective date: {EFFECTIVE_DATE}</p>
        </div>
      </header>

      {/* Quick summary cards */}
      <section className="relative pb-6 md:pb-8">
        <div className="grid max-w-5xl gap-4 px-4 mx-auto sm:px-6 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={Mail}
            title="What we collect"
            text="Primarily your email address. Plus content you choose to add (e.g., project name/logo, updates)."
          />
          <SummaryCard
            icon={Lock}
            title="How it’s used"
            text="To create your account, send essential service emails, and power core features."
          />
          <SummaryCard
            icon={Scale}
            title="Your choices"
            text="Access, update, or delete your data. Opt out of non-essential emails anytime."
          />
        </div>
      </section>

      {/* Table of contents */}
      <section className="relative py-4 md:py-6">
        <div className="max-w-5xl px-4 mx-auto sm:px-6">
          <nav className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold text-white/80">On this page</h2>
            <ul className="grid gap-2 mt-2 text-sm text-white/75 sm:grid-cols-2">
              <li><a className="hover:underline" href="#data-we-collect">1. Data we collect</a></li>
              <li><a className="hover:underline" href="#how-we-use">2. How we use data</a></li>
              <li><a className="hover:underline" href="#legal-bases">3. Legal bases</a></li>
              <li><a className="hover:underline" href="#cookies">4. Cookies & storage</a></li>
              <li><a className="hover:underline" href="#sharing">5. Sharing & processors</a></li>
              <li><a className="hover:underline" href="#retention">6. Data retention</a></li>
              <li><a className="hover:underline" href="#security">7. Security</a></li>
              <li><a className="hover:underline" href="#rights">8. Your rights</a></li>
              <li><a className="hover:underline" href="#global">9. International use</a></li>
              <li><a className="hover:underline" href="#changes">10. Changes</a></li>
              <li><a className="hover:underline" href="#contact">11. Contact us</a></li>
            </ul>
          </nav>
        </div>
      </section>

      {/* Sections */}
      <main className="relative py-8 md:py-12">
        <div className="max-w-5xl px-4 mx-auto space-y-8 sm:px-6">

          <Section id="data-we-collect" icon={Database} title="1) Data we collect">
            <ul className="pl-5 space-y-2 list-disc text-white/80">
              <li>
                <span className="font-semibold text-white">Email address (primary):</span> used to create and
                secure your account, authenticate, and communicate essential updates.
              </li>
              <li>
                <span className="font-semibold text-white">Content you submit (optional):</span> project name,
                logo (image you upload), team names, standup logs, progress updates, milestones, and similar
                items you add while using the app. This is typically business/project data, not personal data—unless
                you include it.
              </li>
              <li>
                <span className="font-semibold text-white">Public project data:</span> if you choose to mark a
                project as “public,” certain content (like your project name, progress timeline, and daily
                standup logs) may be visible to investors or others browsing the platform. This visibility helps
                founders showcase traction and attract potential funding.
              </li>
              <li>
                <span className="font-semibold text-white">Basic technical data:</span> limited, privacy-preserving
                logs (e.g., timestamped requests) to operate, debug, and secure the service.
              </li>
            </ul>
            <p className="mt-3 text-sm text-white/60">
              We do <span className="font-semibold text-white">not</span> sell your personal information.
            </p>
          </Section>


          <Section id="how-we-use" icon={FileEdit} title="2) How we use your data">
            <p className="text-white/80">
              We use your email and submitted content to run {PRODUCT_NAME} and support the 6-step journey you see on the{" "}
              <a href="/story" className="underline">Story</a> page:
            </p>
            <ol className="pl-5 mt-3 space-y-1 list-decimal text-white/80">
              <li><span className="font-semibold text-white">Create your project:</span> save project name/logo you choose.</li>
              <li><span className="font-semibold text-white">Assemble your team:</span> invite teammates via email.</li>
              <li><span className="font-semibold text-white">Establish commitments:</span> store the cadence and goals you define.</li>
              <li><span className="font-semibold text-white">Log your progress:</span> keep check-ins and updates you submit.</li>
              <li><span className="font-semibold text-white">Get funded:</span> present your progress timeline and traction.</li>
              <li><span className="font-semibold text-white">Achieve your goals:</span> track outcomes you record.</li>
            </ol>
            <p className="mt-3 text-white/80">
              If you make a project <span className="font-semibold text-white">public</span>, its standup logs, updates, and
              progress metrics may be visible to registered investors and other platform visitors to help
              connect promising founders with potential backers. Private projects remain fully private and
              visible only to invited collaborators.
            </p>
            <p className="mt-3 text-white/80">
              We may also send service emails (e.g., sign-in links, account notices) and, if you opt in,
              product tips or updates. You can unsubscribe from non-essential emails anytime.
            </p>
          </Section>


          <Section id="legal-bases" icon={Scale} title="3) Legal bases (GDPR/UK GDPR)">
            <ul className="pl-5 space-y-2 list-disc text-white/80">
              <li><span className="font-semibold text-white">Contract:</span> Provide and maintain your account and core features.</li>
              <li><span className="font-semibold text-white">Legitimate interests:</span> Service reliability, security, and product improvement that do not override your rights.</li>
              <li><span className="font-semibold text-white">Consent:</span> Optional emails beyond essentials and any features that explicitly ask for consent.</li>
            </ul>
          </Section>

          <Section id="cookies" icon={CookieIcon} title="4) Cookies & local storage">
            <ul className="pl-5 space-y-2 list-disc text-white/80">
              <li>
                <span className="font-semibold text-white">Essential session/auth cookies:</span> used to keep you signed in and protect your account (e.g., Supabase auth/session).
              </li>
              <li>
                <span className="font-semibold text-white">No ad tracking:</span> we do not use third-party advertising cookies.
              </li>
              <li>
                <span className="font-semibold text-white">Local storage:</span> may cache simple UI preferences to improve your experience.
              </li>
            </ul>
          </Section>

          <Section id="sharing" icon={Mail} title="5) Sharing & processors">
            <p className="text-white/80">
              We share data only with service providers necessary to run {PRODUCT_NAME}, under contracts that
              restrict their use of your data:
            </p>
            <ul className="pl-5 mt-2 space-y-2 list-disc text-white/80">
              <li><span className="font-semibold text-white">Email delivery:</span> transactional/opt-in emails (e.g., via SendGrid or similar).</li>
              <li><span className="font-semibold text-white">Hosting & storage:</span> database, auth, and storage infrastructure (e.g., Supabase/Postgres/object storage).</li>
              <li><span className="font-semibold text-white">Investor discovery:</span> for public projects, certain progress
                summaries may be surfaced in search or investor dashboards for funding visibility. We do not
                share private project content without your consent.</li>
            </ul>
            <p className="mt-3 text-sm text-white/60">
              We do not sell personal information. We may disclose information if legally required (e.g., to comply with a lawful request).
            </p>
          </Section>


          <Section id="retention" icon={Clock} title="6) Data retention">
            <p className="text-white/80">
              We keep your account data while your account is active. If you delete your account, we’ll delete or
              anonymize personal data within a reasonable period, except where retention is required for legal, security,
              or operational reasons (e.g., fraud prevention, logs).
            </p>
          </Section>

          <Section id="security" icon={Lock} title="7) Security">
            <p className="text-white/80">
              We use reasonable technical and organizational measures to protect your information (e.g., encryption in
              transit, least-privilege access). No system can be 100% secure, so we encourage strong, unique credentials
              and careful sharing practices.
            </p>
          </Section>

          <Section id="rights" icon={Scale} title="8) Your rights & choices">
            <ul className="pl-5 space-y-2 list-disc text-white/80">
              <li><span className="font-semibold text-white">Access/Update:</span> view and edit your profile data (primarily email) in the app.</li>
              <li><span className="font-semibold text-white">Delete:</span> request account deletion to remove personal data, subject to lawful retention limits.</li>
              <li><span className="font-semibold text-white">Email preferences:</span> unsubscribe from non-essential messages.</li>
              <li><span className="font-semibold text-white">Regional rights:</span> If you’re in the EU/UK/US states with privacy laws (e.g., GDPR/UK GDPR/CPRA),
                you may have additional rights. Contact us to exercise them.</li>
            </ul>
          </Section>

          <Section id="global" icon={Globe} title="9) International use">
            <p className="text-white/80">
              Our providers may process data in the United States and other countries. Where required, we implement
              appropriate safeguards for cross-border transfers.
            </p>
          </Section>

          <Section id="changes" icon={FileEdit} title="10) Changes to this policy">
            <p className="text-white/80">
              We may update this policy to reflect changes to {PRODUCT_NAME}. We’ll revise the “Effective date” above
              and, where appropriate, notify you by email or in-app.
            </p>
          </Section>

          <Section id="contact" icon={Mail} title="11) Contact us">
            <p className="text-white/80">
              Questions or requests? Email us at{" "}
              <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <p className="mt-2 text-sm text-white/60">
              For quickest context, mention the email associated with your {COMPANY_NAME} account.
            </p>
          </Section>

          {/* CTA back to Story */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-lg font-semibold">See how {PRODUCT_NAME} works</h3>
            <p className="mt-1.5 text-white/75">
              Our 6-step journey keeps your team aligned from idea to funding.
            </p>
            <div className="flex flex-col gap-3 mt-4 sm:flex-row">
              <a href="/story" className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold bg-white text-black hover:bg-white/90 transition">
                View the Story
              </a>
              <a href="/onboarding" className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-md transition">
                Get Started
              </a>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

/* -------------------- UI Bits -------------------- */

function SummaryCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="inline-flex items-center gap-2 mb-2 text-white/80">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-sm text-white/75">{text}</p>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="inline-flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-white" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function BackgroundFX() {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10">
      <div className="absolute -top-24 -left-16 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/25 blur-[60px]" />
      <div className="absolute top-24 -right-20 h-[22rem] w-[22rem] rounded-full bg-cyan-400/25 blur-[60px]" />
      <div className="fixed inset-0 opacity-60 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
      </div>
    </div>
  );
}

/** Simple cookie icon */
function CookieIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" {...props}>
      <path d="M19 12a7 7 0 0 1-7 7 7 7 0 1 1 5.657-11.314A3 3 0 0 0 19 10a2 2 0 0 0 0 4zM8.5 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  );
}
