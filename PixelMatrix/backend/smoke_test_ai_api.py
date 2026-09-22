"""
اختبار الدخان لمسارات الذكاء الاصطناعي (AI Ops Smoke Test)
يستدعي /api/ai/remove-bg و /api/ai/composite-product على خادم حقيقي.
التشغيل: python smoke_test_ai_api.py  (بعد تشغيل uvicorn main:app)
"""
import base64
import json
import sys
import urllib.request

import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:8000"
# صورة منتج حقيقية (الأهم للنموذج العصبي) مع بديل اصطناعي عند غياب الشبكة
SAMPLE_URL = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"


def fetch_image_b64() -> str:
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        req = urllib.request.Request(SAMPLE_URL, headers={"User-Agent": "Mozilla/5.0"})
        with opener.open(req, timeout=25) as resp:
            data = resp.read()
        b64 = base64.b64encode(data).decode()
        # اكتشاف الصيغة من البايتات الأولى (JPEG/PNG)
        mime = "image/jpeg" if data[:3] == b"\xff\xd8\xff" else "image/png"
        print(f"  [i] Sample image fetched: {len(data)} bytes ({mime})")
        return f"data:{mime};base64,{b64}"
    except Exception as e:
        print(f"  [!] URL fetch failed ({e}) — falling back to synthetic image")
        img = np.zeros((200, 200, 3), np.uint8)
        img[:, :] = (90, 90, 90)
        cv2.circle(img, (100, 100), 60, (30, 180, 240), -1)
        ok, buf = cv2.imencode(".png", img)
        return "data:image/png;base64," + base64.b64encode(buf).decode()


def call_endpoint(path: str, payload: dict) -> dict:
    # تعطيل بروكسي النظام صراحة: urllib في ويندوز يقرأ بروكسي السجل
    # ويعيد توجيه طلبات localhost إليه فيفشل الاتصال المحلي
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with opener.open(req, timeout=120) as resp:
        return json.loads(resp.read())


def validate_remove_bg(data: dict) -> bool:
    ok = (
        data.get("success") is True
        and isinstance(data.get("image"), str)
        and data["image"].startswith("data:image/png;base64,")
        and isinstance(data.get("extra_data", {}).get("alpha_mask"), str)
        and isinstance(data.get("latency_ms"), (int, float))
        and isinstance(data.get("histogram"), dict)
    )
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /api/ai/remove-bg (u2net+grabcut)  latency={data.get('latency_ms')}ms  fg={data.get('extra_data', {}).get('foreground_coverage')}%")
    return ok


def validate_composite(data: dict) -> bool:
    ok = (
        data.get("success") is True
        and isinstance(data.get("image"), str)
        and data["image"].startswith("data:image/png;base64,")
        and isinstance(data.get("latency_ms"), (int, float))
    )
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /api/ai/composite-product (studio-sweep)  latency={data.get('latency_ms')}ms")
    return ok


def main() -> int:
    image = fetch_image_b64()

    print("=== PixelMatrix AI Ops Smoke Test ===")
    # 1) عزل الخلفية
    remove_res = call_endpoint("/api/ai/remove-bg", {
        "image": image, "model": "u2net", "matting_threshold": 0.1,
        "refine_grabcut": True, "grabcut_iter": 3
    })
    r1 = validate_remove_bg(remove_res)

    # 2) الدمج فوق خلفية الاستوديو باستخدام ناتج العزل (BGRA)
    composite_res = call_endpoint("/api/ai/composite-product", {
        "image": remove_res["image"], "backdrop": "studio-sweep",
        "color1": "#e8ecf2", "color2": "#16202f", "scale": 0.9,
        "position": "bottom", "shadow": True, "shadow_strength": 0.4,
        "vignette": 0.25
    })
    r2 = validate_composite(composite_res)

    passed, total = r1 + r2, 2
    print(f"=== RESULT: {passed}/{total} AI endpoints passed ===")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
