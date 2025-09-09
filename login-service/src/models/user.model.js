const mysql = require('mysql2/promise');

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 segundos

const createPool = async (retryCount = 0) => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DATABASE || 'login_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Testa a conexão
    await pool.getConnection();
    console.log('Conectado ao MySQL com sucesso!');
    return pool;
  } catch (error) {
    console.error(`Tentativa ${retryCount + 1} de ${MAX_RETRIES} falhou:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Tentando novamente em ${RETRY_INTERVAL/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      return createPool(retryCount + 1);
    }
    
    throw new Error('Não foi possível conectar ao MySQL após várias tentativas');
  }
};

let pool;

const initializeDatabase = async () => {
  pool = await createPool();
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela users verificada/criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar tabela users:', error);
    throw error;
  }
};

// Inicializa o banco de dados
initializeDatabase().catch(console.error);

const UserModel = {
  create: async (userData) => {
    try {
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [userData.username, userData.email, userData.password]
      );
      console.log('Usuário criado com ID:', result.insertId);
      return result.insertId;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  findByEmail: async (email) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      console.log('Usuário encontrado:', rows[0] ? 'Sim' : 'Não');
      return rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  },

  findById: async (id) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }
};

module.exports = UserModel;