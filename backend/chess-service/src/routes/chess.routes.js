const express = require('express');
const ChessController = require('../controllers/chess.controller');

const router = express.Router();

router.post('/games', ChessController.createGame);
router.post('/games/:id/move', ChessController.makeMove);
router.get('/games/:id', ChessController.getGame);

module.exports = router;
