#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AI Maestro Studio — Comprehensive User Manual & Operations Guide PDF Generator
Engineered for Eng. Malek A. Almosanif & DIP Student Team:
Awwab Al-Nuzaili, Mohammed Al-Awadhi, Mishaal Hajeb
"""

import os
import sys
import base64
import subprocess
import shutil

_HERE = r"d:\imageProcessingProject\ai_maestro_studio"
ARTIFACTS_DIR = r"C:\Users\ComputerWorld\.gemini\antigravity\brain\5c86d633-081b-4787-8b00-ce443814ab6e"
SUBMISSION_DIR = r"d:\imageProcessingProject\PixelMatrix_DIP_Awwab_AlNuzaili\ai_maestro_studio"

def img_to_b64(path):
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
            return f"data:image/png;base64,{data}"
    return ""

def resolve_img_path(filename):
    local_p = os.path.join(_HERE, filename)
    if os.path.exists(local_p):
        return local_p
    art_p = os.path.join(ARTIFACTS_DIR, filename)
    if os.path.exists(art_p):
        return art_p
    return local_p

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>AI Maestro Suite - دليل المستخدم والتشغيل العملي</title>
<style>
  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    line-height: 1.65;
    color: #1a202c;
    background-color: #ffffff;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  .page-break {
    page-break-before: always;
  }

  /* Cover Page */
  .cover-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 90vh;
    border: 3px solid #1a365d;
    padding: 30px;
    box-sizing: border-box;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-radius: 8px;
  }

  .cover-header {
    text-align: center;
    border-bottom: 2px solid #cbd5e0;
    padding-bottom: 12px;
  }

  .cover-header h3 {
    color: #2b6cb0;
    font-size: 13pt;
    margin: 0;
    font-weight: 700;
  }

  .cover-header h4 {
    color: #4a5568;
    font-size: 10.5pt;
    margin: 4px 0 0 0;
  }

  .cover-title-box {
    text-align: center;
    margin: 20px 0;
  }

  .cover-title-en {
    font-size: 26pt;
    font-weight: 900;
    color: #1a365d;
    letter-spacing: 2px;
  }

  .cover-title-ar {
    font-size: 18pt;
    font-weight: 800;
    color: #2b6cb0;
    margin-top: 6px;
  }

  .cover-badge {
    display: inline-block;
    background: #ebf8ff;
    color: #2b6cb0;
    border: 1px solid #bee3f8;
    padding: 5px 16px;
    border-radius: 20px;
    font-size: 9.5pt;
    font-weight: 700;
    margin-top: 12px;
  }

  /* Executive Cover Meta */
  .cover-meta-wrapper {
    margin: 15px 0;
  }

  .cover-supervisor-card {
    background: #ffffff;
    border: 1.5px solid #cbd5e0;
    border-right: 6px solid #d69e2e;
    border-radius: 8px;
    padding: 12px 18px;
    margin-bottom: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.04);
  }

  .sup-badge {
    display: inline-block;
    background: #fefcbf;
    color: #744210;
    border: 1px solid #faf089;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .sup-name {
    font-size: 12.5pt;
    font-weight: 800;
    color: #1a365d;
    margin: 0;
  }

  .sup-name .en-text {
    font-size: 10pt;
    font-weight: 600;
    color: #4a5568;
    margin-right: 6px;
  }

  .sup-title {
    font-size: 9pt;
    color: #2b6cb0;
    font-weight: 600;
    margin: 2px 0 0 0;
  }

  .team-header-title {
    font-size: 10pt;
    font-weight: 700;
    color: #2b6cb0;
    margin: 0 0 6px 0;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 3px;
  }

  .cover-team-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 6px;
  }

  .member-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 9px 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    text-align: right;
  }

  .member-role-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
  }

  .badge-architect { background: #fefcbf; color: #744210; border: 1px solid #faf089; }
  .badge-dsp { background: #e6fffa; color: #234e52; border: 1px solid #b2f5ea; }
  .badge-hud { background: #fed7e2; color: #702459; border: 1px solid #fbb6ce; }

  .member-name-ar {
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
  }

  .member-name-en {
    font-size: 8pt;
    font-weight: 600;
    color: #4a5568;
    margin: 1px 0 4px 0;
  }

  .member-desc {
    font-size: 7.5pt;
    color: #718096;
    line-height: 1.3;
    margin: 0;
    border-top: 1px solid #edf2f7;
    padding-top: 4px;
  }

  .cover-footer {
    text-align: center;
    font-size: 9pt;
    color: #718096;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
  }

  /* Headings & Content */
  h1 {
    color: #1a365d;
    font-size: 16pt;
    border-bottom: 2px solid #3182ce;
    padding-bottom: 6px;
    margin-top: 22px;
    margin-bottom: 12px;
  }

  h2 {
    color: #2b6cb0;
    font-size: 13pt;
    margin-top: 18px;
    margin-bottom: 8px;
    border-right: 4px solid #3182ce;
    padding-right: 8px;
  }

  h3 {
    color: #2d3748;
    font-size: 11pt;
    margin-top: 14px;
    margin-bottom: 6px;
  }

  p, li {
    text-align: justify;
    font-size: 9.5pt;
    line-height: 1.6;
  }

  ul, ol {
    padding-right: 20px;
    margin-top: 4px;
    margin-bottom: 10px;
  }

  li {
    margin-bottom: 4px;
  }

  /* Callout Boxes */
  .callout {
    background: #f7fafc;
    border-right: 4px solid #3182ce;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 12px 0;
    font-size: 9.5pt;
  }

  .callout-success {
    background: #f0fff4;
    border-right-color: #38a169;
  }

  .callout-warning {
    background: #fffaf0;
    border-right-color: #dd6b20;
  }

  .callout-title {
    font-weight: 700;
    margin-bottom: 3px;
    color: #2d3748;
    font-size: 10pt;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 9pt;
  }

  th, td {
    border: 1px solid #cbd5e0;
    padding: 6px 10px;
    text-align: right;
  }

  th {
    background-color: #edf2f7;
    color: #2d3748;
    font-weight: 700;
  }

  tr:nth-child(even) {
    background-color: #f7fafc;
  }

  /* Image Containers */
  .img-card {
    text-align: center;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  .img-card img {
    max-width: 90%;
    border-radius: 6px;
    border: 1px solid #cbd5e0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.08);
  }

  .img-caption {
    font-size: 8.5pt;
    color: #718096;
    margin-top: 5px;
    font-weight: 600;
  }

  .formula {
    background: #edf2f7;
    padding: 6px 14px;
    border-radius: 6px;
    direction: ltr;
    text-align: center;
    font-family: 'Cambria Math', 'Times New Roman', serif;
    font-size: 9.5pt;
    margin: 8px 0;
    font-weight: 600;
    color: #1a365d;
  }

  .step-num {
    display: inline-block;
    background: #3182ce;
    color: #ffffff;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    font-size: 8.5pt;
    font-weight: 700;
    margin-left: 6px;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-container">
  <div class="cover-header">
    <h3>مشروع مقرر معالجة الصور الرقمية والرؤية الحاسوبية (DIP & Computer Vision)</h3>
    <h4>الدليل الميداني والتشغيلي المعتمد للمستخدم — ربيع 2026</h4>
  </div>

  <div class="cover-title-box">
    <div class="cover-title-en">AI MAESTRO SUITE</div>
    <div class="cover-title-ar">دليل المستخدم والتشغيل العملي لمنظومة الآلات الافتراضية والمايسترو</div>
    <div class="cover-badge">Comprehensive End-User Operations Manual & Gesture Performance Guide</div>
  </div>

  <div class="cover-meta-wrapper">
    <!-- Supervisor Card -->
    <div class="cover-supervisor-card">
      <div class="sup-badge">🎓 إشراف وتوثيق أكاديمي | Academic Supervision</div>
      <div class="sup-name">
        الأستاذ القدير / م. مـــالـــك المصنـــف
        <span class="en-text" dir="ltr">(Eng. Malek A. Almosanif)</span>
      </div>
      <div class="sup-title">أستاذ مقرر معالجة الصور الرقمية والرؤية الحاسوبية والمشرف العام على المشروع</div>
    </div>

    <!-- Team Members Grid -->
    <div class="team-header-title">👥 فريق العمل والتطوير الهندسي (Project Engineers):</div>
    <div class="cover-team-grid">
      <div class="member-card">
        <span class="member-role-badge badge-architect" dir="ltr">LEAD CV & POSE ARCHITECT</span>
        <div class="member-name-ar">أواب النزيلي</div>
        <div class="member-name-en" dir="ltr">Awwab Al-Nuzaili</div>
        <p class="member-desc">رئيس الفريق: تتبع المفاصل، قيادة الأوركسترا، البيانو، ولعبة الإيقاع</p>
      </div>

      <div class="member-card">
        <span class="member-role-badge badge-dsp" dir="ltr">AUDIO SYNTHESIS LEAD</span>
        <div class="member-name-ar">محمد العواضي</div>
        <div class="member-name-en" dir="ltr">Mohammed Al-Awadhi</div>
        <p class="member-desc">مهندس التوليف الصوتي: محرك FluidSynth، العود/الجيتار، والطبول</p>
      </div>

      <div class="member-card">
        <span class="member-role-badge badge-hud" dir="ltr">TOUCHLESS HUD LEAD</span>
        <div class="member-name-ar">مشعل حاجب</div>
        <div class="member-name-en" dir="ltr">Mishaal Hajeb</div>
        <p class="member-desc">مهندس الواجهات بدون لمس: واجهة HUD، الكمان، والتقييم البيومتري</p>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    دليل إرشادي عملي مصور يوضح خطوة بخطوة كيفية إعداد الكاميرا والملاحة بدون لمس وعزف كافة الآلات
  </div>
</div>

<div class="page-break"></div>

<!-- SECTION 1: ENVIRONMENT & SETUP -->
<h1>1. المتطلبات والتجهيز البيئي المثالي (Environment Setup)</h1>

<div class="callout callout-success">
  <div class="callout-title">الهدف التشغيلي (Operational Goal)</div>
  صُمم نظام <strong>AI Maestro Suite</strong> ليعمل بكفاءة عالية على الحواسيب القياسية العادية دون الحاجة لأي عتاد مكلف أو مستشعرات ملبوسة. كل ما تحتاجه هو كاميرا ويب عادية (Webcam 720p) وسماعات صوتية.
</div>

<h3>1.1 المسافة والتموضع أمام الكاميرا (Camera Positioning):</h3>
<ul>
  <li><strong>المسافة المثالية:</strong> قف أو اجلس على مسافة تتراوح بين <strong>1.2 متر إلى 1.8 متر</strong> من الكاميرا.</li>
  <li><strong>كادر الرؤية (FOV):</strong> تأكد من ظهور النصف العلوي من جسمك (من منتصف الصدر حتى الرأس) مع كامل نطاق حركة الذراعين واليدين داخل الكادر.</li>
  <li><strong>ارتفاع الكاميرا:</strong> يُفضل وضع الكاميرا على مستوى الصدر أو الوجه بزاوية أفقية مستقيمة لتفادي تشوه الإحداثيات ثلاثية الأبعاد.</li>
</ul>

<h3>1.2 شروط الإضاءة والبيئة المحيطة (Lighting & Background):</h3>
<ul>
  <li><strong>الإضاءة الأمامية:</strong> احرص على وجود إضاءة كافية أمامك تُنير اليدين والأصابع بوضوح.</li>
  <li><strong>تجنب الإضاءة الخلفية (Backlight):</strong> تجنب وجود نافذة نهارية ساطعة أو مصباح قوي خلف ظهرك مباشرة حتى لا تظهر يديك كظل معتم (Silhouette) يقلل دقة التعرف.</li>
  <li><strong>ثبات الخلفية:</strong> يفضل أن تكون المساحة خلفك هادئة وخالية من حركة الأشخاص الآخرين لضمان تركيز خوارزميات التتبع عليك بمفردك.</li>
</ul>

<div class="page-break"></div>

<!-- SECTION 2: TOUCHLESS LAUNCHER -->
<h1>2. مشغل الاستوديو والملاحة الهولوجرافية بدون لمس (Touchless Launcher)</h1>

<div class="callout callout-warning">
  <div class="callout-title">التشغيل السريع بنقرة واحدة (One-Click Launch)</div>
  انقر نقراً مزدوجاً على ملف <code>run_studio.bat</code> داخل المجلد. سيتولى السكربت تجهيز بيئة البايثون ومكتبات الصوت تلقائياً وإطلاق الاستوديو الرئيسي بدقة 1280x720 بمعدل 30-35 إطار/ثانية.
</div>

<h3>2.1 آليات التحكم الهولوجرافي المزدوجة (Dual-Trigger Touchless Navigation):</h3>
<p>
يتيح لك المشغل تصفح واختيار الآلات الموسيقية بدون لمس لوحة المفاتيح أو الماوس نهائياً عبر طريقتين مبتكرتين:
</p>

<ul>
  <li><span class="step-num">1</span> <strong>المؤشر الهولوجرافي المهدأ (LERP Cursor):</strong> ارفع يدك أمام الكاميرا؛ سيظهر مؤشر دائري نيون يتبع حركة راحة يدك بنعومة وانسيابية تامة، بفضل خوارزمية التنعيم الخطي الأسي (LERP λ = 0.38) التي تلغي الارتعاش العضلي الطبيعي.</li>
  <li><span class="step-num">2</span> <strong>زناد التثبيت الزمني (Dwell Ring Trigger):</strong> حرّك المؤشر وثبّته فوق بطاقة أي آلة لمدة <strong>1.0 ثانية</strong> (30 إطاراً)؛ سيلتف عداد دائري نيون بزاوية 360 درجة، وفور اكتماله، تُطلق الآلة وتفتح تلقائياً.</li>
  <li><span class="step-num">3</span> <strong>زناد الالتقاط اللحظي (Instant Pinch Click):</strong> لتشغيل فوري دون انتظار ثانية التثبيت، حرّك المؤشر فوق بطاقة الآلة والمس طرف إصبع السبابة بالإبهام معاً؛ تنطلق الآلة في الإطار التالي فوراً بزمن استجابة أقل من 20ms.</li>
</ul>

<div class="img-card">
  <img src="__IMG_LAUNCHER__" alt="المشغل الرسومي بدون لمس">
  <div class="img-caption">الشكل (1): المشغل الرسومي الرئيسي بدون لمس (Phase 4) مع المؤشر الهولوجرافي وحلقة التثبيت وزر فريق العمل.</div>
</div>

<h3>2.2 أزرار التحكم والخدمات الإضافية:</h3>
<ul>
  <li><strong>زر فريق العمل والإشراف الأكاديمي [T]:</strong> يفتح نافذة زجاجية عائمة توثق إهداء المشروع لم. مالك المصنف وتعريف المهندسين الثلاثة.</li>
  <li><strong>تبديل خلفية الكاميرا الحية [C]:</strong> يتيح لك إظهار أو إخفاء دفق الكاميرا المباشر خلف الواجهة الزجاجية الشفافة.</li>
  <li><strong>الخروج الآمن [Q] أو [ESC]:</strong> إغلاق المشغل وتحرير مقبض الكاميرا فوراً.</li>
</ul>

<div class="img-card">
  <img src="__IMG_TEAM__" alt="نافذة فريق العمل">
  <div class="img-caption">الشكل (2): نافذة التوثيق التنفيذية الفاخرة لفريق العمل والإشراف الأكاديمي لم. مالك المصنف.</div>
</div>

<div class="page-break"></div>

<!-- SECTION 3: MAESTRO HALL -->
<h1>3. دليل مسرح قيادة الأوركسترا السينمائي (Maestro Concert Hall)</h1>

<p>
مسرح سيمفوني تفاعلي متكامل يقود فيه المستخدم أوركسترا موسيقية حقيقية عبر الكاميرا (سيمفونية بيتهوفن الخامسة، فيروز، قراصنة الكاريبي، وفيفالدي).
</p>

<h3>3.1 قواعد قيادة الأوركسترا وتوزيع وظائف اليدين:</h3>
<ul>
  <li><strong>اليد اليمنى (عصا المايسترو - Maestro Baton):</strong>
    <br>مسؤولة عن <strong>السرعة المترية اللحظية (Tempo & BPM)</strong>. يتم رصد نقطة انقلاب حركة الرسغ للأسفل (Downbeat Inflexion). كلما زادت وتيرة حركة يدك صعوداً وهبوطاً تسارعت الأوركسترا (Accelerando)، وكلما هدأت يدك تباطأ العزف (Ritardando).
  </li>
  <li><strong>اليد اليسرى (التحكم بالقوة والديناميكيات - Dynamic Volume):</strong>
    <br>مسؤولة عن <strong>حجم وقوة الصوت (Volume Dynamics)</strong>. افتح يدك اليسرى وحركها في أقواس واسعة ومرتفعة لرفع الصوت إلى أقصى درجات القوة (Fortissimo ff)، أو اخفضها واجعل حركتها هادئة وقريبة من صدرك لخفض الصوت إلى الهمس (Pianissimo pp).
  </li>
</ul>

<h3>3.2 إيماءات الذكاء الاصطناعي العميقة (BiLSTM Gestures):</h3>
<ul>
  <li><strong>كف اليد المفتوح أمام الصدر (Open Palm STOP):</strong> إيقاف مؤقت فوري لعزف الأوركسترا.</li>
  <li><strong>رفع الإبهام للأعلى (Thumbs Up):</strong> زيادة مستوى صوت الماستر للأوركسترا بنسبة +10%.</li>
  <li><strong>تنزيل الإبهام للأسفل (Thumbs Down):</strong> خفض مستوى صوت الماستر للأوركسترا بنسبة -10%.</li>
  <li><strong>التمرير السريع لليمين / لليسار (Swipe Right / Left):</strong> تسريع أو إبطاء العزف يدوياً بمقدار 0.2x.</li>
</ul>

<div class="img-card">
  <img src="__IMG_MAESTRO__" alt="مسرح المايسترو">
  <div class="img-caption">الشكل (3): مسرح قيادة الأوركسترا السينمائي مع كشافات الضوء الحجمية، مسار العصا النيوني، ومؤشرات التزامن المتري.</div>
</div>

<h3>3.3 لوحة التقييم البيوميتري الذكي للمايسترو [E]:</h3>
<p>
عند الضغط على مفتاح <code>[E]</code> أو عند انتهاء السيمفونية، تنبثق لوحة التقييم الذكي التي تحلل:
</p>
<ul>
  <li><strong>دقة الحفاظ على الإيقاع (Tempo Accuracy):</strong> ثبات وتيرة الضربات ومطابقتها للمترونوم.</li>
  <li><strong>انتظام الفترات الزمنية (Beat Consistency - IBI):</strong> انخفاض تباين الفواصل الزمنية بين النبضات.</li>
  <li><strong>استقرار القوس الحركي (Motion Stability):</strong> نعومة وانسيابية مسارات حركة الذراعين.</li>
  <li><strong>الدرجة الأكاديمية:</strong> يمنح النظام تقييماً نهائياً بدرجة (A+, A, B, C) مع توجيه بيداغوجي مخصص.</li>
</ul>

<div class="img-card">
  <img src="__IMG_PERF__" alt="لوحة التقييم البيوميتري">
  <div class="img-caption">الشكل (4): لوحة التقييم البيوميتري الذكي واستخراج الشهادة الأكاديمية (A+ GRADE).</div>
</div>

<div class="page-break"></div>

<!-- SECTION 4: INSTRUMENTS -->
<h1>4. دليل العزف على الآلات الموسيقية الخمس (Virtual Instruments)</h1>

<!-- PIANO -->
<h2>4.1 البيانو الهوائي الافتراضي (Air Grand Piano)</h2>
<ul>
  <li><strong>لوحة المفاتيح:</strong> لوحة كاملة مكونة من أوكتافين (24 مفتاحاً: 14 أبيض و 10 أسود من نغمة C4 إلى B5).</li>
  <li><strong>العزف البوليفوني بـ 10 أصابع:</strong> يمكنك استخدام جميع أصابع اليدين العشرة في وقت واحد لعزف النغمات والكوردات المركبة.</li>
  <li><strong>سرعة الضغط اللحظية (Velocity Sensing):</strong> سرعة هبوط طرف الإصبع رأسياً تحدد قوة النغمة الصادرة (MIDI Velocity من 40 إلى 127).</li>
  <li><strong>تموجات النيون الضوئية:</strong> ملامسة المفتاح تطلق دوائر تموجية مضيئة تتسع وتتلاشى بشفافية ألفا.</li>
  <li><strong>تبديل خامات الأصوات [1] إلى [5]:</strong> [1] Grand Piano | [2] Electric Piano | [3] Strings | [4] Synth Lead | [5] Harpsichord.</li>
  <li><strong>الإيقاع المصاحب ومحلل الطيف:</strong> اضغط <code>[B]</code> لتشغيل إيقاع الخلفية وتفاعل مع أعمدة محلل الطيف الصوتي الـ 16.</li>
</ul>

<div class="img-card">
  <img src="__IMG_PIANO__" alt="البيانو الهوائي">
  <div class="img-caption">الشكل (5): البيانو الهوائي الافتراضي (24 مفتاحاً، عزف كوردات بوليفوني بـ 10 أصابع، ومحلل الطيف).</div>
</div>

<!-- DRUMS -->
<h2>4.2 الدرامز والإيقاع الشرقي (Air Drums & Percussion)</h2>
<ul>
  <li><strong>المنصات السبع في الفضاء الهوائي:</strong> 7 منصات ملونة ثلاثية الأبعاد (Kick, Snare, Hi-Hat, Crash, Darbuka Dum, Tak, Riqq).</li>
  <li><strong>فيزياء الضرب بالانعكاس المتجهي:</strong> اهبط بيدك أو بطرف السبابة لأسفل بسرعة فوق المنصة؛ تصدر الضربة فور اختراق الدائرة التصادمية وانعكاس التسارع.</li>
  <li><strong>التوليف الإجرائي النقي PCM:</strong> أصوات الإيقاع العربي (دم، تك، رق، صاجات) مولدة كودياً داخل الذاكرة بدون ملفات WAV خارجية.</li>
  <li><strong>عدّاد الكومبو ومضاعف النقاط:</strong> الضربات المتتابعة تزيد من عداد الكومبو وتطلق انفجار جزيئات ملونة في الهواء.</li>
  <li><strong>التبديل بين الأطقم:</strong> [1] طقم الدرامز الغربي (Rock Kit) | [2] طقم الإيقاع الشرقي الأصيل (Arabic Percussion Kit).</li>
</ul>

<div class="img-card">
  <img src="__IMG_DRUMS__" alt="الدرامز والإيقاع">
  <div class="img-caption">الشكل (6): الدرامز والإيقاع الشرقي (7 منصات إيقاعية 3D مع التوليف الإجرائي وعدّاد الكومبو).</div>
</div>

<div class="page-break"></div>

<!-- OUD & GUITAR -->
<h2>4.3 العود الشرقي والجيتار الهوائي (Air Oud & Guitar)</h2>
<ul>
  <li><strong>فصل وظائف اليدين:</strong>
    <br><strong>اليد اليسرى:</strong> تثبيت النغمة والكورد عبر إشارة الإصبع (Finger Pinning) على رقبة الآلة.
    <br><strong>اليد اليمنى:</strong> ريشة العزف الافتراضية (Virtual Plectrum) تتبع حركة رأس السبابة.
  </li>
  <li><strong>دوزان العود العربي الأصيل:</strong> 5 أوتار كلاسيكية حقيقية: يكاه (G2)، عشيران (A2)، دوكاه (D3)، نوا (G3)، وكردان (C4).</li>
  <li><strong>اهتزاز الأوتار الجيبي:</strong> عبور ريشة اليد اليمنى فوق الوتر يفعل اهتزازاً موجياً متموجاً يتلاشى أسياً.</li>
  <li><strong>التبديل للجيتار الهوائي [TAB]:</strong> التبديل الفوري بين العود الشرقي والجيتار بـ 6 كوردات غربية (Em, C, G, D, Am, F).</li>
  <li><strong>إيقاع المقسوم المصاحب:</strong> اضغط <code>[B]</code> لتشغيل إيقاع المقسوم العربي والتدرب على التقاسيم الشرقية.</li>
</ul>

<div class="img-card">
  <img src="__IMG_OUD__" alt="العود الشرقي">
  <div class="img-caption">الشكل (7): العود الشرقي الهوائي (أوتار الدوزان العربي الأصيل مع محاكاة الريشة واهتزاز الأوتار).</div>
</div>

<!-- VIOLIN -->
<h2>4.4 الكمان الكلاسيكي ومحاكاة القوس (Air Concert Violin)</h2>
<ul>
  <li><strong>محاكاة فيزياء حركة القوس (Virtual Bowing):</strong>
    <br><strong>اليد اليمنى:</strong> تمثل قوس الكمان. اسحب يدك أفقياً يميناً ويساراً لمحاكاة حركة الاحتكاك.
    <br><strong>سرعة القوس:</strong> تحدد قوة الصوت اللحظية؛ تتوقف النغمة فور توقف حركة اليد في الهواء.
  </li>
  <li><strong>تحديد الأوتار الأربعة:</strong> ميلان اليد للأعلى أو للأسفل يحدد الوتر النشط (G3, D4, A4, E5).</li>
  <li><strong>الفيبراتو الطبيعي باليد اليسرى:</strong> هز رسغ اليد اليسرى بذبذبة خفيفة (4-7 هرتز) لتطبيق تضمين ترددي طبيعي يضفي شجناً واهتزازاً واقعياً.</li>
</ul>

<div class="img-card">
  <img src="__IMG_VIOLIN__" alt="الكمان الكلاسيكي">
  <div class="img-caption">الشكل (8): الكمان الكلاسيكي الهوائي (تتبع حركة القوس، فيزياء الاحتكاك، واهتزاز الفيبراتو).</div>
</div>

<div class="page-break"></div>

<!-- SECTION 5: SHORTCUTS & TROUBLESHOOTING -->
<h1>5. جدول الاختصارات الشاملة واستكشاف الأخطاء (Shortcuts & FAQ)</h1>

<h3>5.1 جدول الاختصارات الشاملة في المنظومة:</h3>
<table>
  <thead>
    <tr>
      <th style="width: 25%; text-align: center;">المفتاح</th>
      <th style="width: 35%;">الوظيفة في المشغل الرئيسي (Launcher)</th>
      <th style="width: 40%;">الوظيفة داخل الآلات الموسيقية (Instruments)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[1] إلى [6]</td>
      <td>تشغيل الآلة الموسيقية المقابلة مباشرة</td>
      <td>تبديل خامة الصوت (البيانو) / تبديل أطقم الإيقاع (الدرامز)</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[T]</td>
      <td>فتح نافذة فريق العمل والإشراف الأكاديمي</td>
      <td>فتح نافذة فريق العمل والإشراف الأكاديمي</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[B]</td>
      <td>—</td>
      <td>تشغيل / إيقاف الإيقاع المصاحب (Backing Beat)</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[S]</td>
      <td>—</td>
      <td>تبديل ستايل الإيقاع (مقسوم، جاز، ديسكو، روك، سوينغ)</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[+] / [-]</td>
      <td>—</td>
      <td>زيادة أو خفض وتيرة سرعة الإيقاع بمقدار &plusmn;5 BPM</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[TAB]</td>
      <td>—</td>
      <td>التبديل بين العود الشرقي والجيتار (في آلة الأوتار)</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[E]</td>
      <td>—</td>
      <td>إظهار لوحة التقييم البيوميتري الذكي للمايسترو</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[C]</td>
      <td>تشغيل / إيقاف خلفية الكاميرا الحية</td>
      <td>تشغيل / إيقاف تغذية الكاميرا في بعض الأنماط</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[F]</td>
      <td>ملء الشاشة (Fullscreen Toggle)</td>
      <td>ملء الشاشة (Fullscreen Toggle)</td>
    </tr>
    <tr>
      <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2b6cb0;">[Q] / [ESC]</td>
      <td>إغلاق المشغل وإنهاء المنظومة</td>
      <td>الخروج من الآلة والعودة للمشغل الرئيسي تلقائياً</td>
    </tr>
  </tbody>
</table>

<h3>5.2 استكشاف الأخطاء الشائعة وحلولها السريعة (Troubleshooting Guide):</h3>
<ul>
  <li><strong>المشكلة 1: الكاميرا لا تفتح أو تظهر شاشة سوداء!</strong>
    <br><strong>الحل:</strong> تأكد من إغلاق أي برنامج آخر يستخدم الكاميرا (مثل Zoom أو Teams)، وتأكد من منح صلاحيات الوصول للكاميرا في إعدادات خصوصية ويندوز (Settings &rarr; Privacy &rarr; Camera).
  </li>
  <li><strong>المشكلة 2: هل يحتاج البرنامج إلى كرت شاشة مخصص (GPU)؟</strong>
    <br><strong>الحل:</strong> لا، تم تحسين المنظومة بالكامل لتعمل على المعالج العادي (CPU) بدقة 640x360 مع تفويض XNNPACK، وتصل إلى 30-35 FPS على معالجات Core i5 العادية.
  </li>
  <li><strong>المشكلة 3: لا يصدر أي صوت عند العزف!</strong>
    <br><strong>الحل:</strong> تأكد من أن الصوت غير مكتوم في النظام، وتأكد من وجود ملفات الصوت في مجلد <code>assets/orchestra.sf2</code> ومجلد <code>bin/</code>.
  </li>
  <li><strong>المشكلة 4: هل يحدث قفل للكاميرا في ويندوز عند الخروج من آلة والعودة للمشغل؟</strong>
    <br><strong>الحل:</strong> لا، صممنا خوارزمية تفكيك وحجز تلقائي لمقبض الكاميرا (Auto Camera Release & Reacquire) تمنع قفل DirectShow تماماً.
  </li>
</ul>

<div class="callout callout-success" style="margin-top: 20px;">
  <div class="callout-title">خاتمة التوثيق الأكاديمي</div>
  تم إعداد وتوثيق هذا الدليل ليكون مرجعاً عملياً شاملاً للمستخدم وللجنة المناقشة الأكاديمية تحت إشراف <strong>الأستاذ القدير / م. مـــالـــك المصنـــف</strong>.
</div>

</body>
</html>
"""

def main():
    print("Building AI Maestro Suite User Manual HTML...")
    img_launcher = img_to_b64(resolve_img_path("preview_phase4_launcher.png"))
    img_perf = img_to_b64(resolve_img_path("preview_performance_report.png"))
    img_maestro = img_to_b64(resolve_img_path("preview_phase2_full_maestro.png"))
    img_piano = img_to_b64(resolve_img_path("preview_phase3_piano.png"))
    img_oud = img_to_b64(resolve_img_path("preview_phase3_oud.png"))
    img_violin = img_to_b64(resolve_img_path("preview_phase3_violin.png"))
    img_drums = img_to_b64(resolve_img_path("preview_phase3_drums.png"))
    img_team = img_to_b64(resolve_img_path("preview_team_modal.png"))

    html_content = HTML_TEMPLATE.replace("__IMG_LAUNCHER__", img_launcher) \
                                .replace("__IMG_PERF__", img_perf) \
                                .replace("__IMG_MAESTRO__", img_maestro) \
                                .replace("__IMG_PIANO__", img_piano) \
                                .replace("__IMG_OUD__", img_oud) \
                                .replace("__IMG_VIOLIN__", img_violin) \
                                .replace("__IMG_DRUMS__", img_drums) \
                                .replace("__IMG_TEAM__", img_team)

    html_path = os.path.join(_HERE, "AI_Maestro_Suite_User_Manual.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML saved to: {html_path}")

    pdf_name = "AI_Maestro_Suite_User_Manual.pdf"
    pdf_out = os.path.join(_HERE, pdf_name)
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
    print("Rendering User Manual PDF via Google Chrome headless...")
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_out}",
        f"file:///{html_path.replace(os.sep, '/')}"
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Chrome output:", res.stdout, res.stderr)
    
    if os.path.exists(pdf_out):
        sz = os.path.getsize(pdf_out)
        print(f"\n[SUCCESS] User Manual PDF generated successfully!")
        print(f"Path: {pdf_out}")
        print(f"Size: {sz:,} bytes")
        
        # Copy to artifacts directory if exists
        if os.path.isdir(ARTIFACTS_DIR):
            try:
                shutil.copy2(pdf_out, os.path.join(ARTIFACTS_DIR, pdf_name))
                print(f"Copied to artifacts directory.")
            except Exception:
                pass
                
        # Copy to submission directory if exists
        if os.path.isdir(SUBMISSION_DIR):
            try:
                shutil.copy2(pdf_out, os.path.join(SUBMISSION_DIR, pdf_name))
                shutil.copy2(os.path.join(_HERE, "USER_MANUAL.md"), os.path.join(SUBMISSION_DIR, "USER_MANUAL.md"))
                print(f"Copied to submission directory: {SUBMISSION_DIR}")
            except Exception:
                pass
    else:
        print("[ERROR] PDF file was not created!")

if __name__ == "__main__":
    main()
