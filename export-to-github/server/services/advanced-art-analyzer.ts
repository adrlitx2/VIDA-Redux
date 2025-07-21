/**
 * Advanced Art Analyzer for Complex Mutant Ape Artwork
 * Detects specific features like sunglasses, hats, facial oddities, clothes, etc.
 * Implements generative/predictive elements for missing body parts
 */

import Sharp from 'sharp';

interface BackgroundRemovalResult {
  processedImageBuffer: Buffer;
  backgroundDetected: boolean;
  backgroundColors: string[];
  method: string;
}

interface ArtworkFeatures {
  characterType: string;
  headwear: {
    hasHat: boolean;
    hatType: string;
    hatColor: string;
  };
  eyewear: {
    hasSunglasses: boolean;
    glassesType: string;
    eyeColor: string;
  };
  mouth: {
    style: string;
    hasTeeth: boolean;
    hasGrill: boolean;
  };
  clothing: {
    hasClothing: boolean;
    clothingType: string;
    accessories: string[];
  };
  fur: {
    primaryColor: string;
    pattern: string;
    texture: string;
  };
  missingParts: {
    arms: boolean;
    legs: boolean;
    torso: boolean;
    hands: boolean;
  };
}

export class AdvancedArtAnalyzer {
  
  /**
   * DISABLED: Background removal temporarily disabled to preserve character integrity
   * Returns original image to prevent character damage
   */
  async removeBackground(imageBuffer: Buffer): Promise<BackgroundRemovalResult> {
    console.log('🛡️ Background removal disabled - preserving original character');
    
    return {
      processedImageBuffer: imageBuffer,
      backgroundDetected: false,
      backgroundColors: [],
      method: 'Character Preservation (background removal disabled)'
    };
  }

  /**
   * Detect background colors using edge pixel analysis
   */
  private detectBackgroundColors(data: Buffer, width: number, height: number): Array<{r: number, g: number, b: number}> {
    const edgePixels: Array<{r: number, g: number, b: number}> = [];
    
    // Sample top and bottom edges
    for (let x = 0; x < width; x += 5) {
      // Top edge
      const topIndex = x * 4;
      edgePixels.push({
        r: data[topIndex],
        g: data[topIndex + 1],
        b: data[topIndex + 2]
      });
      
      // Bottom edge
      const bottomIndex = ((height - 1) * width + x) * 4;
      edgePixels.push({
        r: data[bottomIndex],
        g: data[bottomIndex + 1],
        b: data[bottomIndex + 2]
      });
    }
    
    // Sample left and right edges
    for (let y = 0; y < height; y += 5) {
      // Left edge
      const leftIndex = (y * width) * 4;
      edgePixels.push({
        r: data[leftIndex],
        g: data[leftIndex + 1],
        b: data[leftIndex + 2]
      });
      
      // Right edge
      const rightIndex = (y * width + width - 1) * 4;
      edgePixels.push({
        r: data[rightIndex],
        g: data[rightIndex + 1],
        b: data[rightIndex + 2]
      });
    }
    
    // Cluster similar colors (tolerance-based grouping)
    return this.clusterColors(edgePixels, 30); // 30-pixel tolerance
  }

  /**
   * Cluster similar colors for background detection
   */
  private clusterColors(pixels: Array<{r: number, g: number, b: number}>, tolerance: number): Array<{r: number, g: number, b: number}> {
    const clusters: Array<{color: {r: number, g: number, b: number}, count: number}> = [];
    
    for (const pixel of pixels) {
      let foundCluster = false;
      
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(pixel.r - cluster.color.r, 2) +
          Math.pow(pixel.g - cluster.color.g, 2) +
          Math.pow(pixel.b - cluster.color.b, 2)
        );
        
        if (distance <= tolerance) {
          cluster.count++;
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        clusters.push({
          color: pixel,
          count: 1
        });
      }
    }
    
    // Return top 3 most common background colors
    return clusters
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(cluster => cluster.color);
  }

  /**
   * Create mask for background removal
   */
  private createBackgroundMask(data: Buffer, width: number, height: number, backgroundColors: Array<{r: number, g: number, b: number}>): Buffer {
    const mask = Buffer.alloc(width * height);
    
    for (let i = 0; i < width * height; i++) {
      const pixelIndex = i * 4;
      const pixel = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2]
      };
      
      // Check if pixel matches any background color
      let isBackground = false;
      for (const bgColor of backgroundColors) {
        const distance = Math.sqrt(
          Math.pow(pixel.r - bgColor.r, 2) +
          Math.pow(pixel.g - bgColor.g, 2) +
          Math.pow(pixel.b - bgColor.b, 2)
        );
        
        if (distance <= 40) { // 40-pixel color distance tolerance
          isBackground = true;
          break;
        }
      }
      
      mask[i] = isBackground ? 0 : 255; // 0 for background, 255 for foreground
    }
    
    return mask;
  }

  /**
   * Apply background mask to remove background
   */
  private async applyBackgroundMask(imageBuffer: Buffer, mask: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      // Convert mask to alpha channel
      const maskSharp = Sharp(mask, {
        raw: {
          width,
          height,
          channels: 1
        }
      });
      
      // Apply mask as alpha channel to create transparency
      const result = await Sharp(imageBuffer)
        .resize(width, height)
        .ensureAlpha()
        .composite([{
          input: await maskSharp.png().toBuffer(),
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();
      
      return result;
      
    } catch (error) {
      console.error('❌ Error applying background mask:', error);
      return imageBuffer; // Return original if masking fails
    }
  }

  /**
   * Identify character regions that must be preserved
   */
  private identifyCharacterRegions(data: Buffer, width: number, height: number): Array<{x: number, y: number, width: number, height: number, type: string}> {
    const characterRegions = [];
    
    // Head region (top 40% of image)
    characterRegions.push({
      x: Math.floor(width * 0.2),
      y: 0,
      width: Math.floor(width * 0.6),
      height: Math.floor(height * 0.4),
      type: 'head'
    });
    
    // Eye region (concentrated area where eyes would be)
    characterRegions.push({
      x: Math.floor(width * 0.3),
      y: Math.floor(height * 0.15),
      width: Math.floor(width * 0.4),
      height: Math.floor(height * 0.15),
      type: 'eyes'
    });
    
    // Mouth region
    characterRegions.push({
      x: Math.floor(width * 0.35),
      y: Math.floor(height * 0.3),
      width: Math.floor(width * 0.3),
      height: Math.floor(height * 0.15),
      type: 'mouth'
    });
    
    // Body region (center 60% of image, below head)
    characterRegions.push({
      x: Math.floor(width * 0.25),
      y: Math.floor(height * 0.4),
      width: Math.floor(width * 0.5),
      height: Math.floor(height * 0.5),
      type: 'body'
    });
    
    return characterRegions;
  }

  /**
   * Detect safe background colors that won't harm character features
   */
  private detectSafeBackgroundColors(data: Buffer, width: number, height: number, characterRegions: any[]): Array<{r: number, g: number, b: number}> {
    const edgePixels: Array<{r: number, g: number, b: number}> = [];
    
    // Sample corners (most likely to be background)
    const cornerSamples = [
      [0, 0], [width-1, 0], [0, height-1], [width-1, height-1]
    ];
    
    for (const [x, y] of cornerSamples) {
      const index = (y * width + x) * 4;
      edgePixels.push({
        r: data[index],
        g: data[index + 1],
        b: data[index + 2]
      });
    }
    
    // Sample edges but avoid character regions
    for (let x = 0; x < width; x += 10) {
      for (let y = 0; y < height; y += 10) {
        // Only sample if not in character region
        let inCharacterRegion = false;
        for (const region of characterRegions) {
          if (x >= region.x && x < region.x + region.width &&
              y >= region.y && y < region.y + region.height) {
            inCharacterRegion = true;
            break;
          }
        }
        
        if (!inCharacterRegion && (x < 50 || x > width - 50 || y < 50 || y > height - 50)) {
          const index = (y * width + x) * 4;
          edgePixels.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2]
          });
        }
      }
    }
    
    // Conservative color clustering
    const clusters: Array<{color: {r: number, g: number, b: number}, count: number}> = [];
    const tolerance = 40; // More conservative tolerance
    
    for (const pixel of edgePixels) {
      let foundCluster = false;
      
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(pixel.r - cluster.color.r, 2) +
          Math.pow(pixel.g - cluster.color.g, 2) +
          Math.pow(pixel.b - cluster.color.b, 2)
        );
        
        if (distance <= tolerance) {
          cluster.count++;
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        clusters.push({
          color: pixel,
          count: 1
        });
      }
    }
    
    // Only return colors that appear frequently (likely background)
    return clusters
      .filter(cluster => cluster.count >= 3) // Must appear at least 3 times
      .sort((a, b) => b.count - a.count)
      .slice(0, 2) // Max 2 background colors
      .map(cluster => cluster.color);
  }

  /**
   * Create character-preserving mask that protects character features
   */
  private createCharacterPreservingMask(data: Buffer, width: number, height: number, backgroundColors: Array<{r: number, g: number, b: number}>, characterRegions: any[]): Buffer {
    const mask = Buffer.alloc(width * height);
    
    for (let i = 0; i < width * height; i++) {
      const y = Math.floor(i / width);
      const x = i % width;
      const pixelIndex = i * 4;
      
      const pixel = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2]
      };
      
      // Always preserve character regions
      let inCharacterRegion = false;
      for (const region of characterRegions) {
        if (x >= region.x && x < region.x + region.width &&
            y >= region.y && y < region.y + region.height) {
          inCharacterRegion = true;
          break;
        }
      }
      
      if (inCharacterRegion) {
        mask[i] = 255; // Preserve character areas
      } else {
        // Check if pixel matches background colors
        let isBackground = false;
        for (const bgColor of backgroundColors) {
          const distance = Math.sqrt(
            Math.pow(pixel.r - bgColor.r, 2) +
            Math.pow(pixel.g - bgColor.g, 2) +
            Math.pow(pixel.b - bgColor.b, 2)
          );
          
          if (distance <= 60) { // More conservative removal
            isBackground = true;
            break;
          }
        }
        
        mask[i] = isBackground ? 0 : 255; // Remove only clear background
      }
    }
    
    return mask;
  }

  /**
   * Apply conservative background removal that preserves character features
   */
  private async applyConservativeBackgroundRemoval(imageBuffer: Buffer, mask: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      // Convert mask to alpha channel
      const maskSharp = Sharp(mask, {
        raw: {
          width,
          height,
          channels: 1
        }
      });
      
      // Apply mask with conservative blending
      const result = await Sharp(imageBuffer)
        .resize(width, height)
        .ensureAlpha()
        .composite([{
          input: await maskSharp.png().toBuffer(),
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();
      
      return result;
      
    } catch (error) {
      console.error('❌ Error applying conservative background removal:', error);
      return imageBuffer; // Return original if removal fails
    }
  }

  /**
   * Comprehensive artwork analysis for mutant apes and complex characters
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<ArtworkFeatures> {
    try {
      console.log('🎨 Starting comprehensive artwork analysis...');
      
      // Get high-resolution image data for detailed analysis
      const { data, info } = await Sharp(imageBuffer)
        .resize(512, 512, { fit: 'contain' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const width = info.width;
      const height = info.height;
      
      // Analyze different regions of the artwork
      const headRegion = this.extractHeadRegion(data, width, height);
      const eyeRegion = this.extractEyeRegion(data, width, height);
      const mouthRegion = this.extractMouthRegion(data, width, height);
      const bodyRegion = this.extractBodyRegion(data, width, height);
      
      // Detect specific features
      const headwear = this.analyzeHeadwear(headRegion);
      const eyewear = this.analyzeEyewear(eyeRegion);
      const mouth = this.analyzeMouth(mouthRegion);
      const clothing = this.analyzeClothing(bodyRegion);
      const fur = this.analyzeFur(data, width, height);
      
      // Detect missing body parts that need generation
      const missingParts = this.detectMissingParts(data, width, height);
      
      // Classify character type based on all features
      const characterType = this.classifyCharacter(headwear, eyewear, mouth, clothing, fur);
      
      const features: ArtworkFeatures = {
        characterType,
        headwear,
        eyewear,
        mouth,
        clothing,
        fur,
        missingParts
      };
      
      console.log('✅ Artwork analysis complete:', features);
      return features;
      
    } catch (error) {
      console.error('❌ Artwork analysis failed:', error);
      return this.getDefaultFeatures();
    }
  }
  
  /**
   * Extract head region for detailed analysis
   */
  private extractHeadRegion(data: Buffer, width: number, height: number): Buffer {
    const headRegion = Buffer.alloc(width * Math.floor(height * 0.4) * 3);
    let destIndex = 0;
    
    for (let y = 0; y < Math.floor(height * 0.4); y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 3;
        headRegion[destIndex++] = data[srcIndex];
        headRegion[destIndex++] = data[srcIndex + 1];
        headRegion[destIndex++] = data[srcIndex + 2];
      }
    }
    
    return headRegion;
  }
  
  /**
   * Extract eye region for eyewear detection
   */
  private extractEyeRegion(data: Buffer, width: number, height: number): Buffer {
    const eyeY = Math.floor(height * 0.15);
    const eyeHeight = Math.floor(height * 0.15);
    const eyeRegion = Buffer.alloc(width * eyeHeight * 3);
    let destIndex = 0;
    
    for (let y = eyeY; y < eyeY + eyeHeight; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 3;
        eyeRegion[destIndex++] = data[srcIndex];
        eyeRegion[destIndex++] = data[srcIndex + 1];
        eyeRegion[destIndex++] = data[srcIndex + 2];
      }
    }
    
    return eyeRegion;
  }
  
  /**
   * Extract mouth region for dental/grill analysis
   */
  private extractMouthRegion(data: Buffer, width: number, height: number): Buffer {
    const mouthY = Math.floor(height * 0.3);
    const mouthHeight = Math.floor(height * 0.2);
    const mouthRegion = Buffer.alloc(width * mouthHeight * 3);
    let destIndex = 0;
    
    for (let y = mouthY; y < mouthY + mouthHeight; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 3;
        mouthRegion[destIndex++] = data[srcIndex];
        mouthRegion[destIndex++] = data[srcIndex + 1];
        mouthRegion[destIndex++] = data[srcIndex + 2];
      }
    }
    
    return mouthRegion;
  }
  
  /**
   * Extract body region for clothing analysis
   */
  private extractBodyRegion(data: Buffer, width: number, height: number): Buffer {
    const bodyY = Math.floor(height * 0.4);
    const bodyHeight = Math.floor(height * 0.6);
    const bodyRegion = Buffer.alloc(width * bodyHeight * 3);
    let destIndex = 0;
    
    for (let y = bodyY; y < bodyY + bodyHeight; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 3;
        bodyRegion[destIndex++] = data[srcIndex];
        bodyRegion[destIndex++] = data[srcIndex + 1];
        bodyRegion[destIndex++] = data[srcIndex + 2];
      }
    }
    
    return bodyRegion;
  }
  
  /**
   * Analyze headwear (hats, caps, helmets, etc.)
   */
  private analyzeHeadwear(headRegion: Buffer): any {
    let darkPixels = 0;
    let coloredPixels = 0;
    let metallicPixels = 0;
    let totalPixels = headRegion.length / 3;
    
    let hatColors: { [key: string]: number } = {};
    
    for (let i = 0; i < headRegion.length; i += 3) {
      const r = headRegion[i];
      const g = headRegion[i + 1];
      const b = headRegion[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Detect dark hats (black, dark green military style)
      if (brightness < 80) darkPixels++;
      
      // Detect colored hats
      if (r > 150 || g > 150 || b > 150) coloredPixels++;
      
      // Detect metallic/shiny elements
      if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
        metallicPixels++;
      }
      
      // Track hat colors
      const colorKey = `${Math.floor(r/50)*50},${Math.floor(g/50)*50},${Math.floor(b/50)*50}`;
      hatColors[colorKey] = (hatColors[colorKey] || 0) + 1;
    }
    
    const darkRatio = darkPixels / totalPixels;
    const coloredRatio = coloredPixels / totalPixels;
    const metallicRatio = metallicPixels / totalPixels;
    
    // Determine hat type and color
    let hasHat = darkRatio > 0.3 || coloredRatio > 0.4;
    let hatType = 'none';
    let hatColor = 'none';
    
    if (hasHat) {
      if (darkRatio > 0.5) {
        hatType = metallicRatio > 0.1 ? 'military_helmet' : 'cap';
        hatColor = 'black';
      } else if (coloredRatio > 0.4) {
        hatType = 'beanie';
        // Get dominant color
        const dominantColor = Object.entries(hatColors)
          .sort((a, b) => b[1] - a[1])[0][0];
        hatColor = dominantColor;
      }
    }
    
    console.log(`🎩 Headwear analysis: ${hatType} (${hatColor}), Dark: ${darkRatio.toFixed(2)}, Colored: ${coloredRatio.toFixed(2)}`);
    
    return { hasHat, hatType, hatColor };
  }
  
  /**
   * Analyze eyewear (sunglasses, glasses, laser eyes)
   */
  private analyzeEyewear(eyeRegion: Buffer): any {
    let darkPixels = 0;
    let redPixels = 0;
    let reflectivePixels = 0;
    let totalPixels = eyeRegion.length / 3;
    
    for (let i = 0; i < eyeRegion.length; i += 3) {
      const r = eyeRegion[i];
      const g = eyeRegion[i + 1];
      const b = eyeRegion[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Detect dark sunglasses
      if (brightness < 60) darkPixels++;
      
      // Detect red laser eyes
      if (r > 200 && g < 100 && b < 100) redPixels++;
      
      // Detect reflective surfaces
      if (brightness > 220) reflectivePixels++;
    }
    
    const darkRatio = darkPixels / totalPixels;
    const redRatio = redPixels / totalPixels;
    const reflectiveRatio = reflectivePixels / totalPixels;
    
    let hasSunglasses = darkRatio > 0.4 || reflectiveRatio > 0.2;
    let glassesType = 'none';
    let eyeColor = 'normal';
    
    if (hasSunglasses) {
      if (redRatio > 0.1) {
        glassesType = 'laser_eyes';
        eyeColor = 'red';
      } else if (reflectiveRatio > 0.2) {
        glassesType = 'reflective_sunglasses';
        eyeColor = 'mirrored';
      } else {
        glassesType = 'dark_sunglasses';
        eyeColor = 'dark';
      }
    }
    
    console.log(`🕶️ Eyewear analysis: ${glassesType}, Dark: ${darkRatio.toFixed(2)}, Red: ${redRatio.toFixed(2)}`);
    
    return { hasSunglasses, glassesType, eyeColor };
  }

  /**
   * Analyze mouth features (grills, fangs, expression)
   */
  private analyzeMouth(mouthRegion: Buffer): any {
    let metallicPixels = 0;
    let whitePixels = 0;
    let darkPixels = 0;
    let totalPixels = mouthRegion.length / 3;
    
    for (let i = 0; i < mouthRegion.length; i += 3) {
      const r = mouthRegion[i];
      const g = mouthRegion[i + 1];
      const b = mouthRegion[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Detect metallic grills
      if (brightness > 180 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
        metallicPixels++;
      }
      
      // Detect white teeth/fangs
      if (r > 220 && g > 220 && b > 220) whitePixels++;
      
      // Detect dark mouth cavity
      if (brightness < 80) darkPixels++;
    }
    
    const metallicRatio = metallicPixels / totalPixels;
    const whiteRatio = whitePixels / totalPixels;
    const darkRatio = darkPixels / totalPixels;
    
    let style = 'normal';
    let hasTeeth = whiteRatio > 0.1;
    let hasGrill = metallicRatio > 0.05;
    
    if (hasGrill) {
      style = 'grill';
    } else if (hasTeeth && darkRatio > 0.2) {
      style = 'fanged';
    } else if (hasTeeth) {
      style = 'smiling';
    } else if (darkRatio > 0.3) {
      style = 'open';
    }
    
    console.log(`👄 Mouth analysis: ${style}, Metallic: ${metallicRatio.toFixed(2)}, Teeth: ${whiteRatio.toFixed(2)}`);
    
    return { style, hasTeeth, hasGrill };
  }

  /**
   * Analyze clothing and accessories
   */
  private analyzeClothing(bodyRegion: Buffer): any {
    let fabricPixels = 0;
    let chainPixels = 0;
    let colorVariety = new Set<string>();
    let totalPixels = bodyRegion.length / 3;
    
    for (let i = 0; i < bodyRegion.length; i += 3) {
      const r = bodyRegion[i];
      const g = bodyRegion[i + 1];
      const b = bodyRegion[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Detect fabric textures (mid-range brightness with color)
      if (brightness > 80 && brightness < 200) {
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        if (saturation > 50) fabricPixels++;
      }
      
      // Detect metallic chains/jewelry
      if (brightness > 200 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
        chainPixels++;
      }
      
      // Track color variety
      const colorKey = `${Math.floor(r/30)*30},${Math.floor(g/30)*30},${Math.floor(b/30)*30}`;
      colorVariety.add(colorKey);
    }
    
    const fabricRatio = fabricPixels / totalPixels;
    const chainRatio = chainPixels / totalPixels;
    
    let hasClothing = fabricRatio > 0.3;
    let clothingType = hasClothing ? 'shirt' : 'none';
    let accessories: string[] = [];
    
    if (chainRatio > 0.02) {
      accessories.push('necklace');
    }
    
    if (colorVariety.size > 8) {
      accessories.push('patterned_clothing');
    }
    
    console.log(`👔 Clothing analysis: ${clothingType}, Fabric: ${fabricRatio.toFixed(2)}, Chains: ${chainRatio.toFixed(2)}, Colors: ${colorVariety.size}`);
    
    return { hasClothing, clothingType, accessories };
  }

  /**
   * Analyze fur/skin patterns and colors
   */
  private analyzeFur(data: Buffer, width: number, height: number): any {
    let colorCounts: { [key: string]: number } = {};
    let totalPixels = data.length / 4; // RGBA format
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Group colors into ranges
      const colorKey = `${Math.floor(r/40)*40},${Math.floor(g/40)*40},${Math.floor(b/40)*40}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    // Find dominant colors
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    const primaryColor = sortedColors[0]?.[0] || '120,80,40';
    const pattern = sortedColors.length > 2 ? 'multicolored' : 'solid';
    const texture = 'fur'; // Default for now
    
    console.log(`🐾 Fur analysis: Primary ${primaryColor}, Pattern: ${pattern}, Top colors:`, sortedColors.map(c => c[0]));
    
    return { primaryColor, pattern, texture };
  }

  /**
   * Detect missing body parts that need procedural generation
   */
  private detectMissingParts(data: Buffer, width: number, height: number): any {
    // Sample different body regions to detect presence
    const armLeftRegion = this.sampleRegion(data, width, height, 0.1, 0.3, 0.4, 0.8);
    const armRightRegion = this.sampleRegion(data, width, height, 0.7, 0.9, 0.4, 0.8);
    const legLeftRegion = this.sampleRegion(data, width, height, 0.35, 0.45, 0.8, 1.0);
    const legRightRegion = this.sampleRegion(data, width, height, 0.55, 0.65, 0.8, 1.0);
    const torsoRegion = this.sampleRegion(data, width, height, 0.3, 0.7, 0.4, 0.8);
    const handLeftRegion = this.sampleRegion(data, width, height, 0.05, 0.25, 0.6, 0.8);
    const handRightRegion = this.sampleRegion(data, width, height, 0.75, 0.95, 0.6, 0.8);
    
    // Check if regions have meaningful content (not background)
    const missingParts = {
      arms: this.isRegionEmpty(armLeftRegion) || this.isRegionEmpty(armRightRegion),
      legs: this.isRegionEmpty(legLeftRegion) || this.isRegionEmpty(legRightRegion),
      torso: this.isRegionEmpty(torsoRegion),
      hands: this.isRegionEmpty(handLeftRegion) || this.isRegionEmpty(handRightRegion)
    };
    
    console.log('🦴 Missing parts detection:', missingParts);
    
    return missingParts;
  }

  /**
   * Sample a region of the image
   */
  private sampleRegion(data: Buffer, width: number, height: number, x1: number, x2: number, y1: number, y2: number): number[] {
    const samples: number[] = [];
    const startX = Math.floor(x1 * width);
    const endX = Math.floor(x2 * width);
    const startY = Math.floor(y1 * height);
    const endY = Math.floor(y2 * height);
    
    for (let y = startY; y < endY; y += 3) {
      for (let x = startX; x < endX; x += 3) {
        const index = (y * width + x) * 4;
        if (index < data.length - 3) {
          const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
          samples.push(brightness);
        }
      }
    }
    
    return samples;
  }

  /**
   * Check if a region is mostly empty (background)
   */
  private isRegionEmpty(samples: number[]): boolean {
    if (samples.length === 0) return true;
    
    // Calculate variance to detect meaningful content
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / samples.length;
    
    // Low variance and extreme brightness values indicate background
    return variance < 500 || mean < 20 || mean > 235;
  }

  /**
   * Classify character type based on all detected features
   */
  private classifyCharacter(headwear: any, eyewear: any, mouth: any, clothing: any, fur: any): string {
    let score = 0;
    let characterType = 'generic';
    
    // BAYC/NFT scoring system
    if (headwear.hasHat) score++;
    if (eyewear.hasSunglasses) score++;
    if (mouth.hasGrill || mouth.style === 'fanged') score++;
    if (clothing.hasClothing) score++;
    if (fur.pattern === 'multicolored') score++;
    
    if (score >= 3) {
      characterType = 'nft_character';
    } else if (mouth.style === 'fanged' || fur.primaryColor.includes('120')) {
      characterType = 'animal';
    } else if (eyewear.glassesType === 'laser_eyes') {
      characterType = 'robot';
    } else if (headwear.hatType === 'military_helmet') {
      characterType = 'human';
    }
    
    console.log(`🎭 Character classification: ${characterType} (score: ${score})`);
    
    return characterType;
  }

  /**
   * Return default features when analysis fails
   */
  private getDefaultFeatures(): ArtworkFeatures {
    return {
      characterType: 'generic',
      headwear: { hasHat: false, hatType: 'none', hatColor: 'none' },
      eyewear: { hasSunglasses: false, glassesType: 'none', eyeColor: 'normal' },
      mouth: { style: 'normal', hasTeeth: false, hasGrill: false },
      clothing: { hasClothing: false, clothingType: 'none', accessories: [] },
      fur: { primaryColor: '120,80,40', pattern: 'solid', texture: 'fur' },
      missingParts: { arms: true, legs: true, torso: false, hands: true }
    };
  }
}