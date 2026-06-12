# 🏛️ Smart Asset Management Platform (SAMP)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/framework-Express_4.19.2-purple.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

An enterprise-grade, high-performance web application designed for the **IIT Roorkee Cultural Council (Shared Resource Workspace)**. This platform orchestrates the cataloging, real-time calendar allocation, automated inventory balancing, and secure physical checkout/return lifecycle of high-value cultural assets (media equipment, audio systems, stage props, and lighting grids) across multiple campus sections and clubs.

---

## 📑 Table of Contents
1. [System Architecture & Data Flow](#-system-architecture--data-flow)
2. [Core Functional Modules](#-core-functional-modules)
3. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
4. [Deep Dive: Micro-Transaction Storage Engine](#-deep-dive-micro-transaction-storage-engine)
5. [Complete API Endpoints Catalog](#-complete-api-endpoints-catalog)
6. [Tech Stack & Prerequisites](#-tech-stack--prerequisites)
7. [Installation & Local Deployment](#-installation--local-deployment)
8. [Frontend Design & Interactive Capabilities](#-frontend-design--interactive-capabilities)
9. [Production Hardening Checklist](#-production-hardening-checklist)
10. [License](#-license)

---

## 🏗️ System Architecture & Data Flow

SAMP utilizes a decoupled **Monolithic Architecture** combining an Express.js RESTful API backend with a high-performance, single-page reactive HTML5 application. 

```text
                                  +------------------------------------------+
                                  |         Vanilla HTML5/CSS3/JS UI         |
                                  |  (Chart.js, Html5-QRCode, FontAwesome)   |
                                  +---------------------+--------------------+
                                                        |
                                            HTTPS REST Operations / JSON
                                                        v
                                  +---------------------+--------------------+
                                  |          Express.js Engine               |
                                  |           (Port Line: 2026)              |
                                  +--+------------------+-----------------+--+
                                     |                  |                 |
                                     v                  v                 v
                              [/api/auth]         [/api/assets]     [/api/bookings]
                                     |                  |                 |
                                     +------------------+-----------------+
                                                        |
                                           Internal Middleware Pipeline
                                        (JWT Authorization & RBAC Evaluator)
                                                        |
                                                        v
                                  +---------------------+--------------------+
                                  |     JavaScript Memory Proxy Layer        |
                                  |    (Interceptors for Array Mutations)    |
                                  +---------------------+--------------------+
                                                        |
                                              Instant Sync Hooks
                                                        v
                                  +---------------------+--------------------+
                                  |      Flat JSON Storage File Ledger       |
                                  |            (`db_store.json`)             |
                                  +------------------------------------------+