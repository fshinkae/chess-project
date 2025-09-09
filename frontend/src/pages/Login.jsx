import {
  Box,
  Button,
  Container,
  Input,
  Stack,
  Heading,
  Text,
  Link as ChakraLink,
  useToast,
  HStack,
  Center,
  Icon
} from '@chakra-ui/react';
import { GiChessKnight } from 'react-icons/gi';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      toast({
        title: 'Erro no login',
        description: result.error,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
    
    setIsLoading(false);
  };

  return (
    <Center minH="100vh" bg="gray.50">
      <Box
        bg="white"
        p={8}
        rounded="lg"
        shadow="lg"
        w="full"
        maxW="400px"
        mx={4}
      >
        <Stack spacing={6} align="center">
          <HStack spacing={2} align="center">
            <Icon as={GiChessKnight} boxSize={10} color="gray.700" />
            <Heading size="lg" fontFamily="mono">MicroChess</Heading>
          </HStack>
          <Text color="gray.600" fontSize="sm">
            Entre ou crie sua conta para jogar
          </Text>

          <HStack w="full" spacing={2}>
            <Button
              flex={1}
              variant="ghost"
              size="sm"
              as={Link}
              to="/login"
              bg="gray.100"
            >
              Entrar
            </Button>
            <Button
              flex={1}
              variant="ghost"
              size="sm"
              as={Link}
              to="/register"
            >
              Registrar
            </Button>
          </HStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <Stack spacing={4}>
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="lg"
                bg="gray.50"
                border={0}
                required
              />
              <Input
                placeholder="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="lg"
                bg="gray.50"
                border={0}
                required
              />
              <Button
                type="submit"
                colorScheme="blackAlpha"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="Entrando..."
              >
                Entrar
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Center>
  );
}

export default Login;