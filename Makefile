# Makefile for Red Tetris
frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

create-db:
	docker compose --env-file .env up -d

db:
	docker exec -it red_tetris_postgres psql -h localhost -U riri -d red_tetris_db

update-db:
	docker exec -it red_tetris_postgres pg_dump -U riri red_tetris_db > backup.sql

down:
	@echo "Backing up database..."
	@$(MAKE) update-db
	@echo "Stopping containers..."
	docker compose stop
	@echo "Removing containers (keeping volumes)..."
	docker compose rm -f

prune:
	@echo "Resetting database (this will DELETE all data)..."
	@echo "Stopping and removing containers + volumes..."
	docker compose down -v
	@echo "Pruning unused Docker resources..."
	docker system prune -f
	@echo "Removing local backup..."
	rm -f backup.sql
	@echo "Database reset complete."

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
