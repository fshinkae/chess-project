import {
  Box,
  Container,
  Grid,
  Heading,
  List,
  ListItem,
  Button,
  Text,
  Badge,
  useToast,
  VStack,
  HStack,
  Spinner,
  Center,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Flex,
  Icon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react';
import { GiChessKnight } from 'react-icons/gi';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

function ChallengeDialog({ isOpen, onClose, challenger, onAccept, onDecline }) {
  const cancelRef = useRef();

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Desafio Recebido!
          </AlertDialogHeader>

          <AlertDialogBody>
            {challenger} te desafiou para uma partida. Deseja aceitar?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onDecline} variant="ghost">
              Recusar
            </Button>
            <Button colorScheme="blue" onClick={onAccept} ml={3}>
              Aceitar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

function Lobby() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    setIsConnecting(true);
    console.log('Iniciando conexão com socket, usuário:', user);

    const newSocket = io('http://localhost:3002', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Conectado ao servidor de chat');
      setIsConnecting(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Erro na conexão:', error);
      setIsConnecting(false);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    });

    newSocket.on('users_online', (users) => {
      console.log('Usuários online recebidos:', users);
      setOnlineUsers(users.filter(u => u.id !== user?.id));
    });

    newSocket.on('challenge_received', ({ challengerId, challengerName }) => {
      setChallenge({ id: challengerId, name: challengerName });
      onOpen();
    });

    newSocket.on('challenge_declined', ({ userId, username }) => {
      toast({
        title: 'Desafio recusado',
        description: `${username} recusou seu desafio`,
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    });

    newSocket.on('game_started', ({ gameId }) => {
      toast({
        title: 'Partida iniciada!',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
      navigate(`/game/${gameId}`);
    });

    setSocket(newSocket);

    return () => {
      console.log('Desconectando socket...');
      newSocket.close();
    };
  }, [user, token]);

  const challengeUser = (userId, username) => {
    if (!socket) return;
    
    socket.emit('challenge', { targetUserId: userId });
    toast({
      title: 'Desafio enviado!',
      description: `Aguardando resposta de ${username}...`,
      status: 'info',
      duration: null,
      id: `challenge-${userId}`,
      isClosable: true
    });
  };

  const handleAcceptChallenge = () => {
    if (!socket || !challenge) return;
    
    socket.emit('accept_challenge', { challengerId: challenge.id });
    onClose();
    setChallenge(null);
  };

  const handleDeclineChallenge = () => {
    if (!socket || !challenge) return;
    
    socket.emit('decline_challenge', { challengerId: challenge.id });
    onClose();
    setChallenge(null);
  };

  if (isConnecting) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Conectando ao servidor...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box bg="gray.100" minH="100vh">
      <Flex justifyContent="space-between" alignItems="center" bg="white" p={2} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={8}>
          <HStack spacing={2}>
            <Icon as={GiChessKnight} boxSize={8} color="gray.700" />
            <Heading size="md" fontFamily="mono">MicroChess</Heading>
          </HStack>
          <HStack>
            <Button size="sm" variant="ghost">Análise</Button>
            <Button size="sm" variant="ghost">Nova partida</Button>
            <Button size="sm" variant="ghost">Partidas</Button>
            <Button size="sm" variant="ghost">Jogadores</Button>
          </HStack>
        </HStack>
        <HStack spacing={4}>
          <Text fontWeight="medium">Olá, {user?.username}!</Text>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sair
          </Button>
        </HStack>
      </Flex>

      <Box maxW="container.xl" mx="auto" py={6} px={4}>
        <Grid templateColumns="1fr 300px" gap={6}>
          <Box bg="white" p={6} rounded="lg" shadow="md">
            <Tabs>
              <TabList>
                <Tab>Jogadores Online</Tab>
                <Tab>Histórico</Tab>
                <Tab>Ranking</Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <List spacing={3}>
                    {onlineUsers.length === 0 ? (
                      <Text color="gray.500" py={4}>
                        Nenhum outro jogador online no momento...
                      </Text>
                    ) : (
                      onlineUsers.map((onlineUser) => (
                        <ListItem
                          key={onlineUser.id}
                          p={4}
                          bg="gray.50"
                          borderRadius="md"
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          _hover={{ bg: 'gray.100' }}
                        >
                          <Box>
                            <Text fontWeight="bold">{onlineUser.username}</Text>
                            <Badge
                              colorScheme={onlineUser.status === 'available' ? 'green' : 'orange'}
                              variant="subtle"
                            >
                              {onlineUser.status === 'available' ? 'Disponível' : 'Em jogo'}
                            </Badge>
                          </Box>
                          {onlineUser.status === 'available' && (
                            <Button
                              colorScheme="blackAlpha"
                              size="sm"
                              onClick={() => challengeUser(onlineUser.id, onlineUser.username)}
                            >
                              Desafiar
                            </Button>
                          )}
                        </ListItem>
                      ))
                    )}
                  </List>
                </TabPanel>
                <TabPanel>
                  <Text color="gray.500">Histórico de partidas em breve...</Text>
                </TabPanel>
                <TabPanel>
                  <Text color="gray.500">Ranking de jogadores em breve...</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          <Box bg="white" p={6} rounded="lg" shadow="md" height="fit-content">
            <VStack align="stretch" spacing={4}>
              <Heading size="md">Estatísticas</Heading>
              <Box p={4} bg="gray.50" rounded="md">
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text>Partidas jogadas</Text>
                    <Text fontWeight="bold">0</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Vitórias</Text>
                    <Text fontWeight="bold" color="green.500">0</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Derrotas</Text>
                    <Text fontWeight="bold" color="red.500">0</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Empates</Text>
                    <Text fontWeight="bold" color="gray.500">0</Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </Grid>
      </Box>

      <ChallengeDialog
        isOpen={isOpen}
        onClose={onClose}
        challenger={challenge?.name}
        onAccept={handleAcceptChallenge}
        onDecline={handleDeclineChallenge}
      />
    </Box>
  );
}

export default Lobby;