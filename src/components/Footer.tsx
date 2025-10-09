import { Github, Sparkles } from "lucide-react";

/** FOOTER */
export default function Footer() {
  return (
    <footer className="relative py-12 border-t border-white/10">
      <div className="flex flex-col items-center justify-between gap-6 px-5 mx-auto max-w-7xl md:flex-row">
        <a href="/" className="inline-flex items-center gap-2">
          <div className="grid w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">sweaty<span className="text-fuchsia-400">.dev</span></span>
        </a>
        <div className="flex items-center gap-4 text-sm text-white/70">
          <a href="https://github.com/Cclayelijah/Speed-Equity" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
            <Github className="w-4 h-4"/> GitHub Project
          </a>
          <span className="opacity-50">•</span>
          <a href="mailto:hello@sweaty.dev" className="hover:text-white">Contact</a>
          <span className="opacity-50">•</span>
          <a href="/privacy" className="hover:text-white">Privacy</a>
        </div>
      </div>
    </footer>
  )
}