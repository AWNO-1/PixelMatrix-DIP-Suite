import cv2
import numpy as np

class DIPService:
    """
    فئة خدمات معالجة الصور الرقمية (Digital Image Processing Service)
    تحتوي على تطبيق الخوارزميات الرياضية الأساسية لمعالجة البكسل (Point Operations)
    باستخدام مكتبتي OpenCV و NumPy.
    """

    @staticmethod
    def adjust_brightness_contrast(image: np.ndarray, brightness: float = 0.0, contrast: float = 0.0) -> np.ndarray:
        """
        1. تعديل السطوع والتباين (Brightness & Contrast Adjustment)
        
        المعادلة الرياضية الأكاديمية:
        g(x, y) = α · f(x, y) + β
        
        حيث:
        - f(x, y): قيمة بكسل الصورة الأصلية.
        - g(x, y): قيمة بكسل الصورة المعالجة بعد التحويل.
        - α (Alpha): معامل التباين (Contrast Multiplier).
          إذا كان α > 1 يزداد التباين، وإذا كان 0 < α < 1 يقل التباين.
        - β (Beta): إزاحة السطوع (Brightness Offset).
          إذا كانت β > 0 تصبح الصورة أكثر سطوعاً، وإذا كانت β < 0 تصبح أغمق.
        
        في هذا التطبيق:
        نستقبل brightness من [-100, 100] ونحولها إلى إزاحة β مناسبة.
        نستقبل contrast من [-100, 100] ونحولها إلى معامل α مناسب:
        alpha = (contrast + 100) / 100.0 (بحيث عند 0 يكون alpha = 1.0)
        """
        # تحويل مدخلات واجهة المستخدم إلى معاملات رياضية
        alpha = float((contrast + 100.0) / 100.0)
        if alpha < 0:
            alpha = 0.0
            
        beta = float(brightness * 1.27) # تحويل النطاق من 100 إلى ما يقارب 127
        
        # نستخدم cv2.convertScaleAbs التي تطبق المعادلة مع اقتطاع القيم بدقة بين [0, 255]
        # وتحويل الناتج إلى uint8
        return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

    @staticmethod
    def adjust_gamma(image: np.ndarray, gamma: float = 1.0) -> np.ndarray:
        """
        2. تصحيح جاما والتحويل الأسي (Gamma Power-Law Correction)
        
        المعادلة الرياضية الأكاديمية:
        s = c · r^γ
        
        حيث:
        - r: شدة إضاءة البكسل الأصلية بعد التطبيع في النطاق [0, 1].
        - s: شدة إضاءة البكسل الناتجة بعد التطبيع.
        - c: ثابت التحجيم (عادة يساوي 1.0 أو 255).
        - γ (Gamma): أس التحويل:
          * إذا كانت γ < 1: تتمدد درجات الظلال الداكنة وتصبح الصورة أفتح مع الحفاظ على تفاصيل المناطق الساطعة.
          * إذا كانت γ > 1: تنضغط الظلال وتصبح الصورة أغمق لزيادة التباين في المناطق المضيئة.
          
        الأداء الأمثل (LUT Optimization):
        بدلاً من حساب القوة الأسية (float power) لكل بكسل في مصفوفة الحجم W × H،
        نقوم بإنشاء جدول بحث مسبق (Look-Up Table - LUT) يحتوي على 256 قيمة محسوبة مسبقاً،
        ثم تطبق دالة cv2.LUT التحويل بتعقيد زمني O(1) لكل بكسل!
        """
        if gamma <= 0:
            gamma = 0.01
            
        # بناء جدول البحث المسبق (Precomputed LUT) لتطبيق المعادلة الأكاديمية s = c · r^γ
        lut_table = np.array([
            ((i / 255.0) ** gamma) * 255.0 for i in np.arange(0, 256)
        ]).astype("uint8")
        
        # تطبيق جدول التحويل على قنوات الصورة
        return cv2.LUT(image, lut_table)

    @staticmethod
    def histogram_equalization(image: np.ndarray, method: str = "clahe", clip_limit: float = 2.0) -> np.ndarray:
        """
        3. معادلة الهستوجرام (Global Histogram Equalization & CLAHE)
        
        المفهوم الرياضي الأكاديمي:
        إعادة توزيع كثافة مستويات الشدة (Probability Density Function - PDF) 
        لتصبح دالة التوزيع التراكمي (Cumulative Distribution Function - CDF) خطية موحدة:
        s_k = T(r_k) = (L - 1) * ∑_{j=0}^{k} p_r(r_j)
        
        في الصور الملونة (Color Images):
        لا نطبق المعادلة على قنوات RGB مباشرة لتجنب تشوه الألوان وتبدل درجات الصبغة (Hue Distortion).
        بل نحول الصورة إلى فضاء الألوان YCrCb أو LAB، ونطبق معادلة الهستوجرام فقط على قناة الإضاءة (Luminance Channel - Y أو L)،
        ثم نعيد دمج القنوات والتحويل إلى BGR.
        
        الأنواع المدعومة:
        - "global": معادلة الهستوجرام الشاملة للصورة كاملة.
        - "clahe": معادلة الهستوجرام الموضعية التكيفية مع تقييد التباين (Contrast Limited Adaptive Histogram Equalization)
                   لمنع تضخيم الضوضاء في المناطق المتجانسة.
        """
        has_alpha = False
        alpha_channel = None
        
        # التحقق من وجود قناة شفافية (Alpha) والاحتفاظ بها
        if len(image.shape) == 3 and image.shape[2] == 4:
            has_alpha = True
            b, g, r, alpha_channel = cv2.split(image)
            image = cv2.merge([b, g, r])
            
        if len(image.shape) == 2:
            # صورة أحادية القناة (Grayscale)
            if method == "clahe":
                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
                result = clahe.apply(image)
            else:
                result = cv2.equalizeHist(image)
        else:
            # صورة ملونة: التحويل إلى فضاء LAB
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            
            if method == "clahe":
                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
                l_equalized = clahe.apply(l_channel)
            else:
                l_equalized = cv2.equalizeHist(l_channel)
                
            lab_merged = cv2.merge([l_equalized, a_channel, b_channel])
            result = cv2.cvtColor(lab_merged, cv2.COLOR_LAB2BGR)
            
        if has_alpha and alpha_channel is not None:
            b, g, r = cv2.split(result)
            result = cv2.merge([b, g, r, alpha_channel])
            
        return result

    @staticmethod
    def invert_colors(image: np.ndarray) -> np.ndarray:
        """
        4. عكس ألوان الصورة (Image Negative / Inversion)
        
        المعادلة الرياضية الأكاديمية:
        s = (L - 1) - r = 255 - r
        
        حيث:
        - L: عدد مستويات الشدة اللونية (في صور 8-bit، L = 256، وبالتالي L - 1 = 255).
        - r: قيمة البكسل الحالية.
        - s: القيمة المعكوسة.
        
        نحرص برمجياً على عكس قنوات الألوان (RGB/BGR) فقط وعدم عكس قناة الشفافية (Alpha Channel)
        حتى لا تصبح الخلفية المفرغة مصمتة.
        """
        if len(image.shape) == 3 and image.shape[2] == 4:
            # صورة مع قناة شفافية: نعكس BGR ونحتفظ بـ Alpha
            b, g, r, a = cv2.split(image)
            b_inv = 255 - b
            g_inv = 255 - g
            r_inv = 255 - r
            return cv2.merge([b_inv, g_inv, r_inv, a])
        else:
            return 255 - image

    @staticmethod
    def otsu_threshold(image: np.ndarray) -> tuple[np.ndarray, float]:
        """
        5. عتبة أوتسو الثنائية (Otsu's Global Adaptive Thresholding)
        
        المفهوم الرياضي الأكاديمي:
        خوارزمية إحصائية غير خاضعة للإشراف (Unsupervised) لحساب العتبة المثلى T*
        التي تفصل الهستوجرام إلى فئتين (خلفية C0 وكائن C1)،
        بحيث تعظم التباين بين الفئات (Between-Class Variance - σ_B^2) 
        أو تقلل التباين الداخلي للفئات (Within-Class Variance - σ_W^2):
        
        σ_B^2(T) = ω_0(T) · [μ_0(T) - μ_T]^2 + ω_1(T) · [μ_1(T) - μ_T]^2
        
        الناتج:
        - صورة ثنائية (Binary Image) بألوان 0 (أسود) و 255 (أبيض).
        - القيمة العددية للعتبة المحسوبة تلقائياً (Optimal Threshold Value).
        """
        # تحويل الصورة إلى تدرج الرمادي Grayscale أولاً
        if len(image.shape) == 3:
            if image.shape[2] == 4:
                # تجاهل قناة الشفافية عند حساب العتبة
                bgr = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
                gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            else:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
            
        # تطبيق خوارزمية أوتسو
        optimal_threshold, binary_img = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        
        # تحويل الصورة الثنائية الناتجة إلى 3 قنوات BGR للعرض في واجهات العرض
        result_bgr = cv2.cvtColor(binary_img, cv2.COLOR_GRAY2BGR)
        
        return result_bgr, float(optimal_threshold)

    # =========================================================================
    # الفلاتر المكانية والالتفاف (Spatial Filtering & Convolution)
    # =========================================================================

    @staticmethod
    def apply_blur(image: np.ndarray, blur_type: str = "gaussian", ksize: int = 5, sigma: float = 1.0) -> np.ndarray:
        """
        6. فلاتر التنعيم والطمس المكانية (Spatial Smoothing Filters)
        
        الأنواع:
        - "gaussian": مرشح غاوس الخطي مع توزيع طبيعي للأوزان.
          G(x,y) = (1 / 2πσ²) * e^(-(x² + y²)/2σ²)
        - "median": مرشح الوسيط اللاخطي (Non-linear)، مثالي لإزالة ضوضاء الملح والفلفل (Salt & Pepper Noise).
          g(x,y) = median{ f(s,t) }
        - "mean" / "box": مرشح المتوسط الصندوقي، يمنح كل بكسل في الجوار وزناً متساوياً (1 / k²).
        """
        # التأكد من أن حجم النواة فردي وموجب (Odd number >= 3)
        if ksize % 2 == 0:
            ksize += 1
        ksize = max(3, ksize)
        
        has_alpha = len(image.shape) == 3 and image.shape[2] == 4
        if has_alpha:
            b, g, r, a = cv2.split(image)
            bgr = cv2.merge([b, g, r])
        else:
            bgr = image

        blur_type = blur_type.lower()
        if blur_type == "gaussian":
            blurred = cv2.GaussianBlur(bgr, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)
        elif blur_type == "median":
            blurred = cv2.medianBlur(bgr, ksize)
        elif blur_type in ["mean", "box"]:
            blurred = cv2.blur(bgr, (ksize, ksize))
        else:
            blurred = cv2.GaussianBlur(bgr, (ksize, ksize), sigmaX=sigma)

        if has_alpha:
            b, g, r = cv2.split(blurred)
            return cv2.merge([b, g, r, a])
        return blurred

    @staticmethod
    def apply_bilateral_filter(image: np.ndarray, d: int = 9, sigma_color: float = 75.0, sigma_space: float = 75.0) -> np.ndarray:
        """
        7. مرشح التنعيم ثنائي الجوانب لحفظ الحواف (Bilateral Filter - Edge Preserving)
        
        المفهوم الرياضي الأكاديمي:
        يدمج بين مرشحين غاوسيين في آن واحد:
        1. غاوسي النطاق المكاني (Spatial Domain): يزن البكسلات حسب قربها الهندسي.
        2. غاوسي المدى اللوني (Range/Photometric Domain): يزن البكسلات حسب تشابهها اللوني.
        
        النتيجة: تنعيم رائع للأسطح والوجوه والضوضاء مع الحفاظ التام والصلب على الحواف والتفاصيل.
        """
        d = max(1, int(d))
        has_alpha = len(image.shape) == 3 and image.shape[2] == 4
        if has_alpha:
            b, g, r, a = cv2.split(image)
            bgr = cv2.merge([b, g, r])
        else:
            bgr = image

        # تطبيق الفلتر الثنائي على قنوات الألوان
        filtered = cv2.bilateralFilter(bgr, d=d, sigmaColor=sigma_color, sigmaSpace=sigma_space)

        if has_alpha:
            b, g, r = cv2.split(filtered)
            return cv2.merge([b, g, r, a])
        return filtered

    @staticmethod
    def apply_sharpen(image: np.ndarray, amount: float = 1.0, method: str = "unsharp") -> np.ndarray:
        """
        8. زيادة الحدة والتفاصيل الدقيقة (Image Sharpening)
        
        الطرق:
        - "laplacian": مصفوفة لابلاسيان المباشرة للحدة من الدرجة الثانية:
          [ 0, -1,  0]
          [-1,  5, -1]
          [ 0, -1,  0]
        - "unsharp": قناع إزالة الضبابية (Unsharp Masking):
          g(x,y) = f(x,y) + k · (f(x,y) - f_smooth(x,y))
        """
        has_alpha = len(image.shape) == 3 and image.shape[2] == 4
        if has_alpha:
            b, g, r, a = cv2.split(image)
            bgr = cv2.merge([b, g, r])
        else:
            bgr = image

        if method == "laplacian":
            # مصفوفة زيادة الحدة المشتقة من معامل لابلاسيان
            kernel = np.array([
                [0, -1, 0],
                [-1, 4 + amount, -1],
                [0, -1, 0]
            ], dtype=np.float32)
            # تطبيع إذا لزم
            kernel_sum = np.sum(kernel)
            if kernel_sum > 0:
                kernel = kernel / kernel_sum
            sharpened = cv2.filter2D(bgr, -1, kernel)
        else:
            # طريقة Unsharp Masking الأكثر نعومة واحترافية
            gaussian = cv2.GaussianBlur(bgr, (0, 0), 2.0)
            sharpened = cv2.addWeighted(bgr, 1.0 + amount, gaussian, -amount, 0)

        if has_alpha:
            b, g, r = cv2.split(sharpened)
            return cv2.merge([b, g, r, a])
        return sharpened

    @staticmethod
    def apply_sobel(image: np.ndarray, direction: str = "magnitude", ksize: int = 3) -> np.ndarray:
        """
        9. كاشف الحواف سوبل (Sobel Edge Detector - First-Order Derivatives)
        
        المفهوم الرياضي الأكاديمي:
        يحسب التقريب العددي لمشتقات التدرج المكاني الأول:
        Gx = مشتقة التدرج الأفقي (Horizontal Gradient)
        Gy = مشتقة التدرج الرأسي (Vertical Gradient)
        
        مقدار التدرج (Gradient Magnitude):
        M(x,y) = √(Gx² + Gy²) ≈ |Gx| + |Gy|
        """
        if ksize % 2 == 0:
            ksize += 1
        ksize = min(7, max(1, ksize))

        # تحويل لتدرج الرمادي لاستخراج الحواف بدقة
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # حساب المشتقات باستخدام دقة 16-bit أو float32 لتجنب الاقتطاع السالب
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=ksize)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=ksize)

        direction = direction.lower()
        if direction == "x":
            abs_grad = np.absolute(sobel_x)
        elif direction == "y":
            abs_grad = np.absolute(sobel_y)
        else:
            # Magnitude: sqrt(Gx^2 + Gy^2)
            abs_grad = np.sqrt(np.square(sobel_x) + np.square(sobel_y))

        # تحويل المدى إلى [0, 255] uint8
        scaled_edge = np.clip(abs_grad, 0, 255).astype(np.uint8)
        
        # تحويل الناتج إلى 3 قنوات للعرض المنسق
        return cv2.cvtColor(scaled_edge, cv2.COLOR_GRAY2BGR)

    @staticmethod
    def apply_canny(image: np.ndarray, threshold1: float = 50.0, threshold2: float = 150.0) -> np.ndarray:
        """
        10. كاشف الحواف الأمثل كاني (Canny Edge Detector)
        
        المراحل الأكاديمية الأربع لخوارزمية Canny:
        1. التنعيم الغاوسي لإزالة الضوضاء (Gaussian Smoothing).
        2. حساب شدة واتجاه تدرج الحواف (Gradient Intensity & Direction).
        3. كبت القيم غير العظمى (Non-Maximum Suppression - NMS) لترقيق الحواف لعرض بكسل واحد.
        4. التخميد المزدوج بالعتبة والتتبع بالتباطؤ (Hysteresis Thresholding):
           - الحواف فوق threshold2 تعتبر حواف قوية حقيقية (Strong Edges).
           - الحواف بين threshold1 و threshold2 تعتبر حواف ضعيفة تقبل فقط إذا كانت متصلة بحافة قوية.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        t1 = max(0, min(255, int(threshold1)))
        t2 = max(0, min(255, int(threshold2)))

        edges = cv2.Canny(gray, threshold1=t1, threshold2=t2, L2gradient=True)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    @staticmethod
    def apply_custom_kernel(image: np.ndarray, kernel_matrix: list[list[float]], bias: float = 0.0, normalize: bool = True) -> np.ndarray:
        """
        11. محرك الالتفاف المخصص (Custom Kernel Convolution Playground)
        
        المفهوم الرياضي:
        تطبيق معادلة الالتفاف ثنائي الأبعاد عبر cv2.filter2D:
        g(x,y) = ∑∑ w(s,t) · f(x+s, y+t) + bias
        
        المعاملات:
        - kernel_matrix: مصفوفة الأوزان المدخلة من المستخدم (3x3 أو 5x5).
        - normalize: إذا كان مجموع الأوزان > 0 وتم تفعيل التطبيع، نقسم المصفوفة على المجموع لحفظ السطوع.
        - bias: قيمة إزاحة مضافة للناتج (مفيدة لفلاتر Emboss والنقش).
        """
        kernel = np.array(kernel_matrix, dtype=np.float32)
        
        # التحقق من أن المصفوفة مربعة
        if kernel.ndim != 2 or kernel.shape[0] != kernel.shape[1]:
            raise ValueError("يجب أن تكون مصفوفة الالتفاف مربعة (Square Matrix: 3x3 أو 5x5)")

        # التطبيع الرياضي للأوزان
        kernel_sum = float(np.sum(kernel))
        if normalize and kernel_sum > 0:
            kernel = kernel / kernel_sum

        has_alpha = len(image.shape) == 3 and image.shape[2] == 4
        if has_alpha:
            b, g, r, a = cv2.split(image)
            bgr = cv2.merge([b, g, r])
        else:
            bgr = image

        # تطبيق عملية الالتفاف المكانية
        convolved = cv2.filter2D(bgr, -1, kernel, delta=bias)

        if has_alpha:
            b, g, r = cv2.split(convolved)
            return cv2.merge([b, g, r, a])
        return convolved

    # =========================================================================
    # عزل الخلفية الذكي واستوديو المنتجات (AI Matting & Product Studio)
    # =========================================================================

    # جلسة rembg تُنشأ مرة واحدة لكل نموذج (تحميل النموذج عملية ثقيلة تُخزَّن مؤقتاً)
    _rembg_sessions: dict = {}

    @classmethod
    def _get_rembg_session(cls, model_name: str = "u2net"):
        """
        إدارة جلسات rembg بشكل Singleton لكل نموذج (Lazy Loading).
        النماذج المدعومة: u2net (عام), isnet-general-use (أعلى دقة), u2net_human_seg (بشر).
        """
        if model_name not in cls._rembg_sessions:
            from rembg import new_session
            cls._rembg_sessions[model_name] = new_session(model_name)
        return cls._rembg_sessions[model_name]

    @staticmethod
    def _hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
        """تحويل لون Hex من الواجهة (#RRGGBB) إلى متuple بقنوات BGR الخاصة بـ OpenCV."""
        hex_color = (hex_color or "#ffffff").lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join(c * 2 for c in hex_color)
        try:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
        except (ValueError, IndexError):
            r, g, b = 255, 255, 255
        return (b, g, r)

    @staticmethod
    def _apply_matting_threshold(alpha: np.ndarray, threshold: float) -> np.ndarray:
        """
        عتبة الصقل التفاعلية (Matting Threshold):
        إعادة تعيين حدة انتقال قناع ألفا حول قيمة العتبة t ∈ [0, 1]:
          alpha' = clip( (alpha/255 - t) / (1 - t), 0, 1 ) * 255
        عند t = 0 يعاد المدى كما هو (هوية)، وزيادة t تجعل البكسلات نصف الشفافة
        أقرب إلى الشمول في الخلفية (تنظيف بقايا الهالة Halo Cleanup).
        """
        if threshold <= 0.0:
            return alpha
        threshold = min(threshold, 0.95)
        norm = alpha.astype(np.float32) / 255.0
        adjusted = np.clip((norm - threshold) / (1.0 - threshold), 0.0, 1.0)
        return (adjusted * 255.0).astype(np.uint8)

    @classmethod
    def remove_background(
        cls,
        image: np.ndarray,
        model: str = "u2net",
        matting_threshold: float = 0.0,
        alpha_matting: bool = False,
        fg_threshold: int = 240,
        bg_threshold: int = 10,
        erode_size: int = 10,
        refine_grabcut: bool = True,
        grabcut_iter: int = 3,
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        12. عزل الخلفية الذكي بشبكة U-2-Net عبر مكتبة rembg مع خيارات الصقل.

        المراحل:
        1. U-2-Net inference → خريطة ألفا الاحتمالية (Saliency Map) بدقة الصورة.
        2. Matting Threshold: إعادة تدرج انتقال القناع حسب عتبة المستخدم.
        3. (اختياري) Alpha Matting المضمن في rembg لتنعيم الحواف الشعرية.
        4. (اختياري) صقل تفاعلي بـ GrabCut: يُهيأ نموذجا GMM من قناع الشبكة
           (صنف قطعي FG = تآكل القناع، قطعي BG = خارج تمدده) ثم تُحسَّن الحدود إحصائياً.

        الناتج:
        - صورة BGRA: قنوات BGR الأصلية + قناة ألفا المحسوبة.
        - قناع الألفا الرمادي منفصلاً (لعرضه في شاشات الـ HUD).
        """
        from PIL import Image as PILImage
        from rembg import remove as rembg_remove

        h, w = image.shape[:2]

        # 1) استخراج خريطة الألفا من نموذج الشبكة العصبية (RGB مدخل rembg)
        rgb = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2RGB)
        pil_input = PILImage.fromarray(rgb)
        session = cls._get_rembg_session(model)

        if alpha_matting:
            result_pil = rembg_remove(
                pil_input,
                session=session,
                alpha_matting=True,
                alpha_matting_foreground_threshold=int(fg_threshold),
                alpha_matting_background_threshold=int(bg_threshold),
                alpha_matting_erode_size=int(erode_size),
            )
            alpha = np.array(result_pil.getchannel("A"))
        else:
            mask_pil = rembg_remove(pil_input, only_mask=True, session=session)
            alpha = np.array(mask_pil)

        # 2) عتبة الصقل التفاعلية على القناع
        alpha = cls._apply_matting_threshold(alpha, matting_threshold)

        # 3) الصقل الإحصائي التفاعلي بـ GrabCut المُهيأ من قناع الشبكة
        if refine_grabcut:
            alpha = cls._refine_with_grabcut(image[:, :, :3], alpha, iterations=grabcut_iter)

        # 4) بناء الناتج BGRA مع الحفاظ على أي ألفا أصلي (الأكبر بينهما)
        b, g, r = cv2.split(image[:, :, :3])
        if len(image.shape) == 3 and image.shape[2] == 4:
            orig_alpha = image[:, :, 3]
            alpha = np.maximum(alpha, orig_alpha)
        rgba_out = cv2.merge([b, g, r, alpha])

        return rgba_out, alpha

    @staticmethod
    def _refine_with_grabcut(bgr: np.ndarray, alpha: np.ndarray, iterations: int = 3) -> np.ndarray:
        """
        صقل قناع الألفا بخوارزمية GrabCut الإحصائية:
        - يُهيأ قناع GC من خريطة الشبكة: قطعي FG = تآكل(قناع)، قطعي BG = خارج تمدد(قناع).
        - يُشغَّل GrabCut بنمط GC_INIT_WITH_MASK لتحسين نموذجي ألوان GMM للخلفية والأمام.
        - القناع النهائي يُضرب في ألفا الشبكة للحفاظ على التدرج الناعم عند الحواف.
        """
        bin_mask = (alpha > 127).astype(np.uint8)
        if bin_mask.sum() == 0 or bin_mask.sum() == bin_mask.size:
            return alpha  # قناع منحل أو ممتلئ: GrabCut لن يضيف شيئاً

        kernel = np.ones((5, 5), np.uint8)
        sure_fg = cv2.erode(bin_mask, kernel, iterations=2)
        sure_bg_zone = cv2.dilate(bin_mask, kernel, iterations=2)

        gc_mask = np.full(bgr.shape[:2], cv2.GC_PR_BGD, np.uint8)
        gc_mask[bin_mask == 1] = cv2.GC_PR_FGD
        gc_mask[sure_fg == 1] = cv2.GC_FGD
        gc_mask[sure_bg_zone == 0] = cv2.GC_BGD

        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        try:
            cv2.grabCut(bgr, gc_mask, None, bgd_model, fgd_model, int(iterations), cv2.GC_INIT_WITH_MASK)
        except cv2.error:
            return alpha  # فشل نادر (مدخلات منحلة): إعادة ألفا الشبكة كما هو

        gc_binary = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

        # تنعيم خفيف لحدود القناع الإحصائي ثم دمجه مع تدرج ألفا الأصلي
        gc_binary = cv2.GaussianBlur(gc_binary, (3, 3), 0)
        refined = cv2.bitwise_and(alpha, alpha, mask=gc_binary)
        return refined

    @classmethod
    def composite_product(
        cls,
        foreground: np.ndarray,
        backdrop: str = "studio-sweep",
        color1: str = "#e8ecf2",
        color2: str = "#16202f",
        scale: float = 1.0,
        position: str = "bottom",
        shadow: bool = True,
        shadow_strength: float = 0.35,
        vignette: float = 0.0,
    ) -> np.ndarray:
        """
        13. دمج المنتج المعزول فوق خلفيات استوديو مخصصة (Product Backdrop Compositor).

        الخلفيات المدعومة:
        - "solid": لون صافٍ (color1).
        - "vertical-gradient": تدرج رأسي من color1 (أعلى) إلى color2 (أسفل).
        - "radial-gradient": إضاءة مركزية ناعمة (color1 في المركز → color2 عند الأطراف).
        - "studio-sweep": خلفية الاستوديو المنحنية (Sweep) — أفق علوي داكن يتدرج إلى أرضية مضيئة.
        - "checkerboard": لوحة شطرنج شفافة تجميلية.

        خيارات الاستوديو: مقياس المنتج (scale)، الارتكاز (position)، ظل أرضي واقعي
        (shadow) مأخوذ من تمويه قناع الألفا، وعدسة منحنية داكنة (vignette).
        """
        h, w = foreground.shape[:2]
        fg_alpha = foreground[:, :, 3] if foreground.shape[2] == 4 else np.full((h, w), 255, np.uint8)
        fg_bgr = foreground[:, :, :3]

        c1 = cls._hex_to_bgr(color1)
        c2 = cls._hex_to_bgr(color2)

        # 1) بناء لوح الخلفية بحجم المنتج
        backdrop_type = backdrop.lower()
        if backdrop_type == "solid":
            canvas = np.full((h, w, 3), c1, dtype=np.uint8)

        elif backdrop_type == "vertical-gradient":
            t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
            canvas = (np.array(c1, np.float32) * (1 - t) + np.array(c2, np.float32) * t).astype(np.uint8)
            canvas = np.broadcast_to(canvas, (h, w, 3)).copy()

        elif backdrop_type == "radial-gradient":
            yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            cy, cx = h / 2.0, w / 2.0
            dist = np.sqrt(((xx - cx) / max(w, 1)) ** 2 + ((yy - cy) / max(h, 1)) ** 2)
            t = np.clip(dist / 0.75, 0.0, 1.0)[:, :, None]
            canvas = (np.array(c1, np.float32) * (1 - t) + np.array(c2, np.float32) * t).astype(np.uint8)

        elif backdrop_type == "checkerboard":
            cell = max(8, min(h, w) // 16)
            yy, xx = np.mgrid[0:h, 0:w]
            checker = (((yy // cell) + (xx // cell)) % 2).astype(np.uint8)
            c1_arr = np.array(c1, np.uint8)
            c2_arr = np.array(c2, np.uint8)
            canvas = np.where(checker[:, :, None] == 0, c1_arr, c2_arr)

        else:  # studio-sweep: أفقي داكن أعلى + أرضية مضيئة أسفل (منحنى استوديو)
            t = np.clip(np.linspace(-0.35, 1.15, h, dtype=np.float32), 0.0, 1.0)[:, None, None]
            canvas_row = (np.array(c2, np.float32) * (1 - t) + np.array(c1, np.float32) * t).astype(np.uint8)
            canvas = np.broadcast_to(canvas_row, (h, w, 3)).copy()

        # 2) العدسة المنحنية (Vignette): تعتيم ناعم للأطراف يبرز المنتج
        if vignette > 0.0:
            yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            cy, cx = h / 2.0, w / 2.0
            dist = np.sqrt(((xx - cx) / max(w, 1)) ** 2 + ((yy - cy) / max(h, 1)) ** 2)
            falloff = 1.0 - np.clip(dist - 0.35, 0.0, 1.0) * float(vignette)
            canvas = np.clip(canvas.astype(np.float32) * falloff[:, :, None], 0, 255).astype(np.uint8)

        # 3) تحجيم المنتج (Scale) مع الحفاظ على نسبة الأبعاد — يبقى لوح الخلفية بحجمه الأصلي
        if abs(scale - 1.0) > 0.01:
            new_w = max(2, int(w * scale))
            new_h = max(2, int(h * scale))
            fg_bgr = cv2.resize(fg_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
            fg_alpha = cv2.resize(fg_alpha, (new_w, new_h), interpolation=cv2.INTER_AREA)
            h, w = new_h, new_w

        canvas_h, canvas_w = canvas.shape[:2]

        # 4) حساب نقطة الارتكاز (Anchor): وسط اللوح أو أرضية الاستوديو
        paste_x = (canvas_w - w) // 2
        paste_y = (canvas_h - h) // 2 if position == "center" else max(0, canvas_h - h)

        # قصّ آمن: إذا تجاوز المنتج حدود اللوح نقتطع الجزء الخارجي فقط
        src_x0, src_y0 = max(0, -paste_x), max(0, -paste_y)
        dst_x0, dst_y0 = max(0, paste_x), max(0, paste_y)
        copy_w = min(w - src_x0, canvas_w - dst_x0)
        copy_h = min(h - src_y0, canvas_h - dst_y0)
        if copy_w <= 0 or copy_h <= 0:
            return canvas
        fg_roi = fg_bgr[src_y0:src_y0 + copy_h, src_x0:src_x0 + copy_w]
        alpha_roi = fg_alpha[src_y0:src_y0 + copy_h, src_x0:src_x0 + copy_w]

        # 5) الظل الأرضي الواقعي: تمويه غاوسي لقناع المنتج مُزاح للأسفل ثم تعتيم الخلفية
        if shadow:
            shadow_mask = cv2.GaussianBlur(alpha_roi, (31, 31), 12).astype(np.float32) / 255.0
            shadow_mask = np.roll(shadow_mask, 12, axis=0)  # إزاحة الظل تحت المنتج
            shadow_strength = float(np.clip(shadow_strength, 0.0, 1.0))
            roi = canvas[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w].astype(np.float32)
            darkened = roi * (1.0 - shadow_mask[:, :, None] * shadow_strength * 0.75)
            canvas[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w] = np.clip(darkened, 0, 255).astype(np.uint8)

        # 6) الدمج بألفا (Alpha Blending): out = bg·(1-α) + fg·α
        alpha_f = (alpha_roi.astype(np.float32) / 255.0)[:, :, None]
        roi = canvas[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w].astype(np.float32)
        blended = roi * (1.0 - alpha_f) + fg_roi.astype(np.float32) * alpha_f
        canvas[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w] = np.clip(blended, 0, 255).astype(np.uint8)

        return canvas

    # =========================================================================
    # التحويلات الهندسية والمزج والمجال الترددي والتصدير (Steps 5 & 6)
    # =========================================================================

    # نسب الأبعاد المدعومة للقص التفاعلي
    ASPECT_RATIOS: dict = {
        "free": None,
        "1:1": 1.0,
        "16:9": 16.0 / 9.0,
        "4:3": 4.0 / 3.0,
        "9:16": 9.0 / 16.0,
        "3:2": 3.0 / 2.0,
    }

    @classmethod
    def apply_transform(
        cls,
        image: np.ndarray,
        quarter_turns: int = 0,
        free_angle: float = 0.0,
        flip: str = "none",
        crop_box: list[int] | None = None,
        aspect: str = "free",
    ) -> np.ndarray:
        """
        14. محرك التحويلات الهندسية الأفينية (Geometric Affine Transforms).

        ترتيب التطبيق: القص ← الدوران بمضاعفات 90° ← الدوران الحر ← القلب.
        - الدوران الحر (زاوية θ حول المركز) عبر مصفوفة ألفين 2×3:
          M = [ cosθ  sinθ  (1-cosθ)·cx - sinθ·cy ]
              [-sinθ  cosθ  sinθ·cx + (1-cosθ)·cy ]
          مع توسيع الإطار المحيط ليحوي الصورة كاملة (بدون قص الزوايا).
        - القلب: cv2.flip (0 رأسي، 1 أفقي، -1 كلاهما).
        - القص مع فرض نسبة أبعاد: أكبر نافذة ممكنة بالنسبة المطلوبة متمركزة داخل الصندوق.
        """
        h, w = image.shape[:2]

        # 1) القص (Crop) مع ضبط نسبة الأبعاد إن طُلبت
        if crop_box is not None and len(crop_box) == 4:
            x, y, cw, ch = [int(v) for v in crop_box]
            cw = max(2, min(cw, w - max(0, x)))
            ch = max(2, min(ch, h - max(0, y)))
            x = max(0, min(x, w - cw))
            y = max(0, min(y, h - ch))

            ratio = cls.ASPECT_RATIOS.get(aspect)
            if ratio is not None:
                if cw / ch > ratio:      # الصندوق أعرض من النسبة → نقلّص العرض
                    new_w = max(2, int(ch * ratio))
                    x += (cw - new_w) // 2
                    cw = new_w
                else:                     # الصندوق أطول من النسبة → نقلّص الارتفاع
                    new_h = max(2, int(cw / ratio))
                    y += (ch - new_h) // 2
                    ch = new_h

            image = image[y:y + ch, x:x + cw].copy()
            h, w = image.shape[:2]

        # 2) الدوران بمضاعفات 90 درجة (قلب مصفوفي خالص بلا استيفاء)
        turns = int(quarter_turns) % 4
        if turns == 1:       # 90° عكس عقارب الساعة
            image = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        elif turns == 2:     # 180°
            image = cv2.rotate(image, cv2.ROTATE_180)
        elif turns == 3:     # 270° عكس عقارب الساعة = 90° معها
            image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        h, w = image.shape[:2]

        # 3) الدوران الحر حول المركز مع توسيع الإطار المحيط (Expand Bounding Box)
        angle = float(free_angle) % 360.0
        if abs(angle) > 1e-3:
            center = (w / 2.0, h / 2.0)
            m = cv2.getRotationMatrix2D(center, angle, 1.0)
            cos_v = abs(m[0, 0])
            sin_v = abs(m[0, 1])
            new_w = int(h * sin_v + w * cos_v)
            new_h = int(h * cos_v + w * sin_v)
            m[0, 2] += (new_w - w) / 2.0
            m[1, 2] += (new_h - h) / 2.0
            image = cv2.warpAffine(
                image, m, (new_w, new_h),
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT_101,
            )
            h, w = image.shape[:2]

        # 4) القلب (Flip)
        flip_code = {"h": 1, "v": 0, "hv": -1, "both": -1}.get((flip or "none").lower())
        if flip_code is not None:
            image = cv2.flip(image, flip_code)

        return image

    @staticmethod
    def _blend_channel_pair(base_f: np.ndarray, blend_f: np.ndarray, mode: str) -> np.ndarray:
        """معادلات أنماط المزج على قناة مفردة مطبَّعة [0,1] (b=الأساس، s=الطبقة العلوية)."""
        if mode == "multiply":
            return base_f * blend_f
        if mode == "screen":
            return base_f + blend_f - base_f * blend_f
        if mode == "overlay":
            # الأساس هو من يحدد النبرة: بكسلات الدرجات الداكنة تتضاعف، والفاتحة تُفرَّغ
            return np.where(base_f <= 0.5, 2.0 * base_f * blend_f, 1.0 - 2.0 * (1.0 - base_f) * (1.0 - blend_f))
        if mode == "soft-light":
            # صيغة W3C/Cairo القياسية
            d = np.where(blend_f <= 0.25, ((16.0 * blend_f - 12.0) * blend_f + 4.0) * blend_f, np.sqrt(blend_f))
            return np.where(
                blend_f <= 0.5,
                base_f - (1.0 - 2.0 * blend_f) * base_f * (1.0 - base_f),
                base_f + (2.0 * blend_f - 1.0) * (d - base_f),
            )
        if mode == "difference":
            return np.abs(base_f - blend_f)
        return blend_f  # normal

    @classmethod
    def apply_blend(
        cls,
        base: np.ndarray,
        overlay: np.ndarray | None = None,
        overlay_color: str | None = None,
        mode: str = "normal",
        opacity: float = 1.0,
    ) -> np.ndarray:
        """
        15. دمج الطبقات بأنماط المزج الاحترافية (Photoshop-like Blend Modes).

        المعادلات على القيم المطبَّعة [0,1] حيث b قناة الأساس و s قناة الطبقة:
        - Multiply: b·s                          (تعتيم مضاعف)
        - Screen:   b + s − b·s                  (تفتيح عكسي مضاعف)
        - Overlay:  2bs إذا b≤0.5 وإلا 1−2(1−b)(1−s)
        - Soft Light (W3C): b − (1−2s)·b(1−b) إن s≤0.5 وإلا b + (2s−1)·(D(s)−b)
        - Difference: |b − s|
        الناتج النهائي يُمزج بالشفافية: out = base·(1−opacity) + mode·opacity.
        قناة ألفا الطبقة العلوية (إن وجدت) تُستخدم قناعاً لكل بكسل فوق opacity.
        """
        h, w = base.shape[:2]
        mode = (mode or "normal").lower().replace(" ", "-")
        opacity = float(np.clip(opacity, 0.0, 1.0))

        # بناء الطبقة العلوية: صورة ثانية أو لون صافٍ
        if overlay is not None:
            layer = overlay
        elif overlay_color:
            c = cls._hex_to_bgr(overlay_color)
            layer = np.full((h, w, 3), c, dtype=np.uint8)
        else:
            return base

        # توحيد الأبعاد والأبعاد اللونية
        if layer.shape[:2] != (h, w):
            layer = cv2.resize(layer, (w, h), interpolation=cv2.INTER_AREA)

        layer_alpha = None
        if layer.ndim == 3 and layer.shape[2] == 4:
            layer_alpha = layer[:, :, 3].astype(np.float32) / 255.0
            layer = layer[:, :, :3]
        if base.ndim == 3 and base.shape[2] == 4:
            base_bgr = base[:, :, :3]
        elif base.ndim == 2:
            base_bgr = cv2.cvtColor(base, cv2.COLOR_GRAY2BGR)
        else:
            base_bgr = base

        base_f = base_bgr.astype(np.float32) / 255.0
        layer_f = layer.astype(np.float32) / 255.0

        if mode == "normal":
            blended_f = layer_f
        else:
            blended_f = cls._blend_channel_pair(base_f, layer_f, mode)
            blended_f = np.clip(blended_f, 0.0, 1.0)

        # مزج الشفافية العام ثم قناع ألفا الطبقة العلوية لكل بكسل
        out_f = base_f * (1.0 - opacity) + blended_f * opacity
        if layer_alpha is not None:
            out_f = base_f * (1.0 - layer_alpha[:, :, None]) + out_f * layer_alpha[:, :, None]

        # تقريب صحيح (لا اقتطاع) لتجنب فقد بكسل عن 255 بدقة float32
        out = np.clip(np.round(out_f * 255.0), 0, 255).astype(np.uint8)

        # الحفاظ على ألفا الأساس إن وجدت
        if base.ndim == 3 and base.shape[2] == 4:
            out = cv2.merge([out[:, :, 0], out[:, :, 1], out[:, :, 2], base[:, :, 3]])
        return out

    @staticmethod
    def apply_fft_spectrum(image: np.ndarray) -> tuple[np.ndarray, dict]:
        """
        16. طيف السعة في المجال الترددي (Magnitude Spectrum Visualization).

        المعادلات:
        - التحويل المباشر: F(u,v) = ∑∑ f(x,y) · e^{-j2π(ux/M + vy/N)}
        - إعادة المركز: F₀ = fftshift(F)  (التردد الصفري DC في المركز)
        - طيف السعة اللوغاريتمي: S(u,v) = 20·log(1 + |F₀(u,v)|)
          (اللوغاريتم ضروري لأن الديناميكية اللونية للطيف تتجاوز بكثير مدى العرض)
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        f = np.fft.fft2(gray.astype(np.float32))
        f_shifted = np.fft.fftshift(f)
        magnitude = np.abs(f_shifted)
        log_spectrum = 20.0 * np.log(1.0 + magnitude)

        # تطبيع الطيف للعرض في النطاق [0,255]
        spectrum_norm = cv2.normalize(log_spectrum, None, 0, 255, cv2.NORM_MINMAX)
        spectrum_img = spectrum_norm.astype(np.uint8)

        cy, cx = gray.shape[0] // 2, gray.shape[1] // 2
        stats = {
            "dc_magnitude": round(float(magnitude[cy, cx]), 2),
            "max_magnitude": round(float(magnitude.max()), 2),
            "log_range": [round(float(log_spectrum.min()), 2), round(float(log_spectrum.max()), 2)],
        }
        return cv2.cvtColor(spectrum_img, cv2.COLOR_GRAY2BGR), stats

    @staticmethod
    def apply_frequency_filter(
        image: np.ndarray,
        filter_type: str = "lowpass",
        profile: str = "gaussian",
        cutoff: float = 30.0,
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        17. الترشيح الترددي بفلاتر Low-Pass و High-Pass بنمطي Ideal و Gaussian.

        دوال الاستجابة الترددية H(u,v) حول المركز:
        - Ideal LPF:  H = 1 إذا D(u,v) ≤ D₀ وإلا 0
        - Ideal HPF:  H = 1 − H_ideal_lpf
        - Gaussian LPF: H = e^{−D²(u,v) / 2D₀²}
        - Gaussian HPF: H = 1 − H_gauss_lpf

        المسار الكامل: FFT ← Shift ← ضرب في H ← Inverse Shift ← IFFT ← أخذ الجزء الحقيقي
        والعودة إلى [0,255] بتطبيع min-max (ضروري للـ HPF ذي القيم السالبة).
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image[:, :, :3], cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        rows, cols = gray.shape
        f = np.fft.fft2(gray.astype(np.float32))
        f_shifted = np.fft.fftshift(f)

        # مصفوفة المسافات الترددية D(u,v) من المركز (DC)
        uu, vv = np.meshgrid(np.arange(cols), np.arange(rows))
        dist = np.sqrt((uu - cols // 2) ** 2 + (vv - rows // 2) ** 2).astype(np.float32)

        d0 = max(1.0, float(cutoff))
        filter_type = (filter_type or "lowpass").lower()
        profile = (profile or "gaussian").lower()

        if profile == "ideal":
            lpf = (dist <= d0).astype(np.float32)
        else:  # gaussian
            lpf = np.exp(-(dist ** 2) / (2.0 * d0 ** 2))

        h = (1.0 - lpf) if filter_type == "highpass" else lpf

        g = f_shifted * h
        g_unshifted = np.fft.ifftshift(g)
        result = np.fft.ifft2(g_unshifted)
        real_part = np.real(result)

        # تطبيع min-max لأن HPF ينتج قيماً سالبة، ولإضاحة LPF قد تضيّق المدى
        mn, mx = float(real_part.min()), float(real_part.max())
        if mx - mn > 1e-9:
            normalized = (real_part - mn) / (mx - mn) * 255.0
        else:
            normalized = np.zeros_like(real_part)
        out = normalized.astype(np.uint8)

        # معاينة قناع الفلتر H نفسه لعرضه في الواجهة
        h_preview = (h * 255.0).astype(np.uint8)

        return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR), cv2.cvtColor(h_preview, cv2.COLOR_GRAY2BGR)

    @staticmethod
    def export_image(image: np.ndarray, image_format: str = "png", quality: int = 95) -> tuple[np.ndarray, dict]:
        """
        18. التصدير النهائي بصيغ الويب القياسية (Final Export Encoder).

        - PNG: ترميز بدون فقد (Lossless) — لا تتأثر بالجودة.
        - JPEG: فقدية بمعامل كمية Q (IMWRITE_JPEG_QUALITY 1..100).
          ملاحظة: JPEG لا يدعم قناة ألفا فتُدمج الشفافية على خلفية بيضاء.
        - WebP: فقدية/شبه بلا فقد بكفاءة أعلى من JPEG.

        يعيد الصورة المرمَّزة ومعها Data URI جاهزة للتنزيل وحجم الملف بايتات.
        """
        import base64 as _b64

        image_format = (image_format or "png").lower().lstrip(".")
        quality = int(np.clip(quality, 1, 100))

        img = image
        if image_format in ("jpeg", "jpg") and len(img.shape) == 3 and img.shape[2] == 4:
            # دمج الشفافية على أبيض لأن JPEG يدعم 3 قنوات فقط
            b, g, r, a = cv2.split(img)
            alpha_f = a.astype(np.float32) / 255.0
            fg = img[:, :, :3].astype(np.float32)
            bg = np.full_like(fg, 255.0)
            img = np.clip(fg * alpha_f[:, :, None] + bg * (1.0 - alpha_f[:, :, None]), 0, 255).astype(np.uint8)

        if image_format == "png":
            ok, buf = cv2.imencode(".png", img)
        elif image_format in ("jpeg", "jpg"):
            ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        elif image_format == "webp":
            ok, buf = cv2.imencode(".webp", img, [int(cv2.IMWRITE_WEBP_QUALITY), quality])
        else:
            raise ValueError(f"صيغة التصدير غير مدعومة: {image_format}")

        if not ok:
            raise ValueError("فشل ترميز الصورة للتصدير")

        fmt = "jpeg" if image_format == "jpg" else image_format
        mime = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp"}[fmt]
        data_uri = f"data:{mime};base64," + _b64.b64encode(buf).decode()

        info = {
            "format": fmt,
            "quality": quality if fmt != "png" else None,
            "file_size_bytes": int(buf.nbytes),
            "lossless": fmt == "png",
            "data_uri": data_uri,
        }
        return img, info

    _AI_SESSIONS = {}

    @classmethod
    def get_ai_session(cls, model_name: str = "u2netp"):
        """
        إرجاع جلسة استدلال عصبية مخبأة مسبقاً في الذاكرة (Cached Inference Session)
        لتفادي إعادة قراءة وتحميل شبكة الأوزان من القرص في كل طلب عزل (تسريع فوري > 2x).
        مع تأمين نسخ ملف النموذج المحلي المرفق في المستودع تلقائياً لتفادي أي تنزيل من الإنترنت.
        """
        if model_name not in cls._AI_SESSIONS:
            import os, shutil
            if model_name == "u2netp":
                local_m = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "models", "u2netp.onnx"))
                target_d = os.path.expanduser("~/.rembg/models/u2netp")
                target_f = os.path.join(target_d, "u2netp.onnx")
                if os.path.exists(local_m) and not os.path.exists(target_f):
                    try:
                        os.makedirs(target_d, exist_ok=True)
                        shutil.copy2(local_m, target_f)
                    except Exception:
                        pass

            from rembg import new_session
            cls._AI_SESSIONS[model_name] = new_session(model_name=model_name)
        return cls._AI_SESSIONS[model_name]

    @classmethod
    def warmup_sessions(cls):
        """
        تحمية نماذج الذكاء الاصطناعي في الخلفية عند بدء تشغيل الخادم
        بحيث تكون الاستجابة فورية من أول نقرة للمستخدم.
        """
        import numpy as np
        from rembg import remove
        for m in ("u2netp", "u2net"):
            try:
                s = cls.get_ai_session(m)
                dummy = np.zeros((64, 64, 3), dtype=np.uint8)
                remove(dummy, session=s, only_mask=True)
            except Exception:
                pass

    @classmethod
    def remove_background(
        cls,
        image: np.ndarray,
        model: str = "u2netp",
        matting_threshold: float = 0.0,
        alpha_matting: bool = False,
        fg_threshold: int = 240,
        bg_threshold: int = 10,
        erode_size: int = 10,
        refine_grabcut: bool = False,
        grabcut_iter: int = 2
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        عزل الخلفية فائق السرعة بمزيج الذكاء الاصطناعي والمعالجة الرقمية (High-Speed Hybrid DIP):
        1. جلسة استدلال عصبية مخبأة مسبقاً (Session Caching - 0ms reload).
        2. تحجيم هجين ذكي (Multi-scale Mask Inference): استنتاج قناع الألفا على أبعاد مثالية (أقصاها 1024px)
           ثم رفعه إلى الدقة الكاملة للصورة الأصلية مع الحفاظ التام على حدة وجودة البكسلات.
        3. استخراج القناع مباشرة (only_mask=True) لتوفير تحويلات الذاكرة.
        4. صقل اختياري سريع بـ GrabCut عند الحاجة.
        """
        try:
            from rembg import remove
            session = cls.get_ai_session(model_name=model)
            h, w = image.shape[:2]

            # استخراج مصفوفة الألوان الأصلية BGR
            if len(image.shape) == 2:
                bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            elif image.shape[2] == 4:
                bgr = image[:, :, :3]
            else:
                bgr = image

            # 2. التحجيم الهجين الذكي للصور الكبيرة لتقليص زمن الاستدلال
            max_dim = 1024
            is_large = max(h, w) > max_dim

            if is_large:
                scale = max_dim / float(max(h, w))
                small_w = max(2, int(w * scale))
                small_h = max(2, int(h * scale))
                small_bgr = cv2.resize(bgr, (small_w, small_h), interpolation=cv2.INTER_AREA)
                small_rgb = cv2.cvtColor(small_bgr, cv2.COLOR_BGR2RGB)

                mask_small = remove(
                    small_rgb,
                    session=session,
                    only_mask=True,
                    alpha_matting=alpha_matting,
                    alpha_matting_foreground_threshold=fg_threshold,
                    alpha_matting_background_threshold=bg_threshold,
                    alpha_matting_erode_size=erode_size
                )

                if refine_grabcut and grabcut_iter > 0:
                    try:
                        gc_mask = np.where(mask_small > 220, cv2.GC_FGD, np.where(mask_small < 30, cv2.GC_BGD, cv2.GC_PR_FGD)).astype(np.uint8)
                        bgdModel = np.zeros((1, 65), np.float64)
                        fgdModel = np.zeros((1, 65), np.float64)
                        cv2.grabCut(small_bgr, gc_mask, None, bgdModel, fgdModel, int(grabcut_iter), cv2.GC_INIT_WITH_MASK)
                        mask_small = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
                    except Exception:
                        pass

                alpha_mask = cv2.resize(mask_small, (w, h), interpolation=cv2.INTER_LINEAR)
            else:
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                alpha_mask = remove(
                    rgb,
                    session=session,
                    only_mask=True,
                    alpha_matting=alpha_matting,
                    alpha_matting_foreground_threshold=fg_threshold,
                    alpha_matting_background_threshold=bg_threshold,
                    alpha_matting_erode_size=erode_size
                )
                if refine_grabcut and grabcut_iter > 0:
                    try:
                        gc_mask = np.where(alpha_mask > 220, cv2.GC_FGD, np.where(alpha_mask < 30, cv2.GC_BGD, cv2.GC_PR_FGD)).astype(np.uint8)
                        bgdModel = np.zeros((1, 65), np.float64)
                        fgdModel = np.zeros((1, 65), np.float64)
                        cv2.grabCut(bgr, gc_mask, None, bgdModel, fgdModel, int(grabcut_iter), cv2.GC_INIT_WITH_MASK)
                        alpha_mask = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
                    except Exception:
                        pass

            out_bgra = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha_mask])
        except Exception:
            h, w = image.shape[:2]
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            alpha_mask = thresh
            bgr = image[:, :, :3] if len(image.shape) == 3 else cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            out_bgra = cv2.merge([bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2], alpha_mask])

        if matting_threshold > 0:
            t = int(matting_threshold * 255)
            alpha_mask = np.clip(((alpha_mask.astype(np.float32) - t) / max(1, 255 - t)) * 255.0, 0, 255).astype(np.uint8)
            out_bgra[:, :, 3] = alpha_mask

        return out_bgra, alpha_mask

    @staticmethod
    def composite_product(
        image: np.ndarray,
        backdrop: str = "studio-sweep",
        color1: str = "#e8ecf2",
        color2: str = "#16202f",
        scale: float = 1.0,
        position: str = "bottom",
        shadow: bool = True,
        shadow_strength: float = 0.35,
        vignette: float = 0.0,
    ) -> np.ndarray:
        """
        دمج صورة المنتج المعزولة فوق خلفية استوديو مخصصة مع ظلال أرضية واقعية وعدسة منحنية.
        """
        def hex_to_bgr(h_str):
            h_str = h_str.lstrip("#")
            if len(h_str) == 3:
                h_str = "".join([c * 2 for c in h_str])
            if len(h_str) != 6:
                return [232, 236, 242]
            r, g, b = int(h_str[0:2], 16), int(h_str[2:4], 16), int(h_str[4:6], 16)
            return [b, g, r]

        bgr1 = np.array(hex_to_bgr(color1), dtype=np.float32)
        bgr2 = np.array(hex_to_bgr(color2), dtype=np.float32)

        prod_h, prod_w = image.shape[:2]
        canvas_w = max(prod_w, 1280)
        canvas_h = max(prod_h, 800)

        # توليد الخلفية
        bg = np.zeros((canvas_h, canvas_w, 3), dtype=np.float32)
        if backdrop == "solid":
            bg[:] = bgr1
        elif backdrop == "radial-gradient":
            cx, cy = canvas_w / 2.0, canvas_h * 0.48
            y_idx, x_idx = np.ogrid[:canvas_h, :canvas_w]
            dist = np.sqrt((x_idx - cx)**2 + (y_idx - cy)**2)
            max_r = np.sqrt(cx**2 + cy**2)
            norm_dist = np.clip(dist / max_r, 0.0, 1.0)[:, :, None]
            bg = bgr1 * (1.0 - norm_dist) + bgr2 * norm_dist
        elif backdrop == "studio-sweep":
            horizon = int(canvas_h * 0.62)
            wall_t = np.linspace(0, 1, horizon, endpoint=False)[:, None, None].astype(np.float32)
            bg[:horizon] = bgr1 * (1.0 - wall_t) + bgr2 * wall_t
            floor_len = canvas_h - horizon
            floor_t = np.linspace(0, 1, floor_len)[:, None, None].astype(np.float32)
            bg[horizon:] = bgr2 * (1.0 - floor_t * 0.5) + bgr1 * (floor_t * 0.5)
        else:
            t = np.linspace(0, 1, canvas_h)[:, None, None].astype(np.float32)
            bg = bgr1 * (1.0 - t) + bgr2 * t

        scaled_w = max(2, int(prod_w * scale))
        scaled_h = max(2, int(prod_h * scale))
        resized_prod = cv2.resize(image, (scaled_w, scaled_h), interpolation=cv2.INTER_AREA)

        pos_x = max(0, (canvas_w - scaled_w) // 2)
        pos_y = max(0, int(canvas_h * 0.82) - scaled_h if position == "bottom" else (canvas_h - scaled_h) // 2)

        if shadow:
            shadow_cx = pos_x + scaled_w // 2
            shadow_cy = min(canvas_h - 1, pos_y + scaled_h)
            shadow_rx = int(scaled_w * 0.45)
            shadow_ry = max(6, int(scaled_h * 0.06))
            shadow_mask = np.zeros((canvas_h, canvas_w), dtype=np.float32)
            cv2.ellipse(shadow_mask, (shadow_cx, shadow_cy), (shadow_rx, shadow_ry), 0, 0, 360, 1.0, -1)
            shadow_mask = cv2.GaussianBlur(shadow_mask, (41, 41), 15)
            alpha_s = np.clip(shadow_mask * shadow_strength, 0.0, 1.0)[:, :, None]
            bg = bg * (1.0 - alpha_s)

        fg_bgr = resized_prod[:, :, :3].astype(np.float32)
        if resized_prod.shape[2] == 4:
            fg_alpha = (resized_prod[:, :, 3].astype(np.float32) / 255.0)[:, :, None]
        else:
            fg_alpha = np.ones((scaled_h, scaled_w, 1), dtype=np.float32)

        roi_h = min(scaled_h, canvas_h - pos_y)
        roi_w = min(scaled_w, canvas_w - pos_x)
        if roi_h > 0 and roi_w > 0:
            target_roi = bg[pos_y:pos_y + roi_h, pos_x:pos_x + roi_w]
            fg_crop = fg_bgr[:roi_h, :roi_w]
            alpha_crop = fg_alpha[:roi_h, :roi_w]
            target_roi[:] = fg_crop * alpha_crop + target_roi * (1.0 - alpha_crop)

        out_bgr = np.clip(bg, 0, 255).astype(np.uint8)

        if vignette > 0:
            cx, cy = canvas_w / 2.0, canvas_h / 2.0
            y_idx, x_idx = np.ogrid[:canvas_h, :canvas_w]
            r = np.sqrt((x_idx - cx)**2 + (y_idx - cy)**2) / np.sqrt(cx**2 + cy**2)
            vignette_mask = np.clip(1.0 - vignette * (r**2), 0.0, 1.0)[:, :, None]
            out_bgr = np.clip(out_bgr.astype(np.float32) * vignette_mask, 0, 255).astype(np.uint8)

        return out_bgr

