import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, request } from "../../api/http";
import CultivationSensorSetupStep from "./CultivationSensorSetupStep";

vi.mock("../../api/http", () => ({
  jsonRequest: vi.fn(),
  request: vi.fn(),
  unwrapApiResponse: (response) => response,
}));

const customType = { id: 5, type: "SOIL_MOISTURE", valueUnit: "VWC" };
const temperatureTypes = [
  { id: 1, type: "TEMPERATURE", valueUnit: "°C" },
  { id: 2, type: "TEMPERATURE", valueUnit: "°F" },
];

function renderStep({
  reusableSensors = [],
  registeredSensors = [],
  sensorTypes = [customType],
  environmentSettings = [],
} = {}) {
  request.mockImplementation((path) => {
    if (path === "/cultivations/sensor-types") {
      return Promise.resolve({ sensorTypeInfoResponses: sensorTypes });
    }
    if (path === "/cultivations/reusable-sensors?exclude-cultivation-id=41") {
      return Promise.resolve({ sensors: reusableSensors });
    }
    return Promise.resolve(null);
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CultivationSensorSetupStep
        cultivationId={41}
        environmentSettings={environmentSettings}
        registeredSensors={registeredSensors}
        onRegistered={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

async function completeNewSensorForm() {
  fireEvent.change(screen.getByRole("textbox", { name: "센서 이름" }), {
    target: { value: "토양 센서" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "모델명" }), {
    target: { value: "SOIL-100" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "위치" }), {
    target: { value: "광주" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "상세 위치" }), {
    target: { value: "1번 선반" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "센서 고유번호" }), {
    target: { value: "EUI-SOIL-001" },
  });
  fireEvent.click(await screen.findByRole("checkbox", { name: "SOIL_MOISTURE (VWC)" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "SOIL_MOISTURE 최소 임계값" }), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "SOIL_MOISTURE 최대 임계값" }), {
    target: { value: "40" },
  });
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  jsonRequest.mockResolvedValue(null);
});

describe("CultivationSensorSetupStep", () => {
  it("가져올 기존 기기가 없으면 센서 입력 폼을 표시하지 않는다", async () => {
    renderStep();

    fireEvent.click(screen.getByRole("button", { name: "기존 기기에서 가져오기" }));

    expect(await screen.findByText("가져올 기존 센서가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "센서 이름" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "센서 등록" })).not.toBeInTheDocument();
  });

  it("새 기기의 필수 정보와 검증이 준비되기 전에는 등록 버튼을 비활성화한다", async () => {
    renderStep();

    await screen.findByRole("checkbox", { name: "SOIL_MOISTURE (VWC)" });

    expect(screen.getByRole("button", { name: "센서 등록" })).toBeDisabled();
  });

  it("현재 재배지에 이미 등록된 기기 고유번호는 다시 등록할 수 없다", async () => {
    renderStep({
      registeredSensors: [{ deviceEui: "EUI-SOIL-001", deviceName: "등록된 토양 센서" }],
    });
    await completeNewSensorForm();

    expect(screen.getByText("이 재배지에 이미 등록된 센서 고유번호입니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "센서 등록" })).toBeDisabled();
  });

  it("온도 단위는 하나만 선택하고 임계값을 선택 단위로 변환해 전송한다", async () => {
    renderStep({
      sensorTypes: temperatureTypes,
      environmentSettings: [{ sensorTypeId: 1, thresholdMin: 18.37, thresholdMax: 24.83 }],
    });

    fireEvent.change(screen.getByRole("textbox", { name: "센서 이름" }), {
      target: { value: "온도 센서" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "모델명" }), {
      target: { value: "TEMP-100" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "위치" }), {
      target: { value: "광주" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "상세 위치" }), {
      target: { value: "2번 선반" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "센서 고유번호" }), {
      target: { value: "EUI-TEMP-001" },
    });

    fireEvent.click(await screen.findByRole("checkbox", { name: "온도" }));
    expect(screen.getByRole("radio", { name: "온도 °C" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "온도 °F" }));

    expect(screen.getByRole("radio", { name: "온도 °C" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "온도 °F" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "온도 최소 임계값" })).toHaveValue(65.07);
    expect(screen.getByRole("spinbutton", { name: "온도 최대 임계값" })).toHaveValue(76.69);

    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));

    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith("/cultivations/41/sensors", "POST", {
        deviceEui: "EUI-TEMP-001",
        deviceModel: "TEMP-100",
        deviceName: "온도 센서",
        location: "광주",
        locationDetail: "2번 선반",
        sensorSettings: [{ sensorTypeId: 2, thresholdMin: 65.07, thresholdMax: 76.69 }],
      }),
    );
  });

  it("기존 기기의 고유번호는 잠금 상태가 시각적으로 구분된다", async () => {
    renderStep({
      reusableSensors: [
        {
          sourceCultivationId: 9,
          deviceEui: "EUI-OLD",
          deviceModel: "SOIL-OLD",
          deviceName: "기존 토양 센서",
          location: "광주",
          locationDetail: "기존 선반",
          sensorTypes: [{ sensorTypeId: 5, type: "SOIL_MOISTURE", valueUnit: "VWC" }],
        },
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: /기존 토양 센서/ }));

    expect(screen.getByRole("textbox", { name: "센서 고유번호" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "센서 고유번호" })).toHaveClass(
      "sensor-device-eui--locked",
    );
  });

  it("현재 재배지에 이미 등록된 기존 기기는 회색으로 표시하고 선택을 막는다", async () => {
    renderStep({
      registeredSensors: [{ deviceEui: "eui-old", deviceName: "현재 온도 센서" }],
      reusableSensors: [
        {
          sourceCultivationId: 9,
          deviceEui: "EUI-OLD",
          deviceModel: "TEMP-OLD",
          deviceName: "기존 온도 센서",
          location: "광주",
          locationDetail: "기존 선반",
          sensorTypes: [{ sensorTypeId: 5, type: "SOIL_MOISTURE", valueUnit: "VWC" }],
        },
      ],
    });

    const registeredDevice = await screen.findByRole("button", { name: /기존 온도 센서/ });

    expect(registeredDevice).toBeDisabled();
    expect(registeredDevice).toHaveClass("is-unavailable");
    expect(screen.getByText("이미 이 재배지에서 사용 중")).toBeInTheDocument();

    fireEvent.click(registeredDevice);
    expect(screen.queryByRole("textbox", { name: "센서 이름" })).not.toBeInTheDocument();
  });

  it("센서 등록이 완료되면 성공 안내를 표시하고 안내 위치로 이동한다", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    jsonRequest
      .mockResolvedValueOnce({ isValid: true, message: "등록 가능한 범위입니다." })
      .mockResolvedValueOnce(null);
    renderStep();
    await completeNewSensorForm();

    fireEvent.click(screen.getByRole("button", { name: "AI 범위 검증" }));
    await screen.findByText("등록 가능한 범위입니다.");
    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));

    expect(await screen.findByText("토양 센서 기기 등록이 완료되었습니다.")).toBeInTheDocument();
    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }),
    );
  });

  it("AI가 권장 범위 밖으로 판단하면 경고 확인 후 센서를 등록한다", async () => {
    jsonRequest.mockResolvedValueOnce({ isValid: false, message: "AI 권장 범위를 벗어났습니다." });
    renderStep();
    await completeNewSensorForm();

    fireEvent.click(screen.getByRole("button", { name: "AI 범위 검증" }));
    expect(await screen.findByText("AI 권장 범위를 벗어났습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "센서 등록" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));
    expect(await screen.findByRole("dialog", { name: "AI 검증 경고" })).toBeInTheDocument();
    expect(jsonRequest).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "경고 확인 후 등록" }));
    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith("/cultivations/41/sensors", "POST", {
        deviceEui: "EUI-SOIL-001",
        deviceModel: "SOIL-100",
        deviceName: "토양 센서",
        location: "광주",
        locationDetail: "1번 선반",
        sensorSettings: [{ sensorTypeId: 5, thresholdMin: 20, thresholdMax: 40 }],
      }),
    );
  });

  it("AI 검증 요청이 실패해도 경고 확인 후 센서를 등록할 수 있다", async () => {
    jsonRequest
      .mockRejectedValueOnce(new Error("AI 검증 서버에 연결할 수 없습니다."))
      .mockResolvedValueOnce(null);
    renderStep();
    await completeNewSensorForm();

    fireEvent.click(screen.getByRole("button", { name: "AI 범위 검증" }));
    expect(await screen.findByText("AI 검증 서버에 연결할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "센서 등록" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "센서 등록" }));
    expect(await screen.findByRole("dialog", { name: "AI 검증 경고" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "경고 확인 후 등록" }));
    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith(
        "/cultivations/41/sensors",
        "POST",
        expect.objectContaining({ deviceEui: "EUI-SOIL-001" }),
      ),
    );
  });
});
