import { useQueries } from "@tanstack/react-query";
import { Bell, Cpu, MessageSquare, Package, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getAdminInquiries,
  getAdminMembers,
  getAdminMushrooms,
  getAdminSensorTypes,
  getNotificationEvents,
} from "../../api/admin";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { formatDate } from "../../utils/formatters";

const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

function todayLabel() {
  const today = new Date();
  return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${dayNames[today.getDay()]})`;
}

export default function AdminDashboardPage() {
  const [membersQuery, inquiriesQuery, mushroomsQuery, sensorsQuery, eventsQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin", "members", "dashboard"],
        queryFn: () => getAdminMembers({ size: 4 }),
      },
      {
        queryKey: ["admin", "inquiries", "dashboard"],
        queryFn: () => getAdminInquiries({ status: "PENDING", size: 4 }),
      },
      { queryKey: ["admin", "mushrooms"], queryFn: getAdminMushrooms },
      { queryKey: ["admin", "sensor-types"], queryFn: getAdminSensorTypes },
      { queryKey: ["admin", "notification-events"], queryFn: getNotificationEvents },
    ],
  });

  const pendingCount = inquiriesQuery.data?.totalElements || 0;
  const stats = [
    { label: "전체 회원", value: membersQuery.data?.totalElements, icon: Users },
    { label: "미답변 문의", value: inquiriesQuery.data?.totalElements, icon: MessageSquare },
    { label: "버섯 종류", value: mushroomsQuery.data?.length, icon: Package },
    { label: "센서 타입", value: sensorsQuery.data?.length, icon: Cpu },
    { label: "알림 이벤트", value: eventsQuery.data?.length, icon: Bell },
  ];

  return (
    <div className="admin-page admin-dashboard">
      <AdminPageHeader
        title="안녕하세요, 관리자님"
        description="MushMush 플랫폼의 주요 현황을 한눈에 확인하세요."
        action={<time>{todayLabel()}</time>}
      />
      <section className="admin-dashboard-hero">
        <div>
          <p>오늘 확인할 항목</p>
          <h2>
            {inquiriesQuery.isLoading
              ? "미답변 문의를 확인하고 있습니다."
              : pendingCount > 0
                ? `답변을 기다리는 문의가 ${pendingCount}건 있습니다.`
                : "답변을 기다리는 문의가 없습니다."}
          </h2>
          <span>회원·문의·기준정보는 왼쪽 메뉴에서 관리할 수 있습니다.</span>
        </div>
        <Link className="admin-primary-button" to="/admin/inquiries">
          <MessageSquare aria-hidden="true" /> 문의 확인하기
        </Link>
      </section>
      <section className="admin-stat-grid" aria-label="관리 현황">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>{value ?? "-"}</strong>
              <p>{label}</p>
            </div>
          </article>
        ))}
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-summary-panel">
          <header>
            <div>
              <h2>최근 미답변 문의</h2>
              <p>빠른 확인이 필요한 문의입니다.</p>
            </div>
            <Link to="/admin/inquiries">전체 보기</Link>
          </header>
          {inquiriesQuery.isError && (
            <button
              className="admin-inline-retry"
              type="button"
              onClick={() => inquiriesQuery.refetch()}
            >
              문의를 불러오지 못했습니다. 다시 시도
            </button>
          )}
          {!inquiriesQuery.isError && !inquiriesQuery.data?.content?.length && (
            <p className="admin-summary-empty">미답변 문의가 없습니다.</p>
          )}
          <ul className="admin-summary-list">
            {(inquiriesQuery.data?.content || []).map((inquiry) => (
              <li key={inquiry.id}>
                <Link to={`/admin/inquiries?open=${inquiry.id}`}>
                  <span>{inquiry.categoryName}</span>
                  <strong>{inquiry.title}</strong>
                  <small>
                    {inquiry.userNickname} · {formatDate(inquiry.createdAt)}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-summary-panel">
          <header>
            <div>
              <h2>최근 가입 회원</h2>
              <p>새로 함께한 회원입니다.</p>
            </div>
            <Link to="/admin/members">전체 보기</Link>
          </header>
          {membersQuery.isError && (
            <button
              className="admin-inline-retry"
              type="button"
              onClick={() => membersQuery.refetch()}
            >
              회원을 불러오지 못했습니다. 다시 시도
            </button>
          )}
          {!membersQuery.isError && !membersQuery.data?.content?.length && (
            <p className="admin-summary-empty">최근 가입한 회원이 없습니다.</p>
          )}
          <ul className="admin-summary-list admin-member-summary-list">
            {(membersQuery.data?.content || []).map((member) => (
              <li key={member.userId}>
                <span className="admin-list-avatar" aria-hidden="true">
                  {member.nickname?.slice(0, 1) || "회"}
                </span>
                <div>
                  <strong>{member.nickname}</strong>
                  <small>{member.email}</small>
                </div>
                <time>{formatDate(member.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
