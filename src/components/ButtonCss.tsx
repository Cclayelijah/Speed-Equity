// import { useEffect } from "react"

// /* ---------------------- Buttons ---------------------- */
// const baseBtn = "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[.98]"

// function classnames(...c: (string | false | null | undefined)[]) {
//   return c.filter(Boolean).join(" ")
// }

// // Tailwind component classes
// const styles = {
//   primary: classnames(baseBtn, "bg-white text-black hover:bg-white/90"),
//   muted: classnames(baseBtn, "bg-white/10 text-white hover:bg-white/15 border border-white/10"),
//   ghost: classnames(baseBtn, "bg-transparent text-white hover:bg-white/10 border border-white/10"),
// }

// // utility classes for quick usage
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// ;(globalThis as any).styles = styles

// // btn class helpers
// // @ts-ignore - make handy classes available on window for quick copy/paste
// if (typeof window !== "undefined") {
//   // @ts-ignore
//   window.styles = styles
// }

// // Compose class shortcuts for JSX
// // Usage: className="btn primary" or "btn muted"
// const css = `
// .btn{${baseBtn.replaceAll(" "," ")};position:relative;overflow:hidden;
//   border-radius:1.25rem; /* fallback if Tailwind classes not processed */
//   padding:.7rem 1.15rem; /* explicit padding for non-TW environments */
// }
// .btn:before{
//   content:"";position:absolute;inset:0;opacity:0;transition:.35s;
//   background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.25),transparent 60%);
// }
// .btn:hover:before{opacity:.8;}
// .btn:active{transform:translateY(1px);}
// .subtle-shadow{box-shadow:0 4px 18px -4px rgba(0,0,0,.45),0 2px 6px -2px rgba(0,0,0,.4);}

// .btn-primary{
//   background:linear-gradient(135deg,#ffffff,#e9e9e9);
//   color:#000;
//   box-shadow:0 4px 18px -4px rgba(255,255,255,.3),0 2px 10px -2px rgba(255,255,255,.25);
// }
// .btn-primary:hover{background:linear-gradient(135deg,#ffffff,#f3f3f3);}
// .btn-primary:active{background:linear-gradient(135deg,#f8f8f8,#e4e4e4);}

// .btn-glass{
//   background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.05));
//   color:#fff;
//   border:1px solid rgba(255,255,255,.15);
//   backdrop-filter:blur(12px);
// }
// .btn-glass:hover{background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(255,255,255,.08));}

// .btn-outline{
//   background:rgba(255,255,255,0.06);
//   color:#fff;
//   border:1px solid rgba(255,255,255,.18);
// }
// .btn-outline:hover{background:rgba(255,255,255,0.12);}

// .btn-ghost{
//   background:transparent;
//   color:#fff;
//   border:1px solid rgba(255,255,255,.12);
// }
// .btn-ghost:hover{background:rgba(255,255,255,.08);}

// .nav-link{opacity:.78;transition:.25s;color:#fff;}
// .nav-link:hover{opacity:1;}
// .badge-soft{
//   background:rgba(255,255,255,.08);
//   border:1px solid rgba(255,255,255,.15);
//   padding:.4rem .75rem;
//   border-radius:10px;
//   font-size:.65rem;
//   letter-spacing:.5px;
//   text-transform:uppercase;
// }
// `

// // Inject quick button utility css (for environments where Tailwind plugin can't define component classes)
// export default function ButtonCSS() {
//   useEffect(() => {
//     const style = document.createElement('style')
//     style.innerHTML = css
//     document.head.appendChild(style)
//     return () => { document.head.removeChild(style) }
//   }, [])
//   return null
// }
