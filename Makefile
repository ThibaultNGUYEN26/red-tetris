include .env
export

frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

build:
	bash ./get_ip.sh
	docker compose build --no-cache
	docker compose up -d postgres
	@$(MAKE) wait-db
	@$(MAKE) init-db
	docker compose up -d

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

create-db:
	docker compose --env-file .env up -d postgres

wait-db:
	@echo "Waiting for Postgres to be ready..."
	@until docker compose exec -T postgres \
		pg_isready -h localhost -p 5432 -U $(DB_USER) -d $(DB_NAME) > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "Postgres is ready !"

db:
	docker compose exec postgres \
		psql -h localhost -U $(DB_USER) -d $(DB_NAME)

update-db:
	docker compose exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		psql -h localhost -U $(DB_USER) $(DB_NAME) -c \
		"DELETE FROM solo_scores s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = s.username); DELETE FROM coop_scores c WHERE NOT EXISTS (SELECT 1 FROM users u1 WHERE u1.username = c.player_one) OR NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.username = c.player_two); DELETE FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = r.host);"
	docker compose exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		pg_dump -U $(DB_USER) $(DB_NAME) > backup.sql

delete-db:
	rm -rf backup.sql

init-db:
	@echo "Resetting database schema..."
	@docker compose exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		psql -h localhost -U $(DB_USER) $(DB_NAME) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null
	@if [ -s backup.sql ]; then \
		echo "Restoring database from backup.sql..."; \
		docker compose exec -T postgres \
			env PGPASSWORD=$(DB_PASSWORD) \
			psql -h localhost -U $(DB_USER) $(DB_NAME) < backup.sql && \
		echo "Database restored" || \
		echo "Database restore FAILED"; \
	else \
		echo "No backup.sql found, creating empty schema from db-init.sql..."; \
		docker compose exec -T postgres \
			env PGPASSWORD=$(DB_PASSWORD) \
			psql -h localhost -U $(DB_USER) $(DB_NAME) < db-init.sql; \
	fi

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
	bash ./get_ip.sh
	@$(MAKE) create-db
	@$(MAKE) wait-db
	@$(MAKE) init-db
	docker compose up -d

install: setup
	npm install --prefix frontend
	npm install --prefix backend

test-frontend:
	npm run test:run --prefix frontend

test-backend:
	npm run test --prefix backend

test:
	npm run coverage

.PHONY: frontend backend build create-db db update-db delete-db wait-db init-db down prune setup install test-frontend test-backend test
