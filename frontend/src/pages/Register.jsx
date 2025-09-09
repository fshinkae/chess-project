import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  Link as ChakraLink,
  useToast
} from '@chakra-ui/react';
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
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <Stack spacing="8">
        <Stack spacing="6">
          <Stack spacing={{ base: '2', md: '3' }} textAlign="center">
            <Heading size={{ base: 'xs', md: 'sm' }}>
              Criar nova conta
            </Heading>
          </Stack>
        </Stack>
        <Box
          py={{ base: '0', sm: '8' }}
          px={{ base: '4', sm: '10' }}
          bg={{ base: 'transparent', sm: 'bg-surface' }}
          boxShadow={{ base: 'none', sm: 'md' }}
          borderRadius={{ base: 'none', sm: 'xl' }}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing="6">
              <Stack spacing="5">
                <FormControl isRequired>
                  <FormLabel htmlFor="username">Nome de usuário</FormLabel>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    isDisabled={isLoading}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isDisabled={isLoading}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isDisabled={isLoading}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel htmlFor="confirmPassword">Confirmar Senha</FormLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    isDisabled={isLoading}
                  />
                </FormControl>
              </Stack>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
                loadingText="Criando conta..."
              >
                Criar Conta
              </Button>
            </Stack>
          </form>
          <Stack spacing="6" mt="6">
            <Text textAlign="center">
              Já tem uma conta?{' '}
              <ChakraLink as={Link} to="/login" color="blue.500">
                Faça login
              </ChakraLink>
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

export default Register;