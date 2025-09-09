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
  Spinner,
  Center,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react';
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
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    setIsConnecting(true);
    console.log('Iniciando conexão com socket, usuário:', user);

    const newSocket = io('http://localhost:3002', {
      auth: { token }
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
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4}>
            Bem-vindo, {user?.username}!
          </Heading>
          <Heading size="md" mb={4}>
            Jogadores Online
          </Heading>
          <List spacing={3}>
            {onlineUsers.length === 0 ? (
              <Text color="gray.500">
                Nenhum outro jogador online no momento...
              </Text>
            ) : (
              onlineUsers.map((onlineUser) => (
                <ListItem
                  key={onlineUser.id}
                  p={4}
                  bg="white"
                  borderRadius="md"
                  boxShadow="sm"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Text fontWeight="bold">{onlineUser.username}</Text>
                    <Badge
                      colorScheme={onlineUser.status === 'available' ? 'green' : 'orange'}
                    >
                      {onlineUser.status === 'available' ? 'Disponível' : 'Em jogo'}
                    </Badge>
                  </Box>
                  {onlineUser.status === 'available' && (
                    <Button
                      colorScheme="blue"
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
        </Box>
      </VStack>

      <ChallengeDialog
        isOpen={isOpen}
        onClose={onClose}
        challenger={challenge?.name}
        onAccept={handleAcceptChallenge}
        onDecline={handleDeclineChallenge}
      />
    </Container>
  );
}

export default Lobby;