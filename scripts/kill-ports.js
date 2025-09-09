const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const PORTS = [3000, 3001, 3002, 3003, 5173, 5174, 5175, 5176];

async function killPort(port) {
  try {
    // Para Windows e Unix
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} -t`;

    const { stdout } = await execAsync(cmd);
    
    if (stdout) {
      const pids = stdout.split('\n')
        .filter(Boolean)
        .map(line => process.platform === 'win32' 
          ? line.split(/\s+/)[5]
          : line.trim()
        );

      for (const pid of pids) {
        if (pid) {
          const killCmd = process.platform === 'win32'
            ? `taskkill /F /PID ${pid}`
            : `kill -9 ${pid}`;
          
          await execAsync(killCmd);
          console.log(`Processo na porta ${port} (PID: ${pid}) finalizado`);
        }
      }
    }
  } catch (error) {
    // Ignora erros se a porta não estiver em uso
    if (!error.message.includes('No such process')) {
      console.error(`Erro ao tentar matar porta ${port}:`, error.message);
    }
  }
}

async function killAllPorts() {
  console.log('Matando processos nas portas...');
  await Promise.all(PORTS.map(killPort));
  console.log('Todas as portas foram liberadas!');
}

killAllPorts().catch(console.error);

