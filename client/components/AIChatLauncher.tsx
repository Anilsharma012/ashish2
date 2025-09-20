import React, { useEffect, useState, useRef } from "react";

export default function AIChatLauncher(): JSX.Element {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth <= 640 : true,
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { id: string; text: string; from: "user" | "ai" }[]
  >([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    // @ts-ignore
    mql.addEventListener?.("change", onChange);
    // fallback for older browsers
    // @ts-ignore
    mql.addListener?.(onChange);
    setIsMobile(mql.matches);
    return () => {
      // @ts-ignore
      mql.removeEventListener?.("change", onChange);
      // @ts-ignore
      mql.removeListener?.(onChange);
    };
  }, []);

  useEffect(() => {
    // simple focus management: focus input when panel opens
    if (isChatOpen) {
      const el = panelRef.current?.querySelector(
        "input[type='text']",
      ) as HTMLInputElement | null;
      el?.focus();
      // analytics event
      try {
        const elBtn = document.querySelector('[data-event="chat_open"]');
        elBtn?.dispatchEvent(new CustomEvent("ai_chat_open"));
      } catch {}
    }
  }, [isChatOpen]);

  const toggleChat = () => {
    setIsChatOpen((s) => {
      const next = !s;
      try {
        const ev = next ? "chat_open" : "chat_close";
        const el = document.querySelector(`[data-event=\"${ev}\"]`);
        // attach attribute to button for analytics; just log
        console.log("AI Chat event:", ev);
      } catch {}
      return next;
    });
  };

  const handleBackdropClick = () => {
    setIsChatOpen(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const id = String(Date.now());
    setMessages((m) => [...m, { id, text: input.trim(), from: "user" }]);
    setInput("");
    // analytics attribute
    const sendBtn = document.querySelector('[data-event="chat_send"]');
    sendBtn?.dispatchEvent(new CustomEvent("ai_chat_send"));

    // placeholder AI reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: id + "-ai",
          text: "(AI placeholder) Thanks — I received: " + input.trim(),
          from: "ai",
        },
      ]);
    }, 700);
  };

  // compute transform style depending on mobile/desktop
  const drawerStyle: React.CSSProperties = (() => {
    if (isChatOpen) return { transform: "translateX(0) translateY(0)" };
    // closed
    return isMobile
      ? { transform: "translateY(100%)" }
      : { transform: "translateX(100%)" };
  })();

  return (
    <>
      {/* Floating Button */}
      <div
        data-event="chat_open"
        onClick={toggleChat}
        aria-label="Open AI chat"
        title="Chat with AI"
        className="fixed bottom-4 right-4 w-[52px] h-[52px] rounded-full grid place-items-center cursor-pointer"
        style={{
          background: "#C70000",
          boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
          zIndex: 9999,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
            stroke="#fff"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Backdrop */}
      {isChatOpen && (
        <div
          onClick={handleBackdropClick}
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 9998,
          }}
        />
      )}

      {/* Drawer */}
      <div
        ref={panelRef}
        id="ai-chat-drawer"
        role="dialog"
        aria-hidden={!isChatOpen}
        style={{
          position: "fixed",
          right: 0,
          top: isMobile ? "auto" : 0,
          bottom: isMobile ? 0 : "auto",
          zIndex: 9999,
          width: isMobile ? "100vw" : 360,
          maxWidth: "100vw",
          height: isMobile ? "75vh" : "70vh",
          background: "#fff",
          borderTopLeftRadius: isMobile ? 16 : 16,
          borderTopRightRadius: isMobile ? 16 : 0,
          borderBottomLeftRadius: isMobile ? 0 : 0,
          boxShadow: "-12px 0 32px rgba(0,0,0,0.15)",
          transform: drawerStyle.transform,
          transition: "transform .25s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 600 }}>Chat with AI</div>
          <button
            aria-label="Close chat"
            data-event="chat_close"
            onClick={() => setIsChatOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="#111827"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Body (messages area + input) */}
        <div
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            id="ai-chat-frame"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 8,
              borderRadius: 8,
              background: "#FAFAFA",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: "#6B7280" }}>
                Hi — this is your AI chat. Type a message and press Send.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent:
                      m.from === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      background: m.from === "user" ? "#C70000" : "#fff",
                      color: m.from === "user" ? "#fff" : "#111827",
                      padding: "8px 12px",
                      borderRadius: 12,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      maxWidth: "80%",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              aria-label="Type your message"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.08)",
                outline: "none",
              }}
            />
            <button
              data-event="chat_send"
              onClick={handleSend}
              style={{
                background: "#C70000",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
