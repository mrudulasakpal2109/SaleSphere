# SalesSphere — E-Commerce Customer Intelligence & Segmentation System

### *College Data Warehousing & Data Mining (DWM) Project*
**Enterprise E-Commerce Storefront + Analytical Star Schema Data Warehouse + Customer RFM Segmentation + K-Means / Hierarchical Clustering + Interactive Sales Manager Portal**

> **Tagline:** *Bridging Live E-Commerce Transactions with Data Warehousing & Customer Intelligence*

---

## 📌 Executive Summary

**SalesSphere** is an end-to-end, enterprise-grade e-commerce system and analytical data warehouse built for online retail. It integrates a **modern React customer-facing storefront** with an **analytical Star Schema Data Warehouse**, an automated **ETL ingestion pipeline**, and an **executive Sales Manager Portal**.

The system addresses the fundamental DWM challenge of maintaining a strict separation between high-concurrency **Operational Processing (OLTP)** and complex **Analytical Processing (OLAP)** while providing near real-time business insights.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CUSTOMER STOREFRONT                                  │
│             React 19 + TypeScript + Vite + TailwindCSS (Port 3000)               │
│        Browse Catalog ➔ Cart ➔ Checkout ➔ Order History ➔ User Profile          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTP REST APIs
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI BACKEND                                     │
│                     Python 3.11+ ASGI Server (Port 8001)                         │
│   • Cookie Auth (ss_session / ss_manager_session) • PBKDF2-SHA256 Password Hash  │
│   • Catalog & Order Processing • Star Schema Query Engine • ML Analytics Engine  │
└───────────────────────┬──────────────────────────────────┬───────────────────────┘
                        │                                  │
      Writes live order │                                  │ Incremental ETL
      & session state   ▼                                  ▼ Ingestion (sync)
┌────────────────────────────────┐                ┌────────────────────────────────┐
│      OPERATIONAL DATABASE      │                │     ANALYTICAL DATA WAREHOUSE   │
│     (database/operational.db)  │                │    (database/ecommerce_dw.db)  │
│ ────────────────────────────── │                │ ────────────────────────────── │
│ • op_users (Customers)         │                │ • fact_transactions (45,000+)  │
│ • op_sessions (Customer Auth)  │                │ • dim_customer (5,000 records) │
│ • op_products (Catalog items)  │                │ • dim_product (60 products)    │
│ • op_orders (Live purchases)   │                │ • dim_product_variants (754)   │
│ • op_managers (Staff logins)   │                │ • dim_date (Calendar timeline) │
│ • op_addresses / op_events     │                │ • customer_rfm (Analytics)     │
└────────────────────────────────┘                │ • cluster_results (Clusters)   │
                                                  └────────────────┬───────────────┘
                                                                   │
                                                                   ▼
                                                  ┌────────────────────────────────┐
                                                  │    DATA MINING & CLUSTERING    │
                                                  │ ────────────────────────────── │
                                                  │ • RFM Metrics (Distinct Order  │
                                                  │   Count & Net Minus Refunds)   │
                                                  │ • Log1p + StandardScaler       │
                                                  │ • K-Means (K=4, Silhouette)    │
                                                  │ • Hierarchical Ward Linkage    │
                                                  │ • SVG Dendrogram Tree          │
                                                  │ • Actionable Persona Profiling │
                                                  └────────────────┬───────────────┘
                                                                   │
                        ┌──────────────────────────────────────────┴───────────────┐
                        ▼                                                          ▼
┌──────────────────────────────────────────────────┐    ┌──────────────────────────────────┐
│             SALES MANAGER PORTAL                 │    │     STREAMLIT VIVA DASHBOARD     │
│       React 19 Manager UI (Port 3000)            │    │     Python Streamlit (Port 8501) │
│ • Executive Overview & 30-Day Sales Trends       │    │ • College Viva Evaluation Mode   │
│ • Customer Segments Explorer & Dendrogram        │    │ • 3D RFM Cluster Visualizations  │
│ • 45,000+ Transactions Explorer + Filters + CSV │    │ • Elbow & Silhouette Curves      │
│ • Incremental ETL Sync & Star Schema Inspector   │    │ • Live CRUD Recalculation Engine │
└──────────────────────────────────────────────────┘    └──────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Storefront & Portal** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Canvas-Confetti |
| **Backend Web Server** | Python 3.11+, FastAPI, Uvicorn (ASGI), Pydantic v2 |
| **Operational Database (OLTP)** | SQLite with Write-Ahead Logging (WAL) (`database/operational.db`) |
| **Analytical Warehouse (OLAP)** | SQLite Star Schema (`database/ecommerce_dw.db`) |
| **Data Processing & ETL** | Pandas, NumPy |
| **Data Mining & Machine Learning** | Scikit-learn (`KMeans`, `AgglomerativeClustering`, `StandardScaler`, `PCA`), SciPy (`scipy.cluster.hierarchy`) |
| **Viva Interactive Dashboard** | Streamlit, Plotly Express & Plotly Graph Objects, Matplotlib |
| **Security & Authentication** | PBKDF2-HMAC-SHA256 password hashing, dual HTTP-only session cookies (`ss_session`, `ss_manager_session`) |

---

## 📊 Single Authoritative Transaction Dataset

All historical analysis, RFM segmentation, and clustering are anchored strictly to:
- **`data/salesphere_unified_dataset_v2.csv`** (45,000 transaction-item records)

### Key Metrics from Authoritative Dataset:
* **Total Transaction Records:** 45,000
* **Unique Customers:** 5,000 (`C-1001` through `C-6000`)
* **Gross Sales:** ₹71,118,822.93
* **Discounts Applied:** ₹7,958,660.82
* **Refunded Amount (Returned Items):** ₹8,261,404.70
* **Net Realized Revenue:** **₹54,898,757.41** across **29,185 completed sales** without double-counting.
* **Categories:** Women (₹28.4M), Men (₹21.0M), Kids (₹5.5M).
* **Return Distribution:** Completed (29,185), Returned (9,010), Cancelled (4,500), Exchanged (2,305).

> ⚠️ **Data Integrity Rule:** Legacy synthetic CSV files (`synthetic_online_retail_data.csv`, `retail_store_sales.csv`, etc.) are completely bypassed to prevent data duplication or skewed metrics.

---

## 🏢 Data Warehouse Architecture (Star Schema)

The analytical database (`database/ecommerce_dw.db`) is organized as a high-performance **Star Schema**:

```text
                             ┌─────────────────────────┐
                             │        dim_date         │
                             ├─────────────────────────┤
                             │ date (PK, TEXT)         │
                             │ day (INT), month (INT)  │
                             │ quarter (INT), yr (INT) │
                             └────────────┬────────────┘
                                          │
                                          ▼
┌─────────────────────────┐     ┌───────────────────────────────────┐     ┌─────────────────────────┐
│      dim_customer       │     │         fact_transactions         │     │       dim_product       │
├─────────────────────────┤     ├───────────────────────────────────┤     ├─────────────────────────┤
│ customer_id (PK, INT)   │◄────┼─ customer_id (FK, INT)            │────►│ product_id (PK, INT)    │
│ registration_date       │     │ order_date (FK, TEXT)             │     │ product_name (TEXT)     │
│ customer_type           │     │ product_id (FK, INT)              │     │ category (TEXT)         │
│ age, age_group, gender  │     │ order_id (TEXT)                   │     │ price, cost, margin     │
│ city, state, region     │     │ order_item_id (TEXT)              │     └────────────┬────────────┘
│ preferred_category      │     │ brand, product_category           │                  │
│ acquisition_channel     │     │ quantity (INT), unit_price (REAL) │                  ▼
│ loyalty_tier            │     │ gross_amount, discount_amount     │     ┌─────────────────────────┐
└─────────────────────────┘     │ net_sales, refund_amount          │     │  dim_product_variants   │
                                │ return_status, return_reason      │     ├─────────────────────────┤
                                │ payment_method, purchase_channel  │     │ variant_id (PK, INT)    │
                                │ product_rating, data_source       │     │ product_id (FK, INT)    │
                                └───────────────────────────────────┘     │ size, color, stock_qty  │
                                                                          └─────────────────────────┘
```

### Fact & Dimension Tables
1. **`fact_transactions` (Central Fact Table):** 45,000+ transaction rows. Indexed on `customer_id`, `order_id`, `order_date`, `product_id`, `return_status`, and `data_source`.
2. **`dim_customer` (Customer Dimension):** 5,000 customers with demographic attributes (age, age group, gender, city, state, region, loyalty tier).
3. **`dim_product` (Product Dimension):** 60 catalog products with pricing, wholesale cost, and margin.
4. **`dim_product_variants` (Variant Dimension):** 754 inventory variants (size, color, stock levels).
5. **`dim_date` (Date Dimension):** Calendar timeline breakdown (`day`, `month`, `quarter`, `year`).
6. **`customer_rfm` (Analytical Table):** Pre-aggregated customer RFM metrics, quantile scores (1–5), and segment labels.
7. **`cluster_results` (Mining Table):** Machine learning cluster assignments (`kmeans_cluster`, `hierarchical_cluster`, `pca1`, `pca2`).

---

## 🔬 Data Mining & Clustering Methodology

### 1. Customer-Level RFM Computation
To ensure statistical rigor, RFM features are computed with strict adherence to e-commerce reality:
- **Recency ($R$):** Days elapsed from customer's latest order to the reference date:
  $$R_i = \text{Date}_{\text{reference}} - \max(\text{OrderDate}_i)$$
- **Frequency ($F$):** Count of **distinct orders (`Order_ID`)**, preventing distortion from multi-item baskets:
  $$F_i = \text{Count}(\text{Distinct Order\_ID}_i)$$
- **Monetary ($M$):** Net realized spend **excluding refunds on returned items**:
  $$M_i = \sum \text{Net Sales}_i - \sum \text{Refund Amount}_i \quad (\text{where } \text{Return\_Status} = \text{'Returned'})$$

### 2. Feature Preprocessing
Because monetary spend and frequency follow heavy right-skewed power-law distributions:
1. **Log Transformation:** $x' = \log(1 + x)$ compresses extreme tail values.
2. **StandardScaler Normalization:** $z = \frac{x' - \mu}{\sigma}$ centers features at zero mean and unit variance.

### 3. K-Means Clustering ($K=4$)
- **Elbow Method:** Evaluates inertia across $K \in [2, 10]$ showing optimal inflection at $K=4$.
- **Silhouette Coefficient:** Measures cohesion and separation ($S = 0.30+$).
- **Dimensionality Reduction:** 2D Principal Component Analysis (PCA) preserves over 75% of variance for 2D visualization.

### 4. Hierarchical Agglomerative Clustering
- Computes pairwise Euclidean distances between customer feature vectors.
- Agglomerates clusters iteratively using **Ward's Minimum Variance Linkage**:
  $$\Delta \text{ESS}_{AB} = \frac{n_A n_B}{n_A + n_B} \|\bar{x}_A - \bar{x}_B\|^2$$
- Generates SVG tree coordinates exposed to the Sales Manager portal for interactive visual dendrogram inspection.

### 5. Identified Customer Personas & Business Action Plans

| Cluster | Persona | Customer Count | Avg Recency | Avg Frequency | Avg Spend | Recommended Strategy |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **0** | **VIP Champions** | ~1,600 | ~455 days | ~10.4 orders | ~₹20,660 | Dedicated relationship manager, early preview access, premium loyalty rewards. |
| **1** | **Recent Promising Buyers** | ~1,275 | ~368 days | ~6.2 orders | ~₹5,550 | Post-purchase follow-up series, bundle discount incentives, cross-category discovery. |
| **2** | **Potential Loyals** | ~1,480 | ~622 days | ~5.6 orders | ~₹9,470 | Reactivation email workflows, "We Miss You" vouchers, personalized category recommendations. |
| **3** | **Hibernating / Low Engagement** | ~640 | ~615 days | ~3.1 orders | ~₹1,130 | Aggressive clearance promotions, re-engagement surveys, zero-spend social retargeting. |

---

## ⚡ Quick Start & Execution Guide

### 1. Prerequisites
- **Python 3.10+** (verified on Python 3.11)
- **Node.js 18+** & **npm**

### 2. Setup Environment

```bash
# Clone or navigate to the repository
cd SaleSphere

# Install Python dependencies
pip install -r requirements.txt

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Initialize & Seed Databases (One-Time)

```bash
# Initialize operational database and seed 57 catalog products + demo credentials
python backend/seed.py

# Initialize Star Schema warehouse from 45,000-row authoritative CSV
python backend/warehouse.py
```

### 4. Run the Integrated System

Open two terminal windows:

#### Terminal 1 — FastAPI Backend (Port 8001):
```bash
python -m uvicorn backend.server:app --port 8001 --reload
```
*Backend API Docs: `http://localhost:8001/docs`*

#### Terminal 2 — React Storefront & Manager Portal (Port 3000):
```bash
cd frontend
npm run dev
```
*Frontend URL: `http://localhost:3000`*

#### Terminal 3 (Optional) — Streamlit Viva Evaluation Dashboard (Port 8501):
```bash
streamlit run dashboard/app.py
```
*Streamlit URL: `http://localhost:8501`*

---

## 🔑 System Accounts & Access Roles

| Role | Portal URL | Email | Password | Access Privileges & Isolation |
| :--- | :--- | :--- | :--- | :--- |
| **Store Manager (Admin)** | `http://localhost:3000/manager/login` | `admin@salesphere.in` | `Manager@1234` | **Exclusive Manager Access:** Total Revenue (~₹54.9M), Live Inventory Restocking, RFM K-Means ($K=2 \dots 10$), 45,000+ Transactions Explorer, ETL Sync |
| **Customer (Demo Shopper)** | `http://localhost:3000/login` | `demo@salesphere.in` | `Demo@1234` | **Isolated Customer Account:** Catalog browsing, Cart, Checkout, My Orders, Addresses, Wishlist. **Zero access to manager metrics.** |
| **New Customer Registration** | `http://localhost:3000/register` | *(Create any account)* | *(Your password)* | Strictly creates a customer account and redirects to `/account`. Deletes any manager session tokens to prevent privilege bleed. |

---

## 🧪 Automated End-to-End Test Suite

Run the automated integration test suite covering customer checkout, security protection, inventory restocking, dynamic RFM recalculation, transaction exploration, and incremental ETL:

```bash
python backend/tests/test_e2e_integration.py
```

### Test Suite Execution Output:
```text
============================================================
RUNNING SALESPHERE E2E INTEGRATION TEST SUITE
============================================================
[TEST 1]  ✓ Health & Catalog Endpoints (57 products, 45,000 historical rows)
[TEST 2]  ✓ Customer Registration & Session Verification (Strict Isolation)
[TEST 3]  ✓ Demo Order Checkout Flow
[TEST 4]  ✓ Customer Order History Retrieval
[TEST 5]  ✓ Manager API Security & Role Protection (HTTP 401 Unauthorized for customers)
[TEST 6]  ✓ Manager Login (admin@salesphere.in / Manager@1234)
[TEST 7]  ✓ Manager Overview Metrics (Net Revenue ~₹54.9M, 30-Day Trends)
[TEST 8]  ✓ Transaction Explorer (45,000+ rows, Server Pagination & Filter)
[TEST 9]  ✓ Incremental ETL Ingestion & Fact Table Sync
[TEST 10] ✓ Live Storefront Order Verification in fact_transactions (Data Source: Live Storefront)
[TEST 11] ✓ Recalculation of RFM Segmentation & K-Means (K=4) + Hierarchical Dendrogram
[TEST 12] ✓ Decision Tree Demand Prediction Engine (Accuracy Lift vs Baseline, Decision Path)
[TEST 13] ✓ Manager Product Launch Approval & Simultaneous Star Schema Insertion (dim_product)
[TEST 14] ✓ Manager Sign out & Protected Session Invalidation
============================================================
ALL 14 INTEGRATION TESTS PASSED WITH 100% SUCCESS!
============================================================
```

---

## 🎓 College Viva Demonstration Walkthrough (14 Steps)

Follow this exact sequence during your college project presentation to impress the external examiner:

1. **Step 1 — Project Overview & Architecture:** Explain the separation of concerns between OLTP (`database/operational.db`) and OLAP (`database/ecommerce_dw.db`).
2. **Step 2 — Authoritative Dataset:** Show `data/salesphere_unified_dataset_v2.csv` (45,000 rows) and explain that gross sales minus discounts and refunds yields realized net revenue (~₹54.9M).
3. **Step 3 — Customer Storefront Experience:** Open `http://localhost:3000`. Browse catalog categories (Men, Women, Kids), filter products, and add an item to the cart.
4. **Step 4 — Customer Account Creation & Isolation:** Register a new customer at `http://localhost:3000/register`. Show that it lands exclusively on `/account` (Profile, Orders, Addresses) with zero manager analytics or revenue metrics visible.
5. **Step 5 — Security & Manager Authentication:** Open `http://localhost:3000/manager/login`. Show that accessing `/manager` without manager credentials is blocked (HTTP 401). Log in with `admin@salesphere.in` / `Manager@1234`.
6. **Step 6 — Executive Sales KPIs:** On `/manager`, highlight Total Revenue (₹54.9M), Delivered Orders (29,185+), Average Order Value (~₹1,881), and the interactive 30-Day Daily Sales trend chart.
7. **Step 7 — Real-Time Inventory & Restocking:** Navigate to `/manager/inventory`. Show that all 754 variants start with 100 units. Demonstrate placing an order (stock decreases) and restocking inventory using the quick-add buttons (`+25`, `+50`, `+100`) or custom quantity input.
8. **Step 8 — Dynamic RFM K-Means Clustering ($K=2 \dots 10$):** Navigate to `/manager/segmentation`. Point out the dynamic cluster count buttons ($2, 3, 4, 5, 6, 7, 8, 9, 10$). Click $K=4$, then $K=5$, then $K=6$, showing instant recalculation.
9. **Step 9 — Interactive Click-to-Inspect Personas:** Click any cluster button or scatter point. Observe the detailed persona panel expand with exact RFM centroids, business strategy, and recommended targeted campaigns, while the customer table filters to show only that cluster's shoppers.
10. **Step 10 — Hierarchical Clustering & Dendrogram:** Scroll down to the interactive SVG Dendrogram. Explain Ward's Minimum Variance Linkage and how the hierarchical tree groups similar customer spending behaviors.
11. **Step 11 — 45,000+ Transactions Explorer:** Navigate to `/manager/transactions`. Demonstrate searching by customer ID, filtering by Category (Women/Men/Kids) or Return Status, and show server-side pagination across 45,000+ records.
12. **Step 12 — One-Click CSV Export:** Click **Export CSV** on `/manager/transactions` to download the entire warehouse fact dataset for external reporting.
13. **Step 13 — Incremental ETL Live Order Sync:** Navigate to `/manager/etl`. Show the Star Schema table counts. Click **Run Incremental ETL**. Show how customer orders are seamlessly ingested into `fact_transactions` with `data_source = 'Live Storefront'`.
14. **Step 14 — Streamlit Viva Dashboard (Optional):** Open `http://localhost:8501` to display 3D Plotly rotations and the Elbow/Silhouette mathematical curves.

---

## 📁 Repository Directory Structure

```text
SaleSphere/
│
├── backend/                                # FastAPI & Analytical Engine
│   ├── lib/
│   │   ├── db.py                           # SQLite operational database manager
│   │   ├── security.py                     # PBKDF2-HMAC-SHA256 password security
│   │   ├── auth.py                         # Customer session authentication
│   │   └── manager_auth.py                 # Protected manager session authentication
│   ├── routers/
│   │   ├── auth.py                         # Customer auth endpoints (/api/auth)
│   │   ├── products.py                     # Catalog browsing endpoints (/api/products)
│   │   ├── orders.py                       # Live order placement & history (/api/orders)
│   │   └── manager.py                      # Manager portal endpoints (/api/manager)
│   ├── tests/
│   │   └── test_e2e_integration.py         # 12-step automated integration test suite
│   ├── warehouse.py                        # Star Schema initialization, queries & ETL sync
│   ├── rfm.py                              # Customer RFM aggregation & quantile scoring
│   ├── clustering.py                       # K-Means, PCA, Hierarchical Ward & Dendrogram
│   ├── analytics.py                        # 30-day trends & category analytics
│   ├── recommendations.py                  # Persona profiling & marketing action plans
│   ├── pipeline.py                         # Unified recalculation pipeline
│   ├── seed.py                             # Operational seed data & demo accounts
│   └── server.py                           # FastAPI application entry point
│
├── frontend/                               # React 19 Emergent Storefront & Manager Portal
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                    # Storefront landing page & banners
│   │   │   ├── Catalog.tsx                 # Category browsing & search
│   │   │   ├── ProductDetail.tsx           # Product view & add to cart
│   │   │   ├── Cart.tsx                    # Shopping cart
│   │   │   ├── Checkout.tsx                # Address selection & payment
│   │   │   ├── Orders.tsx                  # Customer order history
│   │   │   ├── manager/
│   │   │   │   ├── ManagerLogin.tsx        # Protected manager login screen
│   │   │   │   ├── ManagerLayout.tsx       # Manager sidebar & header layout
│   │   │   │   ├── ManagerOverview.tsx     # Executive KPIs & 30-day trend chart
│   │   │   │   ├── ManagerInventory.tsx    # Live inventory (100 units initial) & stock replenishment
│   │   │   │   ├── ManagerSegmentation.tsx # Dynamic RFM K-Means (K=2..10) & Dendrogram viewer
│   │   │   │   ├── ManagerTransactions.tsx # 45,000+ Transactions Explorer + CSV export
│   │   │   │   ├── ManagerDemandPredictor.tsx # Decision Tree Demand Predictor & Launch Engine
│   │   │   │   └── ManagerEtl.tsx          # Star Schema & Incremental ETL Manager
│   │   ├── types/
│   │   │   └── manager.ts                  # TypeScript types for manager dashboard
│   │   ├── App.tsx                         # Client-side router configuration
│   │   └── main.tsx                        # React application bootstrap
│   ├── package.json                        # Dependencies (Vite, Tailwind, Recharts)
│   └── vite.config.ts                      # Vite configuration & /api proxy to 8001
│
├── dashboard/
│   └── app.py                              # Streamlit Viva Evaluation Dashboard
│
├── data/
│   ├── salesphere_unified_dataset_v2.csv   # Single Authoritative Dataset (45,000 rows)
│   ├── customers.csv                       # Customer dimension source
│   ├── products.csv                        # Product catalog dimension source
│   └── product_variants_inventory.csv      # Variant inventory dimension source
│
├── database/
│   ├── operational.db                      # SQLite OLTP Storefront Database
│   └── ecommerce_dw.db                     # SQLite OLAP Star Schema Data Warehouse
│
├── backup_original/                        # Complete pre-integration snapshot
├── outputs/                                # Exported warehouse CSV reports
├── requirements.txt                        # Python dependencies
├── .env.example                            # Configuration environment template
└── README.md                               # Comprehensive Project & Viva Guide
```

---

## 📜 Academic Integrity & License

This project is created for academic and college demonstration purposes under the Data Warehousing and Mining (DWM) curriculum. All code and analytical pipelines are reproducible and self-contained.
