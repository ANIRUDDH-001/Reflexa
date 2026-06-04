import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

async function run() {
  console.log('Starting dev server...');
  const serverProcess = spawn('pnpm', ['dev'], { cwd: 'packages/backend', stdio: 'ignore', shell: true });
  
  try {
    await setTimeout(5000); // Wait for server to start

    // Health check
    const health = await fetch('http://localhost:8000/health').then(r => r.json());
    if (health.status === 'ok') console.log('✓ Health');
    else { console.error('✗ Health FAILED'); process.exit(1); }

    // Config
    const config = await fetch('http://localhost:8000/config').then(r => r.json());
    if (config.phoenixTraceBase?.includes('phoenix')) console.log('✓ traceBase present');
    else { console.error('✗ traceBase MISSING'); process.exit(1); }
    if (health.version) console.log('✓ version present');
    else { console.error('✗ version MISSING'); process.exit(1); }

    // Session creation
    const styles = ['system-design', 'coding', 'troubleshooting', 'behavioral', 'architecture'];
    for (const style of styles) {
      const res = await fetch('http://localhost:8000/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': 'smoke-test' },
        body: JSON.stringify({ config: { style, role: 'backend', difficulty: 'senior', timeLimit: '20', focusAreas: [] } })
      }).then(r => r.json());
      const text = res.session.trace[0].payload.text.toLowerCase();
      if (style !== 'system-design') {
        if (text.includes('distributed system')) { console.error(`✗ ${style} opener STILL mentions distributed system`); process.exit(1); }
        else console.log(`✓ ${style} opener correct`);
      } else {
        if (text.includes('distributed system')) console.log(`✓ system-design opener correct`);
        else { console.error(`✗ system-design opener MISSING distributed system`); process.exit(1); }
      }
    }

    // Evaluation floor
    const minSession = await fetch('http://localhost:8000/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'smoke-test' },
      body: JSON.stringify({ config: { style: 'behavioral', role: 'backend', difficulty: 'mid', timeLimit: '20', focusAreas: [] } })
    }).then(r => r.json());
    
    await fetch(`http://localhost:8000/session/${minSession.session.id}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'smoke-test' },
      body: JSON.stringify({ text: 'hi' })
    });
    
    await fetch(`http://localhost:8000/session/${minSession.session.id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'smoke-test' },
      body: JSON.stringify({})
    });

    const finalSession = await fetch(`http://localhost:8000/session/${minSession.session.id}`, {
      headers: { 'X-User-Id': 'smoke-test' }
    }).then(r => r.json());

    if (finalSession.session?.evaluation?.rubric?.overall === 0) console.log('✓ Evaluation floor: overall=0 for hi-only session');
    else { console.error(`✗ Evaluation floor BROKEN: overall=${finalSession.session?.evaluation?.rubric?.overall} (expected 0)`); process.exit(1); }
    if (finalSession.session?.evaluation?.candidateRubric?.overall === 0) console.log('✓ Candidate rubric floor: overall=0');
    else { console.error(`✗ Candidate rubric floor BROKEN: overall=${finalSession.session?.evaluation?.candidateRubric?.overall} (expected 0)`); process.exit(1); }

    // Strategy endpoint
    const strategy = await fetch('http://localhost:8000/strategy/latest').then(r => r.json());
    if (strategy.version) console.log('✓ Strategy endpoint OK');
    else { console.error('✗ Strategy endpoint MISSING'); process.exit(1); }

    // CORS check
    const corsRes = await fetch('http://localhost:8000/session', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' }
    });
    if (corsRes.headers.get('access-control-allow-origin')?.includes('localhost:5173')) console.log('✓ CORS: localhost:5173 allowed');
    else { console.error('✗ CORS: localhost:5173 BLOCKED'); process.exit(1); }

  } catch (e) {
    console.error('Smoke tests failed:', e);
    process.exit(1);
  } finally {
    console.log('=== Smoke tests complete ===');
    serverProcess.kill();
  }
}
run();
