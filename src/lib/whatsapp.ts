import { randomUUID } from "node:crypto";
import { addMessage } from "./message-store";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? "v20.0";

type SendTextPayload = {
  to: string;
  body: string;
};

type SendTemplatePayload = {
  to: string;
  templateName: string;
  languageCode: string;
  components?: Array<{
    type: "body";
    parameters: Array<{ type: "text"; text: string }>;
  }>;
};

type SendWhatsAppPayload =
  | ({ type: "text" } & SendTextPayload)
  | ({ type: "template" } & SendTemplatePayload);

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

function ensureConfig() {
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "Missing WhatsApp configuration. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    );
  }
}

export async function sendWhatsAppMessage(payload: SendWhatsAppPayload) {
  ensureConfig();

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  const baseBody = {
    messaging_product: "whatsapp",
    to: payload.to,
  };

  const body =
    payload.type === "text"
      ? {
          ...baseBody,
          type: "text",
          text: { body: payload.body },
        }
      : {
          ...baseBody,
          type: "template",
          template: {
            name: payload.templateName,
            language: { code: payload.languageCode },
            ...(payload.components ? { components: payload.components } : {}),
          },
        };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? "Failed to send WhatsApp message.",
    );
  }

  addMessage({
    id: result.messages?.[0]?.id ?? randomUUID(),
    direction: "outbound",
    to: payload.to,
    from: phoneNumberId ?? null,
    body: payload.type === "text" ? payload.body : payload.templateName,
    status: "sent",
    metadata: {
      request: payload,
      response: result,
    },
    createdAt: new Date().toISOString(),
  });

  return result;
}
