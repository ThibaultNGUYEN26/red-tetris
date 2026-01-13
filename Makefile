# Makefile for Red Tetris

frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

db:
	docker exec -it red_tetris_postgre psql -h localhost -U riri -d red_tetris_db

setup:
	@if [ ! -f frontend/.env ]; then \
	  echo "VITE_API_URL=http://localhost:3000" > frontend/.env; \
	  echo "Created frontend/.env"; \
	else \
	  echo "frontend/.env already exists"; \
	fi

install:
	npm install --prefix frontend
	npm install --prefix backend

.PHONY: frontend backend db setup install
