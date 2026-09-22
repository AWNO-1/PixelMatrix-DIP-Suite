#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
PixelMatrix DIP Studio — Exhaustive 14-Tool Practical User Manual & Operations Guide PDF Generator
Engineered for Eng. Malek A. Almosanif & DIP Student Team:
Awwab Al-Nuzaili, Mohammed Al-Awadhi, Mishaal Hajeb
"""

import os
import sys
import arabic_reshaper
from bidi.algorithm import get_display
import fitz  # PyMuPDF

# Fonts
FONT_REGULAR = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"

if not os.path.exists(FONT_REGULAR) or not os.path.exists(FONT_BOLD):
    raise FileNotFoundError("Arial fonts not found in C:/Windows/Fonts/")

# Colors (RGB normalized 0.0 to 1.0)
COLOR_BG_DARK = (0.043, 0.067, 0.125)        # #0b1120 Obsidian Navy
COLOR_BG_CARD = (0.078, 0.114, 0.188)        # #141d30 Dark Slate
COLOR_CYAN_PRIMARY = (0.024, 0.714, 0.831)   # #06b6d4 Electric Cyan
COLOR_CYAN_LIGHT = (0.4, 0.88, 0.96)         # #67e8f9 Light Cyan
COLOR_EMERALD = (0.063, 0.725, 0.506)        # #10b981 Mint Emerald
COLOR_TEXT_MAIN = (0.94, 0.96, 0.98)         # #f1f5f9 Crisp White
COLOR_TEXT_MUTED = (0.58, 0.64, 0.72)        # #94a3b8 Slate Muted
COLOR_BORDER = (0.12, 0.22, 0.35)            # Subtle Border
COLOR_CODE_BG = (0.03, 0.04, 0.08)           # Code block bg

# Page Setup (A4)
PAGE_W = 595.32
PAGE_H = 841.92
MARGIN_X = 40
USABLE_W = PAGE_W - (2 * MARGIN_X)
CONTENT_TOP = 60
CONTENT_BOTTOM = PAGE_H - 45

def bidi_text(text):
    """Reshape Arabic letters and apply Unicode bidirectional algorithm."""
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

class ManualPDFBuilder:
    def __init__(self, output_path):
        self.output_path = output_path
        self.doc = fitz.open()
        self.page_num = 0
        self.font_reg = fitz.Font(fontfile=FONT_REGULAR)
        self.font_bold = fitz.Font(fontfile=FONT_BOLD)
        self.current_page = None
        self.current_y = CONTENT_TOP

    def new_page(self, is_cover=False):
        """Creates a new page with background and header/footer."""
        self.current_page = self.doc.new_page(width=PAGE_W, height=PAGE_H)
        self.page_num += 1
        self.current_y = CONTENT_TOP

        # Draw dark canvas background
        bg_rect = fitz.Rect(0, 0, PAGE_W, PAGE_H)
        self.current_page.draw_rect(bg_rect, color=COLOR_BG_DARK, fill=COLOR_BG_DARK)

        if not is_cover:
            # Header
            hdr_text = bidi_text("PixelMatrix DIP Studio — دليل الاستخدام والتشغيل التفصيلي (14 أداة)")
            self.current_page.insert_text(
                fitz.Point(PAGE_W - MARGIN_X - self.font_reg.text_length(hdr_text, fontsize=8), 30),
                hdr_text, fontname="arial", fontfile=FONT_REGULAR, fontsize=8, color=COLOR_CYAN_PRIMARY
            )
            sub_text = bidi_text("إشراف: م. مالك المصنف")
            self.current_page.insert_text(
                fitz.Point(MARGIN_X, 30),
                sub_text, fontname="arial", fontfile=FONT_REGULAR, fontsize=8, color=COLOR_TEXT_MUTED
            )
            # Header line
            self.current_page.draw_line(
                fitz.Point(MARGIN_X, 38), fitz.Point(PAGE_W - MARGIN_X, 38),
                color=COLOR_BORDER, width=0.75
            )

            # Footer line
            self.current_page.draw_line(
                fitz.Point(MARGIN_X, PAGE_H - 28), fitz.Point(PAGE_W - MARGIN_X, PAGE_H - 28),
                color=COLOR_BORDER, width=0.75
            )
            # Footer text
            ftr_team = bidi_text("فريق العمل: أواب النزيلي | محمد العواضي | مشعل حاجب")
            self.current_page.insert_text(
                fitz.Point(PAGE_W - MARGIN_X - self.font_reg.text_length(ftr_team, fontsize=7.5), PAGE_H - 16),
                ftr_team, fontname="arial", fontfile=FONT_REGULAR, fontsize=7.5, color=COLOR_TEXT_MUTED
            )
            p_num_str = f"Page {self.page_num}"
            self.current_page.insert_text(
                fitz.Point(MARGIN_X, PAGE_H - 16),
                p_num_str, fontname="arial", fontfile=FONT_REGULAR, fontsize=7.5, color=COLOR_CYAN_PRIMARY
            )

    def wrap_text(self, text, font, size, max_w):
        """Splits Arabic text into lines that fit within max_w."""
        words = text.split(" ")
        lines = []
        curr_line = ""
        for word in words:
            test_line = f"{curr_line} {word}".strip()
            shaped = bidi_text(test_line)
            if font.text_length(shaped, fontsize=size) <= max_w:
                curr_line = test_line
            else:
                if curr_line:
                    lines.append(curr_line)
                curr_line = word
        if curr_line:
            lines.append(curr_line)
        return lines

    def add_chapter_title(self, chapter_num, title_ar):
        """Adds a prominent chapter header."""
        if self.current_y > CONTENT_BOTTOM - 60:
            self.new_page()

        rect = fitz.Rect(MARGIN_X, self.current_y, PAGE_W - MARGIN_X, self.current_y + 26)
        self.current_page.draw_rect(rect, color=COLOR_CYAN_PRIMARY, fill=COLOR_BG_CARD, width=1)

        ch_badge = f"CH {chapter_num}"
        self.current_page.insert_text(
            fitz.Point(MARGIN_X + 10, self.current_y + 17),
            ch_badge, fontname="arialb", fontfile=FONT_BOLD, fontsize=9.5, color=COLOR_CYAN_LIGHT
        )

        full_title = f"{title_ar}"
        shaped_title = bidi_text(full_title)
        tw = self.font_bold.text_length(shaped_title, fontsize=10.5)
        self.current_page.insert_text(
            fitz.Point(PAGE_W - MARGIN_X - 10 - tw, self.current_y + 17),
            shaped_title, fontname="arialb", fontfile=FONT_BOLD, fontsize=10.5, color=COLOR_TEXT_MAIN
        )
        self.current_y += 34

    def add_paragraph(self, text, fontsize=8.5, color=COLOR_TEXT_MUTED):
        """Adds regular explanatory text."""
        lines = self.wrap_text(text, self.font_reg, fontsize, USABLE_W - 8)
        needed_h = len(lines) * 12.5 + 4
        if self.current_y + needed_h > CONTENT_BOTTOM:
            self.new_page()

        for line in lines:
            shaped = bidi_text(line)
            lw = self.font_reg.text_length(shaped, fontsize=fontsize)
            self.current_page.insert_text(
                fitz.Point(PAGE_W - MARGIN_X - 4 - lw, self.current_y + 10),
                shaped, fontname="arial", fontfile=FONT_REGULAR, fontsize=fontsize, color=color
            )
            self.current_y += 12.5
        self.current_y += 4

    def add_card_box(self, title, items, badge=""):
        """Draws a styled container box for buttons and controls."""
        wrapped_items = []
        for item in items:
            prefix = "• "
            lines = self.wrap_text(prefix + item, self.font_reg, 8, USABLE_W - 24)
            wrapped_items.append(lines)

        total_lines = sum(len(l) for l in wrapped_items)
        box_h = 24 + (total_lines * 11) + (len(items) * 2)

        if self.current_y + box_h > CONTENT_BOTTOM:
            self.new_page()

        rect = fitz.Rect(MARGIN_X, self.current_y, PAGE_W - MARGIN_X, self.current_y + box_h)
        self.current_page.draw_rect(rect, color=COLOR_BORDER, fill=COLOR_BG_CARD, width=0.75)

        # Title
        t_shaped = bidi_text(title)
        tw = self.font_bold.text_length(t_shaped, fontsize=9)
        self.current_page.insert_text(
            fitz.Point(PAGE_W - MARGIN_X - 10 - tw, self.current_y + 15),
            t_shaped, fontname="arialb", fontfile=FONT_BOLD, fontsize=9, color=COLOR_CYAN_LIGHT
        )

        if badge:
            b_shaped = bidi_text(badge)
            self.current_page.insert_text(
                fitz.Point(MARGIN_X + 10, self.current_y + 15),
                b_shaped, fontname="arial", fontfile=FONT_REGULAR, fontsize=7.5, color=COLOR_EMERALD
            )

        # Divider inside card
        self.current_page.draw_line(
            fitz.Point(MARGIN_X + 8, self.current_y + 20),
            fitz.Point(PAGE_W - MARGIN_X - 8, self.current_y + 20),
            color=COLOR_BORDER, width=0.5
        )

        # Content lines
        curr_item_y = self.current_y + 30
        for w_lines in wrapped_items:
            for line in w_lines:
                l_shaped = bidi_text(line)
                lw = self.font_reg.text_length(l_shaped, fontsize=8)
                self.current_page.insert_text(
                    fitz.Point(PAGE_W - MARGIN_X - 12 - lw, curr_item_y),
                    l_shaped, fontname="arial", fontfile=FONT_REGULAR, fontsize=8, color=COLOR_TEXT_MAIN
                )
                curr_item_y += 11
            curr_item_y += 2

        self.current_y += box_h + 8

    def generate_full_manual(self):
        """Compiles the complete 14-tool exhaustive manual."""
        print("Generating Cover Page...")
        self.new_page(is_cover=True)

        # Decorative neon borders
        self.current_page.draw_rect(
            fitz.Rect(18, 18, PAGE_W - 18, PAGE_H - 18),
            color=COLOR_CYAN_PRIMARY, width=1.5
        )
        self.current_page.draw_rect(
            fitz.Rect(22, 22, PAGE_W - 22, PAGE_H - 22),
            color=COLOR_BORDER, width=0.5
        )

        # University Header
        univ_text = bidi_text("جامعة إب — كلية الحاسبات والعلوم التطبيقية")
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_bold.text_length(univ_text, fontsize=11)) / 2, 75),
            univ_text, fontname="arialb", fontfile=FONT_BOLD, fontsize=11, color=COLOR_TEXT_MUTED
        )
        dept_text = bidi_text("مشروع تطبيقي لمقرر معالجة الصور الرقمية (DIP) — ربيع 2026")
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_reg.text_length(dept_text, fontsize=10)) / 2, 92),
            dept_text, fontname="arial", fontfile=FONT_REGULAR, fontsize=10, color=COLOR_CYAN_PRIMARY
        )

        # Title Box
        title_box = fitz.Rect(MARGIN_X, 140, PAGE_W - MARGIN_X, 275)
        self.current_page.draw_rect(title_box, color=COLOR_CYAN_PRIMARY, fill=COLOR_BG_CARD, width=1.5)

        t1 = "PixelMatrix"
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_bold.text_length(t1, fontsize=32)) / 2, 195),
            t1, fontname="arialb", fontfile=FONT_BOLD, fontsize=32, color=COLOR_CYAN_LIGHT
        )
        t2 = bidi_text("دليل الاستخدام والتشغيل الشامل والمفصل")
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_bold.text_length(t2, fontsize=15)) / 2, 230),
            t2, fontname="arialb", fontfile=FONT_BOLD, fontsize=15, color=COLOR_TEXT_MAIN
        )
        t3 = bidi_text("شرح وظيفة كل زر ومنزلق وقائمة في الـ 14 وحدة معالجة بالتسلسل الفعلي")
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_reg.text_length(t3, fontsize=9.5)) / 2, 255),
            t3, fontname="arial", fontfile=FONT_REGULAR, fontsize=9.5, color=COLOR_EMERALD
        )

        # Supervisor Card
        sup_box = fitz.Rect(MARGIN_X, 310, PAGE_W - MARGIN_X, 400)
        self.current_page.draw_rect(sup_box, color=COLOR_BORDER, fill=COLOR_BG_CARD, width=1)
        s_title = bidi_text("إشراف ومناقشة الأستاذ المهندس:")
        self.current_page.insert_text(
            fitz.Point(PAGE_W - MARGIN_X - 18 - self.font_reg.text_length(s_title, fontsize=10.5), 338),
            s_title, fontname="arial", fontfile=FONT_REGULAR, fontsize=10.5, color=COLOR_TEXT_MUTED
        )
        s_name = bidi_text("م. مالك المصنف (Eng. Malek A. Almosanif)")
        self.current_page.insert_text(
            fitz.Point(PAGE_W - MARGIN_X - 18 - self.font_bold.text_length(s_name, fontsize=14), 370),
            s_name, fontname="arialb", fontfile=FONT_BOLD, fontsize=14, color=COLOR_CYAN_LIGHT
        )

        # Student Team Box
        team_box = fitz.Rect(MARGIN_X, 425, PAGE_W - MARGIN_X, 580)
        self.current_page.draw_rect(team_box, color=COLOR_BORDER, fill=COLOR_BG_CARD, width=1)
        tm_hdr = bidi_text("فريق العمل والتطوير البرمجي:")
        self.current_page.insert_text(
            fitz.Point(PAGE_W - MARGIN_X - 18 - self.font_bold.text_length(tm_hdr, fontsize=11.5), 452),
            tm_hdr, fontname="arialb", fontfile=FONT_BOLD, fontsize=11.5, color=COLOR_EMERALD
        )

        members = [
            ("1. أواب النزيلي (Awwab Al-Nuzaili)", "رئيس الفريق وكبير المطورين: استوديو البوز، نواة الخوارزميات، عزل AI، وتعديل المحرر"),
            ("2. محمد العواضي (Mohammed Al-Awadhi)", "مهندس النظم ومعمل الحسابات والمزج، تجزئة الألوان، وتشفير LSB"),
            ("3. مشعل حاجب (Mishaal Hajeb)", "مهندس الواجهات وتجربة المستخدم، الفحص البيومتري ICAO، وتنسيق الأصول")
        ]
        my = 480
        for m_name, m_role in members:
            mn_shaped = bidi_text(m_name)
            mr_shaped = bidi_text(f"— {m_role}")
            self.current_page.insert_text(
                fitz.Point(PAGE_W - MARGIN_X - 22 - self.font_bold.text_length(mn_shaped, fontsize=10), my),
                mn_shaped, fontname="arialb", fontfile=FONT_BOLD, fontsize=10, color=COLOR_TEXT_MAIN
            )
            self.current_page.insert_text(
                fitz.Point(PAGE_W - MARGIN_X - 32 - self.font_reg.text_length(mr_shaped, fontsize=9), my + 14),
                mr_shaped, fontname="arial", fontfile=FONT_REGULAR, fontsize=9, color=COLOR_TEXT_MUTED
            )
            my += 32

        # Version & Date Badge
        v_box = fitz.Rect(MARGIN_X, 610, PAGE_W - MARGIN_X, 660)
        self.current_page.draw_rect(v_box, color=COLOR_CYAN_PRIMARY, fill=COLOR_BG_CARD, width=1)
        v_text = bidi_text("الإصدار الأكاديمي المعتمد v2.5 • سبتمبر 2026 • دليل شامل لجميع الأدوات بالتسلسل الدقيق")
        self.current_page.insert_text(
            fitz.Point((PAGE_W - self.font_bold.text_length(v_text, fontsize=9.5)) / 2, 638),
            v_text, fontname="arialb", fontfile=FONT_BOLD, fontsize=9.5, color=COLOR_CYAN_LIGHT
        )

        # ==================== الفصل 1 ====================
        print("Writing Chapter 1: Launchpad & Navbar...")
        self.new_page()
        self.add_chapter_title("1", "شاشة الترحيب وشريط التنقل العلوي (Launchpad & Navbar)")
        self.add_paragraph("يوفر شريط التنقل العلوي وشاشة الترحيب مدخلاً عملياً وسلساً لكافة عمليات المنصة:")

        self.add_card_box(
            "أزرار شاشة الترحيب (Launchpad Buttons)",
            [
                "زر دخول المحرر (Launch Studio): الانتقال المباشر لاستوديو الكانفاس وبدء المعالجة فوراً.",
                "زر فتح صورة للبدء: استعراض ملفات الحاسوب واختيار أي صورة بصيغ PNG, JPG, WebP, SVG.",
                "زر تحميل دليل الاستخدام (PDF): تنزيل هذا المستند التوثيقي الكامل على جهاز المستخدم.",
                "عينة المنتج الهندسية: تحميل فوري لصورة ساعة ذكية معقدة لاختبار فلاتر كشف الحواف والتحويلات.",
                "عينة الضوضاء (Salt & Pepper): تحميل فوري لصورة مشوهة بنمش لاختبار فلتر الوسيط وحساب PSNR.",
                "عينة البورتريه البيومتري: تحميل صورة شخصية لاختبار استوديو الجوازات وتتبع استواء العينين."
            ],
            badge="LAUNCHPAD"
        )

        self.add_card_box(
            "أزرار الشريط العلوي بالتسلسل من اليمين إلى اليسار (Navbar Controls)",
            [
                "1. زر إخفاء/إظهار لوحة المعايير (أقصى اليمين): إخفاء لوحة التحكم اليمنى لتوسيع مساحة العمل، والنقر مجدداً يعيدها.",
                "2. شعار PixelMatrix وزر الرئيسية: النقر عليه يعيدك في أي لحظة لشاشة الترحيب.",
                "3. زر التراجع Undo (Ctrl+Z): التراجع عن آخر فلتر أو معالجة خطوة للخلف (حفظ حتى 15 خطوة).",
                "4. زر الإعادة Redo (Ctrl+Y): إعادة تطبيق الفلتر المتراجع عنه خطوة للأمام.",
                "5. زر إعادة الضبط Reset: تصفير كافة المعالجات والرجوع إلى النسخة الأصلية الأولى بنقرة واحدة.",
                "6. أزرار الزوم (- / + / 100%): إنقاص أو زيادة نسبة العرض بمقدار 10%، وزر الملاءمة 100%.",
                "7. زر ستارة المقارنة (Compare): تفعيل الستارة المنزلقة لمقارنة الصورة قبل وبعد المعالجة مباشرة.",
                "8. قائمة الوضعيات الرسمية (Official Poses ▾): منسدلة سريعة لاختيار (الجواز الدولي، الفيزا، الهوية).",
                "9. زر دليل الاستخدام (BookOpen): فتح نافذة دليل الاستخدام الشامل وتحميل ملف الـ PDF.",
                "10. زر فريق العمل (Users): فتح نافذة التعريف بالفريق المطور والمشرف م. مالك المصنف.",
                "11. زر فتح صورة (Upload): استيراد صورة جديدة من الجهاز في أي وقت.",
                "12. زر حفظ وتصدير (Export): تصدير وتنزيل فوري للصورة المعالجة بصيغة PNG ناصعة الجودة.",
                "13. زر إخفاء/إظهار شريط الأدوات (أقصى اليسار): إخفاء شريط الأدوات الأيسر لإتاحة رؤية كاملة."
            ],
            badge="NAVBAR"
        )

        # ==================== الفصل 2 ====================
        print("Writing Chapter 2: Tool 1 - Affine...")
        self.new_page()
        self.add_chapter_title("2", "الأداة 1: التحويلات الهندسية وأدوات القص (AFFINE)")
        self.add_paragraph("الأداة الأولى في القائمة الجانبية اليسرى، وتتيح ضبط أبعاد وتدوير وقص الصورة:")

        self.add_card_box(
            "أزرار ومنزلقات وحدة التحويلات الهندسية (في اللوحة اليمنى)",
            [
                "زر تدوير 90° لليمين (Rotate CW): تدوير الصورة 90 درجة مع اتجاه عقارب الساعة.",
                "زر تدوير 90° لليسار (Rotate CCW): تدوير الصورة 90 درجة عكس عقارب الساعة.",
                "زر تدوير 180°: قلب الصورة بالكامل رأساً على عقب.",
                "منزلق التدوير الحر (Free Angle Slider): تدوير دقيق بزاوية من -180° إلى +180° لتعديل ميلان الكاميرا.",
                "زر قلب أفقي (Flip Horizontal): عمل انعكاس مرآتي أفقي للصورة.",
                "زر قلب رأسي (Flip Vertical): عمل انعكاس مرآتي رأسي للصورة.",
                "أزرار نسب الأبعاد الثابتة للقص: (Free حر بـ 8 مقابض تفاعلية، 1:1 مربع، 16:9 شاشة عريضة، 4:3 كلاسيكي، 9:16 طولي، 3:2 احترافي).",
                "منزلق هامش القص الداخلي (Crop Inset %): تقليص إطار القص متناظراً للداخل بنسبة مئوية محكمة.",
                "زر تطبيق القص (APPLY CROP): تثبيت القص المختار وتحديث مصفوفة الكانفاس وسجل التراجع."
            ],
            badge="TOOL 1 • AFFINE"
        )

        # ==================== الفصل 3 ====================
        print("Writing Chapter 3: Tool 2 - Point Ops...")
        self.new_page()
        self.add_chapter_title("3", "الأداة 2: تحسينات البكسل والعمليات النقطية (POINT)")
        self.add_paragraph("الأداة الثانية في القائمة؛ تعالج إضاءة وتباين كل بكسل بصورة فردية ومباشرة:")

        self.add_card_box(
            "أزرار ومنزلقات تحسينات البكسل (في اللوحة اليمنى)",
            [
                "منزلق السطوع (Brightness): ضبط شدة الإضاءة العامة بإضافة أو طرح قيمة (-100 إلى +100).",
                "منزلق التباين (Contrast): تعزيز الفرق بين المناطق الساطعة والداكنة عبر منزلق التباين.",
                "منزلق التشبع (Saturation): زيادة حيوية الألوان أو سحبها لتصبح رمادية تماماً.",
                "منزلق تصحيح غاما (Gamma): ضبط انحناء الاستجابة الضوئية (0.1 إلى 5.0) لتفتيح الظلال العميقة.",
                "منزلق العتبة المباشرة (Threshold): تحويل الصورة لأبيض وأسود بتحديد حد القطع من 0 إلى 255.",
                "زر تصفير المنزلقات (Reset Sliders): إعادة كافة منزلقات التعديل إلى الصفر الافتراضي.",
                "زر الصورة السالبة (Negative): عكس ألوان وشدة الصورة (255 - I) لمحاكاة أفلام الأشعة.",
                "زر التحويل اللوغاريتمي (Log Transform): تطبيق دالة c*log(1+r) لتفتيح التفاصيل الداكنة.",
                "زر تمدد التباين (Contrast Stretch): إعادة توزيع مستويات الشدة لتغطي المدى الكامل [0, 255].",
                "منزلق تقطيع المستويات البتية (Bit-Plane): استعراض المستويات الثنائية من بت 0 (الأقل) إلى 7 (الأهم).",
                "زر مساواة المدرج التكراري (Hist Equalization): إعادة تسوية توزيع السطوع لرفع التباين لأقصى حد."
            ],
            badge="TOOL 2 • POINT"
        )

        # ==================== الفصل 4 ====================
        print("Writing Chapter 4: Tool 3 - Spatial...")
        self.new_page()
        self.add_chapter_title("4", "الأداة 3: الفلاتر المكانية والحدة وكاشف كاني (SPATIAL)")
        self.add_paragraph("الأداة الثالثة؛ تطبق مصفوفات الالتفاف المكاني للتنعيم وكشف الحواف وزيادة الحدة:")

        self.add_card_box(
            "تبويبات وأزرار الفلاتر المكانية (في اللوحة اليمنى)",
            [
                "تبويب كاشف كاني الحقيقي (True Canny): منزلق العتبة العليا (50-200)، منزلق العتبة الدنيا (10-100)، منزلق سيغما الغاوسي، وزر 'تطبيق كاني الحقيقي' للحصول على حواف بسمك بكسل واحد.",
                "تبويب فلتر التنعيم الغاوسي (Gaussian Blur): منزلق حجم النواة (3 إلى 11) ومنزلق سيغما، وزر تطبيق التنعيم.",
                "تبويب فلتر الوسيط الحقيقي (True Median Blur): منزلق نافذة 3x3 أو 5x5 وزر تطبيق لإزالة النمش بدون طمس الحواف.",
                "تبويب الفلتر ثنائي الجانب (Bilateral Filter): منزلق قطر الجوار d، وسيغما اللون، وسيغما الفضاء لتنعيم الأسطح مع صيانة الحواف.",
                "تبويب كاشف سوبيل (Sobel): أزرار الاتجاه (أفقي، رأسي، مشترك)، منزلق النواة، وزر تطبيق سوبيل.",
                "تبويب كاشف بريويت (Prewitt): أزرار الاتجاه وزر تطبيق بريويت لتوليد خرائط التدرج.",
                "تبويب زيادة الحدة وتضخيم التباين (Highboost): منزلق معامل التضخيم A وزر تطبيق زيادة الحدة."
            ],
            badge="TOOL 3 • SPATIAL"
        )

        # ==================== الفصل 5 ====================
        print("Writing Chapter 5: Tool 4 - Arithmetic...")
        self.new_page()
        self.add_chapter_title("5", "الأداة 4: معمل الحسابات ومزج الصور (ARITHMETIC)")
        self.add_paragraph("الأداة الرابعة؛ معمل متكامل لتنفيذ العمليات الجبرية بين صورتين A و B:")

        self.add_card_box(
            "أزرار وعناصر تحكم معمل الحسابات والمزج",
            [
                "أزرار العمليات الجبرية: (طرح الصورتين |A-B|، جمع وتوسيط (A+B)/2، ضرب A*B/255، قسمة A/(B+1)، مزج خطي Alpha Blending، القيمة العظمى Max، القيمة الصغرى Min).",
                "زر رفع صورة ثانية (Upload Image B): اختيار الصورة الثانية من الحاسوب لمطابقتها مع الصورة الحالية.",
                "زر عينة تجريبية تلقائية: تحميل صورة ثانية نموذجية جاهزة بضغطة واحدة دون الحاجة لملف خارجي.",
                "شاشة المعاينة المصغرة المزدوجة: عرض حي مصغر للصورة A والصورة B بجوار بعضهما للتأكد من جاهزيتهما.",
                "منزلق وزن المزج (Alpha Slider %): ضبط نسبة الشفافية ومساهمة كل صورة من 0% إلى 100% في نمط المزج.",
                "زر تنفيذ العملية الحسابية (EXECUTE ARITHMETIC): تطبيق المعادلة فورياً على الكانفاس."
            ],
            badge="TOOL 4 • ARITHMETIC"
        )

        # ==================== الفصل 6 ====================
        print("Writing Chapter 6: Tool 5 - Restore...")
        self.new_page()
        self.add_chapter_title("6", "الأداة 5: الترميم وإزالة الضوضاء ومقاييس الجودة (RESTORE)")
        self.add_paragraph("الأداة الخامسة؛ بيئة محاكاة عملية لتوليد الضوضاء وتطبيق الفلاتر الترميمية وقياس PSNR:")

        self.add_card_box(
            "أزرار محاكاة الضوضاء والترميم",
            [
                "أزرار حقن الضوضاء الاصطناعية: زر إضافة ضوضاء ملح وفلفل (مع منزلق الكثافة %)، زر إضافة ضوضاء غاوسية (مع منزلق سيغما)، وزر إضافة ضوضاء موحدة.",
                "فلتر الوسيط الحقيقي (Median Filter): نافذة 3x3 أو 5x5 لإزالة شوائب الملح والفلفل بنسبة 100% مع صيانة الحواف.",
                "فلتر المتوسط الحسابي (Arithmetic Mean): تنعيم عام للضوضاء المنتظمة.",
                "فلتر المتوسط التوافقي (Harmonic Mean): إزالة الضوضاء الغاوسية وبقع الملح البيضاء.",
                "فلتر المتوسط المقابل للتوافقي (Contraharmonic): منزلق الرتبة Q (Q>0 للفلفل الأسود، و Q<0 للملح الأبيض).",
                "فلتر وينر التكيفي (Adaptive Wiener): ترميم الإشارة المشوهة في المناطق الملساء تكيفياً.",
                "زر تطبيق فلتر الترميم: معالجة الصورة واستعادتها فورياً.",
                "زر حساب مقاييس الجودة (Compute PSNR & MSE): يقارن الصورة المرممة بالأصلية ويعطي القيمة بالديسيبل."
            ],
            badge="TOOL 5 • RESTORE"
        )

        # ==================== الفصل 7 ====================
        print("Writing Chapter 7: Tool 6 - Segment...")
        self.new_page()
        self.add_chapter_title("7", "الأداة 6: تجزئة وعزل الألوان وعنقدة K-Means (SEGMENT)")
        self.add_paragraph("الأداة السادسة؛ تهدف لتقسيم الصورة إلى مناطق متجانسة وعزل الخلفيات الملونة:")

        self.add_card_box(
            "أزرار التجزئة وعزل الألوان",
            [
                "زر عتبة أوتسو التلقائية (Otsu Threshold): حساب حد العتبة الأمثل رياضياً وفصل الصورة ثنائياً بنقرة واحدة.",
                "خوارزمية عنقدة K-Means: منزلق عدد العناقيد K (من 2 إلى 8)، منزلق عدد التكرارات، وزر تطبيق تجزئة K-Means لتكميم الألوان وتجميع البكسلات في مراكز لونية رئيسية.",
                "أداة عزل الكروما والعزل اللوني (Chroma Key): قطارة لاختيار اللون المستهدف من الكانفاس، منزلق تسامح اللون، منزلق تسامح التشبع والسطوع، وزر تطبيق العزل اللوني.",
                "خيار توليد القناع الثنائي (Binary Mask): تحويل المنطقة المعزولة للون أبيض والباقي لأسود."
            ],
            badge="TOOL 6 • SEGMENT"
        )

        # ==================== الفصل 8 ====================
        print("Writing Chapter 8: Tool 7 - Morphology...")
        self.new_page()
        self.add_chapter_title("8", "الأداة 7: المعالجة المورفولوجية للصور (MORPH)")
        self.add_paragraph("الأداة السابعة؛ تعالج الخصائص الهيكلية والشكلية عبر عنصر البنية (Structuring Element):")

        self.add_card_box(
            "العمليات المورفولوجية السبع المتاحة",
            [
                "خيارات عنصر البنية: أزرار شكل النواة (مربع Square أو صليب Cross)، ومنزلق حجم النواة (3x3, 5x5, 7x7).",
                "زر التآكل (Erosion): تقليص مساحة الأجسام الساطعة وإزالة النتوءات وعزل الأجسام المترابطة.",
                "زر التمدد (Dilation): توسيع الأجسام وسد الثقوب والشقوق الصغيرة.",
                "زر الفتح (Opening): تآكل متبوع بتمدد لإزالة الشوائب الخارجية مع الحفاظ على الحجم الأصلي.",
                "زر الإغلاق (Closing): تمدد متبوع بتآكل لسد الفجوات الداخلية دون تضخيم الأجسام.",
                "زر قبعة الرأس (Top-Hat): طرح الفتح من الأصل لإبراز الأجسام الساطعة الصغيرة على خلفية مظلمة.",
                "زر القبعة السفلية (Black-Hat): استخلاص التجاويف والبقع الداكنة في جوار مشرق.",
                "زر التدرج المورفولوجي (Morph Gradient): طرح التآكل من التمدد لاستخلاص المحيط الخارجي للهيكل."
            ],
            badge="TOOL 7 • MORPH"
        )

        # ==================== الفصل 9 ====================
        print("Writing Chapter 9: Tool 8 - Thermal LUT...")
        self.new_page()
        self.add_chapter_title("9", "الأداة 8: الرؤية الحرارية والطيفية (LUT)")
        self.add_paragraph("الأداة الثامنة؛ تطبق جداول تلوين كاذب (Pseudocolor) لتعزيز الإدراك البصري للمناطق الحرارية:")

        self.add_card_box(
            "قوالب التلوين الكاذب المعتمدة",
            [
                "قالب FLIR Ironbow: المعيار الصناعي لكاميرات الأشعة تحت الحمراء لكشف بؤر التسريب والحرارة.",
                "قالب FLIR Jet: التدرج الطيفي الفيزيائي الكامل للخرائط الطيفية من الأزرق للأحمر.",
                "قالب Hot Red: تدرج النيران والحرارة المتوهجة لإبراز المناطق ذات الكثافة القصوى.",
                "قالب Night Vision: محاكاة مناظير الرؤية الليلية العسكرية الفسفورية باللون الأخضر.",
                "قالب Medical X-Ray: محاكاة أفلام الأشعة السينية الطبية بتدرجات الأزرق والسماوي الناصع.",
                "زر تطبيق جدول الألوان المختار: نقرة واحدة لتطبيق القالب مع دعم التراجع الفوري."
            ],
            badge="TOOL 8 • LUT"
        )

        # ==================== الفصل 10 ====================
        print("Writing Chapter 10: Tool 9 - Stego...")
        self.new_page()
        self.add_chapter_title("10", "الأداة 9: تشفير وحقن البيانات في البت 0 (STEGO)")
        self.add_paragraph("الأداة التاسعة؛ تشفير وحقن رسائل سرية داخل بكسلات الصورة عبر خوارزمية LSB:")

        self.add_card_box(
            "أزرار وخطوات التشفير والاستخراج",
            [
                "حقل إدخال الرسالة السرية: كتابة أي نص سري يراد تشفيره وحقنه في الصورة.",
                "مؤشر السعة التخزينية المتاحة بالبايت: يوضح الحد الأقصى للنصوص التي تستوعبها الصورة الحالية.",
                "زر تشفير وحقن في البت الأقل أهمية (Embed Secret): يدمج النص في البت 0 مع الحفاظ على ثبات الصورة و PSNR > 54 dB.",
                "زر استخراج النص المخفي فوراً (Extract Secret): قراءة وفك تشفير الرسالة المخفية من أي صورة مشفرة.",
                "صندوق عرض الرسالة المستخرجة وزر نسخ إلى الحافظة (Copy): لنسخ النص المستخرج فوراً."
            ],
            badge="TOOL 9 • STEGO"
        )

        # ==================== الفصل 11 ====================
        print("Writing Chapter 11: Tool 10 - AI Mask...")
        self.new_page()
        self.add_chapter_title("11", "الأداة 10: عزل الخلفية الذكي فائق السرعة (AI MASK)")
        self.add_paragraph("الأداة العاشرة؛ عزل عصبي فائق الدقة والسرعة (0.39 ثانية) يعمل محلياً بالكامل دون إنترنت:")

        self.add_card_box(
            "أزرار وخيارات العزل الذكي فائق السرعة",
            [
                "زر عزل الخلفية بنقرة واحدة: تنفيذ العزل العصبي مع تحمية استباقية وتخزين مؤقت في الرام (Zero Cold-Start).",
                "أزرار اختيار النماذج العصبية: (نموذج توربو فائق u2netp بسرعة 0.39s، نموذج U-2-Net قياسي، نموذج ISNet عالي الدقة، ونموذج U2Net بورتريه للأشخاص والشعر).",
                "منزلق دقة صقل الحواف (Matting Threshold): ضبط حد تصفية الهالة اللونية وتنظيف حدود الشعر والأجسام.",
                "خيار الصقل الإحصائي بـ GrabCut (GMM Refinement): مع منزلق عدد التكرارات (Iterations 1-8) لتحسين حدود البكسل المشتركة.",
                "شاشة معاينة قناع الشفافية الحي (Alpha Mask HUD): عرض مصور لقناع الألفا الرمادي فورياً للتحقق من دقة الفصل.",
                "العمل دون اتصال (100% Offline): كافة نماذج الذكاء الاصطناعي مخزنة محلياً وتعمل بدون أي اتصال بالإنترنت."
            ],
            badge="TOOL 10 • AI MASK"
        )

        # ==================== الفصل 12 ====================
        print("Writing Chapter 12: Tool 11 - Draw...")
        self.new_page()
        self.add_chapter_title("12", "الأداة 11: الرسم والكتابة الحرة (DRAW)")
        self.add_paragraph("الأداة الحادية عشرة؛ أدوات رسم وتأشير فيكتور وتعليقات نصية مباشرة فوق الكانفاس:")

        self.add_card_box(
            "أدوات الرسم والكتابة الحرة",
            [
                "أزرار أدوات الرسم: (الفرشاة الحرة Brush، الممحاة Eraser، رسم خط Line، سهم إرشادي Arrow، مستطيل Rectangle، دائرة Circle، كتابة نص توضيحي Text).",
                "منزلق سماكة الخط (Stroke Width): تعديل سمك ضربة الفرشاة من 1 إلى 50 بكسل.",
                "منتقي الألوان الشامل (Color Picker): اختيار أي لون للرسم مع دعم الألوان المشبعة والشفافة.",
                "منزلق الشفافية (Opacity %): لتحديد شفافية ضربات الرسم والتعليقات.",
                "زر تراجع عن آخر ضربة رسم (Undo Draw): التراجع عن آخر حركة فرشاة.",
                "زر مسح كافة الرسومات (Clear All): تصفير طبقة الرسم الحرة.",
                "زر تثبيت وحفظ الرسم في الصورة (Save Drawing): دمج الرسم نهائياً داخل مصفوفة الصورة."
            ],
            badge="TOOL 11 • DRAW"
        )

        # ==================== الفصل 13 ====================
        print("Writing Chapter 13: Tool 12 - 3D Studio...")
        self.new_page()
        self.add_chapter_title("13", "الأداة 12: استوديو المنتجات ثلاثي الأبعاد (STUDIO)")
        self.add_paragraph("الأداة الثانية عشرة؛ دمج المنتج المعزول فوق منصات وخلفيات 3D احترافية:")

        self.add_card_box(
            "أزرار ومنزلقات استوديو المنتجات",
            [
                "أزرار نوع خلفية الاستوديو: (استوديو منحنى Studio Sweep، منصة 3D Podium، نيون سايبر Neon، إضاءة بؤرية Spotlight، تدرج رأسي، شطرنج شفاف).",
                "منتقي ألوان إضاءة الاستوديو والتدرج: تخصيص ألوان الخلفية لتناسب هوية المنتج التجاري.",
                "منزلقات التحكم بالمجسم: منزلق الحجم Scale %، منزلق الإزاحة الرأسية Offset Y، ومنزلق زاوية الدوران Rotation.",
                "خيار الظلال الأرضية الواقعية (Drop Shadow): مع منزلق للتحكم في قوة ونعومة الظل الساقط على المنصة.",
                "خيار الانعكاس الزجاجي الأرضي (Floor Reflection): مع منزلق لتحديد شفافية وانعكاس المنتج على الأرضية.",
                "منزلق التعتيم البؤري (Vignette): تركيز الإضاءة على منتج العرض وتعتيم الحواف الخارجية.",
                "زر توليد وعرض مشهد الاستوديو (Render 3D Mockup): تطبيق المشهد ثلاثي الأبعاد على الكانفاس."
            ],
            badge="TOOL 12 • STUDIO"
        )

        # ==================== الفصل 14 ====================
        print("Writing Chapter 14: Tool 13 - Matrix & FFT...")
        self.new_page()
        self.add_chapter_title("14", "الأداة 13: مختبر الالتفاف ومجال التردد (MATRIX)")
        self.add_paragraph("الأداة الثالثة عشرة؛ مصفوفات التفاف مخصصة 3x3 وفلاتر مجال التردد السريع FFT:")

        self.add_card_box(
            "أدوات مختبر الالتفاف ومجال التردد",
            [
                "شبكة إدخال النواة التفاعلية 3x3: 9 خلايا رقمية تتيح كتابة أي قيم معاملات التفاف يدوياً واختبار أثرها.",
                "أزرار القوالب الجاهزة الشهيرة: (زيادة حدة Sharpen، كشف الحواف Ridge، تنعيم صندوقي Box Blur، نقش بارز Emboss، تنعيم غاوسي تقريبي Gaussian 3x3).",
                "منزلق الانحياز والإزاحة (Bias): إضافة قيمة إزاحة ثابتة (-255 إلى +255) للناتج بعد الالتفاف.",
                "خيار المعايرة والتطبيع التلقائي (Normalize Kernel): قسمة الناتج على مجموع المعاملات تلقائياً.",
                "زر تطبيق الالتفاف المكاني (Apply Matrix): تنفيذ الالتفاف المكاني على الكانفاس فوراً.",
                "قسم فلترة مجال التردد FFT: نوع الفلتر (تمرير منخفض Low-Pass أو تمرير مرتفع High-Pass)، نوع الدالة (غاوسية، بتروورث، مثالية)، منزلق تردد القطع D0، وزر تطبيق فلترة التردد Apply FFT."
            ],
            badge="TOOL 13 • MATRIX"
        )

        # ==================== الفصل 15 ====================
        print("Writing Chapter 15: Tool 14 - Biometrics...")
        self.new_page()
        self.add_chapter_title("15", "الأداة 14: الوضعيات الرسمية ICAO البيومترية (3 POSES)")
        self.add_paragraph("الأداة الرابعة عشرة؛ استوديو فحص معايير الجوازات وتوازي الوجه والكتفين:")

        self.add_card_box(
            "أدوات استوديو الصور الرسمية البيومترية",
            [
                "أزرار اختيار المعيار الرسمي: (جواز السفر الدولي شنغن 35x45mm، الهوية الوطنية 40x50mm، الفيزا الأمريكية 51x51mm).",
                "زر تشغيل كاميرا الويب الحية (Launch Camera): مع خطوط شبكة إرشادية بيومترية للرأس ومحور العينين والكتفين.",
                "زر التقاط الصورة (Snap Photo): تجميد لقطة الكاميرا وإدخالها للفحص المباشر.",
                "زر رفع صورة من الحاسوب (Upload Photo): فحص ومطابقة أي صورة مخزنة مسبقاً.",
                "مؤشرات التحقق الذكي: فحص استواء العينين (يحذر بلون أحمر إذا تجاوز الميلان 2.5°)، فحص توازي الكتفين (يحذر إذا تجاوز الاختلاف 3.0°)، وفحص تجانس الإضاءة.",
                "زر استبدال الخلفية: تحويل الخلفية للون أبيض أو أزرق رسمي موحد بنقرة واحدة.",
                "زر توليد ورقة الطباعة الجاهزة (Generate 4x6 Sheet): ترتيب 6 أو 8 صور على ورقة قياسية مع خطوط قص.",
                "زر تصدير للطباعة بدقة 300 DPI وزر إرسال الصورة للمحرر لمتابعة العمل."
            ],
            badge="TOOL 14 • 3 POSES"
        )

        # ==================== الفصل 16 ====================
        print("Writing Chapter 16: Telemetry & Final Export...")
        self.new_page()
        self.add_chapter_title("16", "المراقبة الحية HUD، الفحص المجهري، والتصدير (Telemetry & Export)")
        self.add_paragraph("أدوات الفحص والتحليل والمراقبة والتصدير النهائي في اللوحة اليمنى والكانفاس:")

        self.add_card_box(
            "تبويب بيانات ومعالجة (Telemetry & Info HUD) في اللوحة اليمنى",
            [
                "المدرج التكراري الحي (Live Histogram): رسم بياني لـ 32 حزمة يوضح توزيع شدة القنوات R, G, B ومستوى الإضاءة العام.",
                "بطاقة معلومات المعالجة الأكاديمية (DIP Processing Info HUD): توثيق أبعاد المدخلات Input، المعالجة التمهيدية Preprocessing، المعاملات Parameters، المخرجات وزمن التنفيذ Latency بالمللي ثانية، والمبدأ الأكاديمي الفيزيائي للعملية.",
                "بطاقة فحص الجودة الأكاديمية (PSNR & MSE): زر يقارن الصورة الحالية بالأصلية ويعطي القيمة الدقيقة بالديسيبل."
            ],
            badge="TELEMETRY"
        )

        self.add_card_box(
            "أدوات الكانفاس التفاعلية وبطاقة التصدير النهائي (Final Export)",
            [
                "ستارة المقارنة المنزلقة (Split Curtain): سحب الخط الفاصل بالماوس يميناً ويساراً لمشاهدة تأثير الفلتر ومقارنة الأصل بالمعالج.",
                "عدسة الفحص البكسلي المجهري 5x5: زر أسفل الكانفاس لتفعيل نافذة تكبير تعرض مصفوفة البكسلات وقيم [R, G, B, A] وإحداثيات الموقع (X, Y).",
                "الأزرار العائمة لإظهار القوائم: زر عائم بأعلى يسار الكانفاس لاستعادة شريط الأدوات، وزر عائم بأعلى يمين الكانفاس لاستعادة لوحة المعايير.",
                "خيارات صيغ التصدير النهائي: زر اختيار PNG (بدون فقد)، زر اختيار JPEG (مع منزلق الجودة 1-100)، وزر اختيار WebP.",
                "زر تصدير وتنزيل الصورة المعالجة: حفظ الصورة على جهاز الحاسوب بأعلى جودة."
            ],
            badge="EXPORT"
        )

        # Save document
        print(f"Saving compiled PDF to: {self.output_path}...")
        self.doc.save(self.output_path)
        self.doc.close()
        print(f"PDF Successfully Generated! Total Pages: {self.page_num}")

if __name__ == "__main__":
    target_pdf = "d:/imageProcessingProject/PixelMatrix/frontend/public/PixelMatrix_User_Manual.pdf"
    os.makedirs(os.path.dirname(target_pdf), exist_ok=True)
    builder = ManualPDFBuilder(target_pdf)
    builder.generate_full_manual()

    # Also copy to dist if dist exists
    dist_pdf = "d:/imageProcessingProject/PixelMatrix/frontend/dist/PixelMatrix_User_Manual.pdf"
    if os.path.exists(os.path.dirname(dist_pdf)):
        import shutil
        shutil.copyfile(target_pdf, dist_pdf)
        print(f"Copied updated PDF to dist: {dist_pdf}")
