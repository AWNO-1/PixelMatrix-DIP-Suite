"""
اختبار الدخان الشامل لمسارات الفلاتر المكانية (Spatial API Smoke Test)
يستدعي نقاط النهاية الست جميعها على خادم حقيقي ويتحقق من الاستجابات.
التشغيل: python smoke_test_spatial_api.py  (بعد تشغيل uvicorn main:app)
"""
import base64
import json
import sys
import urllib.request

import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:8000"


def make_test_image_b64() -> str:
    """إنشاء صورة اختبارية اصطناعية (تدرج + دوائر + حواف حادة) وترميزها Base64."""
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :] = (60, 60, 60)
    # تدرج أفقي لاختبار مشتقات سوبل
    for x in range(160):
        img[:, x, 0] = int(x * 255 / 160)
    # دائرة ساطعة لاختبار كاشف كاني
    cv2.circle(img, (80, 60), 30, (0, 255, 255), -1)
    cv2.rectangle(img, (20, 20), (50, 100), (255, 255, 255), 2)
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise RuntimeError("فشل ترميز صورة الاختبار")
    return "data:image/png;base64," + base64.b64encode(buf).decode()


def call_endpoint(path: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def validate(name: str, data: dict) -> bool:
    ok = (
        data.get("success") is True
        and isinstance(data.get("image"), str)
        and data["image"].startswith("data:image/png;base64,")
        and isinstance(data.get("latency_ms"), (int, float))
        and isinstance(data.get("histogram"), dict)
        and "r" in data["histogram"]
        and len(data["histogram"]["r"]) == 32
        and data.get("dimensions", {}).get("width") == 160
    )
    print(f"  [{'PASS' if ok else 'FAIL'}] {name:<38} latency={data.get('latency_ms')}ms")
    return ok


def main() -> int:
    image = make_test_image_b64()
    cases = [
        ("/api/spatial/blur", {"image": image, "blur_type": "gaussian", "ksize": 5, "sigma": 1.5}, "POST /api/spatial/blur (gaussian)"),
        ("/api/spatial/blur", {"image": image, "blur_type": "median", "ksize": 5}, "POST /api/spatial/blur (median)"),
        ("/api/spatial/blur", {"image": image, "blur_type": "mean", "ksize": 7}, "POST /api/spatial/blur (mean)"),
        ("/api/spatial/bilateral", {"image": image, "d": 9, "sigma_color": 75, "sigma_space": 75}, "POST /api/spatial/bilateral"),
        ("/api/spatial/sharpen", {"image": image, "amount": 1.5, "method": "unsharp"}, "POST /api/spatial/sharpen (unsharp)"),
        ("/api/spatial/sharpen", {"image": image, "amount": 1.0, "method": "laplacian"}, "POST /api/spatial/sharpen (laplacian)"),
        ("/api/spatial/sobel", {"image": image, "direction": "magnitude", "ksize": 3}, "POST /api/spatial/sobel (magnitude)"),
        ("/api/spatial/canny", {"image": image, "threshold1": 50, "threshold2": 150}, "POST /api/spatial/canny"),
        ("/api/spatial/custom-kernel", {"image": image, "kernel": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], "bias": 0, "normalize": False}, "POST /api/spatial/custom-kernel (sharpen)"),
        ("/api/spatial/custom-kernel", {"image": image, "kernel": [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], "bias": 128, "normalize": False}, "POST /api/spatial/custom-kernel (emboss+bias)"),
    ]

    print("=== PixelMatrix Spatial API Smoke Test ===")
    results = [validate(label, call_endpoint(path, payload)) for path, payload, label in cases]
    passed, total = sum(results), len(results)
    print(f"=== RESULT: {passed}/{total} endpoints passed ===")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
