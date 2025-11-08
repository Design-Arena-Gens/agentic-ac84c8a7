## Agentic WhatsApp Console

This project delivers a WhatsApp Cloud API control room that helps you:

- Send ad-hoc messages and approved templates to any recipient
- Define lightweight automation rules that live in the browser
- Monitor inbound and outbound message activity in real time
- Accept webhook calls from Meta to record customer replies

### Local development

1. Install dependencies (already handled by `create-next-app`, re-run if needed):

   ```bash
   npm install
   ```

2. Duplicate `.env.local.example` into `.env.local` and fill in your WhatsApp Cloud API credentials.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) to access the agent console.

### Environment variables

| Variable | Description |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Permanent token from Meta for authenticating API calls. |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID for the sending business account. |
| `WHATSAPP_VERIFY_TOKEN` | Secret used to validate the webhook challenge handshake. |
| `WHATSAPP_GRAPH_VERSION` _(optional)_ | Graph API version (defaults to `v20.0`). |

### Webhook endpoint

Configure the following URL in the Meta Developer dashboard for inbound message events:

```
https://agentic-ac84c8a7.vercel.app/api/webhook
```

Supply the same value as `WHATSAPP_VERIFY_TOKEN` to complete verification.

### Automated rules

Automation rules are stored in the browser's local storage. They are ideal for rapid prototyping without a database. Extend the logic inside `src/components/AgentDashboard.tsx` to bridge these rules with a production workflow.

### Production build

Create an optimized build and run locally before shipping to Vercel:

```bash
npm run build
npm run start
```

Once satisfied, deploy with `vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-ac84c8a7`.
