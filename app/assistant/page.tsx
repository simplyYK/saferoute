import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import ChatInterface from "@/components/chat/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />
      <main className="flex-1 mt-14 mb-14 overflow-hidden">
        <ChatInterface className="h-full" />
      </main>
      <BottomNav />
    </div>
  );
}
