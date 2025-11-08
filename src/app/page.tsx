import { AgentDashboard } from "@/components/AgentDashboard";
import { getWhatsAppConfig } from "@/lib/config";

export default function Home() {
  const config = getWhatsAppConfig();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_55%)]" />
      <AgentDashboard
        config={{
          isConfigured: config.isConfigured,
          hasAccessToken: Boolean(config.accessToken),
          hasPhoneNumberId: Boolean(config.phoneNumberId),
          hasVerifyToken: Boolean(config.verifyToken),
          graphVersion: process.env.WHATSAPP_GRAPH_VERSION ?? "v20.0",
        }}
      />
      <footer className="mx-auto mb-10 mt-6 flex w-full max-w-6xl justify-between px-6 text-xs text-slate-500 lg:px-12">
        <span>Agentic WhatsApp Console</span>
        <span>Powered by Next.js · Deploy to Vercel</span>
      </footer>
    </div>
  );
}
