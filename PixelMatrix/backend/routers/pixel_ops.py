import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal

from services.dip_service import DIPService
from utils.image_converter import base64_to_cv2, cv2_to_base64, calculate_histogram_data

router = APIRouter(prefix="/api/pixel", tags=["Pixel Operations (Point Operations)"])

# نماذج التحقق من المدخلات (Pydantic Request Schemas)
class BaseImageRequest(BaseModel):
    image: str = Field(..., description="الصورة بصيغة Base64 Data URI")

class BrightnessContrastRequest(BaseImageRequest):
    brightness: float = Field(0.0, ge=-100.0, le=100.0, description="قيمة السطوع بين -100 و 100")
    contrast: float = Field(0.0, ge=-100.0, le=100.0, description="قيمة التباين بين -100 و 100")

class GammaRequest(BaseImageRequest):
    gamma: float = Field(1.0, ge=0.05, le=5.0, description="قيمة معامل جاما")

class EqualizationRequest(BaseImageRequest):
    method: Literal["clahe", "global"] = Field("clahe", description="طريقة المعادلة: clahe أو global")
    clip_limit: float = Field(2.0, ge=1.0, le=10.0, description="حد تقييد التباين لـ CLAHE")

class BatchPixelRequest(BaseImageRequest):
    brightness: Optional[float] = Field(0.0, ge=-100.0, le=100.0)
    contrast: Optional[float] = Field(0.0, ge=-100.0, le=100.0)
    gamma: Optional[float] = Field(1.0, ge=0.05, le=5.0)

# نموذج الاستجابة القياسي (API Response Schema)
class DIPResponse(BaseModel):
    success: bool
    message: str
    image: str
    latency_ms: float
    dimensions: dict
    histogram: dict
    extra_data: Optional[dict] = None


@router.post("/brightness-contrast", response_model=DIPResponse)
async def api_brightness_contrast(req: BrightnessContrastRequest):
    """
    تعديل السطوع والتباين رياضياً:
    g(x,y) = alpha * f(x,y) + beta
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.adjust_brightness_contrast(img_np, req.brightness, req.contrast)
        
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)
        
        return DIPResponse(
            success=True,
            message="تم تعديل السطوع والتباين بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء معالجة السطوع والتباين: {str(e)}")


@router.post("/gamma", response_model=DIPResponse)
async def api_gamma_correction(req: GammaRequest):
    """
    تصحيح جاما باستخدام جدول البحث المسبق (LUT Optimization):
    s = c * r^gamma
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.adjust_gamma(img_np, req.gamma)
        
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)
        
        return DIPResponse(
            success=True,
            message="تم تطبيق تصحيح جاما بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تصحيح جاما: {str(e)}")


@router.post("/histogram-equalization", response_model=DIPResponse)
async def api_histogram_equalization(req: EqualizationRequest):
    """
    معادلة الهستوجرام الشاملة أو التكيفية (CLAHE):
    تطبق على قناة الإضاءة (Luminance) في فضاء ألوان LAB للحفاظ على طبيعة الألوان.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.histogram_equalization(img_np, method=req.method, clip_limit=req.clip_limit)
        
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)
        
        return DIPResponse(
            success=True,
            message=f"تم تطبيق معادلة الهستوجرام ({req.method.upper()}) بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء معادلة الهستوجرام: {str(e)}")


@router.post("/invert", response_model=DIPResponse)
async def api_invert_colors(req: BaseImageRequest):
    """
    عكس ألوان الصورة (Image Negative):
    s = 255 - r
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.invert_colors(img_np)
        
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)
        
        return DIPResponse(
            success=True,
            message="تم عكس ألوان الصورة بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء عكس الألوان: {str(e)}")


@router.post("/otsu", response_model=DIPResponse)
async def api_otsu_threshold(req: BaseImageRequest):
    """
    تحويل الصورة إلى ثنائية (أبيض وأسود) باستخدام عتبة أوتسو الذكية:
    تحسب العتبة المثلى تلقائياً عبر تعظيم التباين بين الفئات.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np, optimal_thresh = DIPService.otsu_threshold(img_np)
        
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)
        
        return DIPResponse(
            success=True,
            message=f"تم تطبيق عتبة أوتسو بنجاح (العتبة المثلى: {optimal_thresh})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"optimal_threshold": optimal_thresh}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق عتبة أوتسو: {str(e)}")


@router.post("/batch", response_model=DIPResponse)
async def api_batch_pixel_processing(req: BatchPixelRequest):
    """
    معالجة متعددة متتالية للبكسل في طلب واحد (High-Performance Pipeline)
    تطبق: السطوع والتباين -> ثم تصحيح جاما.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        
        # 1. السطوع والتباين
        if req.brightness != 0.0 or req.contrast != 0.0:
            img_np = DIPService.adjust_brightness_contrast(img_np, req.brightness, req.contrast)
            
        # 2. جاما
        if req.gamma != 1.0:
            img_np = DIPService.adjust_gamma(img_np, req.gamma)
            
        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(img_np)
        hist = calculate_histogram_data(img_np)
        
        return DIPResponse(
            success=True,
            message="تمت المعالجة المجمعة للبكسل بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(img_np.shape[1]), "height": int(img_np.shape[0])},
            histogram=hist
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء المعالجة المجمعة: {str(e)}")
