// OKLCH 변환 유틸 (Björn Ottosson의 OKLab 공식 기반)
function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

function rgbToOklch([r, g, b]) {
  const lr = srgbToLinear(r),
    lg = srgbToLinear(g),
    lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToRgb([L, C, H]) {
  const hRad = (H * Math.PI) / 180;
  const a = Math.cos(hRad) * C;
  const b = Math.sin(hRad) * C;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bl)];
}

// 색상(Hue)은 원형이라 최단 방향으로 보간해야 함
function lerpHue(h1, h2, t) {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (h1 + diff * t + 360) % 360;
}

// stops: [{ at: number(0~100), rgb: [r, g, b] }, ...]
// percent가 속한 두 지점 사이를 OKLCH(L·C·H) 공간에서 보간해 "rgb(r, g, b)" 문자열을 반환한다.
// RGB 채널별 선형보간과 달리 색상 전환 구간(예: gold -> green)에서 채도가 빠지는 탁한 색을 피할 수 있다.
export function interpolateComplianceColor(percent, stops) {
  const p = Math.max(0, Math.min(100, percent));

  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (p >= stops[i].at && p <= stops[i + 1].at) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const t = upper.at === lower.at ? 0 : (p - lower.at) / (upper.at - lower.at);

  const [l1, c1, h1] = rgbToOklch(lower.rgb);
  const [l2, c2, h2] = rgbToOklch(upper.rgb);

  const L = l1 + (l2 - l1) * t;
  const C = c1 + (c2 - c1) * t;
  const H = lerpHue(h1, h2, t);

  const [r, g, b] = oklchToRgb([L, C, H]);
  return `rgb(${r}, ${g}, ${b})`;
}
