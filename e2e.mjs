
const PORT = process.env.PORT || 8000;
const URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

async function run() {
  console.log('--- END TO END TEST ---');
  
  // 1. Health
  const h = await fetch(`${URL}/health`);
  console.log('Health:', await h.json());

  // 2. Create session
  console.log('\nCreating session...');
  const createRes = await fetch(`${URL}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'test-e2e-user'
    },
    body: JSON.stringify({
      config: {
        role: 'engineer',
        difficulty: 'mid',
        style: 'system-design',
        timeLimit: '15'
      }
    })
  });
  
  if (!createRes.ok) {
    console.error('Failed to create session', await createRes.text());
    process.exit(1);
  }
  const { session } = await createRes.json();
  console.log('Created Session:', session.id);

  // 3. Turn 1
  console.log('\nSending Turn 1...');
  const turn1Res = await fetch(`${URL}/session/${session.id}/turn/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'test-e2e-user'
    },
    body: JSON.stringify({
      text: 'Hello, I am ready'
    })
  });
  
  if (!turn1Res.ok) {
    console.error('Failed Turn 1', await turn1Res.text());
    process.exit(1);
  }
  
  const text1 = await turn1Res.text();
  console.log('Turn 1 Stream bytes:', text1.length);
  if (!text1.includes('data: {"type":"done"')) {
    console.error('Turn 1 missing DONE event');
  }

  // 4. End session
  console.log('\nEnding session...');
  const endRes = await fetch(`${URL}/session/${session.id}/end`, {
    method: 'POST',
    headers: {
      'X-User-Id': 'test-e2e-user'
    }
  });
  
  if (!endRes.ok) {
    console.error('Failed to end session', await endRes.text());
    process.exit(1);
  }
  
  const endData = await endRes.json();
  console.log('End Session Result:', endData);
  
  console.log('\n--- SUCCESS ---');
}

run().catch(console.error);
