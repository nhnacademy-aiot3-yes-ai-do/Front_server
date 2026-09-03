import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCultivation, getMushroomGuide } from "../../api/cultivations";
import { jsonRequest, request } from "../../api/http";
import CultivationCreatePage from "./CultivationCreatePage";

vi.mock("../../api/cultivations", () => ({
  createCultivation: vi.fn(),
  cultivationKeys: {
    guide: (mushroomId) => ["cultivations", "mushroom-guide", Number(mushroomId)],
  },
  getMushroomGuide: vi.fn(),
}));

vi.mock("../../api/http", () => ({
  jsonRequest: vi.fn(),
  request: vi.fn(),
}));

const sensorTypes = [
  { id: 1, type: "TEMPERATURE", valueUnit: "°C" },
  { id: 2, type: "HUMIDITY", valueUnit: "%" },
  { id: 3, type: "CO2", valueUnit: "ppm" },
  { id: 4, type: "LIGHT", valueUnit: "lux" },
];

function mushroom(id, name) {
  return {
    id,
    mushroomNameKo: name,
    thresholdInfoResponses: sensorTypes.map((sensorType) => ({
      thresholdType: "GROWTH",
      sensorType,
    })),
  };
}

function guide(temperatureMin, temperatureMax) {
  return {
    cultivationCondition: {
      temperature: { min: temperatureMin, max: temperatureMax },
      humidity: { min: 80, max: 90 },
      co2: { min: 800, max: 1500 },
      light: { min: 100, max: 500 },
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CultivationCreatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function moveToEnvironmentStep(mushroomId = "1") {
  fireEvent.change(await screen.findByRole("textbox", { name: "재배지 이름" }), {
    target: { value: "느타리 1번 재배지" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "버섯 종류" }), {
    target: { value: mushroomId },
  });
  fireEvent.click(screen.getByRole("button", { name: "다음: 환경 설정" }));

  await screen.findByRole("heading", { name: "AI 추천 환경을 확인해 주세요" });
  await screen.findByRole("spinbutton", { name: "온도 최소값" });
}

beforeEach(() => {
  vi.clearAllMocks();
  request.mockImplementation((path) => {
    if (path === "/cultivations/mushroom-references") {
      return Promise.resolve({
        mushroomReferenceInfoResponses: [mushroom(1, "느타리버섯"), mushroom(2, "양송이버섯")],
      });
    }
    if (path === "/cultivations/sensor-types") {
      return Promise.resolve({ sensorTypeInfoResponses: sensorTypes });
    }
    if (path === "/cultivations/reusable-sensors?exclude-cultivation-id=41") {
      return Promise.resolve({ sensors: [] });
    }
    return Promise.resolve(null);
  });
  createCultivation.mockResolvedValue({ cultivationId: 41 });
  jsonRequest.mockResolvedValue(null);
});

afterEach(cleanup);

describe("CultivationCreatePage", () => {
  it("새 추천값을 조회하는 동안 기존 임계값 영역의 높이를 유지한다", async () => {
    let resolveButtonGuide;
    const buttonGuide = new Promise((resolve) => {
      resolveButtonGuide = resolve;
    });

    getMushroomGuide.mockImplementation((mushroomId) =>
      Number(mushroomId) === 1 ? Promise.resolve(guide(18, 24)) : buttonGuide,
    );

    renderPage();
    await moveToEnvironmentStep();
    expect(await screen.findByDisplayValue("18")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    const mushroomSelect = screen.getByRole("combobox", { name: "버섯 종류" });
    fireEvent.change(mushroomSelect, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "다음: 환경 설정" }));

    expect(screen.getByDisplayValue("18")).toBeInTheDocument();
    expect(screen.getByText("추천값 불러오는 중")).toBeInTheDocument();

    await act(async () => resolveButtonGuide(guide(20, 25)));
    await waitFor(() => expect(screen.getByDisplayValue("20")).toBeInTheDocument());
  });

  it("추천 환경으로 재배지를 생성한 뒤 센서 등록 단계로 이동한다", async () => {
    getMushroomGuide.mockResolvedValue(guide(18, 24));

    renderPage();
    await moveToEnvironmentStep();

    fireEvent.click(screen.getByRole("button", { name: "재배지 생성 후 센서 등록" }));

    await waitFor(() =>
      expect(createCultivation).toHaveBeenCalledWith({
        name: "느타리 1번 재배지",
        mushroomId: 1,
        environmentSettingRequests: [
          { sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 },
          { sensorTypeId: 2, thresholdMin: 80, thresholdMax: 90 },
          { sensorTypeId: 3, thresholdMin: 800, thresholdMax: 1500 },
          { sensorTypeId: 4, thresholdMin: 100, thresholdMax: 500 },
        ],
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "사용할 센서를 등록해 주세요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("느타리 1번 재배지가 생성되었습니다.")).toBeInTheDocument();
  });

  it("추천 범위를 벗어나면 확인 경고 후 사용자가 생성을 계속할 수 있다", async () => {
    getMushroomGuide.mockResolvedValue(guide(18, 24));

    renderPage();
    await moveToEnvironmentStep();

    fireEvent.click(screen.getByRole("checkbox", { name: "수동 설정" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "온도 최소값" }), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "재배지 생성 후 센서 등록" }));

    expect(await screen.findByRole("dialog", { name: "추천 범위 확인" })).toBeInTheDocument();
    expect(createCultivation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "그래도 생성" }));
    await waitFor(() => expect(createCultivation).toHaveBeenCalledTimes(1));
  });

  it("센서 범위 형식이 잘못되면 입력 카드에 오류를 표시하고 생성을 막는다", async () => {
    getMushroomGuide.mockResolvedValue(guide(18, 24));

    renderPage();
    await moveToEnvironmentStep();

    fireEvent.click(screen.getByRole("checkbox", { name: "수동 설정" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "습도 최대값" }), {
      target: { value: "-92" },
    });

    expect(screen.getByText("최소값은 최대값보다 작아야 합니다.")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "재배지 생성 후 센서 등록" })).toBeDisabled();
    expect(createCultivation).not.toHaveBeenCalled();
  });

  it("3단계에서 추천 임계값을 적용한 센서를 등록해야 완료할 수 있다", async () => {
    getMushroomGuide.mockResolvedValue(guide(18, 24));

    renderPage();
    await moveToEnvironmentStep();
    fireEvent.click(screen.getByRole("button", { name: "재배지 생성 후 센서 등록" }));

    await screen.findByRole("heading", { name: "사용할 센서를 등록해 주세요" });
    expect(screen.getByRole("button", { name: "설정 완료" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "센서 이름" }), {
      target: { value: "온습도 센서 A" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "모델명" }), {
      target: { value: "TH-100" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "위치" }), {
      target: { value: "광주" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "상세 위치" }), {
      target: { value: "1번 선반" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "센서 고유번호" }), {
      target: { value: "EUI-001" },
    });
    fireEvent.click(await screen.findByRole("checkbox", { name: "온도 (°C)" }));
    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));

    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith("/cultivations/41/sensors", "POST", {
        deviceEui: "EUI-001",
        deviceModel: "TH-100",
        deviceName: "온습도 센서 A",
        location: "광주",
        locationDetail: "1번 선반",
        sensorSettings: [{ sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 }],
      }),
    );
    expect(screen.getByRole("button", { name: "설정 완료" })).toBeEnabled();
  });

  it("기존 센서를 선택하면 EUI를 잠그고 선택한 타입에 현재 재배지 임계값을 적용한다", async () => {
    getMushroomGuide.mockResolvedValue(guide(18, 24));
    request.mockImplementation((path) => {
      if (path === "/cultivations/mushroom-references") {
        return Promise.resolve({
          mushroomReferenceInfoResponses: [mushroom(1, "느타리버섯")],
        });
      }
      if (path === "/cultivations/sensor-types") {
        return Promise.resolve({ sensorTypeInfoResponses: sensorTypes });
      }
      if (path === "/cultivations/reusable-sensors?exclude-cultivation-id=41") {
        return Promise.resolve({
          sensors: [
            {
              sourceCultivationId: 9,
              deviceEui: "EUI-OLD",
              deviceModel: "TH-OLD",
              deviceName: "기존 온도 센서",
              location: "서울",
              locationDetail: "이전 선반",
              sensorTypes: [{ sensorTypeId: 1, type: "TEMPERATURE", valueUnit: "°C" }],
            },
          ],
        });
      }
      return Promise.resolve(null);
    });

    renderPage();
    await moveToEnvironmentStep();
    fireEvent.click(screen.getByRole("button", { name: "재배지 생성 후 센서 등록" }));

    fireEvent.click(await screen.findByRole("button", { name: /기존 온도 센서/ }));
    expect(screen.getByRole("textbox", { name: "센서 고유번호" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));

    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith("/cultivations/41/sensors", "POST", {
        deviceEui: "EUI-OLD",
        deviceModel: "TH-OLD",
        deviceName: "기존 온도 센서",
        location: "서울",
        locationDetail: "이전 선반",
        sensorSettings: [{ sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 }],
      }),
    );
  });
});
