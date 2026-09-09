import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";
import { normalizeList } from "../../utils/formatters";

const welcomeMessage = {
  id: "welcome",
  role: "ASSISTANT",
  content: "안녕하세요! 재배 환경과 버섯 관리에 대해 궁금한 점을 물어보세요.",
};

export default function ChatPanel({ cultivationId }) {
  const queryClient = useQueryClient(); // 👈 1. queryClient 추가
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const requestGenerationRef = useRef(0);

  // cultivationId 변경 또는 화면 이탈 시 세션 초기화 및 이전 비동기 요청 무효화
  useEffect(() => {
    requestGenerationRef.current += 1;
    setConversationId(null);
    setMessages([]);
    setNotice(null);
    setSending(false);

    // 화면을 나갈 때 진행 중이던 요청 무효화
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [cultivationId]);

  const historyQuery = useQuery({
    queryKey: ["chat-history", cultivationId],
    queryFn: () =>
        request(`/api/chat/history?cultivationId=${cultivationId}`).then(unwrapApiResponse),
    enabled: Boolean(cultivationId), // id가 있을 때만 호출하도록 가드 추가
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

    const currentGeneration = requestGenerationRef.current;

    try {
      const response = await jsonRequest("/api/chat", "POST", {
        conversationId,
        cultivationId,
        message,
        channelId: 1,
      }).then(unwrapApiResponse);

      if (currentGeneration !== requestGenerationRef.current) {
        return;
      }

      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${response.sequenceNumber || Date.now()}`,
          role: response.role || "ASSISTANT",
          content: response.reply,
        },
      ]);
      // 새 대화가 DB에 저장되었으므로 캐시 갱신
      await queryClient.invalidateQueries({ queryKey: ["chat-history", cultivationId] }); // 👈 await 추가!
    } catch (error) {
      if (currentGeneration !== requestGenerationRef.current) {
        return;
      }
      setNotice({ type: "error", message: error.message });
    } finally {
      // 이전 요청이거나 언마운트된 경우 실행되지 않도록 조건문 감싸기
      if (currentGeneration === requestGenerationRef.current) {
        setSending(false);
        input?.focus();
      }
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
