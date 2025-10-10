import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";


/** NAVBAR */
export default function AppNav({ scrolled, title }: { scrolled: boolean; title: string; }) {
  const navItems = getNavItemsByTitle(title)

  return (
    <div
      className={`
        relative w-full
        transition-colors duration-300
        border-b-2
        ${scrolled
          ? "bg-[#05060A]/85 backdrop-blur-md border-white/30"
          : "bg-[#05060A]/0 border-transparent"}
      `}
      style={{ willChange: 'background-color' }}
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
          {/* <span className="text-2xl font-bold text-white">{title}</span> */}
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h1>
         </div>
         <div className="flex items-center gap-2">
           {navItems && navItems}
         </div>
       </div>
     </div>
   )
}

function getNavItemsByTitle(title: string) {
  const navigate = useNavigate()
  let navItems = <></>;
  console.log(title)
  switch (title) {
    case "Dashboard":
      navItems = <>
        <button
          className="px-4 py-2 border border-[#333] rounded btn-outline btn text-white/80 hover:bg-white/5 hover:text-white"
          onClick={() => navigate('/checkin')}
        >
          Check-In
        </button>
        <button
          className="px-4 py-2 border border-[#333] rounded btn-outline btn text-white/80 hover:bg-white/5 hover:text-white"
          onClick={() => navigate('/settings')}
        >
          Profile
        </button>
      </>
      break;
    default:
      navItems = <>
        <button
          className="px-4 py-2 border border-[#333] rounded btn-outline btn text-white/80 hover:bg-white/5 hover:text-white"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
      </>
  }
  
  return navItems;
}
