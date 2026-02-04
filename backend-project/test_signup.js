const http = require('http');

const data = JSON.stringify({
  garageName: 'My New Garage ' + Date.now(),
  ownerName: 'TestOwner', 
  email: 'test' + Date.now() + '@example.com',
  password: 'password123'
});

console.log('Sending request...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
