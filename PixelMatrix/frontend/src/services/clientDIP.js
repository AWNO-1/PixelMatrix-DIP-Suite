/**
 * محرك معالجة الصور الرقمية المحلي فائق السرعة (Client-side DIP Engine)
 * =========================================================================
 * يعالج العمليات في المتصفح لحظياً (زمن تنفيذ < 10ms بمعدل 60 FPS)
 * عبر HTML5 Canvas 2D ومصفوفات البكسل المباشرة (ImageData TypedArrays).
 * يضمن تشغيل كافة ميزات المحرر (قص، تدوير، فلاتر، إضاءة، تباين، تراجع)
 * بكامل قوتها واستجابتها الفورية حتى دون انتظار استجابة الشبكة.
 */

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof dataUrl === 'string' && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://'))) {
      try {
        if (typeof window !== 'undefined' && !dataUrl.startsWith(window.location.origin)) {
          img.crossOrigin = 'anonymous';
        }
      } catch (e) {}
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (img.crossOrigin) {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = (err) => reject(err);
        fallback.src = dataUrl;
      } else {
        reject(new Error('Failed to load image'));
      }
    };
    img.src = dataUrl;
  });
}

function clamp(v, min = 0, max = 255) {
  return Math.min(max, Math.max(min, v));
}

/**
 * 1. الدوران بمضاعفات 90 درجة (90° CW, 90° CCW, 180°)
 */
export async function rotate90(dataUrl, direction = 'cw') {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (direction === 'cw' || direction === 1 || direction === 90) {
    canvas.width = h;
    canvas.height = w;
    ctx.translate(h, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (direction === 'ccw' || direction === 3 || direction === 270) {
    canvas.width = h;
    canvas.height = w;
    ctx.translate(0, w);
    ctx.rotate((-90 * Math.PI) / 180);
  } else if (direction === '180' || direction === 2) {
    canvas.width = w;
    canvas.height = h;
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * 2. الدوران بالزاوية الحرة مع توسيع الإطار التلقائي
 */
export async function rotateFreeAngle(dataUrl, angleDeg) {
  const img = await loadImage(dataUrl);
  const rad = (angleDeg * Math.PI) / 180;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const newW = Math.max(1, Math.round(w * cos + h * sin));
  const newH = Math.max(1, Math.round(w * sin + h * cos));

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -w / 2, -h / 2);

  return canvas.toDataURL('image/png');
}

/**
 * 3. القلب المرآتي (Flip: Horizontal / Vertical / Both)
 */
export async function flipImage(dataUrl, flipType = 'h') {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (flipType === 'h') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else if (flipType === 'v') {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  } else if (flipType === 'hv') {
    ctx.translate(canvas.width, canvas.height);
    ctx.scale(-1, -1);
  }

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * 4. القص بنسب الأبعاد أو بالمستطيل الحر (Crop by Aspect Ratio & Margins)
 */
export async function cropImage(dataUrl, options = {}) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  let { x = 0, y = 0, width = w, height = h, aspect = 'free', insetPercent = 0 } = options;

  if (options.rect) {
    x = Math.round(options.rect.x);
    y = Math.round(options.rect.y);
    width = Math.round(options.rect.width);
    height = Math.round(options.rect.height);
  } else if (options.percentRect) {
    x = Math.round((options.percentRect.x / 100) * w);
    y = Math.round((options.percentRect.y / 100) * h);
    width = Math.round((options.percentRect.w / 100) * w);
    height = Math.round((options.percentRect.h / 100) * h);
  } else if (aspect && aspect !== 'free') {
    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === '4:3') targetRatio = 4 / 3;
    else if (aspect === '9:16') targetRatio = 9 / 16;
    else if (aspect === '3:2') targetRatio = 3 / 2;

    const currentRatio = w / h;
    if (currentRatio > targetRatio) {
      width = Math.round(h * targetRatio);
      height = h;
      x = Math.round((w - width) / 2);
      y = 0;
    } else {
      width = w;
      height = Math.round(w / targetRatio);
      x = 0;
      y = Math.round((h - height) / 2);
    }
  }

  if (insetPercent > 0) {
    const insetX = Math.round(width * (insetPercent / 100));
    const insetY = Math.round(height * (insetPercent / 100));
    x += insetX;
    y += insetY;
    width = Math.max(10, width - 2 * insetX);
    height = Math.max(10, height - 2 * insetY);
  }

  // حدود الأمان
  x = Math.max(0, Math.min(w - 2, x));
  y = Math.max(0, Math.min(h - 2, y));
  width = Math.max(2, Math.min(w - x, width));
  height = Math.max(2, Math.min(h - y, height));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

/**
 * 5. معالجات البكسل النقطية (Point Operations: Brightness, Contrast, Saturation, Gamma, Threshold)
 */
export async function applyPixelAdjustments(dataUrl, params = {}) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  const brightness = Number(params.brightness || 0); // -100 to 100
  const contrast = Number(params.contrast || 0);     // -100 to 100
  const saturation = Number(params.saturation || 0); // -100 to 100
  const gamma = Number(params.gamma || 1.0);         // 0.1 to 3.0
  const threshold = params.threshold != null && params.threshold !== '' ? Number(params.threshold) : null;
  const invert = Boolean(params.invert);
  const grayscale = Boolean(params.grayscale);
  const sepia = Boolean(params.sepia);

  // حساب معامل التباين
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  // جدول LUT للجاما لسرعة التنفيذ
  const gammaLut = new Uint8ClampedArray(256);
  const invGamma = 1 / Math.max(0.01, gamma);
  for (let i = 0; i < 256; i++) {
    gammaLut[i] = Math.round(Math.pow(i / 255, invGamma) * 255);
  }

  const satFactor = 1 + saturation / 100;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    // السطوع
    if (brightness !== 0) {
      r += brightness * 1.4;
      g += brightness * 1.4;
      b += brightness * 1.4;
    }

    // التباين
    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // الإشباع اللوني (Saturation)
    if (saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;
    }

    // جاما
    if (gamma !== 1.0) {
      r = gammaLut[clamp(Math.round(r))];
      g = gammaLut[clamp(Math.round(g))];
      b = gammaLut[clamp(Math.round(b))];
    }

    // درجات الرمادي
    if (grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    // العتبة الثنائية (Threshold)
    if (threshold !== null && threshold > 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const binVal = gray >= threshold ? 255 : 0;
      r = binVal;
      g = binVal;
      b = binVal;
    }

    // العكس السالب (Invert)
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // السيبيا الكلاسيكية (Sepia)
    if (sepia) {
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = tr;
      g = tg;
      b = tb;
    }

    d[i] = clamp(Math.round(r));
    d[i + 1] = clamp(Math.round(g));
    d[i + 2] = clamp(Math.round(b));
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * 6. الفلاتر المكانية والالتفاف (Spatial Filters: Gaussian, Sharpen, Sobel, Laplacian, Emboss)
 */
export async function applySpatialFilter(dataUrl, filterType = 'gaussian', options = {}) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;

  // نسخ قنوات ألفا بالكامل
  for (let i = 0; i < s.length; i += 4) {
    d[i + 3] = s[i + 3];
  }

  // تعريف مصفوفات الالتفاف القياسية
  let kernel = null;
  let divisor = 1;
  let offset = 0;

  if (filterType === 'gaussian' || filterType === 'blur') {
    kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    divisor = 16;
  } else if (filterType === 'sharpen') {
    const amount = Number(options.amount || 1.0);
    kernel = [
      [0, -amount, 0],
      [-amount, 4 * amount + 1, -amount],
      [0, -amount, 0]
    ];
    divisor = 1;
  } else if (filterType === 'laplacian') {
    kernel = [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0]
    ];
    divisor = 1;
    offset = 128;
  } else if (filterType === 'emboss') {
    kernel = [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2]
    ];
    divisor = 1;
    offset = 128;
  } else if (filterType === 'box') {
    kernel = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ];
    divisor = 9;
  } else if (filterType === 'custom' && options.kernel) {
    kernel = options.kernel;
    divisor = options.normalize
      ? kernel.reduce((acc, row) => acc + row.reduce((rAcc, c) => rAcc + (parseFloat(c) || 0), 0), 0) || 1
      : 1;
    offset = Number(options.bias) || 0;
  }

  if (filterType === 'sobel') {
    // كشف الحواف سوبل (Magnitude)
    const gx = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const gy = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sumGx = 0;
        let sumGy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4;
            const gray = 0.299 * s[idx] + 0.587 * s[idx + 1] + 0.114 * s[idx + 2];
            sumGx += gray * gx[ky + 1][kx + 1];
            sumGy += gray * gy[ky + 1][kx + 1];
          }
        }

        const mag = clamp(Math.hypot(sumGx, sumGy));
        const outIdx = (y * w + x) * 4;
        d[outIdx] = mag;
        d[outIdx + 1] = mag;
        d[outIdx + 2] = mag;
        d[outIdx + 3] = 255;
      }
    }
  } else if (kernel) {
    // تطبيق الالتفاف العام 3x3
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let rSum = 0, gSum = 0, bSum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4;
            const kVal = kernel[ky + 1][kx + 1];
            rSum += s[idx] * kVal;
            gSum += s[idx + 1] * kVal;
            bSum += s[idx + 2] * kVal;
          }
        }

        const outIdx = (y * w + x) * 4;
        d[outIdx] = clamp(Math.round(rSum / divisor + offset));
        d[outIdx + 1] = clamp(Math.round(gSum / divisor + offset));
        d[outIdx + 2] = clamp(Math.round(bSum / divisor + offset));
      }
    }
  } else {
    for (let i = 0; i < s.length; i++) d[i] = s[i];
  }

  ctx.putImageData(dst, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * 6b. فلتر الوسيط الإحصائي الحقيقي (True Rank-Order Median Filter)
 * فلتر مكاني غير خطي (Non-linear Order-Statistic Filter) يقوم بفرز قيم الجوار واختيار القيمة الوسطية.
 * المتخصص الأول والأمثل في استئصال ضوضاء الملح والفلفل (Impulse Salt & Pepper Noise) وحفظ الحواف.
 */
export async function applyMedianFilter(dataUrl, ksize = 3) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;

  // نسخ قناة الشفافية
  for (let i = 0; i < s.length; i += 4) {
    d[i + 3] = s[i + 3];
  }

  const k = Math.max(3, ksize % 2 === 0 ? ksize + 1 : ksize);
  const half = Math.floor(k / 2);
  const total = k * k;
  const medIdx = Math.floor(total / 2);

  const rBuf = new Uint8Array(total);
  const gBuf = new Uint8Array(total);
  const bBuf = new Uint8Array(total);

  const getIdx = (x, y) => {
    let px = x < 0 ? -x : (x >= w ? 2 * w - x - 2 : x);
    let py = y < 0 ? -y : (y >= h ? 2 * h - y - 2 : y);
    px = Math.max(0, Math.min(w - 1, px));
    py = Math.max(0, Math.min(h - 1, py));
    return (py * w + px) * 4;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let count = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const p = getIdx(x + kx, y + ky);
          rBuf[count] = s[p];
          gBuf[count] = s[p + 1];
          bBuf[count] = s[p + 2];
          count++;
        }
      }

      rBuf.sort();
      gBuf.sort();
      bBuf.sort();

      const out = (y * w + x) * 4;
      d[out] = rBuf[medIdx];
      d[out + 1] = gBuf[medIdx];
      d[out + 2] = bBuf[medIdx];
    }
  }

  ctx.putImageData(dst, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * 7. مزج الطبقات وأنماط الدمج (Photoshop Blend Modes: Multiply, Screen, Overlay, etc.)
 */
export async function blendImages(baseDataUrl, overlayDataUrlOrColor, mode = 'normal', opacity = 1.0) {
  const baseImg = await loadImage(baseDataUrl);
  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // رسم الصورة الأساسية
  ctx.drawImage(baseImg, 0, 0);

  // إعداد نمط الدمج والشفافية
  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0.0, 1.0);

  const compositeModes = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    'soft-light': 'soft-light',
    difference: 'difference'
  };
  ctx.globalCompositeOperation = compositeModes[mode] || 'source-over';

  if (typeof overlayDataUrlOrColor === 'string' && overlayDataUrlOrColor.startsWith('data:')) {
    const overlayImg = await loadImage(overlayDataUrlOrColor);
    ctx.drawImage(overlayImg, 0, 0, w, h);
  } else if (typeof overlayDataUrlOrColor === 'string') {
    ctx.fillStyle = overlayDataUrlOrColor;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}

/**
 * 7b. معمل العمليات الحسابية ومزج الصور الرقمية (Image Arithmetic & Blending Lab)
 * تطبيق العمليات الحسابية الأكاديمية بين صورتين:
 * - طرح الصور (Subtraction): |A(x,y) - B(x,y)| لكشف الفروق والحركة وإبراز العيوب والتغيرات
 * - جمع الصور (Normalized Addition): (A(x,y) + B(x,y)) / 2 لتقليل الضجيج
 * - جمع بالتشبع (Saturated Addition): min(255, A(x,y) + B(x,y))
 * - ضرب الصور (Multiplication): A(x,y) * B(x,y) / 255 لتطبيق الأقنعة الثنائية وحجب الخلفيات
 * - قسمة الصور (Division): A(x,y) / (B(x,y) + 1) * 128 لتصحيح التظليل والتفاوت في شدة الإضاءة
 * - المزج الموزون (Alpha Blend): (1 - alpha) * A(x,y) + alpha * B(x,y)
 * - أنماط المزج الرياضية: Difference, Screen, Max, Min
 */
export async function applyImageArithmetic(baseDataUrl, overlayDataUrl, operation = 'subtract', alpha = 0.5) {
  const [imgA, imgB] = await Promise.all([loadImage(baseDataUrl), loadImage(overlayDataUrl)]);
  const w = Math.max(imgA.naturalWidth || imgA.width || 1, 1);
  const h = Math.max(imgA.naturalHeight || imgA.height || 1, 1);

  // كانفاس الصورة الأساسية A
  const canvasA = document.createElement('canvas');
  canvasA.width = w; canvasA.height = h;
  const ctxA = canvasA.getContext('2d');
  ctxA.drawImage(imgA, 0, 0, w, h);
  const dataA = ctxA.getImageData(0, 0, w, h);
  const a = dataA.data;

  // كانفاس الصورة الثانية B مع ضبط مقياسها تلقائياً لتطابق أبعاد A
  const canvasB = document.createElement('canvas');
  canvasB.width = w; canvasB.height = h;
  const ctxB = canvasB.getContext('2d');
  ctxB.drawImage(imgB, 0, 0, w, h);
  const dataB = ctxB.getImageData(0, 0, w, h);
  const b = dataB.data;

  // كانفاس الإخراج
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w; outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  const outData = outCtx.createImageData(w, h);
  const out = outData.data;

  const len = a.length;
  const aFactor = clamp(alpha, 0.0, 1.0);

  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const va = a[i + c];
      const vb = b[i + c];
      let res = 0;

      if (operation === 'subtract' || operation === 'difference') {
        res = Math.abs(va - vb);
      } else if (operation === 'add') {
        res = clamp(Math.round((va + vb) / 2));
      } else if (operation === 'add_saturated') {
        res = clamp(va + vb);
      } else if (operation === 'multiply') {
        res = clamp(Math.round((va * vb) / 255));
      } else if (operation === 'divide') {
        res = clamp(Math.round((va / Math.max(1, vb)) * 128));
      } else if (operation === 'blend') {
        res = clamp(Math.round((1 - aFactor) * va + aFactor * vb));
      } else if (operation === 'screen') {
        res = clamp(255 - Math.round(((255 - va) * (255 - vb)) / 255));
      } else if (operation === 'max') {
        res = Math.max(va, vb);
      } else if (operation === 'min') {
        res = Math.min(va, vb);
      } else {
        res = va;
      }

      out[i + c] = res;
    }
    out[i + 3] = a[i + 3] !== undefined ? a[i + 3] : 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas.toDataURL('image/png');
}

/**
 * 8. حساب الهستوجرام اللحظي 32-bin لشاشات الـ HUD
 */
export async function calculateHistogram(dataUrl) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const w = Math.min(img.naturalWidth || 256, 256);
  const h = Math.min(img.naturalHeight || 256, 256);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const { data: pixels } = ctx.getImageData(0, 0, w, h);
  const bins = 32;
  const counts = {
    r: new Array(bins).fill(0),
    g: new Array(bins).fill(0),
    b: new Array(bins).fill(0)
  };

  for (let i = 0; i < pixels.length; i += 4) {
    counts.r[Math.min(bins - 1, pixels[i] >> 3)]++;
    counts.g[Math.min(bins - 1, pixels[i + 1] >> 3)]++;
    counts.b[Math.min(bins - 1, pixels[i + 2] >> 3)]++;
  }

  const maxVal = Math.max(...counts.r, ...counts.g, ...counts.b, 1);
  const norm = (arr) => arr.map((v) => Math.round((v / maxVal) * 1000) / 10);

  return {
    r: norm(counts.r),
    g: norm(counts.g),
    b: norm(counts.b)
  };
}

/**
 * 9. دمج طبقة الرسم والأشكال فوق الصورة بدقة كاملة
 */
export async function mergeDrawingWithImage(baseDataUrl, drawingCanvasOrDataUrl) {
  const baseImg = await loadImage(baseDataUrl);
  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // رسم الصورة الأساسية
  ctx.drawImage(baseImg, 0, 0, w, h);

  // رسم طبقة التوضيحات والرسوم فوقها
  if (typeof drawingCanvasOrDataUrl === 'string') {
    const overlayImg = await loadImage(drawingCanvasOrDataUrl);
    ctx.drawImage(overlayImg, 0, 0, w, h);
  } else if (drawingCanvasOrDataUrl) {
    ctx.drawImage(drawingCanvasOrDataUrl, 0, 0, w, h);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 10. استوديو المنتجات والخلفيات الاحترافية ثلاثية الأبعاد (Product Studio Compositor)
 * =================================================================================
 * يدمج صورة المنتج فوق خلفيات استوديو عالية الجودة (Studio Sweep, 3D Podium, Neon, Gradients)
 * مع ظلال أرضية واقعية، إضاءات بؤرية، انعكاسات، وعدسات تعتيم أطراف (Vignette).
 */
export async function compositeProductStudio(imageDataUrl, options = {}) {
  const {
    backdrop = 'studio-sweep',
    color1 = '#e8ecf2',
    color2 = '#16202f',
    scale = 0.85,
    position = 'bottom',
    offsetY = 0,
    rotation = 0,
    shadow = true,
    shadowStrength = 0.4,
    vignette = 0.0,
    reflection = false,
    reflectionStrength = 0.25,
    autoCutout = false
  } = options;

  const rawImg = await loadImage(imageDataUrl);

  // إعداد كائن صورة المنتج (مع تطبيق عزل الخلفية التلقائي عند الطلب للصور الصلبة)
  let prodImg = rawImg;
  if (autoCutout) {
    const cutCanvas = document.createElement('canvas');
    cutCanvas.width = rawImg.naturalWidth;
    cutCanvas.height = rawImg.naturalHeight;
    const cutCtx = cutCanvas.getContext('2d');
    cutCtx.drawImage(rawImg, 0, 0);
    const imgData = cutCtx.getImageData(0, 0, cutCanvas.width, cutCanvas.height);
    const d = imgData.data;

    // أخذ عينة من لون الزاوية العليا اليسرى
    const bgR = d[0], bgG = d[1], bgB = d[2];
    const tol = 38;

    for (let i = 0; i < d.length; i += 4) {
      const dr = Math.abs(d[i] - bgR);
      const dg = Math.abs(d[i + 1] - bgG);
      const db = Math.abs(d[i + 2] - bgB);
      const diff = Math.max(dr, dg, db);
      if (diff < tol) {
        d[i + 3] = Math.max(0, Math.round(((diff - (tol - 12)) / 12) * 255));
      }
    }
    cutCtx.putImageData(imgData, 0, 0);
    prodImg = cutCanvas;
  }

  // تحديد أبعاد مساحة عمل الاستوديو
  const W = Math.max(rawImg.naturalWidth, 1280);
  const H = Math.max(rawImg.naturalHeight, 800);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. رسم خلفية الاستوديو المختارة (Studio Backdrop)
  if (backdrop === 'solid') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, W, H);
  } else if (backdrop === 'vertical-gradient') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (backdrop === 'radial-gradient') {
    const rGrad = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.05, W / 2, H * 0.5, Math.max(W, H) * 0.7);
    rGrad.addColorStop(0, color1);
    rGrad.addColorStop(1, color2);
    ctx.fillStyle = rGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (backdrop === 'neon-glow') {
    // خلفية نيون داكنة تقنية
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, W, H);

    // هالة نيون مشعة خلف المنتج
    const nGrad = ctx.createRadialGradient(W / 2, H * 0.5, W * 0.08, W / 2, H * 0.5, W * 0.45);
    nGrad.addColorStop(0, color1 || '#06b6d4');
    nGrad.addColorStop(0.5, color2 || '#3b82f6');
    nGrad.addColorStop(1, 'rgba(7,10,18,0)');
    ctx.fillStyle = nGrad;
    ctx.fillRect(0, 0, W, H);

    // خطوط شبكية أرضية ثلاثية الأبعاد
    ctx.strokeStyle = 'rgba(6,182,212,0.15)';
    ctx.lineWidth = 1;
    const horizon = H * 0.65;
    for (let x = 0; x <= W; x += W / 16) {
      ctx.beginPath();
      ctx.moveTo(W / 2, horizon);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = horizon; y <= H; y += (H - horizon) / 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (backdrop === 'podium') {
    // خلفية استوديو ناعمة
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, color1);
    bgGrad.addColorStop(1, color2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // منصة ثلاثية الأبعاد أسطوانية (3D Cylindrical Podium)
    const podCX = W / 2;
    const podCY = H * 0.74;
    const podRX = W * 0.28;
    const podRY = H * 0.07;
    const podH = H * 0.12;

    // ظل المنصة على الأرض
    ctx.beginPath();
    ctx.ellipse(podCX, podCY + podH + 6, podRX * 1.15, podRY * 1.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // جسم الأسطوانة
    const cylGrad = ctx.createLinearGradient(podCX - podRX, 0, podCX + podRX, 0);
    cylGrad.addColorStop(0, 'rgba(20,25,35,0.85)');
    cylGrad.addColorStop(0.5, 'rgba(240,245,255,0.95)');
    cylGrad.addColorStop(1, 'rgba(20,25,35,0.85)');
    ctx.fillStyle = cylGrad;
    ctx.beginPath();
    ctx.rect(podCX - podRX, podCY, podRX * 2, podH);
    ctx.fill();

    // السطح العلوي البيضاوي للمنصة
    ctx.beginPath();
    ctx.ellipse(podCX, podCY, podRX, podRY, 0, 0, Math.PI * 2);
    const topGrad = ctx.createRadialGradient(podCX, podCY - 10, podRY * 0.2, podCX, podCY, podRX);
    topGrad.addColorStop(0, '#ffffff');
    topGrad.addColorStop(1, '#d8e0ea');
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (backdrop === 'checkerboard') {
    const size = 20;
    for (let y = 0; y < H; y += size) {
      for (let x = 0; x < W; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#f1f5f9' : '#cbd5e1';
        ctx.fillRect(x, y, size, size);
      }
    }
  } else {
    // studio-sweep (المنحنى اللانهائي الافتراضي للاستوديوهات الاحترافية)
    const horizon = H * 0.62;

    // جدار الاستوديو
    const wallGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    wallGrad.addColorStop(0, color1);
    wallGrad.addColorStop(1, color2);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, horizon);

    // أرضية الاستوديو مع انتقال ناعم عند الأفق
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, H);
    floorGrad.addColorStop(0, color2);
    floorGrad.addColorStop(0.4, color1);
    floorGrad.addColorStop(1, color2);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, W, H - horizon);

    // منحنى الإضاءة عند الأفق
    const sweep = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 40);
    sweep.addColorStop(0, 'rgba(255,255,255,0)');
    sweep.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    sweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, horizon - 40, W, 80);
  }

  // 2. حساب مقاسات وتموضع المنتج
  const baseAspect = prodImg.naturalWidth / prodImg.naturalHeight || 1;
  const maxProdH = H * 0.72;
  const maxProdW = W * 0.75;
  let targetH = maxProdH * scale;
  let targetW = targetH * baseAspect;
  if (targetW > maxProdW) {
    targetW = maxProdW;
    targetH = targetW / baseAspect;
  }

  let posX = (W - targetW) / 2;
  let groundBaseline = backdrop === 'podium' ? H * 0.74 : H * 0.82;
  let posY = position === 'bottom' ? groundBaseline - targetH : (H - targetH) / 2;
  posY += (offsetY / 100) * H;

  // 3. رسم الظلال الأرضية الواقعية (Photorealistic Contact & Cast Shadows)
  if (shadow) {
    const shadowCX = W / 2;
    const shadowCY = posY + targetH;
    const sStrength = Math.min(1.0, Math.max(0.05, shadowStrength));

    // أ. ظل تلامسي دقيق وداكن أسفل قاعدة المنتج مباشرة (Contact Shadow)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowCX, shadowCY + 2, targetW * 0.38, Math.max(4, targetH * 0.025), 0, 0, Math.PI * 2);
    const contactGrad = ctx.createRadialGradient(shadowCX, shadowCY + 2, 0, shadowCX, shadowCY + 2, targetW * 0.38);
    contactGrad.addColorStop(0, `rgba(0,0,0,${sStrength * 0.95})`);
    contactGrad.addColorStop(0.5, `rgba(0,0,0,${sStrength * 0.6})`);
    contactGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = contactGrad;
    ctx.fill();
    ctx.restore();

    // ب. ظل مسقط عريض وناعم مشتت على أرضية الاستوديو (Soft Cast Ambient Shadow)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowCX, shadowCY + 8, targetW * 0.52, Math.max(12, targetH * 0.08), 0, 0, Math.PI * 2);
    const castGrad = ctx.createRadialGradient(shadowCX, shadowCY + 8, 0, shadowCX, shadowCY + 8, targetW * 0.52);
    castGrad.addColorStop(0, `rgba(0,0,0,${sStrength * 0.55})`);
    castGrad.addColorStop(0.6, `rgba(0,0,0,${sStrength * 0.25})`);
    castGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = castGrad;
    ctx.fill();
    ctx.restore();
  }

  // 4. رسم الانعكاس الأرضي إن كان مفعّلاً (Floor Reflection)
  if (reflection) {
    ctx.save();
    const reflH = targetH * 0.45;
    ctx.translate(0, (posY + targetH) * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = Math.min(0.6, Math.max(0.05, reflectionStrength));
    ctx.drawImage(prodImg, posX, posY + targetH - reflH, targetW, reflH, posX, posY + targetH - reflH, targetW, reflH);
    ctx.restore();

    // تلاشي الانعكاس
    const reflFade = ctx.createLinearGradient(0, posY + targetH, 0, posY + targetH + reflH);
    reflFade.addColorStop(0, 'rgba(0,0,0,0)');
    reflFade.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = reflFade;
    ctx.fillRect(posX, posY + targetH, targetW, reflH);
    ctx.restore();
  }

  // 5. رسم صورة المنتج
  ctx.save();
  if (rotation !== 0) {
    ctx.translate(posX + targetW / 2, posY + targetH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(prodImg, -targetW / 2, -targetH / 2, targetW, targetH);
  } else {
    ctx.drawImage(prodImg, posX, posY, targetW, targetH);
  }
  ctx.restore();

  // 6. عدسة تعتيم الأطراف الفوتوغرافية (Vignette)
  if (vignette > 0) {
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, vignette * 0.85)})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 11. تسطيح ودمج مصفوفة الطبقات في صورة واحدة (Flatten Layers Stack)
 * =================================================================
 * يجمع كل الطبقات المرئية بالترتيب مع احترام درجات الشفافية وأنماط المزج.
 */
export async function flattenLayers(layers, width = 1280, height = 720) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  for (const layer of layers) {
    if (!layer.visible || !layer.data) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity != null ? Number(layer.opacity) : 1.0;
    if (layer.blendMode && layer.blendMode !== 'normal') {
      ctx.globalCompositeOperation = layer.blendMode;
    }
    const layerImg = await loadImage(layer.data);
    ctx.drawImage(layerImg, 0, 0, width, height);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 12. حزمة الفلاتر والعمليات النقطية (Point Processing Suite)
 * ========================================================================= */

/**
 * فلتر التحويل اللوغاريتمي: s = c * log(1 + r)
 */
export async function applyLogTransform(dataUrl, c = 46) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = clamp(Math.round(c * Math.log(1 + i)));
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فلتر تمدد التباين (Contrast Stretching - Piecewise Linear)
 */
export async function applyContrastStretching(dataUrl, r1 = 50, s1 = 10, r2 = 200, s2 = 245) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // إعداد جدول تحويل خطي مجزأ (Piecewise Linear LUT)
  const lut = new Uint8ClampedArray(256);
  const slope1 = r1 > 0 ? s1 / r1 : 0;
  const slope2 = r2 > r1 ? (s2 - s1) / (r2 - r1) : 0;
  const slope3 = 255 > r2 ? (255 - s2) / (255 - r2) : 0;

  for (let r = 0; r < 256; r++) {
    if (r < r1) {
      lut[r] = clamp(Math.round(slope1 * r));
    } else if (r <= r2) {
      lut[r] = clamp(Math.round(slope2 * (r - r1) + s1));
    } else {
      lut[r] = clamp(Math.round(slope3 * (r - r2) + s2));
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فلتر تقطيع المستويات البتية (Bit-Plane Slicing: bit 0 to 7)
 */
export async function applyBitPlaneSlicing(dataUrl, bit = 7) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const bitClamped = Math.max(0, Math.min(7, bit));
  const mask = 1 << bitClamped;

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const val = (gray & mask) ? 255 : 0;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * تسوية الهيستوغرام العالمية (Histogram Equalization)
 */
export async function applyHistogramEqualization(dataUrl) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const totalPixels = canvas.width * canvas.height;

  // 1. حساب الهيستوغرام للإضاءة
  const hist = new Int32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[gray]++;
  }

  // 2. حساب دالة التوزيع التراكمي CDF
  const cdf = new Float32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + hist[i];
  }

  let minCdf = 0;
  for (let i = 0; i < 256; i++) {
    if (cdf[i] > 0) {
      minCdf = cdf[i];
      break;
    }
  }

  // 3. بناء جدول التحويل التراكمي
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = clamp(Math.round(((cdf[i] - minCdf) / (totalPixels - minCdf)) * 255));
  }

  // 4. تطبيق التحويل مع الحفاظ على النسب اللونية
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const eq = lut[gray];
    const ratio = gray > 0 ? eq / gray : 1;
    d[i] = clamp(Math.round(d[i] * ratio));
    d[i + 1] = clamp(Math.round(d[i + 1] * ratio));
    d[i + 2] = clamp(Math.round(d[i + 2] * ratio));
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 13. الفلاتر المكانية المحلية المتقدمة (Unsharp, Highboost, Prewitt, Canny)
 * ========================================================================= */

/**
 * فلتر بريويت لكشف الحواف (Prewitt Edge Detection)
 */
export async function applyPrewittFilter(dataUrl, direction = 'magnitude') {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data;
  const dd = dst.data;

  // تحويل إلى رمادي
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * sd[i * 4] + 0.587 * sd[i * 4 + 1] + 0.114 * sd[i * 4 + 2]);
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Prewitt kernels
      // Gx = [-1, 0, 1; -1, 0, 1; -1, 0, 1]
      // Gy = [-1, -1, -1; 0, 0, 0; 1, 1, 1]
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] -
        gray[y * w + (x - 1)]       + gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];

      const gy =
        -gray[(y - 1) * w + (x - 1)] - gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];

      let mag = 0;
      if (direction === 'x') mag = Math.abs(gx);
      else if (direction === 'y') mag = Math.abs(gy);
      else mag = Math.sqrt(gx * gx + gy * gy);

      const val = clamp(Math.round(mag));
      const idx = (y * w + x) * 4;
      dd[idx] = val;
      dd[idx + 1] = val;
      dd[idx + 2] = val;
      dd[idx + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فلتر قناع عدم الوضوح (Unsharp Masking) وفلتر التعزيز العالي (Highboost Filtering)
 * formula: f_out = (A - 1) * f + (f - f_smooth) = A * f - f_smooth
 */
export async function applyUnsharpHighboost(dataUrl, A = 1.5, ksize = 5) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const origData = ctx.getImageData(0, 0, w, h);
  const od = origData.data;

  // إنشاء نسخة منعمة بالصندوق أو غاوس
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext('2d');
  blurCtx.filter = `blur(${Math.max(1, Math.round(ksize / 2))}px)`;
  blurCtx.drawImage(img, 0, 0);
  const blurData = blurCtx.getImageData(0, 0, w, h);
  const bd = blurData.data;

  const outData = ctx.createImageData(w, h);
  const outD = outData.data;

  for (let i = 0; i < od.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = od[i + c];
      const blurred = bd[i + c];
      // Highboost: A * orig - blurred = orig + (A - 1) * orig + (orig - blurred)
      const res = A * orig - (A - 1 > 0 ? (A - 1) * blurred : blurred);
      outD[i + c] = clamp(Math.round(orig + A * (orig - blurred)));
    }
    outD[i + 3] = 255;
  }

  ctx.putImageData(outData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * كاشف حواف كاني الأكاديمي المباشر (Canny Edge Detector)
 */
export async function applyCannyEdge(dataUrl, lowThresh = 50, highThresh = 140) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // 1. تنعيم أولي لإزالة الضجيج
  ctx.filter = 'blur(1px)';
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 2. تحويل للرمادي
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }

  // 3. تدرجات سوبيل والزاوية
  const mag = new Float32Array(w * h);
  const dir = new Uint8Array(w * h); // 0=0°, 1=45°, 2=90°, 3=135°

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] -
        2 * gray[y * w + (x - 1)]   + 2 * gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];

      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];

      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y * w + x] = m;

      let angle = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (angle < 0) angle += 180;

      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) dir[y * w + x] = 0;
      else if (angle >= 22.5 && angle < 67.5) dir[y * w + x] = 1;
      else if (angle >= 67.5 && angle < 112.5) dir[y * w + x] = 2;
      else dir[y * w + x] = 3;
    }
  }

  // 4. كبت القيم غير العظمى (Non-Maximum Suppression)
  const nms = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = mag[y * w + x];
      const d = dir[y * w + x];
      let p1 = 0, p2 = 0;

      if (d === 0) {
        p1 = mag[y * w + (x - 1)];
        p2 = mag[y * w + (x + 1)];
      } else if (d === 1) {
        p1 = mag[(y - 1) * w + (x + 1)];
        p2 = mag[(y + 1) * w + (x - 1)];
      } else if (d === 2) {
        p1 = mag[(y - 1) * w + x];
        p2 = mag[(y + 1) * w + x];
      } else {
        p1 = mag[(y - 1) * w + (x - 1)];
        p2 = mag[(y + 1) * w + (x + 1)];
      }

      if (c >= p1 && c >= p2) {
        nms[y * w + x] = c;
      } else {
        nms[y * w + x] = 0;
      }
    }
  }

  // 5. العتبة المزدوجة والتتبع بالتلاكؤ (Hysteresis Thresholding)
  const out = ctx.createImageData(w, h);
  const od = out.data;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const val = nms[y * w + x];
      const idx = (y * w + x) * 4;
      if (val >= highThresh) {
        od[idx] = od[idx + 1] = od[idx + 2] = 255;
        od[idx + 3] = 255;
      } else if (val >= lowThresh) {
        // فحص الجوار 8
        let connected = false;
        for (let ny = -1; ny <= 1; ny++) {
          for (let nx = -1; nx <= 1; nx++) {
            if (nms[(y + ny) * w + (x + nx)] >= highThresh) {
              connected = true;
              break;
            }
          }
          if (connected) break;
        }
        const res = connected ? 255 : 0;
        od[idx] = od[idx + 1] = od[idx + 2] = res;
        od[idx + 3] = 255;
      } else {
        od[idx] = od[idx + 1] = od[idx + 2] = 0;
        od[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 14. الفلاتر الطيفية والحرارية والسينمائية (False-Color & Thermal Vision)
 * ========================================================================= */

/**
 * تطبيق جداول التحويل الطيفي والحراري (FLIR Ironbow, Jet, X-Ray, Night-Vision, Cyberpunk)
 */
export async function applyFalseColorLUT(dataUrl, lutType = 'ironbow') {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // بناء جدول ألوان RGB (256 entries)
  const lutR = new Uint8ClampedArray(256);
  const lutG = new Uint8ClampedArray(256);
  const lutB = new Uint8ClampedArray(256);

  if (lutType === 'ironbow') {
    // FLIR Ironbow: Black -> Dark Purple -> Red -> Orange -> Yellow -> White
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      if (t < 0.25) {
        const f = t / 0.25;
        lutR[i] = Math.round(70 * f);
        lutG[i] = 0;
        lutB[i] = Math.round(150 * f);
      } else if (t < 0.5) {
        const f = (t - 0.25) / 0.25;
        lutR[i] = Math.round(70 + 185 * f);
        lutG[i] = Math.round(20 * f);
        lutB[i] = Math.round(150 * (1 - f));
      } else if (t < 0.75) {
        const f = (t - 0.5) / 0.25;
        lutR[i] = 255;
        lutG[i] = Math.round(20 + 180 * f);
        lutB[i] = 0;
      } else {
        const f = (t - 0.75) / 0.25;
        lutR[i] = 255;
        lutG[i] = Math.round(200 + 55 * f);
        lutB[i] = Math.round(255 * f);
      }
    }
  } else if (lutType === 'jet') {
    // Jet Spectrum: Blue -> Cyan -> Green -> Yellow -> Red
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      lutR[i] = clamp(Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3)))));
      lutG[i] = clamp(Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2)))));
      lutB[i] = clamp(Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1)))));
    }
  } else if (lutType === 'xray') {
    // Medical X-Ray: Inverted high-contrast cyan/blue
    for (let i = 0; i < 256; i++) {
      const inv = 255 - i;
      lutR[i] = clamp(Math.round(inv * 0.7));
      lutG[i] = clamp(Math.round(inv * 0.85));
      lutB[i] = clamp(Math.round(inv * 1.05));
    }
  } else if (lutType === 'nightvision') {
    // Phosphor Night Vision: Intense phosphor green with contrast
    for (let i = 0; i < 256; i++) {
      lutR[i] = clamp(Math.round(i * 0.15));
      lutG[i] = clamp(Math.round(i * 1.25));
      lutB[i] = clamp(Math.round(i * 0.2));
    }
  } else {
    // Cyberpunk Neon
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      if (t < 0.5) {
        const f = t / 0.5;
        lutR[i] = Math.round(10 + 20 * f);
        lutG[i] = Math.round(40 + 180 * f);
        lutB[i] = Math.round(80 + 175 * f);
      } else {
        const f = (t - 0.5) / 0.5;
        lutR[i] = Math.round(30 + 225 * f);
        lutG[i] = Math.round(220 * (1 - f * 0.7));
        lutB[i] = Math.round(255 * (1 - f * 0.2));
      }
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = lutR[gray];
    d[i + 1] = lutG[gray];
    d[i + 2] = lutB[gray];
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 15. معمل توليد الضوضاء وفلاتر الترميم (Noise & Restoration Lab)
 * ========================================================================= */

function boxMullerRandom(mean = 0, sigma = 25) {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + sigma * z;
}

/**
 * حقن الضوضاء (Gaussian, Salt & Pepper, Uniform)
 */
export async function addNoise(dataUrl, noiseType = 'gaussian', params = {}) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  if (noiseType === 'gaussian') {
    const mean = params.mean != null ? Number(params.mean) : 0;
    const sigma = params.sigma != null ? Number(params.sigma) : 25;
    for (let i = 0; i < d.length; i += 4) {
      const noise = boxMullerRandom(mean, sigma);
      d[i] = clamp(d[i] + noise);
      d[i + 1] = clamp(d[i + 1] + noise);
      d[i + 2] = clamp(d[i + 2] + noise);
    }
  } else if (noiseType === 'salt_pepper') {
    const prob = params.density != null ? Number(params.density) / 100 : 0.05;
    for (let i = 0; i < d.length; i += 4) {
      const r = Math.random();
      if (r < prob / 2) {
        d[i] = d[i + 1] = d[i + 2] = 0; // Pepper
      } else if (r < prob) {
        d[i] = d[i + 1] = d[i + 2] = 255; // Salt
      }
    }
  } else if (noiseType === 'uniform') {
    const range = params.range != null ? Number(params.range) : 40;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 2 * range;
      d[i] = clamp(d[i] + noise);
      d[i + 1] = clamp(d[i + 1] + noise);
      d[i + 2] = clamp(d[i + 2] + noise);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فلاتر الاستعادة والترميم (Arithmetic, Geometric, Harmonic, Contraharmonic, Alpha-Trimmed, Wiener)
 */
export async function applyRestorationFilter(dataUrl, filterType = 'arithmetic_mean', params = {}) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data;
  const dd = dst.data;

  const ksize = params.ksize != null ? Number(params.ksize) : 3;
  const half = Math.floor(ksize / 2);
  const mn = ksize * ksize;
  const Q = params.Q != null ? Number(params.Q) : 1.5;
  const dTrim = params.d != null ? Math.min(mn - 1, Number(params.d)) : 2;
  const noiseVar = params.noiseVar != null ? Number(params.noiseVar) : 400;

  // دالة مساعدة لجلب بكسل مع حواف مرآتية
  const getPix = (ch, x, y) => {
    let px = x < 0 ? -x : (x >= w ? 2 * w - x - 2 : x);
    let py = y < 0 ? -y : (y >= h ? 2 * h - y - 2 : y);
    px = Math.max(0, Math.min(w - 1, px));
    py = Math.max(0, Math.min(h - 1, py));
    return sd[(py * w + px) * 4 + ch];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      for (let ch = 0; ch < 3; ch++) {
        if (filterType === 'arithmetic_mean') {
          let sum = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              sum += getPix(ch, x + kx, y + ky);
            }
          }
          dd[idx + ch] = clamp(Math.round(sum / mn));
        } else if (filterType === 'geometric_mean') {
          let logSum = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const val = Math.max(1e-4, getPix(ch, x + kx, y + ky));
              logSum += Math.log(val);
            }
          }
          dd[idx + ch] = clamp(Math.round(Math.exp(logSum / mn)));
        } else if (filterType === 'harmonic_mean') {
          let recSum = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const val = Math.max(1, getPix(ch, x + kx, y + ky));
              recSum += 1.0 / val;
            }
          }
          dd[idx + ch] = clamp(Math.round(recSum > 0 ? mn / recSum : 0));
        } else if (filterType === 'contraharmonic_mean') {
          let num = 0;
          let den = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const val = Math.max(1, getPix(ch, x + kx, y + ky));
              num += Math.pow(val, Q + 1);
              den += Math.pow(val, Q);
            }
          }
          dd[idx + ch] = clamp(Math.round(den !== 0 ? num / den : 0));
        } else if (filterType === 'median') {
          const vals = [];
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              vals.push(getPix(ch, x + kx, y + ky));
            }
          }
          vals.sort((a, b) => a - b);
          dd[idx + ch] = vals[Math.floor(vals.length / 2)];
        } else if (filterType === 'alpha_trimmed') {
          const vals = [];
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              vals.push(getPix(ch, x + kx, y + ky));
            }
          }
          vals.sort((a, b) => a - b);
          const trim = Math.floor(dTrim / 2);
          const count = mn - 2 * trim;
          let sum = 0;
          for (let i = trim; i < trim + count; i++) {
            sum += vals[i];
          }
          dd[idx + ch] = clamp(Math.round(sum / Math.max(1, count)));
        } else if (filterType === 'wiener') {
          // Adaptive Local Wiener Filter
          let mean = 0;
          const vals = [];
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const v = getPix(ch, x + kx, y + ky);
              mean += v;
              vals.push(v);
            }
          }
          mean /= mn;
          let variance = 0;
          for (let i = 0; i < vals.length; i++) {
            const diff = vals[i] - mean;
            variance += diff * diff;
          }
          variance /= mn;

          const g = sd[idx + ch];
          if (variance <= noiseVar) {
            dd[idx + ch] = clamp(Math.round(mean));
          } else {
            const ratio = noiseVar / variance;
            dd[idx + ch] = clamp(Math.round(g - ratio * (g - mean)));
          }
        }
      }
      dd[idx + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * حساب مقاييس الجودة الأكاديمية (PSNR & MSE)
 */
export async function calculatePSNRAndMSE(originalDataUrl, currentDataUrl) {
  if (!originalDataUrl || !currentDataUrl) return { psnr: '∞ dB', mse: '0.00' };

  const [img1, img2] = await Promise.all([loadImage(originalDataUrl), loadImage(currentDataUrl)]);
  const w = Math.min(img1.naturalWidth, img2.naturalWidth);
  const h = Math.min(img1.naturalHeight, img2.naturalHeight);

  const canvas1 = document.createElement('canvas');
  canvas1.width = w; canvas1.height = h;
  const ctx1 = canvas1.getContext('2d');
  ctx1.drawImage(img1, 0, 0, w, h);
  const d1 = ctx1.getImageData(0, 0, w, h).data;

  const canvas2 = document.createElement('canvas');
  canvas2.width = w; canvas2.height = h;
  const ctx2 = canvas2.getContext('2d');
  ctx2.drawImage(img2, 0, 0, w, h);
  const d2 = ctx2.getImageData(0, 0, w, h).data;

  let sumSqErr = 0;
  const totalChannels = w * h * 3;

  for (let i = 0; i < d1.length; i += 4) {
    const dr = d1[i] - d2[i];
    const dg = d1[i + 1] - d2[i + 1];
    const db = d1[i + 2] - d2[i + 2];
    sumSqErr += dr * dr + dg * dg + db * db;
  }

  const mse = sumSqErr / totalChannels;
  if (mse === 0) return { psnr: '∞ dB', mse: '0.00' };

  const psnr = 10 * Math.log10((255 * 255) / mse);
  return {
    psnr: `${psnr.toFixed(2)} dB`,
    mse: mse.toFixed(2)
  };
}

/* =========================================================================
 * 16. المعالجة المورفولوجية الكاملة (Morphological Processing Suite)
 * ========================================================================= */

/**
 * تطبيق العمليات المورفولوجية: dilate, erode, open, close, tophat, blackhat, gradient
 */
export async function applyMorphology(dataUrl, op = 'dilate', seType = 'square', seSize = 3) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const sd = src.data;

  const half = Math.floor(seSize / 2);

  // دالة الفحص داخل العنصر الهيكلي
  const inSE = (kx, ky) => {
    if (seType === 'cross') return kx === 0 || ky === 0;
    return true; // square
  };

  // تمدد أساسي لمصفوفة بكسل
  const dilateBuffer = (inBuf) => {
    const outBuf = new Uint8ClampedArray(inBuf.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          let maxVal = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              if (!inSE(kx, ky)) continue;
              const px = Math.max(0, Math.min(w - 1, x + kx));
              const py = Math.max(0, Math.min(h - 1, y + ky));
              const v = inBuf[(py * w + px) * 4 + ch];
              if (v > maxVal) maxVal = v;
            }
          }
          outBuf[idx + ch] = maxVal;
        }
        outBuf[idx + 3] = 255;
      }
    }
    return outBuf;
  };

  // تآكل أساسي لمصفوفة بكسل
  const erodeBuffer = (inBuf) => {
    const outBuf = new Uint8ClampedArray(inBuf.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          let minVal = 255;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              if (!inSE(kx, ky)) continue;
              const px = Math.max(0, Math.min(w - 1, x + kx));
              const py = Math.max(0, Math.min(h - 1, y + ky));
              const v = inBuf[(py * w + px) * 4 + ch];
              if (v < minVal) minVal = v;
            }
          }
          outBuf[idx + ch] = minVal;
        }
        outBuf[idx + 3] = 255;
      }
    }
    return outBuf;
  };

  let finalBuffer = null;

  if (op === 'dilate') {
    finalBuffer = dilateBuffer(sd);
  } else if (op === 'erode') {
    finalBuffer = erodeBuffer(sd);
  } else if (op === 'open') {
    // Erode then Dilate
    finalBuffer = dilateBuffer(erodeBuffer(sd));
  } else if (op === 'close') {
    // Dilate then Erode
    finalBuffer = erodeBuffer(dilateBuffer(sd));
  } else if (op === 'tophat') {
    // Original - Opening
    const opened = dilateBuffer(erodeBuffer(sd));
    finalBuffer = new Uint8ClampedArray(sd.length);
    for (let i = 0; i < sd.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        finalBuffer[i + c] = clamp(sd[i + c] - opened[i + c]);
      }
      finalBuffer[i + 3] = 255;
    }
  } else if (op === 'blackhat') {
    // Closing - Original
    const closed = erodeBuffer(dilateBuffer(sd));
    finalBuffer = new Uint8ClampedArray(sd.length);
    for (let i = 0; i < sd.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        finalBuffer[i + c] = clamp(closed[i + c] - sd[i + c]);
      }
      finalBuffer[i + 3] = 255;
    }
  } else if (op === 'gradient') {
    // Dilate - Erode
    const dilated = dilateBuffer(sd);
    const eroded = erodeBuffer(sd);
    finalBuffer = new Uint8ClampedArray(sd.length);
    for (let i = 0; i < sd.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        finalBuffer[i + c] = clamp(dilated[i + c] - eroded[i + c]);
      }
      finalBuffer[i + 3] = 255;
    }
  }

  const outData = ctx.createImageData(w, h);
  outData.data.set(finalBuffer);
  ctx.putImageData(outData, 0, 0);
  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 17. تجزئة الصور وعزل الألوان (Image Segmentation: Color Masking & K-Means)
 * ========================================================================= */

/**
 * فلتر قناع الألوان وعزل العناصر (Color Masking / Chroma Keying)
 * @param {string} mode - 'binary' (قناع أبيض وأسود) أو 'isolate' (إبقاء اللون وتعتيم الباقي)
 */
export async function applyColorMasking(dataUrl, targetColor = [200, 50, 50], tolerance = 60, mode = 'isolate') {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const [tr, tg, tb] = targetColor;
  const tolSq = tolerance * tolerance * 3;

  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - tr;
    const dg = d[i + 1] - tg;
    const db = d[i + 2] - tb;
    const distSq = dr * dr + dg * dg + db * db;
    const inRange = distSq <= tolSq;

    if (mode === 'binary') {
      const val = inRange ? 255 : 0;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    } else {
      // Isolate: keep color if in range, desaturate/darken if not
      if (!inRange) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * 0.35;
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فلتر التجزئة العنقودية الفعلي (K-Means Clustering Segmentation)
 */
export async function applyKMeansSegmentation(dataUrl, k = 4, maxIter = 8) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const numPixels = w * h;

  // 1. بذر المراكز العشوائية الأولية (Random Centroids)
  const kClamped = Math.max(2, Math.min(8, k));
  const centroids = [];
  for (let c = 0; c < kClamped; c++) {
    const randIdx = Math.floor(Math.random() * numPixels) * 4;
    centroids.push([d[randIdx], d[randIdx + 1], d[randIdx + 2]]);
  }

  const labels = new Uint8Array(numPixels);
  let iter = 0;

  while (iter < maxIter) {
    const sums = Array.from({ length: kClamped }, () => [0, 0, 0]);
    const counts = new Int32Array(kClamped);

    // ربط كل بكسل بأقرب مركز
    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const r = d[idx], g = d[idx + 1], b = d[idx + 2];
      let minDist = Infinity;
      let bestC = 0;

      for (let c = 0; c < kClamped; c++) {
        const dr = r - centroids[c][0];
        const dg = g - centroids[c][1];
        const db = b - centroids[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          bestC = c;
        }
      }

      labels[i] = bestC;
      sums[bestC][0] += r;
      sums[bestC][1] += g;
      sums[bestC][2] += b;
      counts[bestC]++;
    }

    // تحديث المراكز
    for (let c = 0; c < kClamped; c++) {
      if (counts[c] > 0) {
        centroids[c][0] = Math.round(sums[c][0] / counts[c]);
        centroids[c][1] = Math.round(sums[c][1] / counts[c]);
        centroids[c][2] = Math.round(sums[c][2] / counts[c]);
      }
    }
    iter++;
  }

  // بناء الصورة المجزأة
  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const c = labels[i];
    d[idx] = centroids[c][0];
    d[idx + 1] = centroids[c][1];
    d[idx + 2] = centroids[c][2];
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/* =========================================================================
 * 18. أداة إخفاء واستخراج البيانات (LSB Steganography)
 * ========================================================================= */

/**
 * تشفير نص سري في البت الأقل أهمية لبكسلات الصورة (LSB Embed)
 */
export async function embedLSBMessage(dataUrl, message) {
  if (!message) return dataUrl;
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // تحويل النص إلى بايتات UTF-8
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const totalLength = msgBytes.length;

  // التأكد من أن سعة الصورة تكفي (3 بت لكل بكسل في قنوات R,G,B)
  const capacityBits = (d.length / 4) * 3;
  // نحتاج 32 بت لرأس الطول + (totalLength * 8) بت
  const requiredBits = 32 + totalLength * 8;
  if (requiredBits > capacityBits) {
    throw new Error('حجم النص أكبر من سعة البكسلات المتاحة في هذه الصورة');
  }

  // مصفوفة البتات الإجمالية
  const bits = [];
  // 32 بت لطول الرسالة
  for (let i = 31; i >= 0; i--) {
    bits.push((totalLength >> i) & 1);
  }
  // بتات النص
  for (let i = 0; i < msgBytes.length; i++) {
    const byte = msgBytes[i];
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }

  // حقن البتات في LSB لقنوات R, G, B
  let bitIdx = 0;
  for (let i = 0; i < d.length && bitIdx < bits.length; i += 4) {
    for (let c = 0; c < 3 && bitIdx < bits.length; c++) {
      // مسح البت الأخير واستبداله
      d[i + c] = (d[i + c] & 0xFE) | bits[bitIdx++];
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * فك واستخراج النص السري من بتات الصورة (LSB Extract)
 */
export async function extractLSBMessage(dataUrl) {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 1. قراءة أول 32 بت لمعرفة طول الرسالة
  let lengthBits = 0;
  let bitIdx = 0;
  for (let i = 0; i < d.length && bitIdx < 32; i += 4) {
    for (let c = 0; c < 3 && bitIdx < 32; c++) {
      const bit = d[i + c] & 1;
      lengthBits = (lengthBits << 1) | bit;
      bitIdx++;
    }
  }

  const msgLength = lengthBits >>> 0;
  // فحص أمان الطول
  if (msgLength <= 0 || msgLength > (d.length / 4) * 3) {
    return 'لم يتم العثور على رسالة مشفرة في هذه الصورة (أو أن الصورة تم تعديلها).';
  }

  // 2. قراءة بتات الرسالة
  const totalBitsNeeded = 32 + msgLength * 8;
  const msgBytes = new Uint8Array(msgLength);
  let currentByte = 0;
  let currentBitInByte = 0;
  let byteIdx = 0;

  bitIdx = 0;
  for (let i = 0; i < d.length && bitIdx < totalBitsNeeded; i += 4) {
    for (let c = 0; c < 3 && bitIdx < totalBitsNeeded; c++) {
      if (bitIdx >= 32) {
        const bit = d[i + c] & 1;
        currentByte = (currentByte << 1) | bit;
        currentBitInByte++;
        if (currentBitInByte === 8) {
          msgBytes[byteIdx++] = currentByte;
          currentByte = 0;
          currentBitInByte = 0;
        }
      }
      bitIdx++;
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(msgBytes);
}

/* =========================================================================
 * 19. عدسة فحص مصفوفة البكسلات 5x5 الحية (Live Pixel Matrix Inspector)
 * ========================================================================= */

/**
 * استخراج مصفوفة الأرقام 5x5 المحيطة بإحداثيات البكسل (cx, cy)
 */
export async function extractPixelMatrix5x5(dataUrl, cx, cy) {
  if (!dataUrl) return null;
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const matrix = [];
  const startX = Math.round(cx) - 2;
  const startY = Math.round(cy) - 2;

  for (let y = startY; y <= startY + 4; y++) {
    const row = [];
    for (let x = startX; x <= startX + 4; x++) {
      const px = Math.max(0, Math.min(w - 1, x));
      const py = Math.max(0, Math.min(h - 1, y));
      const idx = (py * w + px) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      row.push({ r, g, b, gray, hex, isCenter: x === Math.round(cx) && y === Math.round(cy) });
    }
    matrix.push(row);
  }

  return {
    cx: Math.round(cx),
    cy: Math.round(cy),
    matrix,
    centerPixel: matrix[2][2]
  };
}


