import React, { useState } from "react";
import Footer from "./Footer";
import { useAuth } from "./AuthProvider";
import AppNav from "./AppNav";

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




export default function AppLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false)
  return (
    <div className="w-full min-h-screen text-white bg-bg">
      <AppNav scrolled={scrolled} title={title} />
      <BackgroundFX />
      <main className="pt-20">{children}</main>
      <Footer />
    </div>
  );
}