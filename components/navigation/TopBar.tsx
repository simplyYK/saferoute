"use client";
import { Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { type ReactNode } from "react";
import SOSButton from "@/components/shared/SOSButton";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import LocationSearch, { type LocationResult } from "@/components/shared/LocationSearch";
import { useMapStore } from "@/store/mapStore";

interface TopBarProps {
  extraActions?: ReactNode;
}

export default function TopBar({ extraActions }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const flyTo = useMapStore((s) => s.flyTo);

  const handleSelect = (result: LocationResult) => {
    flyTo([result.lat, result.lng]);
    // If not on map/route page, navigate to map
    if (!pathname.startsWith("/map") && !pathname.startsWith("/route") && !pathname.startsWith("/globe")) {
      router.push("/map");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-navy/95 backdrop-blur border-b border-white/10 flex items-center gap-2 px-3 py-2 h-14">
      <Link href="/" className="flex items-center gap-1.5 shrink-0">
        <Shield className="w-5 h-5 text-teal" />
        <span className="font-bold text-white text-sm hidden sm:block">SafeRoute</span>
      </Link>

      <LocationSearch
        placeholder="Search any location..."
        onSelect={handleSelect}
        dark
      />

      {extraActions}
      <LanguageSwitcher compact />
      <SOSButton />
    </header>
  );
}
