export type StoredMessage = {
  id: string;
  direction: "inbound" | "outbound";
  to: string | null;
  from: string | null;
  body: string;
  status?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type MessageStore = {
  messages: StoredMessage[];
  addMessage: (message: StoredMessage) => void;
  getMessages: () => StoredMessage[];
};

const globalKey = Symbol.for("whatsapp-agent.message-store");

type GlobalWithStore = typeof globalThis & {
  [globalKey]?: MessageStore;
};

const globalForStore = globalThis as GlobalWithStore;

if (!globalForStore[globalKey]) {
  const store: MessageStore = {
    messages: [],
    addMessage(message: StoredMessage) {
      this.messages.unshift(message);
      if (this.messages.length > 100) {
        this.messages.length = 100;
      }
    },
    getMessages() {
      return this.messages;
    },
  };

  globalForStore[globalKey] = store;
}

const store = globalForStore[globalKey]!;

export function addMessage(message: StoredMessage) {
  store.addMessage(message);
}

export function getMessages() {
  return store.getMessages();
}
