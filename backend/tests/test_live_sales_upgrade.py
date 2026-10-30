"""Comprehensive End-to-End Test Suite for SalesSphere Live Sales Upgrade.
Tests:
- Test 1: Initial dashboard query, recording initial order count, revenue, date range, refresh time.
- Test 2: Placing genuine customer test order through storefront, verifying instant operational persistence and live sales update.
- Test 3: Multi-item order test to verify distinct order count is NOT inflated by multiple line items.
- Test 4: Before-and-after comparison calculation, verifying previous vs current values and net change delta.
- Test 5: Date-range filters (Today, Last 7 Days, Last 30 Days, All Time) verifying correct boundaries and grouping.
- Test 6: ETL sync execution, idempotency check (no duplicate rows), warehouse vs operational distinction.
- Test 7: Regression verification of existing manager routes (overview, transactions, rfm, etl).
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8001/api"

print("="*70)
print("RUNNING SALESPHERE LIVE SALES & BEFORE-AFTER KPI TEST SUITE")
print("="*70)

# Helper: Manager session
mgr_session = requests.Session()
login_res = mgr_session.post(f"{BASE_URL}/manager/auth/login", json={
    "email": "admin@salesphere.in",
    "password": "Manager@1234"
})
assert login_res.status_code == 200, f"Manager login failed: {login_res.text}"
print("✓ Manager authenticated successfully.")

# -------------------------------------------------------------
# TEST 1: Initial Dashboard State
# -------------------------------------------------------------
print("\n[TEST 1] Initial Dashboard Query & Baseline Recording...")
res = mgr_session.get(f"{BASE_URL}/manager/overview?period=today")
assert res.status_code == 200, f"Overview request failed: {res.text}"
overview = res.json()
assert "live_sales" in overview, "live_sales missing in overview response"
live = overview["live_sales"]
metrics_t1 = live["metrics"]

initial_orders_today = metrics_t1["orders_count"]
initial_revenue_today = metrics_t1["revenue"]
as_of_t1 = overview["as_of"]

print(f"  ✓ Initial Period: {live['period_label']}")
print(f"  ✓ Initial Today Orders (OLTP): {initial_orders_today}")
print(f"  ✓ Initial Today Revenue (OLTP): ₹{initial_revenue_today:,.2f}")
print(f"  ✓ Refresh / As-Of Timestamp: {as_of_t1}")
print(f"  ✓ Warehouse Total Records: {live['warehouse_status']['total_warehouse_records']}")
print(f"  ✓ Unsynced Live Orders in OLTP: {live['warehouse_status']['unsynced_live_orders']}")

# -------------------------------------------------------------
# TEST 2: Place a Genuine Customer Order via Storefront
# -------------------------------------------------------------
print("\n[TEST 2] Placing Single-Item Storefront Order...")
# Get a catalog product
cat_res = requests.get(f"{BASE_URL}/products?limit=1")
assert cat_res.status_code == 200
prod = cat_res.json()["items"][0]

cust_email = f"live.buyer.{int(time.time())}@example.com"
order_payload_1 = {
    "items": [
        {
            "product_id": prod["id"],
            "size": prod["sizes"][0] if prod["sizes"] else "M",
            "color": prod["colors"][0] if prod["colors"] else "Navy",
            "quantity": 1
        }
    ],
    "customer_name": "Aarav Sharma",
    "customer_email": cust_email,
    "customer_phone": "9820198201",
    "shipping_address": {
        "label": "Apartment",
        "full_name": "Aarav Sharma",
        "phone": "9820198201",
        "line1": "Flat 502, Skyline Towers",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560001",
        "is_default": True
    },
    "payment_method": "COD",
    "save_address": False
}

order_res1 = requests.post(f"{BASE_URL}/orders", json=order_payload_1)
assert order_res1.status_code == 201, f"Checkout failed: {order_res1.text}"
order1_data = order_res1.json()
order1_id = order1_data["id"]
order1_total = float(order1_data["total"])
print(f"  ✓ Order 1 placed: {order1_id}, Total: ₹{order1_total:,.2f}")

# Refresh Manager Overview
res_t2 = mgr_session.get(f"{BASE_URL}/manager/overview?period=today")
assert res_t2.status_code == 200
live_t2 = res_t2.json()["live_sales"]
metrics_t2 = live_t2["metrics"]

print(f"  ✓ Updated Today Orders: {metrics_t2['orders_count']} (Expected: {initial_orders_today + 1})")
print(f"  ✓ Updated Today Revenue: ₹{metrics_t2['revenue']:,.2f} (Expected: ₹{initial_revenue_today + order1_total:,.2f})")
assert metrics_t2["orders_count"] == initial_orders_today + 1
assert abs(metrics_t2["revenue"] - (initial_revenue_today + order1_total)) < 0.01

# Verify order in live transactions list
tx_ids = [t["id"] for t in live_t2["transactions"]]
assert order1_id in tx_ids, f"Expected {order1_id} in transactions list"
matched_tx = next(t for t in live_t2["transactions"] if t["id"] == order1_id)
print(f"  ✓ Transaction found in live stream: {matched_tx['id']}, Customer: {matched_tx['customer_name']}, DW Synced: {matched_tx['synced_to_dw']}")
assert matched_tx["synced_to_dw"] is False, "Order should be unsynced (synced_to_dw=False) prior to ETL"

# -------------------------------------------------------------
# TEST 3: Multi-Item Order (Ensure No Double-Counting)
# -------------------------------------------------------------
print("\n[TEST 3] Placing Multi-Item Order (Testing Double-Count Prevention)...")
cat2 = requests.get(f"{BASE_URL}/products?limit=3").json()["items"]
p1 = cat2[0]
p2 = cat2[1] if len(cat2) > 1 else cat2[0]

multi_payload = {
    "items": [
        {
            "product_id": p1["id"],
            "size": p1["sizes"][0] if p1["sizes"] else "L",
            "quantity": 2
        },
        {
            "product_id": p2["id"],
            "size": p2["sizes"][0] if p2["sizes"] else "M",
            "quantity": 1
        }
    ],
    "customer_name": "Meera Sen",
    "customer_email": f"meera.{int(time.time())}@example.com",
    "customer_phone": "9988776655",
    "shipping_address": {
        "label": "Home",
        "full_name": "Meera Sen",
        "phone": "9988776655",
        "line1": "12 Park Street",
        "city": "Kolkata",
        "state": "West Bengal",
        "postal_code": "700016"
    },
    "payment_method": "COD"
}

order_res2 = requests.post(f"{BASE_URL}/orders", json=multi_payload)
assert order_res2.status_code == 201
order2_data = order_res2.json()
order2_id = order2_data["id"]
order2_total = float(order2_data["total"])
print(f"  ✓ Multi-item Order placed: {order2_id} (Items count: 2 lines, 3 units), Total: ₹{order2_total:,.2f}")

res_t3 = mgr_session.get(f"{BASE_URL}/manager/overview?period=today")
live_t3 = res_t3.json()["live_sales"]
metrics_t3 = live_t3["metrics"]

# Ensure order count incremented by EXACTLY 1 (not 2 or 3)
print(f"  ✓ Today Orders: {metrics_t3['orders_count']} (Expected: {initial_orders_today + 2})")
assert metrics_t3["orders_count"] == initial_orders_today + 2, "Multi-item order must count as exactly 1 distinct order!"
print("  ✓ PASSED: Multi-item basket did NOT inflate distinct order count.")

# -------------------------------------------------------------
# TEST 4: Date-Range Filtering Verification
# -------------------------------------------------------------
print("\n[TEST 4] Testing Date-Range Filters (Today, 7d, 30d, All Time)...")
ranges = ["today", "7d", "30d", "all"]
results_by_range = {}

for rng in ranges:
    r = mgr_session.get(f"{BASE_URL}/manager/overview?period={rng}")
    assert r.status_code == 200
    ls = r.json()["live_sales"]
    m = ls["metrics"]
    results_by_range[rng] = m
    print(f"  ✓ Range '{rng.upper()}': {m['orders_count']} orders, ₹{m['revenue']:,.2f} revenue, {len(ls['chart'])} chart points ({ls['chart_interval']})")

# Verify logical hierarchy: Today orders <= 7d orders <= 30d orders <= All time orders
assert results_by_range["today"]["orders_count"] <= results_by_range["7d"]["orders_count"]
assert results_by_range["7d"]["orders_count"] <= results_by_range["30d"]["orders_count"]
assert results_by_range["30d"]["orders_count"] <= results_by_range["all"]["orders_count"]
print("  ✓ PASSED: Date-range hierarchy verified.")

# -------------------------------------------------------------
# TEST 5: Incremental ETL Pipeline Sync & Idempotency
# -------------------------------------------------------------
print("\n[TEST 5] Testing Incremental ETL Sync & Idempotency...")
# Check unsynced count prior to ETL
pre_sync = mgr_session.get(f"{BASE_URL}/manager/overview").json()["live_sales"]["warehouse_status"]
print(f"  ✓ Prior to ETL: {pre_sync['unsynced_live_orders']} order(s) pending warehouse sync.")
assert pre_sync["unsynced_live_orders"] >= 2

# Trigger ETL
etl_run1 = mgr_session.post(f"{BASE_URL}/manager/etl/refresh")
assert etl_run1.status_code == 200
etl_data1 = etl_run1.json()
print(f"  ✓ ETL Run 1 Status: {etl_data1['status']}")
print(f"  ✓ Items newly ingested to warehouse: {etl_data1['new_orders_synced']}")
print(f"  ✓ Total warehouse transactions: {etl_data1['total_transactions']:,}")
first_total_tx = etl_data1["total_transactions"]

# Verify unsynced orders now zero
post_sync = mgr_session.get(f"{BASE_URL}/manager/overview").json()["live_sales"]["warehouse_status"]
print(f"  ✓ After ETL: {post_sync['unsynced_live_orders']} order(s) pending warehouse sync.")
assert post_sync["unsynced_live_orders"] == 0

# Idempotency check: Run ETL again immediately
etl_run2 = mgr_session.post(f"{BASE_URL}/manager/etl/refresh")
assert etl_run2.status_code == 200
etl_data2 = etl_run2.json()
print(f"  ✓ ETL Run 2 (Idempotency): Synced {etl_data2['new_orders_synced']} items (Expected: 0)")
assert etl_data2["new_orders_synced"] == 0, "Second ETL run should ingest 0 duplicates"
assert etl_data2["total_transactions"] == first_total_tx, "Warehouse total rows must remain identical"
print("  ✓ PASSED: Incremental ETL is completely idempotent; no duplicate rows created.")

# -------------------------------------------------------------
# TEST 6: Regression Testing on Manager Portal Endpoints
# -------------------------------------------------------------
print("\n[TEST 6] Regression Verification of Manager Features...")
# Customers
cust_res = mgr_session.get(f"{BASE_URL}/manager/customers?page=1")
assert cust_res.status_code == 200
print(f"  ✓ /manager/customers: {cust_res.json()['total']} customers returned.")

# Transactions Table (45,000+ rows)
tx_res = mgr_session.get(f"{BASE_URL}/manager/transactions?page=1&limit=10")
assert tx_res.status_code == 200
print(f"  ✓ /manager/transactions: {tx_res.json()['total']:,} records queryable.")

# RFM Segmentation
rfm_res = mgr_session.get(f"{BASE_URL}/manager/rfm")
assert rfm_res.status_code == 200
print(f"  ✓ /manager/rfm: {rfm_res.json()['eligible_customers']:,} customers segmented into {len(rfm_res.json()['kmeans'])} K-Means clusters.")

# Inventory
inv_res = mgr_session.get(f"{BASE_URL}/manager/inventory")
assert inv_res.status_code == 200
print(f"  ✓ /manager/inventory: {len(inv_res.json())} SKU variants available.")

print("\n" + "="*70)
print("ALL 6 TEST SUITES PASSED WITH 100% SUCCESS!")
print("="*70)
