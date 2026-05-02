include .env
export

DOCKER_COMPOSE ?= docker-compose

frontend:
	cd frontend && npm run dev

backend:
	cd backend && npm run dev

certs:
	bash ./scripts/generate-ssl-cert.sh

build: certs
	bash ./get_ip.sh
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d postgres
	@$(MAKE) wait-db
	@$(MAKE) init-db
	$(DOCKER_COMPOSE) up -d

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend:
	$(DOCKER_COMPOSE) logs -f frontend

create-db:
	$(DOCKER_COMPOSE) --env-file .env up -d postgres

wait-db:
	@echo "Waiting for Postgres to be ready..."
	@until $(DOCKER_COMPOSE) exec -T postgres \
		pg_isready -h localhost -p 5432 -U $(DB_USER) -d $(DB_NAME) > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "Postgres is ready !"

db:
	$(DOCKER_COMPOSE) exec postgres \
		psql -h localhost -U $(DB_USER) -d $(DB_NAME)

update-db:
	$(DOCKER_COMPOSE) exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		psql -h localhost -U $(DB_USER) $(DB_NAME) -c \
		"DELETE FROM solo_scores s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = s.username); DELETE FROM coop_scores c WHERE NOT EXISTS (SELECT 1 FROM users u1 WHERE u1.username = c.player_one) OR NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.username = c.player_two); DELETE FROM multiplayer_scores m WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = m.username); DELETE FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.username = r.host);"
	$(DOCKER_COMPOSE) exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		pg_dump -U $(DB_USER) $(DB_NAME) > backup.sql

backup: update-db
	mkdir -p backups
	cp backup.sql backups/backup-$$(date +"%Y-%m-%d_%H-%M-%S").sql

delete-db:
	rm -rf backup.sql

init-db:
	@echo "Resetting database schema..."
	@$(DOCKER_COMPOSE) exec -T postgres \
		env PGPASSWORD=$(DB_PASSWORD) \
		psql -h localhost -U $(DB_USER) $(DB_NAME) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null
	@if [ -s backup.sql ]; then \
		echo "Restoring database from backup.sql..."; \
		$(DOCKER_COMPOSE) exec -T postgres \
			env PGPASSWORD=$(DB_PASSWORD) \
			psql -h localhost -U $(DB_USER) $(DB_NAME) < backup.sql && \
		echo "Database restored" || \
		echo "Database restore FAILED"; \
	else \
		echo "No backup.sql found; backend migrations will create the schema on startup."; \
	fi

down:
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) stop
	@echo "Removing containers (keeping volumes)..."
	$(DOCKER_COMPOSE) rm -f

prune:
	@echo "Resetting pgsql containers..."
	@echo "Stopping and removing containers + volumes..."
	$(DOCKER_COMPOSE) down -v
	@echo "Pruning unused Docker resources..."
	docker system prune -f

setup: certs
	bash ./get_ip.sh
	@$(MAKE) create-db
	@$(MAKE) wait-db
	@$(MAKE) init-db
	$(DOCKER_COMPOSE) up -d

install: setup
	npm install --prefix frontend
	npm install --prefix backend

test-frontend:
	npm run test:run --prefix frontend

test-backend:
	npm run test --prefix backend

test:
	npm run coverage

.PHONY: frontend backend certs build create-db db update-db backup delete-db wait-db init-db down prune setup install test-frontend test-backend test
