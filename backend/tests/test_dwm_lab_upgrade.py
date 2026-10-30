"""Automated Test Suite for SalesSphere Data Mining Lab & Warehouse Explorer Upgrade.
Verifies all Module A (Data Mining Lab) and Module B (Warehouse Explorer) requirements.
"""

import sys
import os
import requests
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8001"
ADMIN_EMAIL = "admin@salesphere.in"
ADMIN_PASS = "Manager@1234"

def run_tests():
    print("=" * 70)
    print("RUNNING SALESPHERE DATA MINING LAB & WAREHOUSE EXPLORER TEST SUITE")
    print("=" * 70)

    # 1. Authenticate Manager Session
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/api/manager/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert login_res.status_code == 200, f"Manager login failed: {login_res.status_code}"
    print("✓ Manager authenticated successfully.")

    # -------------------------------------------------------------------------
    # MODULE A: INTERACTIVE DATA MINING LAB TESTS
    # -------------------------------------------------------------------------
    print("\n--- [MODULE A] Interactive Data Mining Lab ---")

    # TEST 1: K-Means K-Selection (K=2, K=4, K=7)
    print("\n[TEST 1] Testing Dynamic K-Means Clustering across K values...")
    for k_val in [2, 4, 7]:
        res = session.get(f"{BASE_URL}/api/manager/rfm?k={k_val}")
        assert res.status_code == 200, f"RFM failed for K={k_val}: {res.status_code}"
        rfm_data = res.json()
        assert rfm_data["k_selected"] == k_val, f"Expected k_selected={k_val}, got {rfm_data['k_selected']}"
        assert len(rfm_data["kmeans"]) == k_val, f"Expected {k_val} clusters, got {len(rfm_data['kmeans'])}"
        print(f"  ✓ K={k_val}: Returned {len(rfm_data['kmeans'])} clusters, silhouette: {rfm_data['silhouette']:.4f}")

    # TEST 2: Evaluation Curve (K=2..10)
    print("\n[TEST 2] Verifying KMeans Evaluation Curves (Elbow Inertia & Silhouette)...")
    res_k4 = session.get(f"{BASE_URL}/api/manager/rfm?k=4")
    data_k4 = res_k4.json()
    evals = data_k4.get("evaluations", [])
    assert len(evals) == 9, f"Expected 9 evaluation points (K=2..10), got {len(evals)}"
    k_keys = [e["k"] for e in evals]
    assert k_keys == list(range(2, 11)), f"Expected K=2..10, got {k_keys}"
    # Verify inertia is monotonically decreasing
    inertias = [e["inertia"] for e in evals]
    assert all(x > y for x, y in zip(inertias, inertias[1:])), f"Inertia must be monotonically decreasing: {inertias}"
    print(f"  ✓ Evaluations present for all K=2..10. Inertia strictly drops from {inertias[0]:,.1f} down to {inertias[-1]:,.1f}.")

    # TEST 3: Optimal K Explanation
    print("\n[TEST 3] Verifying Academic Rationale for Optimal K=4...")
    opt_exp = data_k4.get("optimal_k_explanation")
    assert opt_exp and "Elbow" in opt_exp and "K=4" in opt_exp, "Optimal K explanation missing or incomplete."
    print("  ✓ Optimal K explanation verified.")

    # TEST 4: Cluster Centroids, Medians, and Scaled Coordinates
    print("\n[TEST 4] Verifying Scaled Centroids (z_R, z_F, z_M) & Medians...")
    centroids = data_k4.get("centroids", [])
    assert len(centroids) == 4, f"Expected 4 centroids, got {len(centroids)}"
    for c in centroids:
        assert c["avg_recency"] is not None and c["avg_recency"] > 0
        assert c["avg_frequency"] is not None and c["avg_frequency"] > 0
        assert c["avg_monetary"] is not None and c["avg_monetary"] > 0
        assert c["median_recency"] is not None
        assert c["median_frequency"] is not None
        assert c["median_monetary"] is not None
        assert c["recency_scaled"] is not None
        assert c["frequency_scaled"] is not None
        assert c["monetary_scaled"] is not None
        print(f"  ✓ Cluster {c['cluster']} ({c['label']}): Avg Recency={c['avg_recency']}d (Med: {c['median_recency']}d), "
              f"Scaled z=({c['recency_scaled']}, {c['frequency_scaled']}, {c['monetary_scaled']})")

    # TEST 5: Dendrogram Data Structure
    print("\n[TEST 5] Verifying Hierarchical Dendrogram Data...")
    dendro = data_k4.get("dendrogram")
    assert dendro and "icoord" in dendro and "dcoord" in dendro and "labels" in dendro
    assert len(dendro["icoord"]) > 0 and len(dendro["labels"]) > 0
    print(f"  ✓ Hierarchical Dendrogram tree contains {len(dendro['icoord'])} coordinate branches.")

    # -------------------------------------------------------------------------
    # MODULE B: DATA WAREHOUSE EXPLORER & ETL AUDIT TESTS
    # -------------------------------------------------------------------------
    print("\n--- [MODULE B] Data Warehouse Explorer & ETL Audit ---")

    # TEST 6: Warehouse Schema Inspection
    print("\n[TEST 6] Inspecting Warehouse Schema & Tables...")
    schema_res = session.get(f"{BASE_URL}/api/manager/warehouse/schema")
    assert schema_res.status_code == 200, f"Schema endpoint failed: {schema_res.status_code}"
    schema = schema_res.json()
    assert len(schema["tables"]) == 9, f"Expected 9 warehouse tables, got {len(schema['tables'])}"
    table_names = [t["table_name"] for t in schema["tables"]]
    expected_tables = [
        "fact_transactions", "dim_customer", "dim_product", "dim_product_variants",
        "dim_date", "customer_rfm", "cluster_results", "dw_sync_log", "dw_etl_audit"
    ]
    for exp in expected_tables:
        assert exp in table_names, f"Expected table '{exp}' in warehouse schema"
    print(f"  ✓ All 9 warehouse tables verified. Total DW Records: {schema['total_records']:,}")

    # TEST 7: Table Data Pagination & Live Inspection
    print("\n[TEST 7] Testing Table Data Pagination (fact_transactions & dim_product)...")
    tx_page1 = session.get(f"{BASE_URL}/api/manager/warehouse/table-data?table=fact_transactions&page=1&limit=10").json()
    assert tx_page1["total_rows"] >= 45000, f"Expected >= 45,000 transactions, got {tx_page1['total_rows']}"
    assert len(tx_page1["rows"]) == 10
    assert "net_sales" in tx_page1["columns"] and "customer_id" in tx_page1["columns"]
    print(f"  ✓ fact_transactions: {tx_page1['total_rows']:,} total rows queryable. First page returned 10 items.")

    prod_page1 = session.get(f"{BASE_URL}/api/manager/warehouse/table-data?table=dim_product&page=1&limit=5").json()
    assert len(prod_page1["rows"]) == 5
    assert "product_name" in prod_page1["columns"]
    print(f"  ✓ dim_product: {prod_page1['total_rows']} total products. Live records inspected.")

    # TEST 8: Reject Unauthorized Tables
    print("\n[TEST 8] Security Verification: Whitelisted Tables Enforcement...")
    bad_table_res = session.get(f"{BASE_URL}/api/manager/warehouse/table-data?table=users_passwords&page=1&limit=5")
    assert bad_table_res.status_code == 400, "Unauthorized table access must be rejected."
    print("  ✓ PASSED: Non-warehouse tables correctly rejected with HTTP 400.")

    # TEST 9: OLTP vs OLAP Database Comparison Matrix
    print("\n[TEST 9] Verifying OLTP vs OLAP Deep Architectural Comparison...")
    comp_res = session.get(f"{BASE_URL}/api/manager/warehouse/database-comparison")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["features"]) == 8, f"Expected 8 architectural comparison dimensions, got {len(comp_data['features'])}"
    print(f"  ✓ 8 architectural comparison dimensions verified.")

    # TEST 10: Data Quality & Referential Integrity Checks
    print("\n[TEST 10] Running Live Data Quality & Integrity Suite...")
    dq_res = session.get(f"{BASE_URL}/api/manager/warehouse/data-quality")
    assert dq_res.status_code == 200
    dq_data = dq_res.json()
    assert dq_data["overall_status"] == "PASS", f"Expected overall_status=PASS, got {dq_data['overall_status']}"
    assert dq_data["checks_passed"] == 6, f"Expected 6 passed checks, got {dq_data['checks_passed']}"
    for chk in dq_data["checks"]:
        assert chk["status"] == "PASS", f"Check {chk['id']} failed: {chk['details']}"
        assert chk["violations_count"] == 0, f"Check {chk['id']} has violations: {chk['violations_count']}"
    print(f"  ✓ 100% Data Quality Success: 6/6 checks passed with 0 violations.")

    # TEST 11: Before-and-After Transformation Inspector
    print("\n[TEST 11] Verifying Transformation Preview & Mathematical Formulas...")
    tx_prev = session.get(f"{BASE_URL}/api/manager/warehouse/transformation-preview").json()
    assert len(tx_prev["rules_explained"]) == 5
    assert len(tx_prev["sample_items"]) > 0
    sample = tx_prev["sample_items"][0]
    assert "source_fields" in sample and "transformed_dw_row" in sample
    dw_row = sample["transformed_dw_row"]
    # Check math: net_sales == round(gross_amount - discount_amount, 2)
    assert abs(dw_row["net_sales"] - (dw_row["gross_amount"] - dw_row["discount_amount"])) <= 0.05
    print(f"  ✓ Mathematical equation verified: Net Sales (₹{dw_row['net_sales']}) = Gross (₹{dw_row['gross_amount']}) - Discount (₹{dw_row['discount_amount']}).")

    # TEST 12: End-to-End Data Lineage
    print("\n[TEST 12] Verifying End-to-End Data Lineage Graph...")
    lineage = session.get(f"{BASE_URL}/api/manager/warehouse/data-lineage").json()
    assert len(lineage["nodes"]) == 12, f"Expected 12 lineage nodes, got {len(lineage['nodes'])}"
    assert len(lineage["edges"]) > 0
    assert len(lineage["pipeline_stages"]) == 6
    print(f"  ✓ Lineage verified: 12 nodes, {len(lineage['edges'])} edges, 6 pipeline stages.")

    # TEST 13: Incremental ETL Execution & Audit Logging
    print("\n[TEST 13] Executing Incremental ETL Refresh & Verifying Audit Log...")
    etl_res = session.post(f"{BASE_URL}/api/manager/etl/refresh", json={})
    assert etl_res.status_code == 200
    etl_info = etl_res.json()
    assert etl_info["status"] == "success"
    assert etl_info["run_id"] is not None
    assert etl_info["duration_ms"] > 0
    print(f"  ✓ ETL Refresh completed: Run ID {etl_info['run_id']} in {etl_info['duration_ms']:.1f} ms.")

    audit_res = session.get(f"{BASE_URL}/api/manager/warehouse/etl-audit?limit=5")
    assert audit_res.status_code == 200
    audits = audit_res.json()
    assert audits["total_runs"] > 0
    latest_run = audits["runs"][0]
    assert latest_run["run_id"] == etl_info["run_id"]
    print(f"  ✓ Audit record persisted in dw_etl_audit with step timings: {latest_run['step_timings']}")

    # TEST 14: Preserved Warehouse CSV Export
    print("\n[TEST 14] Verifying Warehouse CSV Export...")
    csv_res = session.get(f"{BASE_URL}/api/manager/etl/export-csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    print(f"  ✓ CSV Export functional: Content-Type is text/csv.")

    print("\n" + "=" * 70)
    print("ALL 14 DATA MINING LAB & WAREHOUSE EXPLORER TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
