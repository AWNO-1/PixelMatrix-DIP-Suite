import base64
import io
import cv2
import numpy as np
from PIL import Image

def base64_to_cv2(base64_str: str) -> np.ndarray:
    """
    تحويل صورة من صيغة Base64 Data URI أو رابط URL إلى مصفوفة NumPy بصيغة BGR/BGRA التي يفهمها OpenCV.
    يدعم صيغ PNG, JPG, WEBP وغيرها.
    """
    if base64_str.startswith("http://") or base64_str.startswith("https://"):
        import urllib.request
        req = urllib.request.Request(base64_str, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            image_bytes = resp.read()
    else:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        
        image_bytes = base64.b64decode(base64_str)

    np_arr = np.frombuffer(image_bytes, np.uint8)
    
    # قراءة الصورة مع الحفاظ على قناة الشفافية إن وجدت (cv2.IMREAD_UNCHANGED)
    image = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
    if image is None:
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(pil_img)
            if len(image_np.shape) == 2:
                image = image_np
            elif image_np.shape[2] == 4:
                image = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGRA)
            else:
                image = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        except Exception:
            raise ValueError("فشل في فك ترميز الصورة من صيغة Base64")
            
    return image



def cv2_to_base64(image: np.ndarray, ext: str = ".png", quality: int = 90) -> str:
    """
    تحويل مصفوفة NumPy الناتجة من معالجة OpenCV إلى سلسلة Base64 Data URI جاهزة للعرض في المتصفح.
    """
    ext = ext.lower()
    if not ext.startswith("."):
        ext = "." + ext
        
    encode_params = []
    if ext in [".jpg", ".jpeg"]:
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    elif ext == ".webp":
        encode_params = [int(cv2.IMWRITE_WEBP_QUALITY), quality]
        
    success, buffer = cv2.imencode(ext, image, encode_params)
    if not success:
        raise ValueError("فشل في ترميز الصورة الناتجة")
        
    b64_encoded = base64.b64encode(buffer).decode("utf-8")
    mime_type = "image/png"
    if ext in [".jpg", ".jpeg"]:
        mime_type = "image/jpeg"
    elif ext == ".webp":
        mime_type = "image/webp"
    elif ext == ".bmp":
        mime_type = "image/bmp"
        
    return f"data:{mime_type};base64,{b64_encoded}"

def calculate_histogram_data(image: np.ndarray) -> dict:
    """
    حساب توزيع الهستوجرام لقنوات الألوان (RGB) وشدة الإضاءة (Luminance)
    لاستخدامها في شاشات الـ HUD الحية في الواجهة.
    """
    hist_data = {"r": [], "g": [], "b": [], "gray": []}
    
    if len(image.shape) == 2:
        # صورة أحادية القناة (Grayscale)
        hist = cv2.calcHist([image], [0], None, [32], [0, 256]).flatten()
        m = float(np.max(hist))
        hist_data["gray"] = [float(round((float(val) / m) * 100.0, 1)) if m > 0 else 0.0 for val in hist]
    else:
        # فصل قنوات BGR وحساب الهستوجرام لكل منها
        # نأخذ أول 3 قنوات فقط حتى لو كانت الصورة تحتوي على قناة ألفا
        channels = cv2.split(image[:, :, :3])
        # cv2 uses BGR order: 0 -> Blue, 1 -> Green, 2 -> Red
        hist_b = cv2.calcHist([channels[0]], [0], None, [32], [0, 256]).flatten()
        hist_g = cv2.calcHist([channels[1]], [0], None, [32], [0, 256]).flatten()
        hist_r = cv2.calcHist([channels[2]], [0], None, [32], [0, 256]).flatten()
        
        # صورة الشدة الإجمالية
        gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        hist_gray = cv2.calcHist([gray], [0], None, [32], [0, 256]).flatten()
        
        # تطبيع القيم (Normalization) إلى نسبة مئوية 0 - 100 لسهولة العرض في الواجهة كأعداد عائمة نقية
        def normalize_hist(h):
            m = float(np.max(h))
            return [float(round((float(val) / m) * 100.0, 1)) if m > 0 else 0.0 for val in h]
            
        hist_data["r"] = normalize_hist(hist_r)
        hist_data["g"] = normalize_hist(hist_g)
        hist_data["b"] = normalize_hist(hist_b)
        hist_data["gray"] = normalize_hist(hist_gray)
        
    return hist_data
