# Makefile for Red Tetris

frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

db:
	docker exec -it red_tetris_postgre psql -h localhost -U riri -d red_tetris_db

setup:
	./get_ip.sh
	@if [ ! -f frontend/.env ]; then \
	  echo "VITE_API_URL=http://localhost:3000" > frontend/.env; \
	  echo "Created frontend/.env"; \
	else \
	  echo "frontend/.env already exists"; \
	fi
	@if [ -f backup.sql ]; then \
	  echo "Restoring database from backup.sql..."; \
	  docker exec -i red_tetris_postgres \
	    psql -U $$DB_USER $$DB_NAME < backup.sql; \
	  echo "Database restored"; \
	else \
	  echo "No backup.sql found, skipping DB restore"; \
	fi

install:
	npm install --prefix frontend
	npm install --prefix backend
	docker-compose --env-file .env up -d

.PHONY: frontend backend db setup-frontend install
