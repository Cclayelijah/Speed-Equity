import { Github, LayoutGrid, Sparkles } from "lucide-react";

/** NAVBAR */
export default function Nav({ scrolled, isLoggedIn, loadingAuth }: { scrolled: boolean; isLoggedIn: boolean; loadingAuth: boolean }) {
  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-colors duration-300
        border-b
        ${scrolled
          ? "bg-[#05060A]/85 backdrop-blur-md border-white/10"
          : "bg-[#05060A]/0 border-transparent"}
      `}
      style={{
        willChange: 'background-color',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none'
      }}
    >
      <div className="flex items-center justify-between h-16 px-5 mx-auto max-w-7xl">
         <a href="/" className="inline-flex items-center gap-2 group">
           <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 shadow-[0_0_40px_-8px] shadow-fuchsia-500/40 grid place-items-center">
             <Sparkles className="w-4 h-4" />
           </div>
           <span className="text-lg font-semibold tracking-tight">
             sweaty<span className="text-fuchsia-400">.dev</span>
           </span>
         </a>
         <div className="items-center hidden md:flex gap-7 text-sm/none">
           <a href="story" className="nav-link">Why Sweaty</a>
           <a
             href="https://github.com/Cclayelijah/Speed-Equity"
             target="_blank"
             rel="noreferrer"
             className="inline-flex items-center gap-1 nav-link"
           >
             <Github className="w-4 h-4" /> GitHub
           </a>
         </div>
         <div className="flex items-center gap-2">
           {loadingAuth ? (
             <span className="badge-soft">Checking session…</span>
           ) : isLoggedIn ? (
             <>
              <a href="/dashboard" className="hidden btn btn-primary subtle-shadow sm:inline-flex"><LayoutGrid className="w-4 h-4" /> Dashboard</a>
              <a href="/settings" className="hidden btn btn-glass sm:inline-flex">Profile</a>
             </>
           ) : (
             <>
              <a href="/onboarding" className="hidden btn btn-primary sm:inline-flex">Get Started</a>
              <a href="/auth" className="inline-flex btn btn-outline"><LogIn className="w-4 h-4" /> Login</a>
             </>
           )}
         </div>
       </div>
     </div>
   )
}