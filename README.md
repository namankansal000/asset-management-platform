# 🏛️ Smart Asset Management Platform (SAMP)

A web-based asset management system developed for the **IIT Roorkee Cultural Council** to streamline the reservation, allocation, issuance, and return of shared cultural resources such as media equipment, lighting systems, audio devices, and stage props.

The platform enables clubs and students to efficiently request assets while providing administrators with tools for inventory management, approval workflows, and analytics.

---

## ✨ Features

### Student / Club Portal

* Browse available assets by category.
* Check asset availability before booking.
* Submit reservation requests.
* View booking history and current reservations.
* Receive updates on booking status.

### Administrator Portal

* Add, update, archive, and manage assets.
* Review and approve/reject booking requests.
* Issue assets during pickup.
* Process asset returns.
* Monitor active loans and overdue items.
* Access analytics dashboards.

### Faculty Advisor Portal

* Review pending administrator requests.
* Approve or reject administrator access.

---

## 🛠 Tech Stack

### Backend

* **Node.js**
* **Express.js**
* **JSON Web Tokens (JWT)** for authentication
* **bcryptjs** for password hashing

### Frontend

* **HTML5**
* **CSS3**

### Additional Libraries

* **Chart.js** – analytics visualizations
* **Html5-QRCode** – QR code scanning functionality
* **Font Awesome** – icons

### Data Storage

* JSON-based local storage using `db_store.json`.

---

## 🏗 System Architecture

```text
Frontend (HTML/CSS/JavaScript)
            │
            ▼
     Express REST API
            │
            ▼
 Authentication & RBAC
            │
            ▼
   Business Logic Layer
            │
            ▼
   JSON File Persistence
```

---

## 👥 User Roles

| Feature                | Student / Club | Admin | Faculty Advisor |
| ---------------------- | -------------- | ----- | --------------- |
| View Assets            | ✅              | ✅     | ❌               |
| Check Availability     | ✅              | ✅     | ❌               |
| Request Bookings       | ✅              | ❌     | ❌               |
| View Own Bookings      | ✅              | ❌     | ❌               |
| Manage Assets          | ❌              | ✅     | ❌               |
| Approve Bookings       | ❌              | ✅     | ❌               |
| Issue/Return Assets    | ❌              | ✅     | ❌               |
| Approve Admin Requests | ❌              | ❌     | ✅               |
| View Analytics         | ❌              | ✅     | ❌               |

---

## 📦 Key Modules

### Asset Management

* Maintain inventory records.
* Track available quantities.
* Archive unused assets.

### Booking System

* Submit booking requests.
* Prevent over-allocation of resources.
* Manage approval workflows.

### QR-Based Verification

* Generate QR codes for quick verification during pickup and return processes.

### Analytics Dashboard

* Monitor asset utilization.
* Track active reservations.
* Identify overdue returns.

---

## 📁 Project Structure

```text
.
├── server.js
├── db.js
├── db_store.json
├── package.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or later)
* npm

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd <repository-folder>
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
node server.js
```

The application will run at:

```text
http://localhost:2026
```

---

## 🔐 Security Features

* Password hashing using bcrypt.
* JWT-based authentication.
* Role-Based Access Control (RBAC).
* Booking validation to prevent double allocation.

---

## 👨‍💻 Developed For

**IIT Roorkee Cultural Council**

Designed to improve the management and utilization of shared cultural assets across campus organizations.
