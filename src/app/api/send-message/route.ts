import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const {
      to,
      type = "text",
      body,
      templateName,
      languageCode = "en_US",
      components,
    } = await request.json();

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Recipient phone number is required." },
        { status: 400 },
      );
    }

    if (type === "text" && (!body || typeof body !== "string")) {
      return NextResponse.json(
        { error: "Text body is required when type is text." },
        { status: 400 },
      );
    }

    if (type === "template" && (!templateName || typeof templateName !== "string")) {
      return NextResponse.json(
        { error: "Template name is required when type is template." },
        { status: 400 },
      );
    }

    const response =
      type === "text"
        ? await sendWhatsAppMessage({
            type: "text",
            to,
            body,
          })
        : await sendWhatsAppMessage({
            type: "template",
            to,
            templateName,
            languageCode,
            components,
          });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while sending message.",
      },
      { status: 500 },
    );
  }
}
