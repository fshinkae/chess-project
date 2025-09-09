const app = require('./src/app');

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`API Gateway rodando na porta ${PORT}`);
  console.log('Redirecionando para:');
  console.log('- Auth Service: http://localhost:3001');
  console.log('- Chat Service: http://localhost:3002');
  console.log('- Chess Service: http://localhost:3003');
});