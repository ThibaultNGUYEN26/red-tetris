include .env
export

frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

create-db:
	docker compose --env-file .env up -d

db:
	docker exec -it red_tetris_postgres psql -h localhost -U ${DB_USER} -d ${DB_NAME}

update-db:
	docker exec -it red_tetris_postgres pg_dump -U ${DB_USER} ${DB_NAME} > backup.sql

down:
	@echo "Backing up database..."
	@$(MAKE) update-db
	@echo "Stopping containers..."
	docker compose stop
	@echo "Removing containers (keeping volumes)..."
	docker compose rm -f

delete-db:
	rm -rf backup.sql

prune:
	@echo "Resetting database (this will DELETE all data)..."
	@echo "Stopping and removing containers + volumes..."
	docker compose down -v
	@echo "Pruning unused Docker resources..."
	docker system prune -f

setup:
	./get_ip.sh
	@if [ ! -f frontend/.env ]; then \
	  echo "VITE_API_URL=http://localhost:3000" > frontend/.env; \
	  echo "Created frontend/.env"; \
	else \
	  echo "frontend/.env already exists"; \
	fi
	@$(MAKE) create-db
	@if [ -f backup.sql ]; then \
		echo "Restoring database from backup.sql..."; \
		docker exec -i red_tetris_postgres \
			env PGPASSWORD=$(DB_PASSWORD) \
			psql -h localhost -U $(DB_USER) $(DB_NAME) < backup.sql && \
		echo "Database restored" || \
		echo "Database restore FAILED"; \
	else \
		echo "No backup.sql found, skipping DB restore"; \
	fi

install:
	npm install --prefix frontend
	npm install --prefix backend
	docker-compose --env-file .env up -d

.PHONY: frontend backend db setup-frontend install
