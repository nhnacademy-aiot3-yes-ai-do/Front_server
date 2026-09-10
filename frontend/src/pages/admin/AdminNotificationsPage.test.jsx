import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNotificationChannel,
  deleteNotificationEvent,
  deleteNotificationTemplate,
  getNotificationChannels,
  getNotificationEvents,
  getNotificationTemplates,
  restoreNotificationChannel,
  saveNotificationChannel,
  saveNotificationEvent,
  saveNotificationTemplate,
} from "../../api/admin";
import AdminNotificationsPage from "./AdminNotificationsPage";

vi.mock("../../api/admin", () => ({
  deleteNotificationChannel: vi.fn(),
  deleteNotificationEvent: vi.fn(),
  deleteNotificationTemplate: vi.fn(),
  getNotificationChannels: vi.fn(),
  getNotificationEvents: vi.fn(),
  getNotificationTemplates: vi.fn(),
  restoreNotificationChannel: vi.fn(),
  saveNotificationChannel: vi.fn(),
  saveNotificationEvent: vi.fn(),
  saveNotificationTemplate: vi.fn(),
}));

const templates = [
  {
    id: 1,
    eventTypeId: 10,
    eventTypeCode: "HARVEST_COMPLETED",
    channelTypeId: 20,
    channelCode: "DISCORD",
    bodyTemplate: "수확이 완료되었습니다.",
    version: 1,
  },
  {
    id: 2,
    eventTypeId: 10,
    eventTypeCode: "HARVEST_COMPLETED",
    channelTypeId: 21,
    channelCode: "TELEGRAM",
    bodyTemplate: "수확이 완료되었습니다.",
    version: 1,
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/notification-events"]}>
        <AdminNotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getNotificationEvents.mockResolvedValue([]);
  getNotificationChannels.mockResolvedValue([
    { id: 20, code: "DISCORD", displayName: "Discord", deleted: false },
    { id: 21, code: "TELEGRAM", displayName: "Telegram", deleted: false },
  ]);
  getNotificationTemplates.mockResolvedValue(templates);
  deleteNotificationChannel.mockResolvedValue(null);
  deleteNotificationEvent.mockResolvedValue(null);
  deleteNotificationTemplate.mockResolvedValue(null);
  restoreNotificationChannel.mockResolvedValue(null);
  saveNotificationChannel.mockResolvedValue(null);
  saveNotificationEvent.mockResolvedValue(null);
  saveNotificationTemplate.mockResolvedValue(null);
});

describe("AdminNotificationsPage 템플릿 필터", () => {
  it("실제 React 관리자 화면에서 채널별 템플릿을 필터링한다", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: "템플릿" }));

    const filter = await screen.findByLabelText("템플릿 채널");
    await waitFor(() => expect(within(filter).getAllByRole("option")).toHaveLength(3));
    expect(screen.getAllByRole("row")).toHaveLength(3);

    fireEvent.change(filter, { target: { value: "DISCORD" } });

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    expect(within(screen.getByRole("table")).getByText("DISCORD")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("TELEGRAM")).not.toBeInTheDocument();
  });
});
