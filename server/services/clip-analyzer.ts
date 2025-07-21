/**
 * CLIP Semantic Analysis Service
 * Uses CLIP for semantic understanding of character images
 */

export interface CLIPAnalysis {
  semanticDescription: string;
  characterConcepts: string[];
  artStyleConfidence: number;
  objectConfidence: number;
}

export class CLIPAnalyzer {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
  }
  
  /**
   * Analyze image using CLIP for semantic understanding
   */
  async analyzeImage(imageBuffer: Buffer): Promise<CLIPAnalysis> {
    try {
      console.log('🧠 Starting CLIP semantic analysis...');
      
      // Convert image to base64 for API
      const base64Image = imageBuffer.toString('base64');
      
      // Use Hugging Face CLIP model for image understanding
      const response = await fetch('https://api-inference.huggingface.co/models/openai/clip-vit-large-patch14', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            image: `data:image/jpeg;base64,${base64Image}`,
            candidates: [
              "a male character",
              "a female character", 
              "a child character",
              "an anthropomorphic animal character",
              "a fantasy creature",
              "a cartoon style artwork",
              "a realistic artwork",
              "an anime style character",
              "a 3D rendered character",
              "a character in T-pose",
              "a character with arms extended",
              "a full body character view",
              "a character facing forward",
              "a side view character",
              "detailed character design",
              "simple character design"
            ]
          }
        })
      });
      
      if (!response.ok) {
        console.log('⚠️ CLIP API unavailable, using fallback analysis');
        return this.getFallbackAnalysis(imageBuffer);
      }
      
      const results = await response.json();
      
      // Process CLIP results to extract character insights
      const analysis = this.processCLIPResults(results);
      
      console.log('✅ CLIP analysis completed:', analysis.semanticDescription);
      return analysis;
      
    } catch (error) {
      console.error('❌ CLIP analysis failed:', error);
      return this.getFallbackAnalysis(imageBuffer);
    }
  }
  
  /**
   * Process CLIP results into structured analysis
   */
  private processCLIPResults(results: any): CLIPAnalysis {
    const scores = results || [];
    
    // Extract character type concepts
    const characterConcepts: string[] = [];
    let semanticDescription = "character artwork";
    let artStyleConfidence = 0.5;
    let objectConfidence = 0.5;
    
    // Analyze top scoring concepts
    if (Array.isArray(scores)) {
      for (const result of scores.slice(0, 5)) {
        if (result.score > 0.3) {
          characterConcepts.push(result.label);
          
          // Build semantic description from top concepts
          if (result.score > artStyleConfidence) {
            if (result.label.includes('male') || result.label.includes('female') || result.label.includes('child')) {
              semanticDescription = result.label;
            } else if (result.label.includes('cartoon') || result.label.includes('anime') || result.label.includes('realistic')) {
              semanticDescription += ` in ${result.label} style`;
            }
          }
        }
      }
      
      // Calculate confidence scores
      artStyleConfidence = Math.max(...scores.slice(0, 3).map((r: any) => r.score || 0));
      objectConfidence = scores[0]?.score || 0.5;
    }
    
    return {
      semanticDescription,
      characterConcepts,
      artStyleConfidence,
      objectConfidence
    };
  }
  
  /**
   * Fallback analysis when CLIP is unavailable
   */
  private getFallbackAnalysis(imageBuffer: Buffer): CLIPAnalysis {
    // Basic analysis based on image properties
    const size = imageBuffer.length;
    
    return {
      semanticDescription: size > 100000 ? "detailed character artwork" : "simple character design",
      characterConcepts: ["character", "artwork", "digital art"],
      artStyleConfidence: 0.6,
      objectConfidence: 0.7
    };
  }
}

export const clipAnalyzer = new CLIPAnalyzer();