import HeroSection from "@/components/hero";
import ChatBot from "@/components/chat-bot";

export default function Home() {
  return (
    <div className="mt-20">
      <HeroSection />
      <ChatBot />
    </div>
  );
}

// Helper component for the list style in image 2
function FeatureRow({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-blue-50 p-3 rounded-2xl">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-900">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}