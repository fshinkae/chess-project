const Message = require('../models/message.model');

const ChatController = {
  sendMessage: async (req, res) => {
    try {
      const { sender, content } = req.body;
      
      const message = new Message({
        sender,
        content
      });

      await message.save();

      // Emite o evento para todos os clientes conectados
      req.app.get('io').emit('message', message);

      res.status(201).json(message);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  getMessages: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const messages = await Message.find()
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json(messages.reverse());
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
};

module.exports = ChatController;
