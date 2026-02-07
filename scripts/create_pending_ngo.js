const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ uid: 'admin', userType: 'admin' }, process.env.JWT_SECRET || 'daansetu-secret-key-2024');

const data = JSON.stringify({ id: 'test-ngo-123', data: { name: 'Test NGO 123', userType: 'ngo', status: 'pending_verification' } });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/admin/debug/create-pending-ngo',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('BODY:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e && e.stack ? e.stack : e.message);
  process.exit(1);
});

req.write(data);
req.end();
