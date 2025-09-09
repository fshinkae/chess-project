const http = require('http');

const services = [
  { name: 'API Gateway', port: 3000 },
  { name: 'Login Service', port: 3001 },
  { name: 'Chat Service', port: 3002 },
  { name: 'Chess Service', port: 3003 }
];

function checkService(service) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${service.port}/health`, (res) => {
      resolve({ ...service, status: 'online', statusCode: res.statusCode });
    });

    req.on('error', () => {
      resolve({ ...service, status: 'offline' });
    });

    req.end();
  });
}

async function checkAllServices() {
  console.log('Verificando status dos serviços...\n');

  const results = await Promise.all(services.map(checkService));

  results.forEach(({ name, port, status, statusCode }) => {
    const statusText = status === 'online' ? '✅ online' : '❌ offline';
    console.log(`${name} (porta ${port}): ${statusText}`);
  });

  const allOnline = results.every(r => r.status === 'online');
  if (!allOnline) {
    console.log('\n⚠️  Alguns serviços estão offline. Execute "npm run start:clean" para reiniciar todos os serviços.');
  }
}

checkAllServices();
