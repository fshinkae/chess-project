import {
  Box,
  Container,
  Grid,
  VStack,
  Text,
  Input,
  Button,
  List,
  ListItem,
  useToast,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  Badge
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuthStore } from '../stores/authStore';
import gameService from '../services/gameService';

function Game() {
  const [game, setGame] = useState(new Chess());
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const { user, token } = useAuthStore();
  const { id: gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // Determina se o usuário atual é o desafiante (peças brancas)
  const isChallenger = gameInfo?.challenger === user?.id;
  
  // Define a orientação do tabuleiro
  const boardOrientation = isChallenger ? 'white' : 'black';

  useEffect(() => {
    if (!gameId || !token || !user) {
      navigate('/');
      return;
    }

    let mounted = true;
    setIsConnecting(true);
    setConnectionError(null);

    async function initializeGame() {
      try {
        const { chessSocket, chatSocket } = await gameService.connect(token, gameId);

        if (!mounted) return;

        // Eventos do jogo
        chessSocket.on('connect', () => {
          console.log('Conectado ao serviço de xadrez');
          setConnectionError(null);
        });

        chessSocket.on('connect_error', (error) => {
          console.error('Erro na conexão com o serviço de xadrez:', error);
          setConnectionError('Não foi possível conectar ao serviço de xadrez');
        });

        chessSocket.on('game_state', (state) => {
          if (!mounted) return;
          console.log('Estado do jogo recebido:', state);
          if (state.fen) {
            setGame(new Chess(state.fen));
          }
          setCurrentPlayer(state.currentPlayer);
          setGameInfo(state.gameInfo);
        });

        chessSocket.on('move', ({ from, to }) => {
          if (!mounted) return;
          console.log('Movimento recebido:', { from, to });
          makeMove(from, to);
        });

        // Eventos do chat
        chatSocket.on('connect', () => {
          console.log('Conectado ao serviço de chat');
          setIsConnecting(false);
        });

        chatSocket.on('game_message', (message) => {
          if (!mounted) return;
          console.log('Mensagem recebida:', message);
          setMessages(prev => [...prev, message]);
        });

        // Solicita estado inicial do jogo
        chessSocket.emit('join_game', { gameId });

      } catch (error) {
        console.error('Erro ao inicializar jogo:', error);
        if (mounted) {
          setConnectionError('Erro ao conectar aos serviços do jogo');
          setIsConnecting(false);
        }
      }
    }

    initializeGame();

    return () => {
      mounted = false;
      gameService.disconnect();
    };
  }, [gameId, token, user]);

  function makeMove(from, to) {
    try {
      const move = game.move({
        from,
        to,
        promotion: 'q'
      });

      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        gameService.sendMove(from, to);

        if (newGame.isGameOver()) {
          let endMessage = 'Fim de jogo: ';
          if (newGame.isCheckmate()) endMessage += 'Xeque-mate!';
          else if (newGame.isDraw()) endMessage += 'Empate!';
          else if (newGame.isStalemate()) endMessage += 'Rei afogado!';

          toast({
            title: endMessage,
            status: 'info',
            duration: null,
            isClosable: true
          });
        }
      }
    } catch (error) {
      console.error('Erro ao fazer movimento:', error);
      toast({
        title: 'Erro ao fazer movimento',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    // Verifica se é a vez do jogador
    if (currentPlayer && currentPlayer !== user.id) {
      toast({
        title: 'Não é sua vez!',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return false;
    }

    // Verifica se o jogador está movendo as peças corretas
    const piece = game.get(sourceSquare);
    const isWhitePiece = piece?.color === 'w';
    if ((isChallenger && !isWhitePiece) || (!isChallenger && isWhitePiece)) {
      toast({
        title: 'Movimento inválido',
        description: 'Você só pode mover suas próprias peças',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return false;
    }

    makeMove(sourceSquare, targetSquare);
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (gameService.sendMessage(newMessage)) {
      setNewMessage('');
    } else {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente em alguns instantes',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  }

  if (isConnecting) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Conectando ao jogo...</Text>
        </VStack>
      </Center>
    );
  }

  if (connectionError) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Erro de Conexão
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            {connectionError}
            <Button
              colorScheme="red"
              mt={4}
              onClick={() => navigate('/')}
            >
              Voltar ao Lobby
            </Button>
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Grid templateColumns="2fr 1fr" gap={8}>
        <Box>
          <VStack spacing={4} align="stretch" mb={4}>
            <Heading size="md">
              {currentPlayer === user.id ? 'Sua vez de jogar' : 'Aguardando oponente...'}
            </Heading>
            <Badge colorScheme={isChallenger ? 'green' : 'purple'} alignSelf="start">
              {isChallenger ? 'Peças Brancas' : 'Peças Pretas'}
            </Badge>
          </VStack>
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={600}
            boardOrientation={boardOrientation}
          />
        </Box>
        <VStack spacing={4} align="stretch">
          <Box
            height="400px"
            overflowY="auto"
            borderWidth={1}
            borderRadius="md"
            p={4}
            bg="white"
          >
            <List spacing={3}>
              {messages.map((message, index) => (
                <ListItem
                  key={index}
                  bg={message.sender === user.username ? 'blue.100' : 'gray.100'}
                  p={2}
                  borderRadius="md"
                >
                  <Text fontWeight="bold">{message.sender}</Text>
                  <Text>{message.content}</Text>
                </ListItem>
              ))}
            </List>
          </Box>
          <form onSubmit={sendMessage}>
            <Grid templateColumns="1fr auto" gap={2}>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                bg="white"
              />
              <Button type="submit" colorScheme="blue">
                Enviar
              </Button>
            </Grid>
          </form>
        </VStack>
      </Grid>
    </Container>
  );
}

export default Game;