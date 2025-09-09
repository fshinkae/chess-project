#!/bin/bash

# Lista de portas para limpar
PORTS=(3000 3001 3002 3003 5173)

for PORT in "${PORTS[@]}"; do
    PID=$(lsof -ti :$PORT)
    if [ ! -z "$PID" ]; then
        echo "Matando processo na porta $PORT (PID: $PID)"
        kill -9 $PID
    fi
done

echo "Todas as portas foram liberadas!"
