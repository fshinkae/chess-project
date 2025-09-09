import {
  Box,
  Button,
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

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const register = useAuthStore(state => state.register);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validações
      if (!username || !email || !password || !confirmPassword) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Por favor, preencha todos os campos',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'Erro na validação',
          description: 'As senhas não coincidem',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }

      setIsLoading(true);
      
      const result = await register(username, email, password);
      
      if (result.success) {
        toast({
          title: 'Conta criada com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        navigate('/');
      } else {
        toast({
          title: 'Erro no registro',
          description: result.error,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Erro ao processar registro:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao criar sua conta. Tente novamente.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
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
            >
              Entrar
            </Button>
            <Button
              flex={1}
              variant="ghost"
              size="sm"
              as={Link}
              to="/register"
              bg="gray.100"
            >
              Registrar
            </Button>
          </HStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <Stack spacing={4}>
              <Input
                placeholder="Nome de usuário"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="lg"
                bg="gray.50"
                border={0}
                required
                isDisabled={isLoading}
              />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="lg"
                bg="gray.50"
                border={0}
                required
                isDisabled={isLoading}
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
                isDisabled={isLoading}
              />
              <Input
                placeholder="Confirmar senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="lg"
                bg="gray.50"
                border={0}
                required
                isDisabled={isLoading}
              />
              <Button
                type="submit"
                colorScheme="blackAlpha"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="Criando conta..."
              >
                Criar Conta
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Center>
  );
}

export default Register;