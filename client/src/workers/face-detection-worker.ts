/**
 * Face Detection Web Worker - Grok-Optimized
 * Offloads MediaPipe face detection from main thread for better performance
 */

import { FaceMesh } from '@mediapipe/face_mesh';

let faceMesh: FaceMesh | null = null;
let isInitialized = false;

// Initialize MediaPipe FaceMesh in worker thread
async function initializeFaceMesh() {
  try {
    faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults((results) => {
      // Send results back to main thread
      self.postMessage({
        type: 'face-results',
        results: results
      });
    });

    isInitialized = true;
    console.log('🎯 Face mesh initialized in worker thread');
  } catch (error) {
    console.error('❌ Worker face mesh initialization failed:', error);
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      await initializeFaceMesh();
      break;
      
    case 'process-frame':
      if (isInitialized && faceMesh && data.imageData) {
        try {
          await faceMesh.send({ image: data.imageData });
        } catch (error) {
          console.error('❌ Worker face processing error:', error);
          self.postMessage({
            type: 'error',
            error: error.message
          });
        }
      }
      break;
      
    case 'cleanup':
      if (faceMesh) {
        faceMesh.close();
        faceMesh = null;
      }
      isInitialized = false;
      break;
  }
});

// Initialize automatically
initializeFaceMesh();