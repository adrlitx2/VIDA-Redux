/**
 * VidaVision 2D to 3D Conversion Service
 * Converts 2D images to 3D models using proprietary VidaVision AI models
 * Built on free AI engines with custom model architecture for authentic 3D generation
 */

import path from 'path';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';

interface Image2D3DResult {
  success: boolean;
  glbBuffer?: Buffer;
  meshData?: {
    vertices: number;
    faces: number;
    materials: number;
  };
  processingSteps: string[];
  error?: string;
}

interface ProcessingOptions {
  userPlan: string;
  enhanceTextures: boolean;
  generateNormalMaps: boolean;
  optimizeTopology: boolean;
}

export class VidaVision2Dto3D {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', '2d-to-3d');
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory() {
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Main 2D to 3D conversion pipeline using custom VidaVision model architecture
   */
  async convertImage2D3D(
    imageBuffer: Buffer,
    options: ProcessingOptions
  ): Promise<Image2D3DResult> {
    const processingSteps: string[] = [];
    
    try {
      console.log('🎨 Starting 2D to 3D conversion with Enhanced VidaVision...');
      processingSteps.push('Pipeline initialization');

      // Import the enhanced mesh generator
      const { AvatarMeshGenerator } = await import('./avatar-mesh-generator');
      
      // BACKGROUND REMOVAL - Remove backgrounds before character analysis for better accuracy
      console.log('🖼️ Running intelligent background removal...');
      const { AdvancedArtAnalyzer } = await import('./advanced-art-analyzer');
      const artAnalyzer = new AdvancedArtAnalyzer();
      const backgroundRemoval = await artAnalyzer.removeBackground(imageBuffer);
      
      console.log('🎯 Background removal result:', {
        backgroundDetected: backgroundRemoval.backgroundDetected,
        backgroundColors: backgroundRemoval.backgroundColors,
        method: backgroundRemoval.method
      });
      
      // Use background-removed image for better character analysis
      const cleanImageBuffer = backgroundRemoval.processedImageBuffer;
      processingSteps.push(`Background removal: ${backgroundRemoval.method}`);
      
      // Convert background-removed image to raw pixel data for mesh generation
      const { data: pixelData, info } = await sharp(cleanImageBuffer)
        .resize(512, 512)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      processingSteps.push('Image processed and converted to pixel data');
      
      // ADVANCED ART ANALYSIS - Analyze clean image content for traits and missing anatomy
      console.log('🎯 Running comprehensive art analysis for character traits...');
      const artworkFeatures = await artAnalyzer.analyzeArtwork(cleanImageBuffer);
      
      console.log('🔍 Comprehensive character analysis:', {
        characterType: artworkFeatures.characterType,
        headwear: artworkFeatures.headwear,
        eyewear: artworkFeatures.eyewear,
        mouth: artworkFeatures.mouth,
        clothing: artworkFeatures.clothing,
        fur: artworkFeatures.fur,
        missingParts: artworkFeatures.missingParts
      });
      
      processingSteps.push('Comprehensive art analysis completed');
      
      // TRUE IMAGE-TO-3D CONVERSION - Generate 3D mesh by actually reading image pixels
      console.log('🧬 Starting TRUE IMAGE-TO-3D CONVERSION with pixel analysis...');
      
      let meshData;
      try {
        console.log('📦 Importing ImageTo3DConverter...');
        const { ImageTo3DConverter } = await import('./image-to-3d-converter-isolated');
        console.log('✅ ImageTo3DConverter imported successfully');
        
        const imageConverter = new ImageTo3DConverter();
        console.log('✅ ImageTo3DConverter instance created');
        
        console.log('🔍 Starting convertImageTo3D with parameters:', {
          bufferSize: cleanImageBuffer.length,
          resolution: 256,
          depthMultiplier: 1.2,
          userPlan: options.userPlan
        });
        
        meshData = await imageConverter.convertImageTo3D(cleanImageBuffer, {
          resolution: 256,
          depthMultiplier: 1.2,
          userPlan: options.userPlan
        });
        
        console.log('✅ TRUE IMAGE-TO-3D CONVERSION COMPLETED!');
        console.log('🎯 Real pixel-based mesh data:', {
          vertices: meshData.vertices.length / 3,
          faces: meshData.faces.length / 3,
          hasNormals: meshData.normals.length > 0,
          hasTextureCoords: meshData.textureCoords.length > 0
        });
        
      } catch (importError) {
        console.error('❌ ImageTo3DConverter import/execution failed:', importError.message);
        console.error('❌ Falling back to old mesh generation...');
        
        // Import the enhanced mesh generator as fallback
        const { AvatarMeshGenerator } = await import('./avatar-mesh-generator');
        const meshGenerator = new AvatarMeshGenerator();
        
        // Generate mesh using art analysis and background-removed image
        // Ensure artworkFeatures is properly structured for fallback
        const safeArtworkFeatures = artworkFeatures || {
          characterType: 'generic_character',
          headwear: { hasHat: false, hatType: 'none' },
          eyewear: { hasSunglasses: false, glassesType: 'none' },
          mouth: { style: 'normal', hasTeeth: false },
          clothing: { hasClothing: false, clothingType: 'none' },
          fur: { primaryColor: '150,150,150', pattern: 'solid' },
          missingParts: { arms: false, legs: false, torso: false, hands: false }
        };
        
        meshData = await meshGenerator.generateArtBasedMesh(
          pixelData,
          info.width,
          info.height,
          safeArtworkFeatures,
          options.userPlan
        );
        
        console.log('🔄 Fallback mesh generated:', {
          vertices: meshData.vertices.length / 3,
          faces: meshData.faces.length / 3
        });
      }
      
      console.log('✅ 3D mesh generated from real image pixels:', {
        vertices: meshData.vertices.length / 3,
        faces: meshData.faces.length / 3,
        hasNormals: meshData.normals.length > 0,
        hasTextureCoords: meshData.textureCoords.length > 0
      });
      
      processingSteps.push(`3D mesh generated: ${meshData.vertices.length / 3} vertices`);
      
      // GLB BUFFER CREATION - Convert mesh to GLB format
      console.log('📦 Creating GLB buffer from real mesh data...');
      const glbBuffer = await this.createGLBBufferFromRealMesh(meshData);
      
      processingSteps.push('GLB buffer creation completed');
      
      console.log('✅ 2D to 3D conversion completed successfully!');
      console.log(`📊 Final stats: ${meshData.vertices.length / 3} vertices, ${meshData.faces.length / 3} faces`);
      
      return {
        success: true,
        glbBuffer,
        meshData: {
          vertices: meshData.vertices.length / 3,
          faces: meshData.faces.length / 3,
          materials: 1
        },
        processingSteps
      };
      
    } catch (error: any) {
      console.error('❌ 2D to 3D conversion failed:', error.message);
      
      return {
        success: false,
        processingSteps: [...processingSteps, `Error: ${error.message}`],
        error: error.message
      };
    }
  }

  /**
   * Create GLB buffer from real mesh data generated by image-to-3D converter
   */
  private async createGLBBufferFromRealMesh(meshData: {
    vertices: number[];
    faces: number[];
    normals: number[];
    textureCoords: number[];
  }): Promise<Buffer> {
    
    console.log('📦 Creating GLB from actual image-based mesh data...');
    
    // Convert arrays to typed arrays for GLB creation
    const vertices = new Float32Array(meshData.vertices);
    const faces = new Uint16Array(meshData.faces);
    const normals = new Float32Array(meshData.normals);
    const texCoords = new Float32Array(meshData.textureCoords);
    
    console.log('🔍 Real mesh data validation:', {
      vertexCount: vertices.length / 3,
      faceCount: faces.length / 3,
      normalCount: normals.length / 3,
      texCoordCount: texCoords.length / 2,
      vertexSize: vertices.byteLength,
      faceSize: faces.byteLength,
      normalSize: normals.byteLength,
      texCoordSize: texCoords.byteLength
    });
    
    // Calculate bounding box for proper min/max values
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (let i = 0; i < vertices.length; i += 3) {
      min[0] = Math.min(min[0], vertices[i]);
      min[1] = Math.min(min[1], vertices[i + 1]);
      min[2] = Math.min(min[2], vertices[i + 2]);
      max[0] = Math.max(max[0], vertices[i]);
      max[1] = Math.max(max[1], vertices[i + 1]);
      max[2] = Math.max(max[2], vertices[i + 2]);
    }
    
    console.log('🔧 Real mesh bounds:', { min, max });
    
    // Calculate buffer layout with all attributes
    const vertexCount = vertices.length / 3;
    const indexCount = faces.length;
    
    // Buffer layout: vertices, normals, texCoords, indices
    const vertexByteLength = vertices.byteLength;
    const normalByteLength = normals.byteLength;
    const texCoordByteLength = texCoords.byteLength;
    const indexByteLength = faces.byteLength;
    
    // Calculate aligned offsets
    let offset = 0;
    const vertexOffset = offset;
    offset += Math.ceil(vertexByteLength / 4) * 4;
    
    const normalOffset = offset;
    offset += Math.ceil(normalByteLength / 4) * 4;
    
    const texCoordOffset = offset;
    offset += Math.ceil(texCoordByteLength / 4) * 4;
    
    const indexOffset = offset;
    const totalBinaryLength = indexOffset + indexByteLength;
    
    // Create GLB data structure with all attributes
    const glbData = {
      asset: { version: "2.0", generator: "VidaVision True Image-to-3D" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{
        primitives: [{
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2
          },
          indices: 3,
          mode: 4
        }]
      }],
      accessors: [
        // Position accessor
        {
          bufferView: 0,
          componentType: 5126,
          count: vertexCount,
          type: "VEC3",
          min: [min[0], min[1], min[2]],
          max: [max[0], max[1], max[2]]
        },
        // Normal accessor
        {
          bufferView: 1,
          componentType: 5126,
          count: vertexCount,
          type: "VEC3"
        },
        // Texture coordinate accessor
        {
          bufferView: 2,
          componentType: 5126,
          count: vertexCount,
          type: "VEC2"
        },
        // Index accessor
        {
          bufferView: 3,
          componentType: 5123,
          count: indexCount,
          type: "SCALAR"
        }
      ],
      bufferViews: [
        // Vertices
        {
          buffer: 0,
          byteOffset: vertexOffset,
          byteLength: vertexByteLength
        },
        // Normals
        {
          buffer: 0,
          byteOffset: normalOffset,
          byteLength: normalByteLength
        },
        // Texture coordinates
        {
          buffer: 0,
          byteOffset: texCoordOffset,
          byteLength: texCoordByteLength
        },
        // Indices
        {
          buffer: 0,
          byteOffset: indexOffset,
          byteLength: indexByteLength
        }
      ],
      buffers: [{
        byteLength: totalBinaryLength
      }]
    };
    
    // Create binary data buffer
    const binaryData = new ArrayBuffer(totalBinaryLength);
    const binaryView = new Uint8Array(binaryData);
    
    // Copy all data to binary buffer
    binaryView.set(new Uint8Array(vertices.buffer), vertexOffset);
    binaryView.set(new Uint8Array(normals.buffer), normalOffset);
    binaryView.set(new Uint8Array(texCoords.buffer), texCoordOffset);
    binaryView.set(new Uint8Array(faces.buffer), indexOffset);
    
    // Convert JSON to buffer
    const jsonString = JSON.stringify(glbData);
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    
    // Calculate chunk sizes with proper padding
    const jsonLength = jsonBuffer.length;
    const jsonPadding = (4 - (jsonLength % 4)) % 4;
    const paddedJsonLength = jsonLength + jsonPadding;
    
    const binaryLength = binaryData.byteLength;
    const binaryPadding = (4 - (binaryLength % 4)) % 4;
    const paddedBinaryLength = binaryLength + binaryPadding;
    
    // Create final GLB buffer
    const glbLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
    const glbBuffer = Buffer.alloc(glbLength);
    let bufferOffset = 0;
    
    // Write GLB header (FIXED: correct byte order)
    glbBuffer.writeUInt32LE(0x46546C67, bufferOffset); bufferOffset += 4; // magic: 'glTF'
    glbBuffer.writeUInt32LE(2, bufferOffset); bufferOffset += 4; // version: 2
    glbBuffer.writeUInt32LE(glbLength, bufferOffset); bufferOffset += 4; // total length
    
    // Write JSON chunk
    glbBuffer.writeUInt32LE(paddedJsonLength, bufferOffset); bufferOffset += 4; // chunk length
    glbBuffer.writeUInt32LE(0x4E4F534A, bufferOffset); bufferOffset += 4; // chunk type 'JSON'
    jsonBuffer.copy(glbBuffer, bufferOffset); bufferOffset += jsonLength;
    
    // JSON padding (spaces)
    for (let i = 0; i < jsonPadding; i++) {
      glbBuffer.writeUInt8(0x20, bufferOffset++);
    }
    
    // Write binary chunk
    glbBuffer.writeUInt32LE(paddedBinaryLength, bufferOffset); bufferOffset += 4; // chunk length
    glbBuffer.writeUInt32LE(0x004E4942, bufferOffset); bufferOffset += 4; // chunk type 'BIN\0'
    Buffer.from(binaryData).copy(glbBuffer, bufferOffset); bufferOffset += binaryLength;
    
    // Binary padding (zeros)
    for (let i = 0; i < binaryPadding; i++) {
      glbBuffer.writeUInt8(0, bufferOffset++);
    }
    
    console.log(`✅ Real image-based GLB created: ${glbBuffer.length} bytes`);
    console.log(`📊 Contains: ${vertexCount} vertices, ${indexCount} indices`);
    console.log(`📦 With: normals, texture coordinates`);
    
    return glbBuffer;
  }

  /**
   * Legacy GLB creation method - kept for fallback
   */
  private async createGLBBuffer(meshData: any, options: ProcessingOptions): Promise<Buffer> {
    try {
      console.log('📦 Creating GLB buffer with geometric validation...');
      
      // First validate that mesh data is usable
      const originalVertices = meshData.vertices;
      const originalFaces = meshData.faces;
      
      console.log('🔍 Original mesh data:', {
        vertexCount: originalVertices.length / 3,
        faceCount: originalFaces.length / 3,
        vertexDataType: typeof originalVertices[0],
        faceDataType: typeof originalFaces[0]
      });
      
      // Use the original mesh data (revert from test cube back to real mesh)
      const vertices = new Float32Array(originalVertices);
      const faces = new Uint16Array(originalFaces);
      
      console.log('🧪 Using original mesh geometry:', {
        vertexCount: vertices.length / 3,
        faceCount: faces.length / 3,
        vertexSize: vertices.byteLength,
        faceSize: faces.byteLength
      });
      
      // Calculate bounding box for proper min/max values
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      
      for (let i = 0; i < vertices.length; i += 3) {
        min[0] = Math.min(min[0], vertices[i]);
        min[1] = Math.min(min[1], vertices[i + 1]);
        min[2] = Math.min(min[2], vertices[i + 2]);
        max[0] = Math.max(max[0], vertices[i]);
        max[1] = Math.max(max[1], vertices[i + 1]);
        max[2] = Math.max(max[2], vertices[i + 2]);
      }
      
      console.log('🔧 Original mesh bounds:', { min, max });
      
      // Create ultra-minimal GLB structure - fixed alignment and proper chunking
      const vertexCount = vertices.length / 3;
      const indexCount = faces.length;
      
      // Ensure proper alignment (4-byte boundaries)
      const vertexByteLength = vertices.byteLength;
      const indexByteLength = faces.byteLength;
      
      // Calculate aligned offsets
      const vertexOffset = 0;
      const indexOffset = Math.ceil(vertexByteLength / 4) * 4;
      const totalBinaryLength = indexOffset + indexByteLength;
      
      // Create minimal GLB data with proper buffer structure
      const glbData = {
        asset: { version: "2.0", generator: "VidaVision 2D-to-3D" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{
          primitives: [{
            attributes: {
              POSITION: 0
            },
            indices: 1,
            mode: 4,
            material: 0
          }]
        }],
        materials: [{
          name: "Avatar Material",
          pbrMetallicRoughness: {
            baseColorFactor: [0.8, 0.7, 0.6, 1.0],
            metallicFactor: 0.0,
            roughnessFactor: 0.8
          },
          doubleSided: true
        }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: vertexCount,
            type: "VEC3",
            min: [min[0], min[1], min[2]],
            max: [max[0], max[1], max[2]]
          },
          {
            bufferView: 1,
            componentType: 5123,
            count: indexCount,
            type: "SCALAR"
          }
        ],
        bufferViews: [
          {
            buffer: 0,
            byteOffset: vertexOffset,
            byteLength: vertexByteLength
          },
          {
            buffer: 0,
            byteOffset: indexOffset,
            byteLength: indexByteLength
          }
        ],
        buffers: [{
          byteLength: totalBinaryLength
        }]
      };
      
      // Create properly aligned binary data
      const binaryData = new ArrayBuffer(totalBinaryLength);
      const binaryView = new Uint8Array(binaryData);
      
      // Copy vertices at offset 0
      binaryView.set(new Uint8Array(vertices.buffer), vertexOffset);
      
      // Copy indices at aligned offset
      binaryView.set(new Uint8Array(faces.buffer), indexOffset);
      
      // Convert JSON to buffer
      const jsonString = JSON.stringify(glbData);
      const jsonBuffer = Buffer.from(jsonString, 'utf8');
      
      // Calculate chunk sizes with proper padding
      const jsonLength = jsonBuffer.length;
      const jsonPadding = (4 - (jsonLength % 4)) % 4;
      const paddedJsonLength = jsonLength + jsonPadding;
      
      const binaryLength = binaryData.byteLength;
      const binaryPadding = (4 - (binaryLength % 4)) % 4;
      const paddedBinaryLength = binaryLength + binaryPadding;
      
      // Create final GLB buffer
      const glbLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
      const glbBuffer = Buffer.alloc(glbLength);
      let offset = 0;
      
      // Write GLB header (CRITICAL: Fixed byte order)
      glbBuffer.writeUInt32LE(0x46546C67, offset); offset += 4; // magic: 'glTF'
      glbBuffer.writeUInt32LE(2, offset); offset += 4; // version: 2
      glbBuffer.writeUInt32LE(glbLength, offset); offset += 4; // total length
      
      // Write JSON chunk
      glbBuffer.writeUInt32LE(paddedJsonLength, offset); offset += 4; // chunk length
      glbBuffer.writeUInt32LE(0x4E4F534A, offset); offset += 4; // chunk type 'JSON'
      jsonBuffer.copy(glbBuffer, offset); offset += jsonLength;
      
      // JSON padding (spaces)
      for (let i = 0; i < jsonPadding; i++) {
        glbBuffer.writeUInt8(0x20, offset++);
      }
      
      // Write binary chunk
      glbBuffer.writeUInt32LE(paddedBinaryLength, offset); offset += 4; // chunk length
      glbBuffer.writeUInt32LE(0x004E4942, offset); offset += 4; // chunk type 'BIN\0'
      Buffer.from(binaryData).copy(glbBuffer, offset); offset += binaryLength;
      
      // Binary padding (zeros)
      for (let i = 0; i < binaryPadding; i++) {
        glbBuffer.writeUInt8(0, offset++);
      }
      
      // Debug output
      console.log('🔍 Original mesh GLB structure:', {
        totalLength: glbBuffer.length,
        vertexCount,
        indexCount,
        vertexByteLength,
        indexByteLength,
        vertexOffset,
        indexOffset,
        totalBinaryLength,
        jsonLength,
        jsonPadding,
        binaryLength,
        binaryPadding,
        bounds: { min, max }
      });
      
      console.log(`✅ Original mesh GLB created: ${glbBuffer.length} bytes`);
      console.log(`📊 Contains: ${vertexCount} vertices, ${indexCount} indices`);
      
      return glbBuffer;
      
    } catch (error: any) {
      console.error('❌ GLB buffer creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a simple test cube for GLB compatibility testing
   */
  private createTestCube(): { vertices: number[], faces: number[] } {
    // Simple cube vertices (8 vertices for a cube)
    const vertices = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0
    ];
    
    // Cube faces (12 triangles for 6 faces)
    const faces = [
      // Front face
      0, 1, 2,   0, 2, 3,
      // Back face
      4, 5, 6,   4, 6, 7,
      // Top face
      3, 2, 6,   3, 6, 5,
      // Bottom face
      0, 4, 7,   0, 7, 1,
      // Right face
      1, 7, 6,   1, 6, 2,
      // Left face
      0, 3, 5,   0, 5, 4
    ];
    
    return { vertices, faces };
  }

  /**
   * Generate thumbnail from 2D image
   */
  async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(512, 512)
        .png({ quality: 90 })
        .toBuffer();
    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Get processing capabilities based on user plan
   */
  getProcessingCapabilities(userPlan: string): ProcessingOptions {
    const baseOptions: ProcessingOptions = {
      userPlan,
      enhanceTextures: true,
      generateNormalMaps: false,
      optimizeTopology: false
    };

    switch (userPlan) {
      case 'goat':
        return { ...baseOptions, generateNormalMaps: true, optimizeTopology: true };
      case 'zeus':
        return { ...baseOptions, generateNormalMaps: true };
      case 'spartan':
        return { ...baseOptions, enhanceTextures: true };
      default:
        return baseOptions;
    }
  }
}

export const vidaVision2Dto3D = new VidaVision2Dto3D();