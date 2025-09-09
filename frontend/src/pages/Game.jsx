import {
  Box,
  Container,
  Grid,
  VStack,
  HStack,
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner,
  Center,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Flex
} from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
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
  const [gameOver, setGameOver] = useState(null);
  const [rematchOffer, setRematchOffer] = useState(null);
  const [rematchTimer, setRematchTimer] = useState(null);
  const [drawOffer, setDrawOffer] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [timeControl, setTimeControl] = useState(null);
  const timeUpdateInterval = useRef(null);
  const cancelRef = useRef();
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
          setTimeControl(state.timeControl);

          // Atualiza o tempo localmente a cada segundo para o jogador atual
          if (timeUpdateInterval.current) {
            clearInterval(timeUpdateInterval.current);
          }

          // Atualiza o tempo para ambos os jogadores
          timeUpdateInterval.current = setInterval(() => {
            setTimeControl(prev => {
              if (!prev) return prev;
              const now = Date.now();
              const elapsed = now - prev.lastMoveTime;
              
              // Só atualiza o tempo do jogador atual
              if (state.currentPlayer) {
                return {
                  ...prev,
                  [state.currentPlayer]: Math.max(0, prev[state.currentPlayer] - elapsed),
                  lastMoveTime: now
                };
              }
              return prev;
            });
          }, 100);
        });

        chessSocket.on('move', ({ from, to }) => {
          if (!mounted) return;
          console.log('Movimento recebido:', { from, to });
          makeMove(from, to);
        });

        // Eventos de empate
        chessSocket.on('draw_offered', ({ offeredBy, username, remainingTime }) => {
          if (!mounted) return;
          setDrawOffer({ offeredBy, username, remainingTime });

          toast({
            title: 'Proposta de Empate',
            description: `${username} propôs empate`,
            status: 'info',
            duration: null,
            isClosable: true
          });
        });

        chessSocket.on('draw_declined', ({ declinedBy, username }) => {
          if (!mounted) return;
          setDrawOffer(null);
          
          toast({
            title: 'Empate Recusado',
            description: `${username} recusou o empate`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        });

        chessSocket.on('draw_offer_expired', () => {
          if (!mounted) return;
          setDrawOffer(null);
          
          toast({
            title: 'Proposta Expirada',
            description: 'O tempo para aceitar o empate expirou',
            status: 'warning',
            duration: 3000,
            isClosable: true
          });
        });

        // Eventos de revanche
        chessSocket.on('rematch_proposed', ({ proposedBy, username, remainingTime }) => {
          if (!mounted) return;
          setRematchOffer({ proposedBy, username, remainingTime });

          toast({
            title: 'Proposta de Revanche',
            description: `${username} propôs uma revanche`,
            status: 'info',
            duration: null,
            isClosable: true
          });
        });

        chessSocket.on('rematch_declined', ({ declinedBy, username }) => {
          if (!mounted) return;
          setRematchOffer(null);
          
          toast({
            title: 'Revanche Recusada',
            description: `${username} recusou a revanche`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        });

        chessSocket.on('rematch_expired', () => {
          if (!mounted) return;
          setRematchOffer(null);
          
          toast({
            title: 'Proposta Expirada',
            description: 'O tempo para aceitar a revanche expirou',
            status: 'warning',
            duration: 3000,
            isClosable: true
          });
        });

        chessSocket.on('rematch_accepted', ({ newGameId }) => {
          if (!mounted) return;
          
          // Limpa os estados antes de navegar
          setGameOver(null);
          setRematchOffer(null);
          setDrawOffer(null);
          setMoveHistory([]);
          
          // Navega para o novo jogo
          navigate(`/game/${newGameId}`, { replace: true });
        });

        // Eventos de fim de jogo
        chessSocket.on('game_over', ({ reason, winner, remainingTime, message: serverMessage }) => {
          if (!mounted) return;
          
          let endMessage = serverMessage;
          if (!endMessage) {
            switch (reason) {
              case 'checkmate':
                endMessage = 'Xeque-mate!';
                break;
              case 'draw':
                endMessage = 'Empate!';
                break;
              case 'stalemate':
                endMessage = 'Rei afogado!';
                break;
              case 'draw_accepted':
                endMessage = 'Empate por acordo mútuo!';
                break;
              case 'resignation':
                endMessage = `${winner === user.id ? 'Oponente desistiu!' : 'Você desistiu!'}`;
                break;
              default:
                endMessage = 'Fim de jogo!';
            }
          }

          setGameOver({ reason, winner, message: endMessage });
          setRematchTimer(remainingTime);

          // Inicia o contador regressivo
          const interval = setInterval(() => {
            setRematchTimer(prev => {
              if (prev <= 1000) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1000;
            });
          }, 1000);
        });

        chessSocket.on('rematch_pending', ({ acceptedBy, username }) => {
          if (!mounted) return;
          setRematchStatus({ status: 'pending', acceptedBy, username });
          toast({
            title: 'Revanche',
            description: `${username} aceitou a revanche!`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        });

        chessSocket.on('rematch_accepted', ({ newGameId }) => {
          if (!mounted) return;
          navigate(`/game/${newGameId}`);
        });

        chessSocket.on('rematch_declined', ({ declinedBy, username }) => {
          if (!mounted) return;
          setRematchStatus({ status: 'declined', declinedBy, username });
          toast({
            title: 'Revanche recusada',
            description: `${username} recusou a revanche.`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        });

        chessSocket.on('rematch_expired', () => {
          if (!mounted) return;
          setRematchStatus({ status: 'expired' });
          toast({
            title: 'Tempo esgotado',
            description: 'O tempo para aceitar a revanche expirou.',
            status: 'warning',
            duration: 3000,
            isClosable: true
          });
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
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
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

        // Atualiza o histórico de jogadas
        setMoveHistory(prev => [...prev, {
          number: Math.floor(prev.length / 2) + 1,
          white: prev.length % 2 === 0 ? move.san : null,
          black: prev.length % 2 === 1 ? move.san : null
        }]);

        // O fim do jogo agora é tratado pelo servidor
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

  // Funções para lidar com a revanche
  const handleAcceptRematch = () => {
    gameService.acceptRematch(gameId);
  };

  const handleDeclineRematch = () => {
    gameService.declineRematch(gameId);
    navigate('/');
  };

  return (
    <Box bg="gray.100" minH="100vh">
      <Flex justifyContent="space-between" alignItems="center" bg="white" p={2} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={8}>
          <Text fontWeight="bold">Chess Game</Text>
          <HStack>
            <Button size="sm" variant="ghost">Análise</Button>
            <Button size="sm" variant="ghost">Nova partida</Button>
            <Button size="sm" variant="ghost">Partidas</Button>
            <Button size="sm" variant="ghost">Jogadores</Button>
          </HStack>
        </HStack>
        <HStack>
          <Button size="sm" variant="outline" colorScheme="red" onClick={() => navigate('/')}>
            Sair
          </Button>
        </HStack>
      </Flex>
      
      <Box maxW="container.xl" mx="auto" py={4}>
        {/* Diálogo de Proposta de Empate */}
        {drawOffer && !gameOver && (
        <AlertDialog
          isOpen={true}
          leastDestructiveRef={cancelRef}
          onClose={() => {}}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Proposta de Empate
              </AlertDialogHeader>

              <AlertDialogBody>
                <VStack spacing={4}>
                  <Text>
                    {drawOffer.username} propôs empate.
                  </Text>
                  <Text>
                    Tempo para aceitar: {Math.ceil(drawOffer.remainingTime / 1000)}s
                  </Text>
                </VStack>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button
                  ref={cancelRef}
                  onClick={() => {
                    gameService.declineDraw(gameId);
                    setDrawOffer(null);
                  }}
                  mr={3}
                >
                  Recusar
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    gameService.acceptDraw(gameId);
                    setDrawOffer(null);
                  }}
                >
                  Aceitar
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      )}

      {/* Diálogo de Fim de Jogo */}
      {gameOver && (
        <AlertDialog
          isOpen={true}
          leastDestructiveRef={cancelRef}
          onClose={() => {}}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                {gameOver.message}
              </AlertDialogHeader>

              <AlertDialogBody>
                <VStack spacing={4}>
                  <Text>
                    {gameOver.winner === user.id ? 'Você venceu!' : 'Você perdeu!'}
                  </Text>
                  {rematchOffer && (
                    <Text>
                      {rematchOffer.username} propôs revanche! 
                      Tempo restante: {Math.ceil(rematchOffer.remainingTime / 1000)}s
                    </Text>
                  )}
                </VStack>
              </AlertDialogBody>

              <AlertDialogFooter>
                <Button
                  onClick={() => {
                    if (rematchOffer) {
                      gameService.declineRematch(gameId);
                    }
                    navigate('/');
                  }}
                  mr={3}
                >
                  Voltar ao Lobby
                </Button>
                {rematchOffer ? (
                  <Button
                    colorScheme="blue"
                    onClick={() => gameService.acceptRematch(gameId)}
                  >
                    Aceitar Revanche
                  </Button>
                ) : (
                  <Button
                    colorScheme="blue"
                    onClick={() => gameService.proposeRematch(gameId)}
                  >
                    Propor Revanche
                  </Button>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      )}
      <Grid templateColumns="auto 400px" gap={4}>
        <Box>
          {/* Timer e Controles */}
          <Box bg="gray.800" p={2} mb={4}>
            <HStack spacing={8} justifyContent="center">
              <Box textAlign="center">
                <Text color="white" fontSize="sm">Brancas</Text>
                <Text color="white" fontSize="3xl" fontFamily="mono" fontWeight="bold">
                  {timeControl ? `${Math.floor(timeControl[gameInfo.challenger] / 60000)}:${String(Math.floor((timeControl[gameInfo.challenger] % 60000) / 1000)).padStart(2, '0')}` : '10:00'}
                </Text>
              </Box>
              <Box textAlign="center">
                <Text color="white" fontSize="sm">Pretas</Text>
                <Text color="white" fontSize="3xl" fontFamily="mono" fontWeight="bold">
                  {timeControl ? `${Math.floor(timeControl[gameInfo.challenged] / 60000)}:${String(Math.floor((timeControl[gameInfo.challenged] % 60000) / 1000)).padStart(2, '0')}` : '10:00'}
                </Text>
              </Box>
            </HStack>
          </Box>

          {/* Tabuleiro */}
          <Box bg="white" p={4} borderRadius="md" shadow="md">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardWidth={600}
              boardOrientation={boardOrientation}
            />
          </Box>

          {/* Controles do Jogo */}
          <HStack spacing={2} mt={4} justifyContent="center">
            <Button
              colorScheme="yellow"
              size="sm"
              onClick={() => gameService.offerDraw(gameId)}
              isDisabled={!!drawOffer || gameOver}
            >
              Propor Empate
            </Button>
            <Button
              colorScheme="red"
              size="sm"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja desistir?')) {
                  gameService.resign(gameId);
                }
              }}
              isDisabled={gameOver}
            >
              Desistir
            </Button>
          </HStack>
        </Box>

        {/* Painel Lateral */}
        <Box bg="white" borderRadius="md" shadow="md" overflow="hidden">
          <Tabs>
            <TabList bg="gray.50" borderBottomWidth="2px">
              <Tab>Lances</Tab>
              <Tab>Informações</Tab>
              <Tab>Aberturas</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={4}>
                {/* Histórico de Jogadas */}
                <TableContainer>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Nº</Th>
                        <Th>Brancas</Th>
                        <Th>Pretas</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {moveHistory.map((move, index) => (
                        <Tr key={index}>
                          <Td>{move.number}</Td>
                          <Td>{move.white || '-'}</Td>
                          <Td>{move.black || '-'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel p={4}>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="sm" color="gray.600">
                    {currentPlayer === user.id ? 'Sua vez de jogar' : 'Aguardando oponente...'}
                  </Text>
                  <Badge colorScheme={isChallenger ? 'green' : 'purple'}>
                    {isChallenger ? 'Peças Brancas' : 'Peças Pretas'}
                  </Badge>
                </VStack>
              </TabPanel>

              <TabPanel p={4}>
                <Text fontSize="sm" color="gray.600">
                  Informações sobre aberturas aparecerão aqui
                </Text>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Chat */}
          <Box borderTopWidth="2px" borderColor="gray.100">
            <Box
              height="200px"
              overflowY="auto"
              p={4}
              bg="white"
            >
              <List spacing={3}>
                {messages.map((message, index) => (
                  <ListItem
                    key={index}
                    bg={message.sender === user.username ? 'blue.50' : 'gray.50'}
                    p={2}
                    borderRadius="md"
                  >
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">{message.sender}</Text>
                    <Text fontSize="sm">{message.content}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box p={2} borderTopWidth="1px" borderColor="gray.100">
              <form onSubmit={sendMessage}>
                <Grid templateColumns="1fr auto" gap={2}>
                  <Input
                    size="sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    bg="white"
                  />
                  <IconButton
                    size="sm"
                    type="submit"
                    colorScheme="blue"
                    aria-label="Enviar mensagem"
                    icon={<Text>➤</Text>}
                  />
                </Grid>
              </form>
            </Box>
          </Box>
        </Box>
      </Grid>
    </Box>
    </Box>
  );
}

export default Game;