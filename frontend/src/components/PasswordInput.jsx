import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보이기"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
