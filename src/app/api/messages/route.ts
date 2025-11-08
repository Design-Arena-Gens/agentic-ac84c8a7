import { NextResponse } from "next/server";
import { addMessage, getMessages } from "@/lib/message-store";

export async function GET() {
  return NextResponse.json({ messages: getMessages() });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const required = ["id", "direction", "body"];
    for (const key of required) {
      if (!payload[key]) {
        return NextResponse.json(
          { error: `Missing required field: ${key}` },
          { status: 400 },
        );
      }
    }

    addMessage({
      id: payload.id,
      direction: payload.direction,
      to: payload.to ?? null,
      from: payload.from ?? null,
      body: payload.body,
      status: payload.status ?? "received",
      metadata: payload.metadata ?? {},
      createdAt: payload.createdAt ?? new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while storing message.",
      },
      { status: 500 },
    );
  }
}
