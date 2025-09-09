# Chess Project - Plataforma de Xadrez Online

## 📝 Sobre o Projeto

Uma plataforma moderna de xadrez online construída com arquitetura de microsserviços, permitindo que jogadores se conectem e joguem em tempo real. O projeto foi desenvolvido com foco em escalabilidade, performance e experiência do usuário.

PPT: https://excalidraw.com/#json=RiylON-aRuEHVDxRh_o7k,ULlzLM0pxiYSWz7-WoUrMg

### Equipe
Felipe Shinkae (CEO, Fullstack)
Matheus Ferreira (CTO, Backend)


### 🎯 Principais Funcionalidades

- Partidas em tempo real entre jogadores
- Sistema de chat durante as partidas
- Autenticação e perfil de usuários
- Interface responsiva e intuitiva
- Matchmaking entre jogadores

### 🏗️ Arquitetura

O projeto utiliza uma arquitetura de microsserviços moderna, composta por:

- **API Gateway**: Ponto de entrada único para todos os serviços
- **Login Service**: Gerenciamento de autenticação e usuários
- **Chess Service**: Lógica do jogo e estado das partidas
- **Chat Service**: Sistema de comunicação em tempo real
- **Frontend**: Interface do usuário construída com React e Vite

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js
- Express
- WebSocket
- MongoDB (implícito pela estrutura)
- Docker

### Frontend
- React
- Vite
- WebSocket Client
- Zustand (para gerenciamento de estado)

## 🚀 Como Executar

### Pré-requisitos
- Node.js
- Docker e Docker Compose
- MongoDB

### Instalação e Execução

1. Clone o repositório
```bash
git clone https://github.com/fshinkae/chess-project
```

2. Instale as dependências (em cada serviço e no frontend)
```bash
# Na raiz do projeto
npm install

# Em cada serviço do backend
cd backend/[service-name]
npm install

# No frontend
cd frontend
npm install
```

3. Inicie os serviços com Docker Compose
```bash
docker-compose up
```

4. Acesse a aplicação
```
Frontend: http://localhost:5173
API Gateway: http://localhost:3000
```

## 🔄 Status do Projeto

O projeto está em desenvolvimento ativo, com as seguintes funcionalidades já implementadas:
- Sistema de autenticação
- Jogabilidade básica de xadrez
- Chat em tempo real
- Interface responsiva

## 👥 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Faça push para a branch
5. Abra um Pull Request