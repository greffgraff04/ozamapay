// @n8n/chat publishes `types: "./dist/index.d.ts"` in its package.json but
// does not actually ship that file (only `dist/src/index.d.ts` exists), so
// TypeScript can't resolve the module without this shim.
declare module "@n8n/chat" {
  export interface ChatOptions {
    webhookUrl: string;
    webhookConfig?: {
      method?: "GET" | "POST";
      headers?: Record<string, string>;
    };
    target?: string | Element;
    mode?: "window" | "fullscreen";
    showWindowCloseButton?: boolean;
    showWelcomeScreen?: boolean;
    loadPreviousSession?: boolean;
    sessionId?: string;
    chatInputKey?: string;
    chatSessionKey?: string;
    defaultLanguage?: "en";
    initialMessages?: string[];
    metadata?: Record<string, unknown>;
    i18n?: Record<string, Record<string, string>>;
    theme?: Record<string, unknown>;
    disabled?: boolean;
    allowFileUploads?: boolean;
    allowedFilesMimeTypes?: string;
    enableStreaming?: boolean;
    beforeMessageSent?: (message: string) => void | Promise<void>;
    afterMessageSent?: (message: string, response?: unknown) => void | Promise<void>;
    enableMessageActions?: boolean;
  }

  export interface ChatApp {
    unmount: () => void;
  }

  export function createChat(options: ChatOptions): ChatApp;
}

declare module "@n8n/chat/style.css";
