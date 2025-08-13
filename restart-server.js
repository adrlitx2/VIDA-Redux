// Restart server and test invitation system
import { spawn } from 'child_process';
import fetch from 'node-fetch';

async function restartAndTest() {
  console.log('🔄 Restarting server...');
  
  // Kill existing node processes on port 5000
  try {
    const killProcess = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
      stdio: 'ignore',
      shell: true 
    });
    
    await new Promise((resolve) => {
      killProcess.on('close', resolve);
    });
    
    console.log('✅ Killed existing node processes');
  } catch (error) {
    console.log('⚠️ Could not kill processes:', error.message);
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start server
  console.log('🚀 Starting server...');
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test invitation endpoint
  console.log('🧪 Testing invitation endpoint...');
  
  try {
    const response = await fetch('http://localhost:5000/api/buddy-system/co-stream/co-stream-1753971523513/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inviteeId: '70972082-7f8c-475d-970a-aca686142a84',
        message: 'test invitation'
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep server running
  console.log('✅ Server is running. Press Ctrl+C to stop.');
  
  server.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.log(`[SERVER ERROR] ${data}`);
  });
}

restartAndTest(); 