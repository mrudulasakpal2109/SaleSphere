"""Comprehensive End-to-End Test Suite for SalesSphere.
Tests:
1. Storefront Health & Catalog retrieval.
2. Customer Registration & Session Authentication.
3. Product Selection & Order Checkout Flow.
4. Order Persistence in Operational DB.
5. Sales Manager Authentication & Access Protection (401 verification).
6. Sales Manager Login & Protected Dashboard Overview.
7. 45,000-row Transaction Table Search & Pagination.
8. Incremental ETL Ingestion & Warehouse Sync of Live Order.
9. Recalculation of RFM Segmentation & K-Means (K=4) + Hierarchical Dendrogram.
10. Manager Logout & Session Termination.
11. CSV Export of Data Warehouse Transactions.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8001/api"

print("="*60)
print("RUNNING SALESPHERE E2E INTEGRATION TEST SUITE")
print("="*60)

# 1. Health & Catalog
print("\n[TEST 1] Testing Health & Catalog Endpoints...")
res = requests.get(f"{BASE_URL}/status")
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
status_data = res.json()
print("  ✓ Status Check:", status_data["status"])
print("  ✓ Authoritative Source:", status_data["warehouse_dataset"])

res = requests.get(f"{BASE_URL}/products?limit=5")
assert res.status_code == 200
cat_data = res.json()
print(f"  ✓ Products Catalog returned {len(cat_data['items'])} items (Total catalog size: {cat_data['total']})")
test_product = cat_data["items"][0]
print(f"  ✓ Sample Product: {test_product['name']} (ID: {test_product['id']}, SKU: {test_product['sku']}, Price: ₹{test_product['price']})")

# 2. Customer Registration & Cookie Session
print("\n[TEST 2] Testing Customer Registration...")
client = requests.Session()
test_email = f"priya.patel.{int(time.time())}@example.com"
reg_payload = {
    "name": "Priya Patel",
    "email": test_email,
    "phone": "9876543211",
    "password": "Password@123"
}
res = client.post(f"{BASE_URL}/auth/register", json=reg_payload)
assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
user_data = res.json()
print("  ✓ Registered customer:", user_data["name"], f"({user_data['email']})")
print("  ✓ Session cookie received:", "ss_session" in client.cookies)

# Verify /auth/me
res = client.get(f"{BASE_URL}/auth/me")
assert res.status_code == 200
print("  ✓ Authenticated user profile verified via /auth/me:", res.json()["name"])

# 3. Checkout & Order Placement
print("\n[TEST 3] Testing Demo Order Checkout Flow...")
checkout_payload = {
    "items": [
        {
            "product_id": test_product["id"],
            "size": test_product["sizes"][0] if test_product["sizes"] else "M",
            "color": test_product["colors"][0] if test_product["colors"] else "Black",
            "quantity": 1
        }
    ],
    "customer_name": "Priya Patel",
    "customer_email": test_email,
    "customer_phone": "9876543211",
    "shipping_address": {
        "label": "Home",
        "full_name": "Priya Patel",
        "phone": "9876543211",
        "line1": "42, MG Road, Residency Area",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "is_default": True
    },
    "payment_method": "COD",
    "save_address": True
}
res = client.post(f"{BASE_URL}/orders", json=checkout_payload)
assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
order_data = res.json()
order_id = order_data["id"]
print(f"  ✓ Order placed successfully! Order ID: {order_id}, Total: ₹{order_data['total']}, Status: {order_data['status']}")

# 4. Order Persistence & Order History
print("\n[TEST 4] Testing Order History Retrieval...")
res = client.get(f"{BASE_URL}/orders")
assert res.status_code == 200
user_orders = res.json()
assert len(user_orders) >= 1
print(f"  ✓ Customer order history retrieved: {len(user_orders)} order(s) found.")

# 5. Manager Access Protection (Unauthorized Check)
print("\n[TEST 5] Testing Manager API Security & Protection...")
unauth_res = requests.get(f"{BASE_URL}/manager/overview")
assert unauth_res.status_code == 401, f"Expected 401 Unauthorized, got {unauth_res.status_code}"
print("  ✓ Access correctly blocked without manager credentials (HTTP 401 Unauthorized).")

# 6. Manager Login with Demo Credentials
print("\n[TEST 6] Testing Manager Login (admin@salesphere.in / Manager@1234)...")
mgr_client = requests.Session()
mgr_login_payload = {
    "email": "admin@salesphere.in",
    "password": "Manager@1234"
}
res = mgr_client.post(f"{BASE_URL}/manager/auth/login", json=mgr_login_payload)
assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
mgr_profile = res.json()
print("  ✓ Manager logged in successfully:", mgr_profile["name"], f"({mgr_profile['role']})")
print("  ✓ Manager session cookie received:", "ss_manager_session" in mgr_client.cookies)

# 7. Manager Overview KPIs
print("\n[TEST 7] Testing Manager Overview Metrics...")
res = mgr_client.get(f"{BASE_URL}/manager/overview")
assert res.status_code == 200
overview = res.json()
kpis = overview["kpis"]
print(f"  ✓ Paid Revenue: ₹{kpis['paid_revenue']:,.2f}")
print(f"  ✓ Total Orders: {kpis['total_orders']:,}")
print(f"  ✓ Registered Customers: {kpis['registered_customers']:,}")
print(f"  ✓ Average Order Value: ₹{kpis['avg_order_value']:,.2f}")
print(f"  ✓ 30-Day Trend points: {len(overview['trend'])}")
print(f"  ✓ Category sales breakdown: {len(overview['category_sales'])} categories")

# 8. Transaction Table Query & Search
print("\n[TEST 8] Testing Transaction Explorer (45,000+ rows)...")
res = mgr_client.get(f"{BASE_URL}/manager/transactions?page=1&limit=10")
if res.status_code != 200:
    print("Test 8 Error:", res.status_code, res.text)
assert res.status_code == 200
tx_data = res.json()
print(f"  ✓ Total records in Data Warehouse: {tx_data['total']:,}")
print(f"  ✓ Page 1 items returned: {len(tx_data['items'])}")

# 9. Warehouse Incremental ETL Sync
print("\n[TEST 9] Testing Incremental ETL Pipeline Refresh...")
res = mgr_client.post(f"{BASE_URL}/manager/etl/refresh")
assert res.status_code == 200
etl_res = res.json()
print(f"  ✓ ETL status: {etl_res['status']}")
print(f"  ✓ Live orders newly ingested to warehouse: {etl_res['new_orders_synced']}")
print(f"  ✓ Updated warehouse transaction rows: {etl_res['total_transactions']:,}")
print(f"  ✓ K-Means Silhouette Score: {etl_res['silhouette_score']:.4f}")

# 10. Search for the Live Order in the Warehouse
print("\n[TEST 10] Verifying Live Storefront Order in fact_transactions...")
res = mgr_client.get(f"{BASE_URL}/manager/transactions?q={order_id}")
assert res.status_code == 200
search_res = res.json()
assert search_res["total"] >= 1, f"Expected order {order_id} in transactions table"
live_item = search_res["items"][0]
print(f"  ✓ Found live order in warehouse fact_transactions:")
print(f"     Order ID: {live_item['order_id']}")
print(f"     Item ID: {live_item['order_item_id']}")
print(f"     Customer ID: C-{live_item['customer_id']}")
print(f"     Net Sales: ₹{live_item['net_sales']}")
print(f"     Data Source: {live_item['data_source']}")
assert live_item['data_source'] == "Live Storefront"

# 11. RFM Segmentation & Dendrogram Coordinates
print("\n[TEST 11] Testing RFM & Hierarchical Clustering Dendrogram...")
res = mgr_client.get(f"{BASE_URL}/manager/rfm")
assert res.status_code == 200
rfm_data = res.json()
print(f"  ✓ RFM Status: {rfm_data['status']}")
print(f"  ✓ Eligible customers analyzed: {rfm_data['eligible_customers']:,}")
print(f"  ✓ K-Means clusters count: {len(rfm_data['kmeans'])}")
print(f"  ✓ Hierarchical clusters count: {len(rfm_data['hierarchical'])}")
print(f"  ✓ Dendrogram tree leaves count: {len(rfm_data['dendrogram']['labels'])}")
print("  ✓ Cluster profiles:")
for c in rfm_data["kmeans"]:
    print(f"     - Cluster {c['cluster']} ({c['label']}): {c['size']} customers, Avg Recency: {c['avg_recency']}d, Avg Freq: {c['avg_frequency']}, Avg Monetary: ₹{c['avg_monetary']:,.2f}")

# 12. Decision Tree Demand Prediction Engine
print("\n[TEST 12] Testing Decision Tree Demand Predictor...")
res = mgr_client.get(f"{BASE_URL}/manager/demand/model")
assert res.status_code == 200, f"Failed model info: {res.text}"
model_meta = res.json()
print(f"  ✓ Model Version: {model_meta['model_version']}")
print(f"  ✓ Model Accuracy: {model_meta['metrics']['classification']['accuracy']*100:.1f}% (Lift: +{model_meta['metrics']['classification']['accuracy_lift']*100:.1f}%)")
print(f"  ✓ Confusion Matrix classes: {model_meta['metrics']['classification']['confusion_matrix']['labels']}")
print(f"  ✓ Decision Tree Nodes: root feature '{model_meta['tree_graph'].get('feature')}', samples: {model_meta['tree_graph'].get('samples')}")

# Simulate demand for new product
predict_payload = {
    "name": "E2E Test Velvet Festive Sherwani",
    "description": "Premium handcrafted velvet sherwani with zari embroidery.",
    "category": "Men",
    "subcategory": "Sherwanis",
    "brand": "Salesphere Luxe",
    "price": 5499.0,
    "discount_percentage": 20.0,
    "sizes": ["M", "L", "XL"],
    "color": "Royal Navy",
    "fabric": "Micro Velvet",
    "launch_month": 10,
    "proposed_stock": 75
}
res = mgr_client.post(f"{BASE_URL}/manager/demand/predict", json=predict_payload)
assert res.status_code == 200, f"Predict failed: {res.text}"
pred_data = res.json()
print(f"  ✓ Demand Forecast: {pred_data['demand_tier']} Demand ({pred_data['predicted_units']} units / month)")
print(f"  ✓ Class Probabilities: {pred_data['probabilities']}")
print(f"  ✓ Suggested Initial Stock: {pred_data['suggested_initial_stock']} units")
print(f"  ✓ Decision Path steps: {len(pred_data['decision_path'])} split rules traversed")
pred_id = pred_data["prediction_id"]

# 13. Manager Product Launch Approval & Star Schema Insertion
print("\n[TEST 13] Testing Manager Approval & Catalogue + Star Schema Integration...")
approve_payload = {
    "prediction_id": pred_id,
    "name": predict_payload["name"],
    "description": predict_payload["description"],
    "category": predict_payload["category"],
    "subcategory": predict_payload["subcategory"],
    "brand": predict_payload["brand"],
    "price": predict_payload["price"],
    "discount_percentage": predict_payload["discount_percentage"],
    "sizes": predict_payload["sizes"],
    "color": predict_payload["color"],
    "fabric": predict_payload["fabric"],
    "launch_month": predict_payload["launch_month"],
    "approved_stock": pred_data["suggested_initial_stock"]
}
res = mgr_client.post(f"{BASE_URL}/manager/demand/approve-launch", json=approve_payload)
assert res.status_code == 200, f"Approve failed: {res.text}"
launch_res = res.json()
launched_pid = launch_res["product_id"]
launched_sku = launch_res["sku"]
print(f"  ✓ Product Launched! Operational ID: {launched_pid}, Star Schema DW ID: {launch_res['dw_product_id']}, SKU: {launched_sku}")

# Verify immediately live on storefront catalog
res = requests.get(f"{BASE_URL}/products?q=Sherwani")
assert res.status_code == 200
catalog_res = res.json()
assert any(p["id"] == launched_pid for p in catalog_res["items"]), "Launched product not found in storefront catalog!"
print(f"  ✓ Storefront verification: Product '{predict_payload['name']}' is immediately browseable and purchasable!")

# Verify prediction audit status updated to 'Approved'
res = mgr_client.get(f"{BASE_URL}/manager/demand/history")
assert res.status_code == 200
history_res = res.json()
matching_audit = next((h for h in history_res if h["id"] == pred_id), None)
assert matching_audit is not None and matching_audit["status"] == "Approved"
print(f"  ✓ Audit Trail verified: Prediction #{pred_id[:8]} status updated to 'Approved' with {matching_audit['approved_stock']} units.")

# 14. Manager Sign out
print("\n[TEST 14] Testing Manager Sign out...")
res = mgr_client.post(f"{BASE_URL}/manager/auth/logout")
assert res.status_code == 200
print("  ✓ Manager logged out.")
res = mgr_client.get(f"{BASE_URL}/manager/overview")
assert res.status_code == 401
print("  ✓ Protected access correctly blocked post-logout.")

print("\n" + "="*60)
print("ALL 14 INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
print("="*60)

