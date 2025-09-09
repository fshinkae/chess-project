const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta';

const AuthController = {
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validações básicas
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Todos os campos são obrigatórios' 
        });
      }

      // Verifica se o email já está em uso
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Este email já está em uso' 
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Cria o usuário
      const userId = await UserModel.create({
        username,
        email,
        password: hashedPassword
      });

      const user = {
        id: userId,
        username,
        email
      };

      // Gera o token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Usuário registrado:', { userId, username, email });

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user,
        token
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validações básicas
      if (!email || !password) {
        return res.status(400).json({ 
          message: 'Email e senha são obrigatórios' 
        });
      }

      // Busca o usuário
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          message: 'Email ou senha inválidos' 
        });
      }

      // Verifica a senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: 'Email ou senha inválidos' 
        });
      }

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email
      };

      // Gera o token JWT
      const token = jwt.sign(
        { 
          userId: userData.id, 
          email: userData.email,
          username: userData.username 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Usuário logado:', userData);

      res.json({
        message: 'Login realizado com sucesso',
        user: userData,
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  }
};

module.exports = AuthController;