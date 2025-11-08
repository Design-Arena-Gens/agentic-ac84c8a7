import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { addMessage } from "@/lib/message-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const entry = payload?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages ?? [];

    for (const message of messages) {
      addMessage({
        id: message.id ?? randomUUID(),
        direction: "inbound",
        to: entry?.metadata?.display_phone_number ?? null,
        from: message.from ?? null,
        body: message.text?.body ?? "[Unsupported message type]",
        status: message.status ?? "received",
        metadata: message,
        createdAt: message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while handling webhook payload.",
      },
      { status: 500 },
    );
  }
}
