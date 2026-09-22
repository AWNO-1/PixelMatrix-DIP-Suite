import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

from services.dip_service import DIPService
from utils.image_converter import base64_to_cv2, cv2_to_base64, calculate_histogram_data
from routers.pixel_ops import DIPResponse, BaseImageRequest

router = APIRouter(prefix="/api/spatial", tags=["Spatial Filters & 2D Convolution"])

# نماذج التحقق للطلبات المكانية (Pydantic Request Schemas)
class BlurRequest(BaseImageRequest):
    blur_type: Literal["gaussian", "median", "mean"] = Field("gaussian", description="نوع الفلتر: gaussian, median, mean")
    ksize: int = Field(5, ge=3, le=31, description="حجم النواة (يجب أن يكون فردياً)")
    sigma: float = Field(1.0, ge=0.1, le=20.0, description="الانحراف المعياري لفلتر غاوس")

class BilateralRequest(BaseImageRequest):
    d: int = Field(9, ge=1, le=25, description="قطر جوار كل بكسل")
    sigma_color: float = Field(75.0, ge=1.0, le=250.0, description="انحراف فضاء الألوان")
    sigma_space: float = Field(75.0, ge=1.0, le=250.0, description="انحراف الفضاء الإحداثي المكاني")

class SharpenRequest(BaseImageRequest):
    amount: float = Field(1.0, ge=0.1, le=5.0, description="شدة زيادة الحدة")
    method: Literal["unsharp", "laplacian"] = Field("unsharp", description="طريقة زيادة الحدة: unsharp أو laplacian")

class SobelRequest(BaseImageRequest):
    direction: Literal["magnitude", "x", "y"] = Field("magnitude", description="اتجاه المشتقة: magnitude أو x أو y")
    ksize: int = Field(3, ge=1, le=7, description="حجم نواة سوبل (1, 3, 5, 7)")

class CannyRequest(BaseImageRequest):
    threshold1: float = Field(50.0, ge=0.0, le=255.0, description="العتبة الدنيا (Lower Hysteresis Threshold)")
    threshold2: float = Field(150.0, ge=0.0, le=255.0, description="العتبة العليا (Upper Hysteresis Threshold)")

class CustomKernelRequest(BaseImageRequest):
    kernel: List[List[float]] = Field(..., description="مصفوفة معاملات الالتفاف المربعة 3x3 أو 5x5")
    bias: float = Field(0.0, ge=-255.0, le=255.0, description="إزاحة الشدة المضافة (Bias Offset)")
    normalize: bool = Field(True, description="تطبيع معاملات النواة بقسمتها على المجموع تلقائياً")


# =============================================================================
# 1. مسار التنعيم والطمس المكاني (Smoothing & Blurring)
# =============================================================================
@router.post("/blur", response_model=DIPResponse)
async def api_blur(req: BlurRequest):
    """
    تطبيق فلاتر التنعيم المكانية (Gaussian, Median, Mean):
    - Gaussian: تنعيم خطي ناعم مع الحفاظ على التدرج الإحصائي.
    - Median: تنعيم لاخطي متميز في القضاء على ضوضاء الملح والفلفل (Impulse Noise).
    - Mean: تنعيم صندوقي بحساب المتوسط الحسابي للجوار.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_blur(img_np, blur_type=req.blur_type, ksize=req.ksize, sigma=req.sigma)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        type_ar = "غاوس (Gaussian)" if req.blur_type == "gaussian" else ("الوسيط (Median)" if req.blur_type == "median" else "المتوسط (Mean)")
        return DIPResponse(
            success=True,
            message=f"تم تطبيق فلتر {type_ar} بنجاح (النواة: {req.ksize}x{req.ksize})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"blur_type": req.blur_type, "ksize": req.ksize, "sigma": req.sigma}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق التنعيم: {str(e)}")


# =============================================================================
# 2. مسار التنعيم مع حفظ الحواف (Bilateral Filtering)
# =============================================================================
@router.post("/bilateral", response_model=DIPResponse)
async def api_bilateral_filter(req: BilateralRequest):
    """
    تطبيق فلتر التنعيم ثنائي الجوانب (Bilateral Filter):
    ينعم الأسطح ويزيل الضوضاء مع الحفاظ التام والصلب على الحواف الواضحة.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_bilateral_filter(
            img_np, d=req.d, sigma_color=req.sigma_color, sigma_space=req.sigma_space
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        return DIPResponse(
            success=True,
            message="تم تطبيق فلتر Bilateral مع صون الحواف بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"d": req.d, "sigma_color": req.sigma_color, "sigma_space": req.sigma_space}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق Bilateral Filter: {str(e)}")


# =============================================================================
# 3. مسار زيادة الحدة والتفاصيل الدقيقة (Image Sharpening)
# =============================================================================
@router.post("/sharpen", response_model=DIPResponse)
async def api_sharpen(req: SharpenRequest):
    """
    تطبيق زيادة الحدة واستخراج الحواف الدقيقة عبر Unsharp Masking أو Laplacian Operator:
    g(x,y) = f(x,y) + amount * Detail(x,y)
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_sharpen(img_np, amount=req.amount, method=req.method)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        return DIPResponse(
            success=True,
            message=f"تمت زيادة حدة الصورة بنجاح (الطريقة: {req.method.upper()})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"amount": req.amount, "method": req.method}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء زيادة حدة الصورة: {str(e)}")


# =============================================================================
# 4. مسار كاشف الحواف سوبل (Sobel Edge Detector)
# =============================================================================
@router.post("/sobel", response_model=DIPResponse)
async def api_sobel(req: SobelRequest):
    """
    حساب المشتقات المكانية الأولى لتدرج الصورة (First-Order Spatial Gradient Derivatives):
    - x: المشتقة الأفقية لتحديد الخطوط الرأسية.
    - y: المشتقة الرأسية لتحديد الخطوط الأفقية.
    - magnitude: مقدار التدرج الكلي sqrt(Gx² + Gy²).
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_sobel(img_np, direction=req.direction, ksize=req.ksize)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        return DIPResponse(
            success=True,
            message=f"تم استخراج حواف سوبل بنجاح (الاتجاه: {req.direction.upper()})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"direction": req.direction, "ksize": req.ksize}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق كاشف سوبل: {str(e)}")


# =============================================================================
# 5. مسار كاشف الحواف الأمثل كاني (Canny Edge Detector)
# =============================================================================
@router.post("/canny", response_model=DIPResponse)
async def api_canny(req: CannyRequest):
    """
    تطبيق خوارزمية كاشف الحواف كاني متعددة المراحل:
    1. تنعيم غاوس لإزالة الضوضاء.
    2. حساب شدة واتجاه التدرج.
    3. كبت القيم غير العظمى (Non-Maximum Suppression).
    4. عتبة التباطؤ المزدوجة (Hysteresis Thresholding).
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_canny(img_np, threshold1=req.threshold1, threshold2=req.threshold2)

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        return DIPResponse(
            success=True,
            message=f"تم تطبيق كاشف كاني بنجاح (العتبات: {req.threshold1} - {req.threshold2})",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={"threshold1": req.threshold1, "threshold2": req.threshold2}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق كاشف كاني: {str(e)}")


# =============================================================================
# 6. مختبر النواة المخصصة للالتفاف (Custom Kernel 2D Convolution Playground)
# =============================================================================
@router.post("/custom-kernel", response_model=DIPResponse)
async def api_custom_kernel(req: CustomKernelRequest):
    """
    تطبيق معادلة الالتفاف المنفصل ثنائي الأبعاد بمصفوفة مخصصة يدخلها المستخدم:
    g(x,y) = ∑∑ w(s,t) · f(x+s, y+t) + bias
    مع إمكانية التطبيع التلقائي للأوزان لحفظ السطوع.
    """
    t_start = time.perf_counter()
    try:
        img_np = base64_to_cv2(req.image)
        result_np = DIPService.apply_custom_kernel(
            img_np, kernel_matrix=req.kernel, bias=req.bias, normalize=req.normalize
        )

        latency = round((time.perf_counter() - t_start) * 1000, 2)
        out_base64 = cv2_to_base64(result_np)
        hist = calculate_histogram_data(result_np)

        rows = len(req.kernel)
        cols = len(req.kernel[0]) if rows > 0 else 0

        return DIPResponse(
            success=True,
            message=f"تم تطبيق مصفوفة الالتفاف المخصصة ({rows}x{cols}) بنجاح",
            image=out_base64,
            latency_ms=latency,
            dimensions={"width": int(result_np.shape[1]), "height": int(result_np.shape[0])},
            histogram=hist,
            extra_data={
                "matrix_size": f"{rows}x{cols}",
                "bias": req.bias,
                "normalized": req.normalize
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ أثناء تطبيق الالتفاف المخصص: {str(e)}")
