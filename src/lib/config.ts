export function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  return {
    phoneNumberId,
    accessToken,
    verifyToken,
    isConfigured: Boolean(phoneNumberId && accessToken),
  };
}
