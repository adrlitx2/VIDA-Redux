# MediaPipe Facial Tracking Calibration Research

## Official MediaPipe Sources

### 1. MediaPipe Face Mesh Documentation
- **Official Repo**: https://github.com/google/mediapipe/tree/master/docs/solutions/face_mesh.md
- **468 Landmark Specification**: Detailed coordinate mappings for all facial landmarks
- **Canonical Face Model**: Based on the "Attention Mesh" paper with standardized proportions

### 2. Academic Papers & Research

#### Primary Paper: "Real-time Facial Surface Geometry from Monocular Video on Mobile GPUs"
- **Authors**: Kartynnik et al. (Google Research)
- **Key Insights**: Landmark stability, coordinate normalization, facial proportion ratios
- **Baseline Values**: Established neutral expression thresholds

#### "Attention Mesh: High-fidelity Face Mesh Prediction in Real-time"
- **Authors**: Bazarevsky et al.
- **Contribution**: 468-point face mesh topology with expression-specific calibration
- **Normalization Standards**: Face-width based proportional scaling methods

### 3. Facial Action Unit (AU) Standards

#### FACS (Facial Action Coding System)
- **Organization**: Paul Ekman Group
- **Standard**: AU intensity measurements (0-5 scale)
- **Conversion Formula**: MediaPipe landmarks → FACS AU intensities
- **Key AUs for Avatar Animation**:
  - AU12 (Lip Corner Puller) - Smile detection
  - AU26 (Jaw Drop) - Mouth opening
  - AU1+2 (Inner/Outer Brow Raiser) - Surprise
  - AU4 (Brow Lowerer) - Anger/concentration

## Calibration Improvement Strategies

### 1. Anthropometric Facial Proportions
Based on Leonardo da Vinci's facial proportions and modern anthropometric studies:

```
Face Width Ratios (normalized to 1.0):
- Eye separation: 0.3-0.35 of face width
- Mouth width: 0.5-0.6 of face width
- Nose width: 0.25-0.3 of face width
- Eyebrow height: 0.08-0.12 above eye center

Neutral Expression Baselines:
- Mouth corner Y-position: ±0.02 face width from mouth center
- Eyebrow-to-eye distance: 0.045-0.055 face width
- Eye openness ratio: 0.25-0.35 (height/width)
- Lip separation: 0.015-0.025 face width
```

### 2. Expression Intensity Calibration

#### Smile Detection Refinement
```
Authentic Smile (Duchenne):
- Mouth corner elevation: 0.03-0.08 face width
- Cheek raise activation: 0.02-0.05 face width
- Eye crinkle engagement: AU6 activation

False Smile Detection:
- Mouth corner only, no cheek raise
- No eye involvement (AU6 absent)
```

#### Micro-Expression Thresholds
```
Validated Micro-Expression Ranges:
- Lip purse: 15-25% mouth width reduction
- Nostril flare: 20-40% nostril width increase  
- Chin raise: 0.01-0.03 face width chin elevation
- Eyebrow flash: 0.02-0.04 face width brow raise (brief)
```

### 3. Real-Time Calibration Techniques

#### Dynamic Baseline Establishment
- **Neutral Frame Capture**: First 30 frames for individual baseline
- **Adaptive Thresholds**: Person-specific expression ranges
- **Drift Compensation**: Gradual baseline adjustment over time

#### Multi-Frame Expression Validation
- **Temporal Consistency**: Expression must persist 3+ frames
- **Magnitude Validation**: Intensity must exceed noise threshold
- **Combination Logic**: Complex expressions require multiple AU activation

## Implementation Recommendations

### 1. Enhanced Landmark Selection
Use MediaPipe's most stable landmarks for expression detection:
```
Primary Smile: Points 61, 291, 17 (mouth corners + center)
Stable Eyebrow: Points 70, 107 (inner brow points)
Reliable Eye: Points 159, 145, 386, 374 (eye tops/bottoms)
Cheek Detection: Points 205, 425 (most prominent cheek points)
```

### 2. Face-Proportional Scaling Formula
```javascript
// Universal normalization approach
const faceWidth = Math.abs(landmarks[234].x - landmarks[454].x);
const normalizedValue = (measurement / faceWidth);
const expressionIntensity = Math.max(0, Math.min(1, 
  (normalizedValue - neutralBaseline) * sensitivityMultiplier
));
```

### 3. Expression Combination Logic
```javascript
// Authentic expression detection
const authenticSmile = smile > 0.3 && cheekRaise > 0.2;
const concentration = browLower > 0.2 && smile < 0.1 && jawDrop < 0.1;
const surprise = eyebrowRaise > 0.4 && jawDrop > 0.3;
```

## Validation Datasets

### 1. CK+ (Extended Cohn-Kanade Dataset)
- **Purpose**: Expression intensity validation
- **Content**: Posed facial expressions with AU intensity labels
- **Usage**: Calibrate expression thresholds against ground truth

### 2. DISFA (Denver Intensity of Spontaneous Facial Action)
- **Purpose**: Spontaneous expression analysis
- **Content**: Natural facial movements with FACS coding
- **Usage**: Validate micro-expression detection accuracy

### 3. BP4D-Spontaneous Database
- **Purpose**: Multi-ethnic expression validation  
- **Content**: Diverse facial structures with AU annotations
- **Usage**: Ensure calibration works across different face shapes

## Next Steps for Enhanced Calibration

1. **Implement person-specific baseline capture**
2. **Add temporal expression validation**
3. **Integrate FACS AU intensity mapping**
4. **Apply anthropometric proportion validation**
5. **Add expression combination logic**
6. **Implement adaptive threshold adjustment**

This research-backed approach will significantly improve the accuracy and reliability of our MediaPipe-based facial tracking system.