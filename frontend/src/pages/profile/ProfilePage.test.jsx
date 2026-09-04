import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as http from "../../api/http";
import ProfilePage from "./ProfilePage";

vi.mock("../../api/http", () => ({
  request: vi.fn(),
  jsonRequest: vi.fn(),
  unwrapApiResponse: vi.fn((res) => (res && Object.hasOwn(res, "data") ? res.data : res)),
}));

const mockProfile = {
  email: "testuser@example.com",
  nickname: "테스트유저",
  photoUrl: "https://yes-nhn.site/storage-proxy/profiles/1/avatar.jpg",
  hasPassword: true,
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-03-01T12:00:00Z",
};

function renderProfilePage(profileData = mockProfile) {
  vi.mocked(http.request).mockImplementation((path) => {
    if (path === "/users/mypage") {
      return Promise.resolve({ data: profileData });
    }
    return Promise.resolve({ data: null });
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("프로필 정보를 정상적으로 불러와 닉네임, 이메일, 프로필 사진을 표시한다", async () => {
    renderProfilePage();

    expect(await screen.findByRole("heading", { name: "테스트유저" })).toBeInTheDocument();
    expect(screen.getByText("testuser@example.com")).toBeInTheDocument();

    const img = screen.getByAltText("현재 프로필");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockProfile.photoUrl);
  });

  it("허용되지 않은 파일 형식의 이미지를 선택하면 오류 메시지를 표시한다", async () => {
    renderProfilePage();

    await screen.findByRole("heading", { name: "테스트유저" });

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    const invalidFile = new File(["dummy"], "document.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(
      await screen.findByText("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."),
    ).toBeInTheDocument();
    expect(http.request).not.toHaveBeenCalledWith("/users/mypage/profile-image", expect.anything());
  });

  it("올바른 이미지 파일을 업로드하면 PUT /users/mypage/profile-image 요청을 전송한다", async () => {
    vi.mocked(http.request).mockImplementation((path, options) => {
      if (path === "/users/mypage/profile-image" && options?.method === "PUT") {
        return Promise.resolve({ data: "https://yes-nhn.site/storage-proxy/new.jpg" });
      }
      return Promise.resolve({ data: mockProfile });
    });

    renderProfilePage();

    await screen.findByRole("heading", { name: "테스트유저" });

    const fileInput = document.querySelector('input[type="file"]');
    const validFile = new File(["valid image"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(http.request).toHaveBeenCalledWith(
        "/users/mypage/profile-image",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    expect(await screen.findByText("프로필 사진을 변경했습니다.")).toBeInTheDocument();
  });

  it("회원정보 수정 모달에서 닉네임을 변경하고 저장하면 PUT /users/mypage 요청을 전송한다", async () => {
    vi.mocked(http.jsonRequest).mockResolvedValue({
      data: { ...mockProfile, nickname: "새닉네임" },
    });

    renderProfilePage();

    await screen.findByRole("heading", { name: "테스트유저" });

    // 1. 회원정보 수정 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: /회원정보 수정/ }));

    // 2. 모달 열림 확인
    expect(await screen.findByText("닉네임을 수정할 수 있어요.")).toBeInTheDocument();

    // 3. 새 닉네임 입력 및 저장
    const nicknameInput = screen.getByLabelText("닉네임");
    fireEvent.change(nicknameInput, { target: { value: "새닉네임" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    // 4. PUT 요청 검증
    await waitFor(() => {
      expect(http.jsonRequest).toHaveBeenCalledWith(
        "/users/mypage",
        "PUT",
        expect.objectContaining({ nickname: "새닉네임" }),
      );
    });

    expect(await screen.findByText("프로필을 수정했습니다.")).toBeInTheDocument();
  });
});
