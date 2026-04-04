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

delete-db:
	rm -rf backup.sql

wait-db:
	@echo "Waiting for Postgres to be ready..."
	@until docker exec red_tetris_postgres \
		pg_isready -h localhost -p 5432 -U $(DB_USER) > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "Postgres is ready !"

down:
	@echo "Stopping containers..."
	docker compose stop
	@echo "Removing containers (keeping volumes)..."
	docker compose rm -f

prune:
	@echo "Resetting pgsql containers..."
	@echo "Stopping and removing containers + volumes..."
	docker compose down -v
	@echo "Pruning unused Docker resources..."
	docker system prune -f

setup:
	./get_ip.sh
	@$(MAKE) create-db
	@$(MAKE) wait-db
	@echo "Running db-init.sql..."
	@docker exec -i red_tetris_postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		psql -h localhost -U $(DB_USER) $(DB_NAME) < db-init.sql
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

install: setup
	npm install --prefix frontend
	npm install --prefix backend

test-frontend:
	npm run test:run --prefix frontend

test-backend:
	npm run test --prefix backend

test:
	npm run coverage

.PHONY: frontend backend db setup-frontend install test-frontend test-backend test-backend-coverage test
