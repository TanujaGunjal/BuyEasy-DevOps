# BuyEasy — Async E-Commerce Platform with Full DevOps Pipeline

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.x-FF6600?logo=rabbitmq&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?logo=jenkins&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-prom--client-E6522C?logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-Dashboard-F46800?logo=grafana&logoColor=white)
![SonarQube](https://img.shields.io/badge/SonarQube-Quality-4E9BCD?logo=sonarqube&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-Supertest-C21325?logo=jest&logoColor=white)
![AWS EC2](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white)

---

## Overview

BuyEasy is a full-stack MERN e-commerce platform built with async order processing at its core. When a customer places an order, the API writes to MongoDB, publishes a persistent event to RabbitMQ, and responds in ~25ms — without blocking on email delivery or stock updates. Two independent consumers handle the event downstream: one deducts inventory via MongoDB `$inc`, the other sends an HTML confirmation email via Gmail SMTP. Failed messages are routed to a dead-letter queue rather than silently retried. Cart reads are served from Redis (1-hour TTL, cache-aside) with automatic invalidation on every write. A price alert cron job monitors cart items for price drops and notifies users by email. The full 7-service stack is orchestrated with Docker Compose, deployed to **AWS EC2** via a Jenkins pipeline that runs tests, static analysis, Docker builds, and SSH-deploys on every push to `main`.

---

## Architecture

```
+----------------------------------------------------------------------+
|                        Docker Network: buyeasy-network               |
|                                                                      |
|  +------------+   HTTP    +----------------------------------------+|
|  |  Frontend  |---------->|           Backend (Express 5)          ||
|  | React+Nginx|<----------| POST /api/orders                       ||
|  |   :3000    | ~25ms     |   1. Verify stock (read-only)          ||
|  +------------+           |   2. Order.create() → MongoDB          ||
|                           |   3. Cart cleared                      ||
|                           |   4. sendToQueue('order.created')      ||
|                           |   5. res.status(201)  ← returns here   ||
|                           |                                        ||
|                           | GET /api/cart                          ||
|                           |   Redis HIT  → return cached           ||
|                           |   Redis MISS → MongoDB → setex(3600)   ||
|                           +-------------------+--------------------+|
|                                               |                     |
|                           +-------------------v--------------------+|
|                           |  RabbitMQ  :5672  /  UI :15672         ||
|                           |  Queue: order.created  (durable)       ||
|                           |  Queue: order.dead-letter              ||
|                           |  Exchange: order.dlx  (dead-letter)    ||
|                           +----------+----------------+------------+|
|                                      |                |             |
|                    +-----------------v--+  +----------v-----------+ |
|                    | inventoryConsumer  |  | notificationConsumer | |
|                    | prefetch(1)        |  | prefetch(1)          | |
|                    | $inc stock+sold    |  | Gmail SMTP           | |
|                    | ack / nack→DLQ     |  | ack / nack→DLQ       | |
|                    +--------------------+  +----------------------+ |
|                                                                     |
|  +-----------+  +----------+  +--------+  +----------+              |
|  | Prometheus|  |  Grafana |  |  Redis |  |Node Exporter|           |
|  |   :9090   |  |  :3001   |  | :6379  |  |  :9100   |              |
|  +-----------+  +----------+  +--------+  +----------+              |
+---------------------------------------------------------------------+

Jenkins: Clean → Checkout → npm install → Jest/Supertest → SonarQube → Docker build → docker compose up
```

---

## Async Order Pipeline

The original synchronous flow blocked the order API on Gmail SMTP (~850ms per request). A slow SMTP server or timeout would fail the entire order endpoint.

**After — async via RabbitMQ (~25ms response):**

| Step | Action | Latency |
|------|--------|---------|
| 1 | Verify stock (read-only MongoDB) | ~10ms |
| 2 | `Order.create()` + cart cleared | ~10ms |
| 3 | `channel.sendToQueue('order.created', payload, { persistent: true })` | ~5ms |
| 4 | `res.status(201)` — returns immediately | — |
| ↓ async | **inventoryConsumer**: `$inc stock`, `$inc soldCount`, ack | background |
| ↓ async | **notificationConsumer**: HTML email via Gmail SMTP, ack | background |
| ↓ on failure | Either consumer nacks → message routed to `order.dead-letter` | — |

Email failure no longer affects order creation. Inventory failure does not block notification. Each consumer fails independently.

---

## Redis Cart Cache

Cache-aside pattern in `controllers/cartController.js` using `ioredis`.

| Path | Behaviour |
|------|-----------|
| **HIT** | `redis.get(cart:{userId})` → return JSON. MongoDB not touched. |
| **MISS** | Fetch from MongoDB → `redis.setex(key, 3600, data)` (1-hour TTL) |
| **Invalidation** | Every write (`addToCart`, `updateCartItem`, `removeFromCart`, `clearCart`) calls `redis.del(key)` |
| **Failure** | Redis errors wrapped in try/catch — falls back to MongoDB silently |

**Why cart and not product catalog?** Cart staleness self-corrects on the next write. Product price staleness has no self-correcting write — a stale price at checkout is a financial data integrity violation.

---

## Price Alert System

Users set a `targetPrice` on any cart item via `PUT /api/cart/:productId/alert`. The `priceAlertCron.js` service (node-cron, `*/1 * * * *`) queries all cart items where `targetPrice != null && alertSent == false`. If `product.price <= targetPrice`, it emails the user via `sendPriceDropAlert()` (nodemailer) and sets `alertSent = true` to prevent duplicate notifications.

---

## Tech Stack

| Layer | Technology | What breaks without it |
|-------|-----------|------------------------|
| Frontend | React 18 + Nginx | No production static file server |
| Backend | Express 5, Node.js 18 | No REST API |
| Database | MongoDB Atlas (Mongoose 9) | No persistence |
| Message Broker | RabbitMQ 3 | Email blocks order API; SMTP timeout = order failure |
| Cache | Redis 7 (ioredis) | Every cart read hits MongoDB |
| Dead-Letter Queue | RabbitMQ DLX | `nack requeue=true` creates infinite retry loops on broken messages |
| Metrics | prom-client 15 | Consumer lag invisible — inventory can fall behind silently |
| Dashboards | Grafana | Lag divergence has no time-series alert |
| Code Quality | SonarQube | Security vulnerabilities enter the codebase undetected |
| CI/CD | Jenkins | Manual build + deploy across 7 services per change |
| Orchestration | Docker Compose | 7 services need coordinated networking, volumes, health-checks |
| System Metrics | Node Exporter | CPU/memory unavailable to Prometheus |
| Testing | Jest + Supertest | No automated regression signal before deploy |
| Scheduling | node-cron | Price alerts never fire |
| Email | nodemailer + Gmail SMTP | No order confirmations or price drop alerts |

---

## Prometheus Metrics

Defined in `config/metrics.js`, exposed at `GET /metrics`, scraped every 15s.

| Metric | Type | What a divergence signals |
|--------|------|--------------------------|
| `orders_created_total` | Counter | Baseline order throughput |
| `inventory_updated_total` | Counter | Falls behind → inventory consumer stuck or crashing |
| `notifications_sent_total` | Counter | Falls behind → SMTP failing, messages dead-lettered |
| `notification_failures_total` | Counter | Rising → inspect `order.dead-letter` queue |
| `orders_vs_inventory_lag` | Gauge | `inc` on order create, `dec` on inventory processed — detects consumer backlog |

Also scrapes: `node-exporter` (:9100) for CPU/memory/disk, and `rabbitmq` (:15692) for queue depths and message rates.

---

## Grafana Consumer Lag Panel

```promql
orders_created_total - inventory_updated_total
```

A rising value means stock is not being decremented — the inventory consumer is stuck or dead. The order API still returns 201 and the database has the order, but customers can purchase out-of-stock items. This panel catches that failure before it becomes customer-visible.

Steady-state target: **0**. Investigate if value exceeds 5.

---

## CI/CD Pipeline

Defined in [`Jenkinsfile`](./Jenkinsfile). Triggered via GitHub webhook on every push to `main`.

```
Clean workspace → Checkout → npm install (backend + frontend)
  → Jest + Supertest (--coverage) → SonarQube scan
  → Docker build (backend + frontend images)
  → docker compose down --remove-orphans
  → inject backend .env from Jenkins Secret File credential
  → docker compose up -d --no-build
```

Secrets — backend `.env` stored as Jenkins `Secret File` (`buyeasy-backend-env`); SonarQube token stored as Jenkins `Secret Text` (`sonar-token`). Neither is committed to the repository.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/products` | — | List products (paginated) |
| GET | `/api/products/:id` | — | Product detail |
| GET | `/api/cart` | JWT | Get cart (Redis → MongoDB) |
| POST | `/api/cart` | JWT | Add item (invalidates cache) |
| PUT | `/api/cart/:itemId` | JWT | Update quantity (invalidates cache) |
| DELETE | `/api/cart/:itemId` | JWT | Remove item (invalidates cache) |
| PUT | `/api/cart/:productId/alert` | JWT | Set price alert |
| DELETE | `/api/cart/:productId/alert` | JWT | Remove price alert |
| POST | `/api/orders` | JWT | Create order (async pipeline) |
| GET | `/api/orders/myorders` | JWT | User's orders |
| GET | `/api/orders/:id` | JWT | Order detail |
| PUT | `/api/orders/:id/pay` | JWT | Mark paid |
| PUT | `/api/orders/:id/status` | JWT + Admin | Update status |
| PUT | `/api/orders/:id/cancel` | JWT | Cancel order |
| GET | `/api/orders` | JWT + Admin | All orders (paginated) |
| GET | `/api/payments` | JWT | Payment history |
| GET | `/api/deliveries` | JWT | Delivery tracking |
| GET | `/api/reviews` | JWT | Product reviews |
| GET | `/metrics` | — | Prometheus scrape endpoint |

---

## Project Structure

```
BuyEasy-DevOps/
├── backend/
│   ├── config/
│   │   ├── db.js                   # MongoDB Atlas connection
│   │   ├── metrics.js              # Prometheus counters + lag gauge
│   │   └── rabbitmq.js             # Connection singleton, queue/exchange setup, auto-reconnect
│   ├── consumers/
│   │   ├── inventoryConsumer.js    # order.created → $inc stock + soldCount, ack/nack
│   │   └── notificationConsumer.js # order.created → Gmail HTML email, ack/nack
│   ├── controllers/
│   │   ├── authController.js       # register, login (bcrypt + JWT)
│   │   ├── cartController.js       # Redis cache-aside, price alert CRUD
│   │   ├── orderController.js      # create order → publish to RabbitMQ
│   │   └── productController.js   # CRUD, filtering, pagination
│   ├── middleware/
│   │   └── auth.js                 # JWT protect + role authorize
│   ├── models/                     # Cart, Order, Product, User, Payment, Delivery, Review, Wishlist
│   ├── routes/                     # auth, cart, orders, products, payments, deliveries, reviews
│   ├── services/
│   │   ├── emailService.js         # nodemailer + sendPriceDropAlert
│   │   └── priceAlertCron.js       # node-cron: price drop check every minute
│   ├── tests/
│   │   └── api.test.js             # Jest + Supertest (DB-free, mocked)
│   ├── server.app.js               # Express app — imported by tests, no server.listen
│   ├── server.js                   # Entry: connectDB → RabbitMQ → consumers → listen
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Home, Products, Cart, Checkout, Orders, Login, Register, Admin
│   │   ├── components/
│   │   ├── context/                # Auth context
│   │   └── services/               # Axios API calls
│   ├── nginx.conf
│   └── Dockerfile
├── docs/screenshots/
├── Jenkinsfile                     # 7-stage CI/CD pipeline
├── docker-compose.yml              # 7-service stack
└── prometheus.yml                  # Scrape config: backend, node-exporter, rabbitmq
```

---

## Getting Started

**Prerequisites:** Docker Desktop, MongoDB Atlas cluster, Gmail App Password

```bash
git clone https://github.com/TanujaGunjal/BuyEasy-DevOps.git
cd BuyEasy-DevOps
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/buyeasy
JWT_SECRET=your_secret_here
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
FROM_NAME=BuyEasy
FROM_EMAIL=your_email@gmail.com
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672
REDIS_URL=redis://redis:6379
CLIENT_URL=http://localhost:3000
```

```bash
# Start all 7 services
docker compose up -d --build

# Confirm startup — watch for RabbitMQ, Redis, consumer connections
docker compose logs -f backend

# (Optional) Seed the database
docker exec -it buyeasy-backend node seed.js
```
---

## Services and Ports

| Service | Container | Port | Credentials |
|---------|-----------|------|-------------|
| Frontend | `buyeasy-frontend` | `3000` | — |
| Backend API | `buyeasy-backend` | `5000` | — |
| RabbitMQ AMQP | `buyeasy-rabbitmq` | `5672` | `admin / admin123` |
| RabbitMQ UI | `buyeasy-rabbitmq` | `15672` | `admin / admin123` |
| Redis | `buyeasy-redis` | `6379` | — |
| Prometheus | `buyeasy-prometheus` | `9090` | — |
| Grafana | `buyeasy-grafana` | `3001` | `admin / admin` |
| Node Exporter | `buyeasy-node-exporter` | `9100` | — |

---

## Screenshots

### Application
![Application UI](docs/screenshots/app.png)

### Jenkins Pipeline
![Jenkins Pipeline](docs/screenshots/jenkins.png)

### SonarQube Analysis
![SonarQube](docs/screenshots/sonar.png)

### Grafana Dashboard
![Grafana Dashboard 1](docs/screenshots/grafana1.png)
![Grafana Dashboard 2](docs/screenshots/grafana2.png)

---

## Author

**Tanuja Gunjal** · [GitHub](https://github.com/TanujaGunjal)

---

