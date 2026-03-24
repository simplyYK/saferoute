import Link from "next/link";
import { MapPin, Shield, Bot, Route, AlertTriangle, Users, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-teal" />
          <span className="font-bold text-lg">SafeRoute</span>
        </div>
        <div className="flex gap-2 text-xs text-slate-400">
          <span>EN</span>
          <span>|</span>
          <span>عربي</span>
          <span>|</span>
          <span>Укр</span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>100M+ people in active conflict zones</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4 text-balance">
          You are not alone.
          <br />
          <span className="text-teal">Find safety now.</span>
        </h1>

        <p className="text-slate-300 text-lg max-w-md mb-8 text-balance">
          Real-time crisis map, safe routes, and emergency resources — no sign-up needed.
        </p>

        <Link
          href="/map"
          className="w-full max-w-sm bg-teal hover:bg-sky-400 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <MapPin className="w-5 h-5" />
          Open Crisis Map
        </Link>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Your location stays on your device. We never track you.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto w-full">
        {[
          { icon: MapPin, label: "Live Danger Map", desc: "Real-time conflict events & hazards", color: "text-red-400" },
          { icon: Users, label: "Community Reports", desc: "Crowdsourced Waze-style alerts", color: "text-yellow-400" },
          { icon: Bot, label: "AI Assistant", desc: "First aid & survival guidance", color: "text-teal" },
          { icon: Route, label: "Safe Routes", desc: "Danger-weighted route planning", color: "text-green-400" },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
            <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 px-6 py-6 flex justify-around max-w-2xl mx-auto w-full">
        {[
          { stat: "100M+", label: "Displaced globally" },
          { stat: "6", label: "Languages" },
          { stat: "0", label: "Sign-ups needed" },
        ].map(({ stat, label }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-bold text-teal">{stat}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </section>

      {/* Select region */}
      <section className="px-6 pb-12 flex flex-col items-center gap-3">
        <p className="text-sm text-slate-400 flex items-center gap-1">
          <Globe className="w-4 h-4" /> Select your region or open the map to use your location
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Ukraine", "Gaza", "Sudan", "Myanmar", "Yemen", "Syria"].map((region) => (
            <Link
              key={region}
              href={`/map?region=${region}`}
              className="text-xs px-3 py-1.5 rounded-full border border-white/20 hover:border-teal hover:text-teal transition-colors"
            >
              {region}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
