"use client";

import { useEffect, useRef } from "react";
import "@n8n/chat/style.css";
import "./SupportChatWidget.css";
import type { ChatApp } from "@n8n/chat";

const N8N_WEBHOOK_URL =
  "https://ozamapay.app.n8n.cloud/webhook/3a976bd9-cc66-41f4-bc9d-7412bcdeadb9/chat";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

// sessionStorage (not localStorage) so a dragged position only survives
// reloads/navigation within the current tab session, and disappears once the
// tab/browser closes — matches the "just this session" requirement without
// any SSR concerns, since it's only ever touched from browser event handlers.
const TOGGLE_POSITION_STORAGE_KEY = "ozamapay_support_chat_toggle_position";
const DRAG_THRESHOLD_PX = 8;

type TogglePosition = { leftPct: number; topPct: number };

function clampToViewport(left: number, top: number, el: HTMLElement) {
  const { width, height } = el.getBoundingClientRect();
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  return {
    left: Math.min(Math.max(left, 0), maxLeft),
    top: Math.min(Math.max(top, 0), maxTop),
  };
}

function applyFixedPosition(el: HTMLElement, left: number, top: number) {
  el.style.position = "fixed";
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
  el.style.margin = "0";
  el.style.zIndex = "var(--chat--window--z-index, 9999)";
}

function saveTogglePosition(pos: TogglePosition) {
  try {
    sessionStorage.setItem(TOGGLE_POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Private browsing / quota errors — losing the saved spot isn't harmful.
  }
}

function loadTogglePosition(): TogglePosition | null {
  try {
    const raw = sessionStorage.getItem(TOGGLE_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.leftPct === "number" && typeof parsed?.topPct === "number") {
      return parsed;
    }
  } catch {
    // Malformed data — ignore and fall back to the default corner position.
  }
  return null;
}

// @n8n/chat renders ".chat-window-toggle" as a flex item inside
// ".chat-window-wrapper" (which is what's actually anchored to
// --chat--window--bottom/right); the toggle itself has no drag API. This
// bolts on pointer-based drag support after the fact: while dragging, the
// toggle is pulled out of that flex layout with an inline `position: fixed`
// so it can move independently of the wrapper (and of the chat panel, which
// intentionally stays anchored where it always was — only the icon moves).
function makeToggleDraggable(toggleEl: HTMLElement): () => void {
  toggleEl.style.touchAction = "none";

  let pointerId: number | null = null;
  let startClientX = 0;
  let startClientY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let justDragged = false;

  const saved = loadTogglePosition();
  if (saved) {
    const clamped = clampToViewport(
      saved.leftPct * window.innerWidth,
      saved.topPct * window.innerHeight,
      toggleEl,
    );
    applyFixedPosition(toggleEl, clamped.left, clamped.top);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    if (!moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      moved = true;
      // Seed the fixed position at the icon's current on-screen spot so it
      // doesn't jump the instant the drag threshold is crossed.
      const rect = toggleEl.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      applyFixedPosition(toggleEl, startLeft, startTop);
    }

    e.preventDefault();
    const clamped = clampToViewport(startLeft + dx, startTop + dy, toggleEl);
    toggleEl.style.left = `${clamped.left}px`;
    toggleEl.style.top = `${clamped.top}px`;
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    if (moved) {
      // A real drag happened — swallow the click Vue's own listener would
      // otherwise receive next, so it doesn't also toggle the chat open/shut.
      justDragged = true;
      const rect = toggleEl.getBoundingClientRect();
      saveTogglePosition({
        leftPct: rect.left / window.innerWidth,
        topPct: rect.top / window.innerHeight,
      });
    }
    pointerId = null;
    moved = false;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // primary mouse button / first touch point only
    pointerId = e.pointerId;
    startClientX = e.clientX;
    startClientY = e.clientY;
    moved = false;
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  // Vue attaches its own click listener directly on toggleEl when @n8n/chat
  // mounts (that's what opens/closes the panel), and it registers before
  // this one, so a same-element listener here would run too late to stop it.
  // A capturing listener on `document` runs during the capture phase, which
  // always completes before any listener on the target itself — the only
  // reliable way to intercept and cancel that click after a real drag.
  function onClickCapture(e: MouseEvent) {
    if (!justDragged) return;
    justDragged = false;
    if (e.target === toggleEl || (e.target instanceof Node && toggleEl.contains(e.target))) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function onResize() {
    if (toggleEl.style.position !== "fixed") return;
    const rect = toggleEl.getBoundingClientRect();
    const clamped = clampToViewport(rect.left, rect.top, toggleEl);
    toggleEl.style.left = `${clamped.left}px`;
    toggleEl.style.top = `${clamped.top}px`;
  }

  toggleEl.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("click", onClickCapture, true);
  window.addEventListener("resize", onResize);

  return () => {
    toggleEl.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
}

// n8n Chat mounts an imperative Vue app; keep a handle so effect cleanup
// (React StrictMode double-invoke, route changes) can unmount it cleanly
// instead of mounting a second instance into the same target.
export default function SupportChatWidget() {
  const chatAppRef = useRef<ChatApp | null>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

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

      const toggleEl = document.querySelector<HTMLElement>(".chat-window-toggle");
      if (toggleEl) {
        cleanupDragRef.current = makeToggleDraggable(toggleEl);
      } else {
        console.error("SupportChatWidget: pa jwenn .chat-window-toggle pou fè l deplasab");
      }
    }

    mountIfAuthenticated();

    return () => {
      cancelled = true;
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
      chatAppRef.current?.unmount();
      chatAppRef.current = null;
    };
  }, []);

  return null;
}
