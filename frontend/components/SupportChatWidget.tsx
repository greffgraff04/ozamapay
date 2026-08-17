"use client";

import { useEffect, useRef } from "react";
import "@n8n/chat/style.css";
import "./SupportChatWidget.css";
import type { ChatApp } from "@n8n/chat";

const N8N_WEBHOOK_URL =
  "https://ozamapay.app.n8n.cloud/webhook/3a976bd9-cc66-41f4-bc9d-7412bcdeadb9/chat";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

// n8n Chat mounts an imperative Vue app; keep a handle so effect cleanup
// (React StrictMode double-invoke, route changes) can unmount it cleanly
// instead of mounting a second instance into the same target.
export default function SupportChatWidget() {
  const chatAppRef = useRef<ChatApp | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mountIfAuthenticated() {
      const token = localStorage.getItem("token");
      if (!token) return;

      let email: string | undefined;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        email = data?.email;
      } catch (err) {
        console.error("SupportChatWidget: pa t kapab jwenn itilizatè a", err);
        return;
      }

      if (cancelled || !email) return;

      const { createChat } = await import("@n8n/chat");
      if (cancelled) return;

      chatAppRef.current = createChat({
        webhookUrl: N8N_WEBHOOK_URL,
        mode: "window",
        showWelcomeScreen: false,
        metadata: { email },
        initialMessages: [
          "Bonjou! 👋 Mwen se Oza, asistan OZAMAPAY. Kijan m ka ede w jodi a?",
        ],
        i18n: {
          en: {
            title: "Bonjou! 👋",
            subtitle: "Nou la pou ede w 24/7.",
            footer: "",
            getStarted: "Kòmanse yon konvèsasyon",
            inputPlaceholder: "Ekri mesaj ou a...",
            closeButtonTooltip: "Fèmen chat la",
          },
        },
      });
    }

    mountIfAuthenticated();

    return () => {
      cancelled = true;
      chatAppRef.current?.unmount();
      chatAppRef.current = null;
    };
  }, []);

  return null;
}
