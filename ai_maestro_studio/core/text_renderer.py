"""
Text Renderer for AI Maestro Studio
Provides crisp Arabic and English typography overlay on OpenCV images using PIL and Bidi.
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

_FONTS_CACHE = {}

def get_font(font_name="tahoma.ttf", size=20):
    key = (font_name, size)
    if key not in _FONTS_CACHE:
        font_path = os.path.join("C:\\Windows\\Fonts", font_name)
        if not os.path.exists(font_path):
            font_path = "C:\\Windows\\Fonts\\arial.ttf"
        try:
            _FONTS_CACHE[key] = ImageFont.truetype(font_path, size)
        except Exception:
            _FONTS_CACHE[key] = ImageFont.load_default()
    return _FONTS_CACHE[key]


def draw_text_bgr(img_bgr, text, pos, font_size=20, color_bgr=(255, 255, 255), 
                  font_name="tahoma.ttf", is_arabic=None, align="left"):
    """
    Draws text onto an OpenCV BGR image with proper Arabic shaping and bidirectional reordering.
    color_bgr is (B, G, R) format.
    align can be 'left', 'center', or 'right'.
    """
    if not text:
        return img_bgr

    # Auto-detect Arabic if not specified
    if is_arabic is None:
        is_arabic = any('\u0600' <= ch <= '\u06FF' for ch in text)

    processed_text = text
    if is_arabic:
        try:
            reshaped = arabic_reshaper.reshape(text)
            processed_text = get_display(reshaped)
        except Exception:
            processed_text = text

    # Convert OpenCV BGR to PIL RGB
    img_rgb = Image.fromarray(img_bgr[:, :, ::-1])
    draw = ImageDraw.Draw(img_rgb)
    font = get_font(font_name, font_size)

    # Measure text bounding box
    bbox = draw.textbbox((0, 0), processed_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x, y = pos
    if align == "center":
        x = x - text_w // 2
    elif align == "right":
        x = x - text_w

    # PIL expects RGB color
    color_rgb = (color_bgr[2], color_bgr[1], color_bgr[0])
    draw.text((x, y), processed_text, font=font, fill=color_rgb)

    # Convert back to BGR contiguous numpy array
    return np.ascontiguousarray(np.array(img_rgb)[:, :, ::-1])


def draw_text_batch(img_bgr, items, font_name="tahoma.ttf"):
    """
    Draws multiple text items in a single PIL pass for peak 60fps performance.
    items is a list of dicts:
    [{'text': '...', 'pos': (x, y), 'size': 20, 'color': (B, G, R), 'align': 'left'/'center'/'right', 'font': '...'}]
    """
    if not items:
        return img_bgr

    img_rgb = Image.fromarray(img_bgr[:, :, ::-1])
    draw = ImageDraw.Draw(img_rgb)

    for it in items:
        text = it.get('text', '')
        if not text:
            continue
        is_ar = it.get('is_arabic', any('\u0600' <= ch <= '\u06FF' for ch in text))
        processed = text
        if is_ar:
            try:
                reshaped = arabic_reshaper.reshape(text)
                processed = get_display(reshaped)
            except Exception:
                processed = text

        f_name = it.get('font', font_name)
        f_size = it.get('size', 20)
        font = get_font(f_name, f_size)

        bbox = draw.textbbox((0, 0), processed, font=font)
        tw = bbox[2] - bbox[0]

        x, y = it.get('pos', (0, 0))
        align = it.get('align', 'left')
        if align == 'center':
            x = x - tw // 2
        elif align == 'right':
            x = x - tw

        cbgr = it.get('color', (255, 255, 255))
        crgb = (cbgr[2], cbgr[1], cbgr[0])
        draw.text((x, y), processed, font=font, fill=crgb)

    return np.ascontiguousarray(np.array(img_rgb)[:, :, ::-1])
