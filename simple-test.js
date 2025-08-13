// Simple test for invitation endpoint
import fetch from 'node-fetch';

async function simpleTest() {
  console.log('🧪 Testing invitation endpoint...');
  
  try {
    const response = await fetch('http://localhost:5000/api/buddy-system/co-stream/co-stream-1753971523513/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // We'll need proper auth
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
    console.error('❌ Network error:', error.message);
  }
}

simpleTest(); 