import time
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.pixel_ops import router as pixel_router
from routers.spatial_ops import router as spatial_router
from routers.ai_ops import router as ai_router
from routers.final_ops import router as final_router
from services.dip_service import DIPService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # تحمية نماذج الذكاء الاصطناعي في خيط خلفي فوري لتكون الاستجابة صفر تأخير من أول نقرة
    threading.Thread(target=DIPService.warmup_sessions, daemon=True).start()
    yield

# إنشاء تطبيق FastAPI
app = FastAPI(
    title="PixelMatrix - Digital Image Processing Core API",
    description="واجهة برمجة تطبيقات خادم معالجة الصور الرقمية المتطور (OpenCV + NumPy + FastAPI)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# إعدادات CORS للسماح لمحرر React (Vite) بالتواصل المباشر مع الخادم
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# مسار فحص صحة الخادم وجاهزيته (Health Check Route)
@app.get("/api/health", tags=["System Telemetry"])
async def health_check():
    """
    مسار فحص صحة وجاهزية محرك المعالجة (OpenCV & FastAPI).
    يعيد معلومات الحالة وزمن التشغيل والوحدات المفعلة في النظام.
    """
    return {
        "status": "online",
        "engine": "PixelMatrix DIP Core",
        "version": "1.0.0",
        "timestamp": time.time(),
        "active_modules": [
            "Point Operations (Brightness, Contrast, Gamma, CLAHE, Invert, Otsu)",
            "Spatial Filtering & 2D Convolution (Gaussian, Median, Bilateral, Sobel, Canny, Custom Kernel)",
            "AI Background Matting (U-2-Net rembg + GrabCut Refine + Product Studio Compositor)",
            "Geometric Affine Transforms (Rotate/Flip/Crop with Aspect Ratios)",
            "Layer Blend Modes (Multiply, Screen, Overlay, Soft-Light, Difference)",
            "Frequency Domain (2D FFT Spectrum + Ideal/Gaussian Low/High-Pass Filters)",
            "Final Export Encoder (PNG / JPEG / WebP with Quality Control)"
        ],
        "frameworks": {
            "fastapi": "0.141.1",
            "opencv": "5.0.0",
            "numpy": "2.4.6"
        }
    }

# تسجيل موجهات المسارات (Routers)
app.include_router(pixel_router)
app.include_router(spatial_router)
app.include_router(ai_router)
app.include_router(final_router)


# نقطة الدخول عند التشغيل المباشر
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
