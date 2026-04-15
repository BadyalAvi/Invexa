<img width="1176" height="550" alt="WhatsApp Image 2026-04-15 at 21 16 54" src="https://github.com/user-attachments/assets/5b32fa8a-f3ad-4e75-a549-ee9506ca3276" /># 🚀 Invexa – Smart Inventory Management System  
### Smart Inventory

---

## 🌟 Overview

Invexa is a **real-time, AI-powered inventory management system** designed to streamline procurement, sales, and operational workflows for small and medium-sized businesses (SMEs).

Traditional inventory systems rely on spreadsheets and disconnected tools, leading to inefficiencies, stock mismatches, and poor decision-making. Invexa eliminates these challenges by providing a **centralized platform** that ensures real-time stock visibility, workflow automation, and improved operational efficiency.

---

## 🎯 Problem vs Solution

| Problem ❌ | Impact 🚨 | Invexa Solution ✅ |
|----------|----------|------------------|
| Manual tracking | High error rates | Automated inventory system |
| Stock mismatch | Inventory loss | Real-time stock updates |
| Disconnected tools | Data inconsistency | Unified platform |
| Poor visibility | Overstock / stockouts | Smart dashboard insights |
| No insights | Poor decisions | AI-powered analytics |

---

## 🔄 Core Workflow

```mermaid
flowchart LR
A[Add Product] --> B[Inventory Database]
B --> C[Create Order]
C --> D[Process Order]
D --> E[Dispatch Order]
E --> F[Stock Automatically Updated]
F --> G[Dashboard Reflects Changes]
```

---

## 📦 Features

### 🔹 Inventory Management
- Add, update, and manage products  
- Real-time stock tracking  
- Maintain accurate inventory levels  

### 🔹 Order Processing
- Create and manage sales orders  
- Track order lifecycle from creation to dispatch  
- Seamless integration with inventory  

### 🔹 Real-Time Stock Updates
- Automatic stock deduction upon dispatch  
- Prevents inconsistencies and stock mismatch  
- Ensures accurate inventory visibility  

### 🔹 Dashboard & Insights
- Real-time KPIs and metrics  
- Overview of inventory and order status  
- Enables quick decision-making  

### 🔹 Intelligence Layer (Conceptual)
- Analytics for performance tracking  
- NLP-based command system  
- AI assistant for smart recommendations  

### 🔹 Reporting & Monitoring
- Audit trails for system activity  
- Stock movement tracking  
- Exportable reports and alerts  

---

## 🏗️ System Architecture

```mermaid
flowchart TB
UI[Frontend - React.js] --> API[Backend - Node.js / Express]
API --> DB[PostgreSQL Database]
API --> Logic[Business Logic Layer]
Logic --> M1[Inventory Module]
Logic --> M2[Order Module]
Logic --> M3[Analytics Module]
Logic --> M4[Reporting Module]
```

---

## 🛠️ Technology Stack

### Frontend
- React.js (Component-based UI)
- Tailwind CSS (Responsive design)

### Backend
- Node.js (Runtime environment)
- Express.js (REST API framework)

### Database
- PostgreSQL (Relational database)

### Security
- JWT Authentication
- Role-Based Access Control (RBAC)

---

## ⚙️ How to Run

### 🔹 Prerequisites
- Node.js (v16+)  
- PostgreSQL  

---

### 🔹 Backend Setup
```
cd invexa-backend
npm install
npm run dev
```

Runs on: http://localhost:5000  

---

### 🔹 Frontend Setup
```
cd inventory-dashboard
npm install
npm run dev
```

Runs on: http://localhost:5173  

---

## 🔑 Demo Credentials

| Role  | Username  | Password     |
|------|----------|-------------|
| Admin | admin     | password123 |
| Sales | sales_rep | test123     |

---


## 📸 Screenshots

### 📊 Dashboard
![Dashboard](https://github.com/user-attachments/assets/2ae8e308-5893-4697-8779-18daf377eb5c)

### 📦 Inventory
![Inventory](https://github.com/user-attachments/assets/52ab750a-4dbd-4757-a940-e06303bf3307)

---
## 👥 Team

**Team Name:** Dhurandhar  

- Bhoomi Samnotra  
- Avichal Badyal  

---

## 💡 Vision & Impact

Invexa is designed as a **scalable and practical solution** that demonstrates how modern inventory systems can leverage real-time data, automation, and intelligent insights to improve business operations.
