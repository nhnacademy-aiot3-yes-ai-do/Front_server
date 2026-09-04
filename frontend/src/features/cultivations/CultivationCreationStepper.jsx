import {Check} from "lucide-react";

const CREATION_STEPS = [
  { number: 1, label: "재배지 정보" },
  { number: 2, label: "환경 설정" },
  { number: 3, label: "센서 등록" },
];

export default function CultivationCreationStepper({ currentStep }) {
  return (
    <ol className="creation-stepper" aria-label="재배지 생성 단계">
      {CREATION_STEPS.map((step) => {
        const state =
          step.number < currentStep ? "done" : step.number === currentStep ? "active" : "";

        return (
          <li
            key={step.number}
            className={state ? `creation-stepper__step is-${state}` : "creation-stepper__step"}
            aria-current={step.number === currentStep ? "step" : undefined}
          >
            <span className="creation-stepper__number">
              {step.number < currentStep ? <Check aria-hidden="true" /> : step.number}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
