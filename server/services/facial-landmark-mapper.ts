/**
 * Facial Landmark to Morph Target Mapper
 * Converts SAM-ViT 468 facial landmarks into subscription-tiered morph targets
 * Optimized for real-time streaming performance
 */

export interface LandmarkGroup {
  name: string;
  priority: number;
  landmarks: number[];
  description: string;
}

export interface MorphTargetDefinition {
  name: string;
  weight: number;
  priority: number;
  landmarks: number[];
  vertexInfluence: number[];
  streamingOptimized: boolean;
}

export class FacialLandmarkMapper {
  
  // SAM-ViT 468 landmark groups mapped to subscription tiers
  private static readonly LANDMARK_GROUPS: LandmarkGroup[] = [
    // Tier 1: Essential (5 targets) - Free tier
    {
      name: 'jawOpen',
      priority: 1,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'Essential jaw movement for speech'
    },
    {
      name: 'eyeBlinkLeft',
      priority: 1,
      landmarks: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161],
      description: 'Left eye blinking for basic emotion'
    },
    {
      name: 'eyeBlinkRight',
      priority: 1,
      landmarks: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384],
      description: 'Right eye blinking for basic emotion'
    },
    {
      name: 'mouthSmile',
      priority: 1,
      landmarks: [61, 291, 39, 181, 269, 270, 267, 271, 272, 12, 15, 16, 17, 18, 200],
      description: 'Basic smile expression'
    },
    {
      name: 'neutral',
      priority: 1,
      landmarks: [1, 2, 5, 4, 6, 19, 94, 125, 141, 235, 31, 228, 229, 230, 231],
      description: 'Neutral facial position baseline'
    },

    // Tier 2: Enhanced (12 targets) - Reply Guy tier
    {
      name: 'mouthFrown',
      priority: 2,
      landmarks: [17, 18, 175, 199, 175, 0, 269, 270, 267, 271, 272, 12, 15, 16, 17],
      description: 'Frown expression for enhanced emotion'
    },
    {
      name: 'browInnerUp',
      priority: 2,
      landmarks: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 70, 63, 105, 66, 107],
      description: 'Eyebrow raise for surprise/worry'
    },
    {
      name: 'eyeSquintLeft',
      priority: 2,
      landmarks: [7, 33, 144, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 161],
      description: 'Left eye squinting for detailed expression'
    },
    {
      name: 'eyeSquintRight',
      priority: 2,
      landmarks: [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381],
      description: 'Right eye squinting for detailed expression'
    },
    {
      name: 'cheekPuff',
      priority: 2,
      landmarks: [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147],
      description: 'Cheek puffing for playful expressions'
    },
    {
      name: 'noseSneer',
      priority: 2,
      landmarks: [5, 4, 6, 19, 94, 125, 141, 235, 31, 228, 229, 230, 231, 232, 233],
      description: 'Nose sneer for disgust expression'
    },
    {
      name: 'mouthPucker',
      priority: 2,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'Mouth puckering for kiss expressions'
    },

    // Tier 3: Professional (20 targets) - Spartan tier
    {
      name: 'eyeLookInLeft',
      priority: 3,
      landmarks: [133, 173, 157, 158, 159, 160, 161, 246, 3, 51, 48, 115, 131, 134, 102],
      description: 'Left eye looking inward'
    },
    {
      name: 'eyeLookInRight',
      priority: 3,
      landmarks: [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381],
      description: 'Right eye looking inward'
    },
    {
      name: 'eyeLookOutLeft',
      priority: 3,
      landmarks: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161],
      description: 'Left eye looking outward'
    },
    {
      name: 'eyeLookOutRight',
      priority: 3,
      landmarks: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384],
      description: 'Right eye looking outward'
    },
    {
      name: 'mouthLeft',
      priority: 3,
      landmarks: [61, 291, 39, 181, 269, 270, 267, 271, 272, 12, 15, 16, 17, 18, 200],
      description: 'Mouth movement to the left'
    },
    {
      name: 'mouthRight',
      priority: 3,
      landmarks: [61, 291, 39, 181, 269, 270, 267, 271, 272, 12, 15, 16, 17, 18, 200],
      description: 'Mouth movement to the right'
    },
    {
      name: 'mouthRollLower',
      priority: 3,
      landmarks: [17, 18, 175, 199, 175, 0, 269, 270, 267, 271, 272, 12, 15, 16, 17],
      description: 'Lower lip rolling inward'
    },
    {
      name: 'mouthRollUpper',
      priority: 3,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'Upper lip rolling inward'
    },

    // Tier 4: Advanced (35 targets) - Zeus tier
    {
      name: 'browOuterUpLeft',
      priority: 4,
      landmarks: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 70, 63, 105, 66, 107],
      description: 'Left outer eyebrow raise for micro-expressions'
    },
    {
      name: 'browOuterUpRight',
      priority: 4,
      landmarks: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 70, 63, 105, 66, 107],
      description: 'Right outer eyebrow raise for micro-expressions'
    },
    {
      name: 'cheekSquintLeft',
      priority: 4,
      landmarks: [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147],
      description: 'Left cheek squinting for detailed control'
    },
    {
      name: 'cheekSquintRight',
      priority: 4,
      landmarks: [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147],
      description: 'Right cheek squinting for detailed control'
    },
    {
      name: 'mouthUpperUpLeft',
      priority: 4,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'Left upper lip detailed control'
    },
    {
      name: 'mouthUpperUpRight',
      priority: 4,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'Right upper lip detailed control'
    },
    {
      name: 'mouthLowerDownLeft',
      priority: 4,
      landmarks: [17, 18, 175, 199, 175, 0, 269, 270, 267, 271, 272, 12, 15, 16, 17],
      description: 'Left lower lip detailed control'
    },
    {
      name: 'mouthLowerDownRight',
      priority: 4,
      landmarks: [17, 18, 175, 199, 175, 0, 269, 270, 267, 271, 272, 12, 15, 16, 17],
      description: 'Right lower lip detailed control'
    },

    // Tier 5: Premium (50+ targets) - Goat tier with visemes
    {
      name: 'viseme_PP',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'P/B/M sounds - lip closure'
    },
    {
      name: 'viseme_FF',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'F/V sounds - lip-teeth contact'
    },
    {
      name: 'viseme_TH',
      priority: 5,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'TH sounds - tongue-teeth'
    },
    {
      name: 'viseme_DD',
      priority: 5,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'T/D/N/L sounds - tongue-roof'
    },
    {
      name: 'viseme_kk',
      priority: 5,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'K/G sounds - tongue-soft palate'
    },
    {
      name: 'viseme_SS',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'S/Z sounds - narrow opening'
    },
    {
      name: 'viseme_RR',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'R sounds - lip rounding'
    },
    {
      name: 'viseme_aa',
      priority: 5,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'A vowel - wide open'
    },
    {
      name: 'viseme_E',
      priority: 5,
      landmarks: [13, 14, 15, 16, 17, 18, 175, 199, 200, 3, 51, 48, 115, 131, 134],
      description: 'E vowel - medium open'
    },
    {
      name: 'viseme_I',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'I vowel - narrow'
    },
    {
      name: 'viseme_O',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'O vowel - rounded'
    },
    {
      name: 'viseme_U',
      priority: 5,
      landmarks: [12, 15, 16, 17, 18, 200, 199, 175, 0, 269, 270, 267, 271, 272, 12],
      description: 'U vowel - very rounded'
    }
  ];

  /**
   * Generate morph targets based on subscription tier limits
   */
  static generateMorphTargetsForTier(maxTargets: number): MorphTargetDefinition[] {
    const targets: MorphTargetDefinition[] = [];
    
    // Sort by priority to ensure essential targets are included first
    const sortedGroups = this.LANDMARK_GROUPS.sort((a, b) => a.priority - b.priority);
    
    for (const group of sortedGroups) {
      if (targets.length >= maxTargets) break;
      
      targets.push({
        name: group.name,
        weight: group.name === 'neutral' ? 1.0 : 0.0,
        priority: group.priority,
        landmarks: group.landmarks,
        vertexInfluence: this.calculateVertexInfluence(group.landmarks),
        streamingOptimized: group.priority <= 3 // Optimize first 3 tiers for streaming
      });
    }
    
    return targets.slice(0, maxTargets);
  }

  /**
   * Calculate vertex influence weights for streaming optimization
   */
  private static calculateVertexInfluence(landmarks: number[]): number[] {
    // Convert landmark indices to vertex influence weights
    // Higher weights for landmarks closer to major facial features
    const weights = landmarks.map(landmark => {
      // Eye region landmarks get higher weights
      if (landmark >= 33 && landmark <= 168) return 0.9;
      // Mouth region landmarks get high weights
      if (landmark >= 0 && landmark <= 18) return 0.85;
      // Nose region landmarks get medium weights
      if (landmark >= 1 && landmark <= 6) return 0.7;
      // Other facial landmarks get lower weights
      return 0.5;
    });
    
    return weights;
  }

  /**
   * Get tier configuration for database storage
   */
  static getTierConfiguration() {
    return {
      free: { maxTargets: 5, priority: 1 },
      reply_guy: { maxTargets: 12, priority: 2 },
      spartan: { maxTargets: 20, priority: 3 },
      zeus: { maxTargets: 35, priority: 4 },
      goat: { maxTargets: 50, priority: 5 }
    };
  }

  /**
   * Validate morph target configuration
   */
  static validateConfiguration(targets: MorphTargetDefinition[], maxTargets: number): boolean {
    return targets.length <= maxTargets && 
           targets.every(target => target.landmarks.length > 0) &&
           targets.some(target => target.name === 'neutral');
  }
}