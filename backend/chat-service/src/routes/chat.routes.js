const express = require('express');
const ChatController = require('../controllers/chat.controller');

const router = express.Router();

router.post('/messages', ChatController.sendMessage);
router.get('/messages', ChatController.getMessages);

module.exports = router;
