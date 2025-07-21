/**
 * VidaRig Testing Routes
 * Test auto-rigging functionality with sample models
 */

import { Express } from 'express';
import { vidaRigFixed } from '../services/vida-rig-fixed';
import * as fs from 'fs';
import * as path from 'path';

export function registerVidaRigTestRoutes(app: Express) {
  // Test goat plan morph target generation
  app.post('/api/vida-rig/test-goat-plan', async (req, res) => {
    try {
      const { userPlan } = req.body;
      
      if (!userPlan) {
        return res.status(400).json({ error: 'User plan required' });
      }

      console.log('🐐 Testing GOAT plan morph target generation...');
      
      // Mock analysis for testing morph targets
      const mockAnalysis = {
        vertices: 8500,
        meshes: [{ name: 'HeadMesh' }],
        hasExistingBones: false,
        humanoidStructure: {
          hasHead: true,
          hasSpine: true,
          hasArms: true,
          hasLegs: true,
          confidence: 0.9
        },
        suggestedBones: []
      };
      
      // Test the fixed VidaRig service
      await vidaRigFixed.initialize();
      
      // Get subscription config
      const tierConfig = await vidaRigFixed.getSubscriptionTierConfig(userPlan);
      
      // Test morph target generation with the user plan
      const morphTargets = await vidaRigFixed.generateAnalysisBasedMorphTargets({}, userPlan);
      
      res.json({
        success: true,
        userPlan,
        tierConfig: {
          maxBones: tierConfig?.max_bones,
          maxMorphTargets: tierConfig?.max_morph_targets,
          faceTracking: tierConfig?.face_tracking
        },
        morphTargets: {
          count: morphTargets.length,
          targets: morphTargets
        },
        analysis: mockAnalysis
      });
      
    } catch (error: any) {
      console.error('🚨 GOAT plan test failed:', error);
      res.status(500).json({ 
        error: 'Test failed', 
        message: error.message,
        stack: error.stack 
      });
    }
  });

  // Test VidaRig analysis on uploaded model
  app.post('/api/test/vida-rig/analyze', async (req, res) => {
    try {
      const { modelUrl } = req.body;
      
      if (!modelUrl) {
        return res.status(400).json({ error: 'Model URL required' });
      }

      console.log('🔍 Testing VidaRig analysis on:', modelUrl);
      
      // Download the model
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }
      
      const modelBuffer = Buffer.from(await response.arrayBuffer());
      
      // Analyze with VidaRig Fixed
      const analysis = await vidaRigFixed.analyzeModel(modelBuffer);
      
      console.log('📊 VidaRig Analysis Results:', {
        vertices: analysis.vertices,
        meshes: analysis.meshes.length,
        hasExistingBones: analysis.hasExistingBones,
        humanoidConfidence: analysis.humanoidStructure.confidence,
        suggestedBones: analysis.suggestedBones.length
      });
      
      res.json({
        success: true,
        analysis: {
          vertices: analysis.vertices,
          meshCount: analysis.meshes.length,
          hasExistingBones: analysis.hasExistingBones,
          humanoidStructure: analysis.humanoidStructure,
          suggestedBones: analysis.suggestedBones,
          isRiggingRecommended: analysis.humanoidStructure.confidence > 0.5
        }
      });
    } catch (error) {
      console.error('VidaRig analysis test failed:', error);
      res.status(500).json({ 
        error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Test VidaRig auto-rigging on uploaded model
  app.post('/api/test/vida-rig/auto-rig', async (req, res) => {
    try {
      const { modelUrl, userPlan = 'free' } = req.body;
      
      if (!modelUrl) {
        return res.status(400).json({ error: 'Model URL required' });
      }

      console.log('🦴 Testing VidaRig auto-rigging on:', modelUrl, 'with plan:', userPlan);
      
      // Download the model
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }
      
      const modelBuffer = Buffer.from(await response.arrayBuffer());
      
      // Analyze first
      const analysis = await vidaRigFixed.analyzeModel(modelBuffer);
      
      // Perform auto-rigging with dynamic subscription tier
      const rigResult = await vidaRigFixed.performAutoRigging(modelBuffer, analysis, userPlan);
      
      // Save rigged model to temp location for testing
      const tempFilename = `rigged_test_${Date.now()}.glb`;
      const tempPath = path.join(process.cwd(), 'temp', tempFilename);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempPath, rigResult.riggedBuffer);
      
      const riggedUrl = `/temp/${tempFilename}`;
      
      console.log('✅ VidaRig auto-rigging completed:', {
        hasFaceRig: rigResult.hasFaceRig,
        hasBodyRig: rigResult.hasBodyRig,
        hasHandRig: rigResult.hasHandRig,
        boneCount: rigResult.boneCount,
        morphTargets: rigResult.morphTargets.length,
        riggedUrl
      });
      
      res.json({
        success: true,
        originalAnalysis: {
          vertices: analysis.vertices,
          hasExistingBones: analysis.hasExistingBones,
          humanoidConfidence: analysis.humanoidStructure.confidence
        },
        rigResult: {
          hasFaceRig: rigResult.hasFaceRig,
          hasBodyRig: rigResult.hasBodyRig,
          hasHandRig: rigResult.hasHandRig,
          boneCount: rigResult.boneCount,
          morphTargets: rigResult.morphTargets,
          riggedModelUrl: riggedUrl
        }
      });
    } catch (error) {
      console.error('VidaRig auto-rigging test failed:', error);
      res.status(500).json({ 
        error: `Auto-rigging failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Serve temp files for testing
  app.get('/temp/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'temp', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  });

  // Test subscription tier detection
  app.get('/api/test/subscription-tier/:plan', async (req, res) => {
    try {
      const { AvatarManager } = await import('../services/avatar-manager');
      const avatarManager = new AvatarManager();
      const tierConfig = await avatarManager.getSubscriptionTierConfig(req.params.plan);
      res.json({ success: true, plan: req.params.plan, tierConfig });
    } catch (error) {
      console.error('Subscription tier test error:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Test GLB validation and compatibility
  app.get('/api/test/glb-validation/:sessionId', async (req, res) => {
    try {
      const { GLBExporter } = await import('../services/glb-exporter');
      const sessionId = req.params.sessionId;
      
      // Try to load rigged model from cache
      const cachePath = path.join(process.cwd(), 'cache', 'rigged', `${sessionId}.glb`);
      
      if (!fs.existsSync(cachePath)) {
        return res.status(404).json({ success: false, error: 'Rigged model not found in cache' });
      }
      
      const glbBuffer = fs.readFileSync(cachePath);
      
      // Parse and validate GLB structure
      const parsed = GLBExporter.parseGLB(glbBuffer);
      const validation = GLBExporter.validateGLB(parsed.json);
      
      res.json({
        success: true,
        sessionId,
        fileSize: glbBuffer.length,
        hasJSON: !!parsed.json,
        hasBinary: !!parsed.binary,
        binarySize: parsed.binary?.length || 0,
        validation: validation,
        gltfStructure: {
          asset: parsed.json?.asset,
          scenes: parsed.json?.scenes?.length || 0,
          nodes: parsed.json?.nodes?.length || 0,
          meshes: parsed.json?.meshes?.length || 0,
          skins: parsed.json?.skins?.length || 0,
          accessors: parsed.json?.accessors?.length || 0
        }
      });
    } catch (error) {
      console.error('GLB validation test error:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  console.log('🧪 VidaRig test routes registered');
}