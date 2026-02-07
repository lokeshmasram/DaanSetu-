const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ uid: 'admin', userType: 'admin' }, process.env.JWT_SECRET || 'daansetu-secret-key-2024');

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/admin/activities',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try { console.log('BODY:', JSON.parse(body)); } catch (e) { console.log('BODY:', body); }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e && e.stack ? e.stack : e.message);
  process.exit(1);
});

req.end();
