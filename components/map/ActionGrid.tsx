"use client";
import { motion } from "framer-motion";
import { Home, Stethoscope, ShieldAlert, Phone } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";

interface ActionGridProps {
  onFindShelter: () => void;
  onFindMedical: () => void;
  onThreatCheck: () => void;
  onEmergencyContacts: () => void;
}

const ACTIONS = [
  {
    id: "shelter",
    icon: Home,
    label: "Seek Shelter",
    sublabel: "Nearest safe location",
    gradient: "from-teal/15 to-sky-600/10",
    border: "border-teal/20 hover:border-teal/50",
    iconBg: "bg-teal/15",
    iconColor: "text-teal",
    glow: "rgba(14,165,233,0.25)",
  },
  {
    id: "medical",
    icon: Stethoscope,
    label: "Medical Aid",
    sublabel: "Hospitals & clinics",
    gradient: "from-green-600/15 to-emerald-600/10",
    border: "border-green-500/20 hover:border-green-500/50",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
    glow: "rgba(34,197,94,0.25)",
  },
  {
    id: "threats",
    icon: ShieldAlert,
    label: "Threat Check",
    sublabel: "AI threat assessment",
    gradient: "from-orange-600/15 to-red-600/10",
    border: "border-orange-500/20 hover:border-orange-500/50",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    glow: "rgba(249,115,22,0.25)",
  },
  {
    id: "contacts",
    icon: Phone,
    label: "Emergency",
    sublabel: "Contacts & hotlines",
    gradient: "from-purple-600/15 to-violet-600/10",
    border: "border-purple-500/20 hover:border-purple-500/50",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    glow: "rgba(139,92,246,0.25)",
  },
];

export default function ActionGrid({ onFindShelter, onFindMedical, onThreatCheck, onEmergencyContacts }: ActionGridProps) {
  const handlers: Record<string, () => void> = {
    shelter: onFindShelter,
    medical: onFindMedical,
    threats: onThreatCheck,
    contacts: onEmergencyContacts,
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 px-3 pb-2">
      {ACTIONS.map((action, i) => {
        const Icon = action.icon;
        const handler = handlers[action.id];
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 350, damping: 28 }}
            whileHover={{ scale: 1.04, boxShadow: `0 6px 20px ${action.glow}` }}
            whileTap={{ scale: 0.94 }}
            onClick={handler}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 rounded-2xl bg-gradient-to-br ${action.gradient} border ${action.border} backdrop-blur-sm transition-all min-h-[74px] relative overflow-hidden`}
          >
            {/* Subtle top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className={`p-2 rounded-xl ${action.iconBg}`}>
              <Icon className={`w-4 h-4 ${action.iconColor}`} strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <p className="text-white text-[11px] font-semibold leading-tight">{action.label}</p>
              <p className="text-slate-500 text-[9px] leading-tight mt-0.5 hidden sm:block">{action.sublabel}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
