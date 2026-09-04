import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";
import { normalizeList } from "../../utils/formatters";

const welcomeMessage = {
  id: "welcome",
  role: "ASSISTANT",
  content: "안녕하세요! 재배 환경과 버섯 관리에 대해 궁금한 점을 물어보세요.",
};

export default function ChatPanel({ cultivationId }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const historyQuery = useQuery({
    queryKey: ["chat-history", cultivationId],
    queryFn: () =>
      request(`/api/chat/history?cultivationId=${cultivationId}`).then(unwrapApiResponse),
    retry: 1,
  });

  const history = normalizeList(historyQuery.data);
  const visibleMessages = messages.length > 0 ? messages : history;

  const sendMessage = async (event) => {
    event.preventDefault();
    const input = inputRef.current;
    const message = input?.value.trim();
    if (!message || sending) return;

    const baseMessages = visibleMessages;
    const userMessage = { id: `user-${Date.now()}`, role: "USER", content: message };
    setMessages([...baseMessages, userMessage]);
    input.value = "";
    setSending(true);
    setNotice(null);
    try {
      const response = await jsonRequest("/api/chat", "POST", {
        conversationId,
        cultivationId,
        message,
        channelId: 1,
      }).then(unwrapApiResponse);
      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${response.sequenceNumber || Date.now()}`,
          role: response.role || "ASSISTANT",
          content: response.reply,
        },
      ]);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setSending(false);
      input?.focus();
    }
  };

  return (
    <section className="panel-card chat-panel">
      <header className="panel-card__heading">
        <div>
          <h2>MushMush AI 챗봇</h2>
          <p>현재 재배지 정보를 바탕으로 질문할 수 있습니다.</p>
        </div>
      </header>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="chat-messages" aria-live="polite">
        {[welcomeMessage, ...visibleMessages].map((message) => (
          <div
            className={`chat-message ${message.role === "USER" ? "chat-message--user" : ""}`}
            key={message.id || `${message.sequenceNumber}-${message.createdAt}`}
          >
            {message.role !== "USER" && (
              <img src="/images/chatbot.png" alt="봇" className="chat-avatar" />
            )}
            <p>{message.content}</p>
          </div>
        ))}
        {historyQuery.isLoading && <p className="chat-status">이전 대화를 불러오는 중…</p>}
        {sending && <p className="chat-status">답변을 생각하고 있어요…</p>}
      </div>
      <form className="chat-input" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="cultivation-chat-input">
          챗봇 메시지
        </label>
        <input
          ref={inputRef}
          id="cultivation-chat-input"
          autoComplete="off"
          maxLength="1000"
          placeholder="재배 관련 질문을 입력하세요"
        />
        <button className="button button--primary" type="submit" disabled={sending}>
          <Send aria-hidden="true" /> 전송
        </button>
      </form>
    </section>
  );
}
