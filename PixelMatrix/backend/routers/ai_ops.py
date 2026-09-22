import time
import cv2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from services.dip_service import DIPService
from utils.image_converter import base64_to_cv2, cv2_to_base64, calculate_histogram_data
from routers.pixel_ops import DIPResponse, BaseImageRequest

router = APIRouter(prefix="/api/ai", tags=["AI Background Removal & Product Studio"])

# نماذج التحقق لعزل الخلفية الذكي (Pydantic Request Schemas)
class RemoveBgRequest(BaseImageRequest):
    model: Literal["u2netp", "u2net", "isnet-general-use", "u2net_human_seg"] = Field(
        "u2netp", description="نموذج الماتينغ العصبي: u2netp فائق السرعة (Turbo)، u2net عام، isnet أعلى دقة، u2net_human_seg للبشر"
    )
    matting_threshold: float = Field(
        0.0, ge=0.0, le=0.95, description="عتبة صقل قناع الألفا (0 = هوية، الزيادة تنظف بقايا الهالة)"
    )
    alpha_matting: bool = Field(False, description="تفعيل الماتينغ المتقدم لتنعيم الحواف الشعرية")
    fg_threshold: int = Field(240, ge=0, le=255, description="عتبة القطعية الأمامية في الماتينغ")
    bg_threshold: int = Field(10, ge=0, le=255, description="عتبة القطعية الخلفية في الماتينغ")
    erode_size: int = Field(10, ge=0, le=30, description="حجم تآكل حدود الماتينغ")
    refine_grabcut: bool = Field(False, description="صقل إحصائي تفاعلي بـ GrabCut مُهيأ من قناع الشبكة (اختياري)")
    grabcut_iter: int = Field(2, ge=1, le=10, description="عدد تكرارات GrabCut")


class CompositeProductRequest(BaseImageRequest):
    backdrop: Literal["solid", "vertical-gradient", "radial-gradient", "studio-sweep", "checkerboard"] = Field(
        "studio-sweep", description="نوع خلفية الاستوديو"
    )
    color1: str = Field("#e8ecf2", description="اللون الأساسي للخلفية (Hex RRGGBB)")
    color2: str = Field("#16202f", description="اللون الثانوي للتدرجات واللوحات (Hex RRGGBB)")
    scale: float = Field(1.0, ge=0.2, le=2.0, description="مقياس تحجيم المنتج قبل الدمج")
    position: Literal["center", "bottom"] = Field("bottom", description="نقطة الارتكاز: وسط اللوح أو أرضية الاستوديو")
    shadow: bool = Field(True, description="توليد ظل أرضي واقعي من قناع الألفا")
    shadow_strength: float = Field(0.35, ge=0.0, le=1.0, description="شدة الظل الأرضي")
    vignette: float = Field(0.0, ge=0.0, le=1.0, description="قوة العدسة المنحنية لتعتيم الأطراف")


# =============================================================================
# 1. عزل الخلفية الذكي بنقرة واحدة (One-Click AI Background Removal)
# =============================================================================
@router.post("/remove-bg", response_model=DIPResponse)
async def api_remove_background(req: RemoveBgRequest):
    """
    عزل الخلفية بشبكة U-2-Net العصبية (rembg) مع خيارات:
    - قناع ألفا احتمالي كامل الدقة (Saliency-driven Alpha Matte).
    - عتبة صقل تفاعلية Matting Threshold لتنظيف بقايا الهالة.
    - ماتينغ متقدم للحواف الشعرية (Alpha Matting) عند الطلب.
    - صقل إحصائي بـ GrabCut مُهيأ من قناع الشبكة العصبية.
    يعيد صورة BGRA + معاينة قناع الألفا منفصلة لشاشات الـ HUD.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np, alpha_mask = DIPService.remove_background(
            img_np,
            model=req.model,
            matting_threshold=req.matting_threshold,
            alpha_matting=req.alpha_matting,
            fg_threshold=req.fg_threshold,
            bg_threshold=req.bg_threshold,
            erode_size=req.erode_size,
            refine_grabcut=req.refine_grabcut,
            grabcut_iter=req.grabcut_iter,
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        # معاينة قناع الألفا الرمادي لعرضها في لوحة القناع الحية
        mask_preview = cv2_to_base64(cv2.cvtColor(alpha_mask, cv2.COLOR_GRAY2BGR))

        coverage = round(float((alpha_mask > 127).mean() * 100.0), 1)

        return DIPResponse(
            success=True,
            message=f"تم عزل الخلفية بنجاح (النموذج: {req.model} | تغطية الأمام: {coverage}% | صقل GrabCut: {'نعم' if req.refine_grabcut else 'لا'})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "alpha_mask": mask_preview,
                "model": req.model,
                "foreground_coverage": coverage,
                "matting_threshold": req.matting_threshold,
                "refined_grabcut": req.refine_grabcut,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء عزل الخلفية: {str(e)}")


# =============================================================================
# 2. دمج المنتج المعزول فوق خلفية استوديو (Product Studio Compositor)
# =============================================================================
@router.post("/composite-product", response_model=DIPResponse)
async def api_composite_product(req: CompositeProductRequest):
    """
    دمج صورة المنتج المعزولة (BGRA) فوق خلفيات استوديو مخصصة:
    ألوان صافية، تدرجات رأسية/شعاعية، منحنى استوديو Sweep، أو لوحة شطرنج،
    مع مقياس تحجيم، ظل أرضي واقعي مشتق من قناع الألفا، وعدسة منحنية Vignette.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        if len(img_np.shape) != 3 or img_np.shape[2] != 4:
            raise ValueError("يتطلب الدمج صورة معزولة بقناة شفافية (BGRA) — طبّق عزل الخلفية أولاً")

        result_np = DIPService.composite_product(
            img_np,
            backdrop=req.backdrop,
            color1=req.color1,
            color2=req.color2,
            scale=req.scale,
            position=req.position,
            shadow=req.shadow,
            shadow_strength=req.shadow_strength,
            vignette=req.vignette,
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        backdrop_names = {
            "solid": "لون صافٍ",
            "vertical-gradient": "تدرج رأسي",
            "radial-gradient": "إضاءة شعاعية",
            "studio-sweep": "منحنى استوديو",
            "checkerboard": "لوحة شطرنج",
        }

        return DIPResponse(
            success=True,
            message=f"تم دمج المنتج فوق خلفية {backdrop_names.get(req.backdrop, req.backdrop)} بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "backdrop": req.backdrop,
                "color1": req.color1,
                "color2": req.color2,
                "scale": req.scale,
                "position": req.position,
                "shadow": req.shadow,
                "vignette": req.vignette,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء دمج المنتج: {str(e)}")
