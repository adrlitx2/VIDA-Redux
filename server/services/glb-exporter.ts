/**
 * Professional GLB Exporter
 * Generates industry-standard GLB files compatible with external applications
 */

export interface GLBStructure {
  json: any;
  binary: Buffer | null;
}

export class GLBExporter {
  /**
   * Create a properly formatted GLB file from GLTF data
   */
  static createGLB(gltfData: any, binaryData?: Buffer): Buffer {
    const jsonString = JSON.stringify(gltfData);
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    
    // Ensure JSON chunk is 4-byte aligned
    const jsonLength = this.align(jsonBuffer.length, 4);
    const paddedJsonBuffer = Buffer.alloc(jsonLength);
    jsonBuffer.copy(paddedJsonBuffer);
    
    // Fill remaining bytes with spaces (0x20)
    for (let i = jsonBuffer.length; i < jsonLength; i++) {
      paddedJsonBuffer[i] = 0x20;
    }
    
    let binaryLength = 0;
    let paddedBinaryBuffer = Buffer.alloc(0);
    
    if (binaryData && binaryData.length > 0) {
      // Ensure binary chunk is 4-byte aligned
      binaryLength = this.align(binaryData.length, 4);
      paddedBinaryBuffer = Buffer.alloc(binaryLength);
      binaryData.copy(paddedBinaryBuffer);
      
      // Fill remaining bytes with zeros
      for (let i = binaryData.length; i < binaryLength; i++) {
        paddedBinaryBuffer[i] = 0x00;
      }
    }
    
    // Calculate total file size
    const headerSize = 12; // GLB header
    const jsonChunkHeaderSize = 8; // JSON chunk header
    const binaryChunkHeaderSize = binaryLength > 0 ? 8 : 0; // Binary chunk header
    const totalSize = headerSize + jsonChunkHeaderSize + jsonLength + binaryChunkHeaderSize + binaryLength;
    
    // Create the complete GLB buffer
    const glbBuffer = Buffer.alloc(totalSize);
    let offset = 0;
    
    // GLB Header
    glbBuffer.writeUInt32LE(0x46546C67, offset); // magic: "glTF"
    offset += 4;
    glbBuffer.writeUInt32LE(2, offset); // version: 2
    offset += 4;
    glbBuffer.writeUInt32LE(totalSize, offset); // total length
    offset += 4;
    
    // JSON Chunk Header
    glbBuffer.writeUInt32LE(jsonLength, offset); // chunk length
    offset += 4;
    glbBuffer.writeUInt32LE(0x4E4F534A, offset); // chunk type: "JSON"
    offset += 4;
    
    // JSON Chunk Data
    paddedJsonBuffer.copy(glbBuffer, offset);
    offset += jsonLength;
    
    // Binary Chunk (if present)
    if (binaryLength > 0) {
      // Binary Chunk Header
      glbBuffer.writeUInt32LE(binaryLength, offset); // chunk length
      offset += 4;
      glbBuffer.writeUInt32LE(0x004E4942, offset); // chunk type: "BIN\0"
      offset += 4;
      
      // Binary Chunk Data
      paddedBinaryBuffer.copy(glbBuffer, offset);
    }
    
    return glbBuffer;
  }
  
  /**
   * Parse GLB file into JSON and binary components
   */
  static parseGLB(glbBuffer: Buffer): GLBStructure {
    if (glbBuffer.length < 20) {
      throw new Error('Invalid GLB file: too small');
    }
    
    // Read GLB header
    const magic = glbBuffer.readUInt32LE(0);
    if (magic !== 0x46546C67) {
      throw new Error('Invalid GLB file: wrong magic number');
    }
    
    const version = glbBuffer.readUInt32LE(4);
    if (version !== 2) {
      throw new Error(`Unsupported GLB version: ${version}`);
    }
    
    const totalLength = glbBuffer.readUInt32LE(8);
    if (totalLength > glbBuffer.length) {
      throw new Error('Invalid GLB file: declared length exceeds buffer size');
    }
    
    let offset = 12;
    let json: any = null;
    let binary: Buffer | null = null;
    
    // Read chunks
    while (offset < totalLength) {
      if (offset + 8 > totalLength) {
        break;
      }
      
      const chunkLength = glbBuffer.readUInt32LE(offset);
      const chunkType = glbBuffer.readUInt32LE(offset + 4);
      offset += 8;
      
      if (offset + chunkLength > totalLength) {
        throw new Error('Invalid GLB file: chunk extends beyond file');
      }
      
      if (chunkType === 0x4E4F534A) { // "JSON"
        const jsonBuffer = glbBuffer.slice(offset, offset + chunkLength);
        const jsonString = jsonBuffer.toString('utf8').replace(/\0+$/, '').trim();
        json = JSON.parse(jsonString);
      } else if (chunkType === 0x004E4942) { // "BIN\0"
        binary = glbBuffer.slice(offset, offset + chunkLength);
      }
      
      offset += chunkLength;
    }
    
    return { json, binary };
  }
  
  /**
   * Validate GLB structure for compatibility
   */
  static validateGLB(gltfData: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check required properties
    if (!gltfData.asset) {
      issues.push('Missing required "asset" property');
    } else {
      if (!gltfData.asset.version) {
        issues.push('Missing required "asset.version" property');
      }
    }
    
    if (!gltfData.scene && (!gltfData.scenes || gltfData.scenes.length === 0)) {
      issues.push('GLB must have at least one scene');
    }
    
    // Validate nodes
    if (gltfData.nodes) {
      gltfData.nodes.forEach((node: any, index: number) => {
        if (node.matrix && (node.translation || node.rotation || node.scale)) {
          issues.push(`Node ${index}: Cannot specify both matrix and TRS properties`);
        }
      });
    }
    
    // Validate meshes
    if (gltfData.meshes) {
      gltfData.meshes.forEach((mesh: any, meshIndex: number) => {
        if (!mesh.primitives || mesh.primitives.length === 0) {
          issues.push(`Mesh ${meshIndex}: Must have at least one primitive`);
        }
        
        mesh.primitives?.forEach((primitive: any, primIndex: number) => {
          if (!primitive.attributes) {
            issues.push(`Mesh ${meshIndex}, primitive ${primIndex}: Missing attributes`);
          }
          if (primitive.attributes && typeof primitive.attributes.POSITION !== 'number') {
            issues.push(`Mesh ${meshIndex}, primitive ${primIndex}: Missing POSITION attribute`);
          }
        });
      });
    }
    
    // Validate accessors
    if (gltfData.accessors) {
      gltfData.accessors.forEach((accessor: any, index: number) => {
        if (typeof accessor.count !== 'number' || accessor.count < 0) {
          issues.push(`Accessor ${index}: Invalid count`);
        }
        if (!accessor.type) {
          issues.push(`Accessor ${index}: Missing type`);
        }
        if (typeof accessor.componentType !== 'number') {
          issues.push(`Accessor ${index}: Missing componentType`);
        }
      });
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Align value to specified boundary
   */
  private static align(value: number, boundary: number): number {
    return Math.ceil(value / boundary) * boundary;
  }
  
  /**
   * Create a minimal valid GLTF structure
   */
  static createMinimalGLTF(): any {
    return {
      asset: {
        version: "2.0",
        generator: "VIDA³ VidaRig Auto-Rigging System"
      },
      scene: 0,
      scenes: [
        {
          nodes: [0]
        }
      ],
      nodes: [
        {
          name: "RootNode",
          mesh: 0
        }
      ],
      meshes: [
        {
          name: "Mesh",
          primitives: [
            {
              attributes: {
                POSITION: 0
              },
              indices: 1
            }
          ]
        }
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126, // FLOAT
          count: 3,
          type: "VEC3",
          max: [1.0, 1.0, 0.0],
          min: [-1.0, -1.0, 0.0]
        },
        {
          bufferView: 1,
          componentType: 5123, // UNSIGNED_SHORT
          count: 3,
          type: "SCALAR"
        }
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 36,
          target: 34962 // ARRAY_BUFFER
        },
        {
          buffer: 0,
          byteOffset: 36,
          byteLength: 6,
          target: 34963 // ELEMENT_ARRAY_BUFFER
        }
      ],
      buffers: [
        {
          byteLength: 44
        }
      ]
    };
  }
}