"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import ChatInterface from "@/components/chat/ChatInterface";

// The AI assistant is primarily accessed via the chat sheet on /map.
// This page is kept as a full-page fallback for direct links.
export default function AssistantPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0f1e]">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-hidden">
        <ChatInterface className="h-full" />
      </main>
      <BottomNav />
    </div>
  );
}
