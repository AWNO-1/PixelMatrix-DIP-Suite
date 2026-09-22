import unittest
import numpy as np
import cv2
from services.dip_service import DIPService
from utils.image_converter import cv2_to_base64, base64_to_cv2, calculate_histogram_data

class TestDIPService(unittest.TestCase):

    def setUp(self):
        # إنشاء صورة اختبارية اصطناعية 100x100 بتدرج ألوان مع قناة ألفا
        np.random.seed(42)
        self.color_img = np.random.randint(50, 200, (100, 100, 3), dtype=np.uint8)
        self.rgba_img = np.random.randint(50, 200, (100, 100, 4), dtype=np.uint8)
        self.gray_img = np.random.randint(50, 200, (100, 100), dtype=np.uint8)

    def test_brightness_contrast(self):
        # اختبار زيادة السطوع والتباين
        bright = DIPService.adjust_brightness_contrast(self.color_img, brightness=30, contrast=20)
        self.assertEqual(bright.shape, self.color_img.shape)
        self.assertEqual(bright.dtype, np.uint8)
        # عند زيادة السطوع، يجب أن يكون متوسط الشدة أعلى
        self.assertGreater(np.mean(bright), np.mean(self.color_img))

    def test_gamma_correction(self):
        # اختبار تصحيح جاما (gamma < 1 يجعل الصورة أفتح، gamma > 1 يجعل الصورة أغمق)
        bright_gamma = DIPService.adjust_gamma(self.color_img, gamma=0.5)
        dark_gamma = DIPService.adjust_gamma(self.color_img, gamma=2.0)
        self.assertEqual(bright_gamma.shape, self.color_img.shape)
        self.assertGreater(np.mean(bright_gamma), np.mean(self.color_img))
        self.assertLess(np.mean(dark_gamma), np.mean(self.color_img))

    def test_histogram_equalization(self):
        # اختبار معادلة الهستوجرام الشاملة و CLAHE
        clahe_img = DIPService.histogram_equalization(self.color_img, method="clahe")
        global_eq = DIPService.histogram_equalization(self.color_img, method="global")
        self.assertEqual(clahe_img.shape, self.color_img.shape)
        self.assertEqual(global_eq.shape, self.color_img.shape)

    def test_image_inversion(self):
        # اختبار عكس الألوان s = 255 - r
        inv = DIPService.invert_colors(self.color_img)
        expected = 255 - self.color_img
        np.testing.assert_array_equal(inv, expected)

        # اختبار الحفاظ على قناة الشفافية عند العكس
        inv_rgba = DIPService.invert_colors(self.rgba_img)
        self.assertEqual(inv_rgba.shape, self.rgba_img.shape)
        np.testing.assert_array_equal(inv_rgba[:, :, 3], self.rgba_img[:, :, 3])

    def test_otsu_threshold(self):
        # اختبار عتبة أوتسو الذكية
        binary_img, threshold_val = DIPService.otsu_threshold(self.color_img)
        self.assertEqual(binary_img.shape, self.color_img.shape)
        self.assertTrue(0 <= threshold_val <= 255)
        # القيم يجب أن تكون إما 0 أو 255 فقط
        unique_vals = np.unique(binary_img)
        for val in unique_vals:
            self.assertIn(val, [0, 255])

    def test_apply_blur(self):
        # اختبار فلاتر التنعيم المختلفة
        gaussian = DIPService.apply_blur(self.color_img, blur_type="gaussian", ksize=5, sigma=1.2)
        median = DIPService.apply_blur(self.color_img, blur_type="median", ksize=5)
        mean_blur = DIPService.apply_blur(self.color_img, blur_type="mean", ksize=5)
        
        self.assertEqual(gaussian.shape, self.color_img.shape)
        self.assertEqual(median.shape, self.color_img.shape)
        self.assertEqual(mean_blur.shape, self.color_img.shape)
        self.assertEqual(gaussian.dtype, np.uint8)

    def test_apply_bilateral_filter(self):
        # اختبار فلتر التنعيم ثنائي الجوانب لحفظ الحواف
        bilateral = DIPService.apply_bilateral_filter(self.color_img, d=9, sigma_color=75, sigma_space=75)
        self.assertEqual(bilateral.shape, self.color_img.shape)
        self.assertEqual(bilateral.dtype, np.uint8)

    def test_apply_sharpen(self):
        # اختبار زيادة الحدة بأسلوبي unsharp و laplacian
        sharp_unsharp = DIPService.apply_sharpen(self.color_img, amount=1.5, method="unsharp")
        sharp_laplacian = DIPService.apply_sharpen(self.color_img, amount=1.0, method="laplacian")
        self.assertEqual(sharp_unsharp.shape, self.color_img.shape)
        self.assertEqual(sharp_laplacian.shape, self.color_img.shape)

    def test_apply_sobel(self):
        # اختبار كاشف سوبل بالاتجاهات المختلفة
        sobel_mag = DIPService.apply_sobel(self.color_img, direction="magnitude", ksize=3)
        sobel_x = DIPService.apply_sobel(self.color_img, direction="x", ksize=3)
        sobel_y = DIPService.apply_sobel(self.color_img, direction="y", ksize=3)
        
        self.assertEqual(sobel_mag.shape, self.color_img.shape)
        self.assertEqual(sobel_x.shape, self.color_img.shape)
        self.assertEqual(sobel_y.shape, self.color_img.shape)

    def test_apply_canny(self):
        # اختبار كاشف كاني الأمثل
        canny = DIPService.apply_canny(self.color_img, threshold1=50, threshold2=150)
        self.assertEqual(canny.shape, self.color_img.shape)
        self.assertEqual(canny.dtype, np.uint8)

    def test_apply_custom_kernel(self):
        # مصفوفة زيادة حدة مخصصة 3x3
        sharpen_kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ]
        result = DIPService.apply_custom_kernel(self.color_img, sharpen_kernel, bias=0.0, normalize=True)
        self.assertEqual(result.shape, self.color_img.shape)
        self.assertEqual(result.dtype, np.uint8)

        # مصفوفة نقش 3x3 مع bias
        emboss_kernel = [
            [-2, -1, 0],
            [-1,  1, 1],
            [ 0,  1, 2]
        ]
        emboss_res = DIPService.apply_custom_kernel(self.color_img, emboss_kernel, bias=128.0, normalize=False)
        self.assertEqual(emboss_res.shape, self.color_img.shape)
        self.assertEqual(emboss_res.dtype, np.uint8)

    def test_base64_conversion_and_histogram(self):
        # اختبار دورة التحويل من وإلى Base64
        b64_str = cv2_to_base64(self.color_img)
        self.assertTrue(b64_str.startswith("data:image/png;base64,"))
        decoded = base64_to_cv2(b64_str)
        self.assertEqual(decoded.shape, self.color_img.shape)

        # اختبار حساب الهستوجرام
        hist = calculate_histogram_data(self.color_img)
        self.assertIn("r", hist)
        self.assertIn("g", hist)
        self.assertIn("b", hist)
        self.assertEqual(len(hist["r"]), 32)

    # =========================================================================
    # اختبارات عزل الخلفية الذكي واستوديو المنتجات (Step 4)
    # =========================================================================

    def setUp_step4_product(self):
        # منتج RGBA اصطناعي: دائرة معتمة على خلفية شفافة تماماً
        fg = np.zeros((100, 100, 4), dtype=np.uint8)
        cv2.circle(fg, (50, 50), 30, (200, 150, 100, 255), -1)
        return fg

    def test_hex_to_bgr_conversion(self):
        # تحويل Hex الواجهة إلى قنوات BGR الخاصة بـ OpenCV
        self.assertEqual(DIPService._hex_to_bgr("#ff0000"), (0, 0, 255))
        self.assertEqual(DIPService._hex_to_bgr("#00ff00"), (0, 255, 0))
        self.assertEqual(DIPService._hex_to_bgr("#0000ff"), (255, 0, 0))
        # لون غير صالح يعود للأبيض افتراضياً
        self.assertEqual(DIPService._hex_to_bgr("#zzzzzz"), (255, 255, 255))

    def test_matting_threshold_remap(self):
        # عتبة الهوية: لا تغيير إطلاقاً عند t = 0
        alpha = np.array([0, 64, 128, 192, 255], dtype=np.uint8)
        np.testing.assert_array_equal(DIPService._apply_matting_threshold(alpha, 0.0), alpha)

        # عتبة 0.5: تنظف الشفافيات الجزئية دون المساس بالصفر والاعتمام الكامل
        raised = DIPService._apply_matting_threshold(alpha, 0.5)
        self.assertEqual(int(raised[0]), 0)
        self.assertEqual(int(raised[-1]), 255)
        self.assertTrue(np.all(raised[1:-1] <= alpha[1:-1]))

    def test_composite_product_solid_backdrop(self):
        fg = self.setUp_step4_product()
        solid = DIPService.composite_product(
            fg, backdrop="solid", color1="#ff0000", shadow=False, vignette=0.0
        )
        self.assertEqual(solid.shape, (100, 100, 3))
        self.assertEqual(solid.dtype, np.uint8)
        # الزاوية الشفافة تأخذ لون الخلفية الصافي (أحمر = BGR 0,0,255)
        np.testing.assert_array_equal(solid[5, 5], [0, 0, 255])
        # مركز المنتج المعتم يبقى بلون المنتج الأصلي
        np.testing.assert_array_equal(solid[50, 50], [200, 150, 100])

    def test_composite_product_gradients_and_options(self):
        fg = self.setUp_step4_product()

        # التدرج الرأسي: الأعلى أفتح من الأسفل (نقطة خالية من المنتج)
        grad = DIPService.composite_product(
            fg, backdrop="vertical-gradient", color1="#ffffff", color2="#000000",
            position="center", shadow=False
        )
        self.assertEqual(grad.shape, (100, 100, 3))
        self.assertGreater(int(grad[2, 5].mean()), int(grad[-3, 5].mean()))

        # منحنى الاستوديو + تحجيم 50% + ظل أرضي + عدسة منحنية (كل المسارات)
        studio = DIPService.composite_product(
            fg, backdrop="studio-sweep", scale=0.5, position="bottom",
            shadow=True, shadow_strength=0.4, vignette=0.3
        )
        self.assertEqual(studio.shape, (100, 100, 3))

        # الإضاءة الشعاعية واللوحة الشطرنجية
        radial = DIPService.composite_product(fg, backdrop="radial-gradient", color1="#eeeeee", color2="#222222", shadow=False)
        checker = DIPService.composite_product(fg, backdrop="checkerboard", color1="#cccccc", color2="#333333", shadow=False)
        self.assertEqual(radial.shape, (100, 100, 3))
        self.assertEqual(checker.shape, (100, 100, 3))

    def test_remove_background_ai(self):
        # عزل الخلفية بشبكة U-2-Net (يُنزَّل النموذج تلقائياً عند أول استدعاء)
        rgba, mask = DIPService.remove_background(
            self.color_img, model="u2net", matting_threshold=0.0, refine_grabcut=False
        )
        self.assertEqual(rgba.shape, (100, 100, 4))
        self.assertEqual(rgba.dtype, np.uint8)
        self.assertEqual(mask.shape, (100, 100))
        self.assertGreaterEqual(int(mask.min()), 0)
        self.assertLessEqual(int(mask.max()), 255)
        # قناة ألفا الناتجة تطابق القناع المرجَّع
        np.testing.assert_array_equal(rgba[:, :, 3], mask)

    def test_remove_background_with_grabcut_refine(self):
        # الصقل الإحصائي التفاعلي بـ GrabCut المُهيأ من قناع الشبكة
        rgba_gc, mask_gc = DIPService.remove_background(
            self.color_img, model="u2net", matting_threshold=0.2,
            refine_grabcut=True, grabcut_iter=2
        )
        self.assertEqual(rgba_gc.shape, (100, 100, 4))
        self.assertEqual(mask_gc.shape, (100, 100))

    # =========================================================================
    # اختبارات التحويلات الهندسية والمزج و FFT والتصدير (Steps 5 & 6)
    # =========================================================================

    def test_apply_transform_rotations_and_flips(self):
        # صورة اختبار غير مربعة للتمييز بين الأبعاد
        rect = np.random.randint(0, 255, (40, 80, 3), dtype=np.uint8)

        # 90° يعكس الأبعاد (80×40)
        r90 = DIPService.apply_transform(rect, quarter_turns=1)
        self.assertEqual(r90.shape, (80, 40, 3))

        # 180° يحافظ على الأبعاد ويعكس المحتوى
        r180 = DIPService.apply_transform(rect, quarter_turns=2)
        self.assertEqual(r180.shape, rect.shape)
        np.testing.assert_array_equal(r180, rect[::-1, ::-1])

        # 360° (صفر أرباع) يعيد الأصل
        r0 = DIPService.apply_transform(rect, quarter_turns=0)
        np.testing.assert_array_equal(r0, rect)

        # القلب الأفقي = fliplr، والرأسي = flipud، والمزدوج = 180°
        fh = DIPService.apply_transform(rect, flip="h")
        np.testing.assert_array_equal(fh, rect[:, ::-1])
        fv = DIPService.apply_transform(rect, flip="v")
        np.testing.assert_array_equal(fv, rect[::-1, :])
        fhv = DIPService.apply_transform(rect, flip="hv")
        np.testing.assert_array_equal(fhv, r180)

    def test_apply_transform_free_angle_and_crop(self):
        rect = np.random.randint(0, 255, (60, 100, 3), dtype=np.uint8)

        # دوران حر 45° يوسّع الإطار المحيط (لا قصّ للزوايا)
        r45 = DIPService.apply_transform(rect, free_angle=45.0)
        self.assertGreaterEqual(r45.shape[0], 60)
        self.assertGreaterEqual(r45.shape[1], 100)

        # قص مركزي 40×40 يعطي مربعاً
        cropped = DIPService.apply_transform(rect.copy(), crop_box=[10, 10, 40, 40], aspect="1:1")
        self.assertEqual(cropped.shape[:2], (40, 40))

        # قص بنسبة 16:9 يضبط النسبة (± بكسل تقريب)
        wide = DIPService.apply_transform(rect.copy(), crop_box=[0, 0, 60, 60], aspect="16:9")
        self.assertAlmostEqual(wide.shape[1] / wide.shape[0], 16 / 9, delta=0.1)

    def test_apply_blend_modes(self):
        base = np.full((50, 50, 3), 128, dtype=np.uint8)

        # Normal بشفافية 50%: أسود فوق رمادي 128 → 64
        normal = DIPService.apply_blend(base, overlay_color="#000000", mode="normal", opacity=0.5)
        self.assertEqual(int(normal[25, 25, 0]), 64)

        # Multiply مع أبيض لا يغيّر الأساس، ومع أسود يصفّره
        mult_white = DIPService.apply_blend(base, overlay_color="#ffffff", mode="multiply", opacity=1.0)
        self.assertEqual(int(mult_white[25, 25, 0]), 128)
        mult_black = DIPService.apply_blend(base, overlay_color="#000000", mode="multiply", opacity=1.0)
        self.assertEqual(int(mult_black[25, 25, 0]), 0)

        # Screen مع أبيض يعطي الأبيض الكامل
        screen_white = DIPService.apply_blend(base, overlay_color="#ffffff", mode="screen", opacity=1.0)
        self.assertEqual(int(screen_white[25, 25, 0]), 255)

        # Difference مع نفس الصورة يعطي صفراً تماماً
        diff = DIPService.apply_blend(base, overlay=base.copy(), mode="difference", opacity=1.0)
        self.assertEqual(int(np.max(diff)), 0)

        # Soft Light و Overlay: أنماط متزامنة مع الأساس (بلا اقتطاع خارج [0,255])
        for mode in ("overlay", "soft-light"):
            out = DIPService.apply_blend(base, overlay_color="#808080", mode=mode, opacity=1.0)
            self.assertEqual(out.shape, base.shape)
            self.assertLessEqual(int(out.max()), 255)
            self.assertGreaterEqual(int(out.min()), 0)

        # طبقة صورة RGB أصغر تُمدّ تلقائياً لأبعاد الأساس
        small = np.full((10, 10, 3), 200, dtype=np.uint8)
        blended_img = DIPService.apply_blend(base, overlay=small, mode="multiply", opacity=1.0)
        self.assertEqual(blended_img.shape, base.shape)

    def test_fft_spectrum(self):
        spectrum, stats = DIPService.apply_fft_spectrum(self.color_img)
        self.assertEqual(spectrum.shape, (100, 100, 3))
        self.assertEqual(spectrum.dtype, np.uint8)
        self.assertIn("dc_magnitude", stats)
        self.assertIn("max_magnitude", stats)
        # طاقة DC (المتوسط) يجب أن تكون قيمة موجبة معقولة
        self.assertGreater(stats["dc_magnitude"], 0.0)

    def test_frequency_filter(self):
        # فلتر تمرير منخفض غاوسي يخفض الطاقة التفاضلية العالية (Laplacian energy)
        def lap_energy(img_gray):
            src = img_gray.astype(np.float64)
            return float(np.mean(np.abs(cv2.Laplacian(src, cv2.CV_64F))))

        original_energy = lap_energy(self.gray_img)

        lowpassed, h_mask = DIPService.apply_frequency_filter(
            self.color_img, filter_type="lowpass", profile="gaussian", cutoff=5.0
        )
        self.assertEqual(lowpassed.shape, self.color_img.shape)
        self.assertEqual(h_mask.shape, self.color_img.shape)
        filtered_energy = lap_energy(lowpassed[:, :, 0])
        self.assertLess(filtered_energy, original_energy)

        # High-Pass بنمطي Ideal و Gaussian يعيدان أبعاداً صحيحة
        hpf_ideal, _ = DIPService.apply_frequency_filter(
            self.color_img, filter_type="highpass", profile="ideal", cutoff=20.0
        )
        hpf_gauss, _ = DIPService.apply_frequency_filter(
            self.color_img, filter_type="highpass", profile="gaussian", cutoff=20.0
        )
        self.assertEqual(hpf_ideal.shape, self.color_img.shape)
        self.assertEqual(hpf_gauss.shape, self.color_img.shape)

    def test_export_image_formats(self):
        # PNG: بدون فقد وبادئة data URI صحيحة
        _, png_info = DIPService.export_image(self.color_img, image_format="png")
        self.assertTrue(png_info["lossless"])
        self.assertTrue(png_info["data_uri"].startswith("data:image/png;base64,"))

        # JPEG: حجم الملف يتقلص مع انخفاض الجودة
        _, q95 = DIPService.export_image(self.rgba_img, image_format="jpeg", quality=95)
        _, q30 = DIPService.export_image(self.rgba_img, image_format="jpeg", quality=30)
        self.assertLess(q30["file_size_bytes"], q95["file_size_bytes"])
        self.assertTrue(q95["data_uri"].startswith("data:image/jpeg;base64,"))

        # WebP يعمل أيضاً
        _, webp_info = DIPService.export_image(self.color_img, image_format="webp", quality=80)
        self.assertTrue(webp_info["data_uri"].startswith("data:image/webp;base64,"))

        # JPEG يتعامل مع ألفا (دمج على أبيض) دون أخطاء
        self.assertEqual(q95["format"], "jpeg")

if __name__ == "__main__":
    unittest.main()

