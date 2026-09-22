"""
اختبار الدخان الختامي (Final Ops Smoke Test — Steps 5 & 6)
يستدعي /api/transform/apply و /api/blend/apply و /api/frequency/fft
و /api/frequency/filter و /api/export/download على خادم حقيقي.
التشغيل: python smoke_test_final.py  (بعد تشغيل uvicorn main:app)
"""
import base64
import json
import sys
import urllib.request

import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:8000"


def make_test_image_b64() -> str:
    """صورة اصطناعية غنية بالتفاصيل (حواف + دوائر + تدرج) لاختبار FFT والتحويلات."""
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :] = (60, 60, 60)
    for x in range(160):
        img[:, x, 0] = int(x * 255 / 160)
    cv2.circle(img, (80, 60), 30, (0, 255, 255), -1)
    cv2.rectangle(img, (20, 20), (50, 100), (255, 255, 255), 2)
    noise = np.random.default_rng(7).integers(0, 60, (120, 160, 3), dtype=np.uint8)
    img = cv2.add(img, noise)
    ok, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf).decode()


def call_endpoint(path: str, payload: dict) -> dict:
    # تعطيل بروكسي النظام صراحة (urllib في ويندوز يقرأ بروكسي السجل)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with opener.open(req, timeout=60) as resp:
        return json.loads(resp.read())


def validate(name: str, data: dict, expect_prefix="data:image/png;base64,") -> bool:
    ok = (
        data.get("success") is True
        and isinstance(data.get("image"), str)
        and data["image"].startswith(expect_prefix)
        and isinstance(data.get("latency_ms"), (int, float))
        and isinstance(data.get("histogram"), dict)
    )
    print(f"  [{'PASS' if ok else 'FAIL'}] {name:<52} latency={data.get('latency_ms')}ms")
    return ok


def main() -> int:
    image = make_test_image_b64()

    overlay = np.full((40, 40, 3), 200, dtype=np.uint8)
    ok, obuf = cv2.imencode(".png", overlay)
    overlay_b64 = "data:image/png;base64," + base64.b64encode(obuf).decode()

    print("=== PixelMatrix Final Ops Smoke Test (Steps 5 & 6) ===")
    results = []

    # 1) التحويلات الهندسية: قص 1:1 + دوران ربعي + قلب
    t1 = call_endpoint("/api/transform/apply", {
        "image": image, "quarter_turns": 1, "flip": "h",
        "crop_x": 20, "crop_y": 10, "crop_w": 100, "crop_h": 100, "aspect": "1:1"
    })
    results.append(validate("POST /api/transform/apply (crop 1:1 + rot90 + flipH)", t1))

    # 2) التحويلات الهندسية: زاوية حرة
    t2 = call_endpoint("/api/transform/apply", {"image": image, "free_angle": 30})
    results.append(validate("POST /api/transform/apply (free angle 30°)", t2))

    # 3) المزج: لون صافٍ بنمط Multiply بشفافية 60%
    b1 = call_endpoint("/api/blend/apply", {
        "image": image, "overlay_type": "color", "color": "#0f1b2d",
        "mode": "multiply", "opacity": 0.6
    })
    results.append(validate("POST /api/blend/apply (color multiply 60%)", b1))

    # 4) المزج: طبقة صورة بنمط Difference
    b2 = call_endpoint("/api/blend/apply", {
        "image": image, "overlay_type": "image", "overlay_image": overlay_b64,
        "mode": "difference", "opacity": 1.0
    })
    results.append(validate("POST /api/blend/apply (image difference 100%)", b2))

    # 5) طيف فورييه
    f1 = call_endpoint("/api/frequency/fft", {"image": image})
    results.append(validate("POST /api/frequency/fft (magnitude spectrum)", f1))
    dc = f1.get("extra_data", {}).get("fft", {}).get("dc_magnitude")
    print(f"        └─ DC magnitude = {dc}")

    # 6) الترشيح الترددي: Gaussian Low-Pass و Ideal High-Pass
    fl1 = call_endpoint("/api/frequency/filter", {
        "image": image, "filter_type": "lowpass", "profile": "gaussian", "cutoff": 20
    })
    results.append(validate("POST /api/frequency/filter (gaussian LPF D0=20)", fl1))
    fl2 = call_endpoint("/api/frequency/filter", {
        "image": image, "filter_type": "highpass", "profile": "ideal", "cutoff": 25
    })
    results.append(validate("POST /api/frequency/filter (ideal HPF D0=25)", fl2))
    has_mask = isinstance(fl1.get("extra_data", {}).get("filter_mask"), str)
    print(f"        └─ filter_mask preview attached: {has_mask}")

    # 7) التصدير: PNG و JPEG بجودة 60
    e1 = call_endpoint("/api/export/download", {"image": image, "image_format": "png"})
    results.append(validate("POST /api/export/download (png lossless)", e1))
    print(f"        └─ size = {e1.get('extra_data', {}).get('file_size_bytes')} bytes")

    e2 = call_endpoint("/api/export/download", {"image": image, "image_format": "jpeg", "quality": 60})
    results.append(validate("POST /api/export/download (jpeg q60)", e2, expect_prefix="data:image/jpeg;base64,"))
    print(f"        └─ download_name = {e2.get('extra_data', {}).get('download_name')}")

    passed, total = sum(results), len(results)
    print(f"=== RESULT: {passed}/{total} final-ops endpoints passed ===")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
