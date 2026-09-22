# Open Source Attribution & Acknowledgements

This project (**PoseLook + PixelMatrix**) incorporates and builds upon the following open-source software and research works:

---

## 1. my-pose (Pose Estimation & Comparison Concepts)

- **Repository**: [https://github.com/sing1ee/my-pose](https://github.com/sing1ee/my-pose)
- **Author**: Zhang Cheng (sing1ee)
- **License**: MIT License
- **Copyright**: (c) 2024 Zhang Cheng

### MIT License Notice:
```
MIT License

Copyright (c) 2024 Zhang Cheng

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### Components Adapted:
- Skeleton connection graphs and joint landmarks definition (`types.ts`).
- Canvas-based body skeleton rendering (`poseDrawing.ts`).
- Joint-angle calculation concepts (elbows, shoulders, hips, knees) adapted and improved in `poseSimilarity.ts` to compare valid keypoint pairs without missing-angle bias.

---

## 2. MediaPipe & BlazePose (Google LLC)

- **Website**: [https://developers.google.com/mediapipe](https://developers.google.com/mediapipe)
- **Model**: BlazePose: On-device Real-time Body Pose Tracking (Bazarevsky et al., 2020)
- **License**: Apache License, Version 2.0

---

## 3. TensorFlow.js (Google LLC)

- **Website**: [https://www.tensorflow.org/js](https://www.tensorflow.org/js)
- **Packages**: `@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgpu`, `@tensorflow/tfjs-backend-webgl`, `@tensorflow-models/pose-detection`
- **License**: Apache License, Version 2.0

---

## 4. PixelMatrix Studio

- **Framework**: React 19, Vite, Tailwind CSS v4, Lucide Icons
- **Image Processing Engine**: FastAPI, OpenCV, NumPy
