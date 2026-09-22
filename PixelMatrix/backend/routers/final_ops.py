import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal

from services.dip_service import DIPService
from utils.image_converter import base64_to_cv2, cv2_to_base64, calculate_histogram_data
from routers.pixel_ops import DIPResponse, BaseImageRequest

router = APIRouter(prefix="/api", tags=["Geometric Transforms, Blending, FFT & Export"])

# نماذج التحقق للعمليات الختامية (Pydantic Request Schemas)
class TransformRequest(BaseImageRequest):
    quarter_turns: int = Field(0, ge=0, le=3, description="عدد أرباع الدوران 90° عكس عقارب الساعة (0..3)")
    free_angle: float = Field(0.0, ge=-360.0, le=360.0, description="زاوية الدوران الحر بالدرجات حول المركز")
    flip: Literal["none", "h", "v", "hv"] = Field("none", description="نوع القلب: أفقي h، رأسي v، أو كلاهما hv")
    crop_x: Optional[int] = Field(None, ge=0, description="بداية القص أفقياً (بكسل)")
    crop_y: Optional[int] = Field(None, ge=0, description="بداية القص رأسياً (بكسل)")
    crop_w: Optional[int] = Field(None, ge=2, description="عرض نافذة القص (بكسل)")
    crop_h: Optional[int] = Field(None, ge=2, description="ارتفاع نافذة القص (بكسل)")
    aspect: Literal["free", "1:1", "16:9", "4:3", "9:16", "3:2"] = Field(
        "free", description="نسبة الأبعاد المفروضة على نافذة القص"
    )


class BlendRequest(BaseImageRequest):
    overlay_type: Literal["image", "color"] = Field("color", description="مصدر الطبقة العلوية: صورة ثانية أو لون صافٍ")
    overlay_image: Optional[str] = Field(None, description="الصورة الثانية Base64 عند overlay_type=image")
    color: str = Field("#ffffff", description="لون الطبقة العلوية Hex عند overlay_type=color")
    mode: Literal["normal", "multiply", "screen", "overlay", "soft-light", "difference"] = Field(
        "normal", description="نمط المزج"
    )
    opacity: float = Field(1.0, ge=0.0, le=1.0, description="شفافية الطبقة العلوية 0..1")


class FFTSpectrumRequest(BaseImageRequest):
    pass  # الصورة فقط: رسم طيف السعة اللوغاريتمي


class FrequencyFilterRequest(BaseImageRequest):
    filter_type: Literal["lowpass", "highpass"] = Field("lowpass", description="اتجاه الفلتر الترددي")
    profile: Literal["ideal", "gaussian"] = Field("gaussian", description="شكل دالة الاستجابة H(u,v)")
    cutoff: float = Field(30.0, ge=1.0, le=500.0, description="تردد العزل D₀ (بكسل ترددي عن المركز)")


class ExportRequest(BaseImageRequest):
    image_format: Literal["png", "jpeg", "webp"] = Field("png", description="صيغة التصدير النهائي")
    quality: int = Field(95, ge=1, le=100, description="جودة الترميز (1-100) — تُتجاهل في PNG")


# =============================================================================
# 1. التحويلات الهندسية: دوران + قلب + قص بنِسَب (Geometric Transforms)
# =============================================================================
@router.post("/transform/apply", response_model=DIPResponse)
async def api_transform(req: TransformRequest):
    """
    تطبيق سلسلة التحويلات الهندسية الأفينية بترتيب: قص بنسبة → دوران ربعي →
    دوران حر بمصفوفة getRotationMatrix2D مع توسيع الإطار → قلب أفقي/رأسي.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)

        crop_box = None
        if None not in (req.crop_x, req.crop_y, req.crop_w, req.crop_h):
            crop_box = [req.crop_x, req.crop_y, req.crop_w, req.crop_h]

        result_np = DIPService.apply_transform(
            img_np,
            quarter_turns=req.quarter_turns,
            free_angle=req.free_angle,
            flip=req.flip,
            crop_box=crop_box,
            aspect=req.aspect,
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        ops = []
        if crop_box:
            ops.append(f"قص {req.aspect}")
        if req.quarter_turns:
            ops.append(f"دوران {req.quarter_turns * 90}°")
        if abs(req.free_angle) > 1e-3:
            ops.append(f"زاوية حرّة {req.free_angle}°")
        if req.flip != "none":
            flip_ar = {"h": "قلب أفقي", "v": "قلب رأسي", "hv": "قلب مزدوج"}.get(req.flip, req.flip)
            ops.append(flip_ar)

        return DIPResponse(
            success=True,
            message=f"تم تطبيق التحويلات الهندسية بنجاح ({' + '.join(ops) if ops else 'بدون تغيير'})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "quarter_turns": req.quarter_turns,
                "free_angle": req.free_angle,
                "flip": req.flip,
                "aspect": req.aspect,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء التحويل الهندسي: {str(e)}")


# =============================================================================
# 2. دمج الطبقات بأنماط المزج (Blend Modes Compositor)
# =============================================================================
@router.post("/blend/apply", response_model=DIPResponse)
async def api_blend(req: BlendRequest):
    """
    دمج طبقة علوية (صورة ثانية أو لون) فوق الصورة الحالية بأنماط
    Normal/Multiply/Screen/Overlay/Soft-Light/Difference مع شفافية 0-100%.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)

        overlay_np = None
        if req.overlay_type == "image":
            if not req.overlay_image:
                raise ValueError("لم تُرفع صورة الطبقة العلوية (overlay_image مطلوب)")
            overlay_np = base64_to_cv2(req.overlay_image)

        result_np = DIPService.apply_blend(
            img_np,
            overlay=overlay_np,
            overlay_color=req.color,
            mode=req.mode,
            opacity=req.opacity,
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        mode_ar = {
            "normal": "عادي", "multiply": "تضاعف", "screen": "شاشة",
            "overlay": "تراكب", "soft-light": "ضوء ناعم", "difference": "فرق",
        }.get(req.mode, req.mode)

        return DIPResponse(
            success=True,
            message=f"تم الدمج بنمط {mode_ar} بشفافية {int(req.opacity * 100)}% بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "mode": req.mode,
                "opacity": req.opacity,
                "overlay_type": req.overlay_type,
                "color": req.color if req.overlay_type == "color" else None,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء دمج الطبقات: {str(e)}")


# =============================================================================
# 3. طيف السعة في المجال الترددي (2D FFT Magnitude Spectrum)
# =============================================================================
@router.post("/frequency/fft", response_model=DIPResponse)
async def api_fft_spectrum(req: FFTSpectrumRequest):
    """
    حساب تحويل فورييه السريع ثنائي الأبعاد وإرجاع طيف السعة المُمركز
    بالمعادلة S(u,v) = 20·log(1 + |F(u,v)|) مطبَّعاً للعرض.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        spectrum_np, stats = DIPService.apply_fft_spectrum(img_np)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(spectrum_np)

        return DIPResponse(
            success=True,
            message=f"تم حساب طيف فورييه بنجاح (الطاقة عند DC: {stats['dc_magnitude']})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(spectrum_np.shape[1]), "height": int(spectrum_np.shape[0])},
            histogram=calculate_histogram_data(spectrum_np),
            extra_data={"fft": stats}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء حساب طيف فورييه: {str(e)}")


# =============================================================================
# 4. الترشيح الترددي Low/High Pass بنمطي Ideal و Gaussian
# =============================================================================
@router.post("/frequency/filter", response_model=DIPResponse)
async def api_frequency_filter(req: FrequencyFilterRequest):
    """
    تطبيق فلتر ترددي كامل المسار: FFT ← fftshift ← ضرب في H(u,v) ←
    ifftshift ← IFFT ← الجزء الحقيقي مع تطبيع min-max وإرجاع معاينة القناع H.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np, h_preview = DIPService.apply_frequency_filter(
            img_np, filter_type=req.filter_type, profile=req.profile, cutoff=req.cutoff
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        h_base64 = cv2_to_base64(h_preview)
        hist = calculate_histogram_data(result_np)

        filter_ar = "تمرير منخفض Low-Pass" if req.filter_type == "lowpass" else "تمرير عالٍ High-Pass"

        return DIPResponse(
            success=True,
            message=f"تم تطبيق فلتر {filter_ar} {req.profile.capitalize()} بنجاح (D₀ = {req.cutoff})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "filter_type": req.filter_type,
                "profile": req.profile,
                "cutoff": req.cutoff,
                "filter_mask": h_base64,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء الترشيح الترددي: {str(e)}")


# =============================================================================
# 5. التصدير النهائي بصيغ الويب (Final Export Encoder)
# =============================================================================
@router.post("/export/download", response_model=DIPResponse)
async def api_export(req: ExportRequest):
    """
    ترميز الصورة المعالجة النهائية بصيغة PNG/JPEG/WebP مع جودة قابلة للتحكم،
    وإرجاع ملف جاهز للتنزيل مباشرة من المتصفح مع حجم الملف بايتات.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        _, info = DIPService.export_image(img_np, image_format=req.image_format, quality=req.quality)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        suggested = f"pixelmatrix-export-{int(time.time())}.{info['format']}"

        return DIPResponse(
            success=True,
            message=f"تم تجهيز التصدير بصيغة {info['format'].upper()} ({info['file_size_bytes'] / 1024:.1f} KB)",
            image=info["data_uri"],
            latency_ms=latency,
            dimensions={"width": int(img_np.shape[1]), "height": int(img_np.shape[0])},
            histogram=calculate_histogram_data(img_np),
            extra_data={
                "format": info["format"],
                "quality": info["quality"],
                "file_size_bytes": info["file_size_bytes"],
                "lossless": info["lossless"],
                "download_name": suggested,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تصدير الصورة: {str(e)}")
