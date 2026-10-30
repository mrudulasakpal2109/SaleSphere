"""Central End-to-End Analytical Pipeline for SalesSphere.
Synchronizes live orders incrementally, computes customer RFM, runs K-Means (K=4)
and Hierarchical Clustering with Ward linkage, generates cluster recommendations,
and persists analytical state to the Data Warehouse.
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path so backend modules import cleanly
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
import numpy as np
from datetime import datetime

from backend.warehouse import (
    init_data_warehouse,
    get_all_transactions,
    get_all_customers,
    sync_live_orders_to_warehouse
)
from backend.rfm import calculate_customer_rfm
from backend.clustering import (
    run_kmeans_clustering,
    run_hierarchical_clustering,
    generate_dendrogram_data,
    generate_cluster_profiles,
    save_cluster_results_to_db,
    evaluate_kmeans_k,
    get_cached_kmeans_evaluations
)
from backend.recommendations import generate_cluster_recommendations
from backend.analytics import (
    get_overview_kpis,
    get_daily_sales_trend,
    get_category_analytics,
    get_brand_analytics,
    get_channel_analytics,
    get_order_status_distribution,
    get_payment_status_distribution,
    get_top_products_performance
)

def run_analysis_pipeline(n_clusters_kmeans: int = 4, n_clusters_hierarchical: int = 4, force_reseed: bool = False):
    """
    Central ETL + Analytics execution function.
    1. Ensures warehouse table state.
    2. Incrementally ingests un-synced live storefront orders.
    3. Aggregates customer RFM metrics.
    4. Evaluates and fits K-Means (K=4) & Hierarchical Ward models.
    5. Builds Dendrogram coordinates for manager dashboard visualization.
    6. Formulates data-driven cluster recommendations.
    7. Computes executive KPIs and sales trend datasets.
    """
    # 1. Ensure Star Schema is initialized with 45,000 unified rows
    init_data_warehouse(force_reseed=force_reseed)

    # 2. Incremental ETL for any newly placed live orders
    new_synced = sync_live_orders_to_warehouse()

    # 3. Extract transaction records
    df_tx = get_all_transactions()
    if df_tx.empty:
        raise ValueError("Data Warehouse contains 0 transaction records.")

    # 4. Customer-Level RFM
    rfm_df, df_scaled = calculate_customer_rfm(df_tx)

    # 5. K-Means Clustering
    rfm_df, kmeans_model, silhouette = run_kmeans_clustering(rfm_df, df_scaled, n_clusters=n_clusters_kmeans)

    # 6. Hierarchical Agglomerative Clustering (Ward Linkage)
    rfm_df = run_hierarchical_clustering(rfm_df, df_scaled, n_clusters=n_clusters_hierarchical)

    # 7. Dendrogram Data for visualization
    dendrogram_data = generate_dendrogram_data(df_scaled, max_leaves=60)

    # 8. Cluster Summaries & Dynamic Recommendations
    kmeans_recs = generate_cluster_recommendations(rfm_df, 'kmeans_cluster')
    hierarchical_recs = generate_cluster_recommendations(rfm_df, 'hierarchical_cluster')

    kmeans_summaries = [
        {
            "cluster": r["cluster"],
            "label": r["label"],
            "size": r["size"],
            "percentage": r.get("percentage") or r.get("share_pct"),
            "avg_recency": r["avg_recency"],
            "avg_frequency": r["avg_frequency"],
            "avg_monetary": r["avg_monetary"],
            "median_recency": r.get("median_recency"),
            "median_frequency": r.get("median_frequency"),
            "median_monetary": r.get("median_monetary"),
            "centroid_recency_scaled": r.get("centroid_recency_scaled"),
            "centroid_frequency_scaled": r.get("centroid_frequency_scaled"),
            "centroid_monetary_scaled": r.get("centroid_monetary_scaled"),
            "pca1": r.get("pca1"),
            "pca2": r.get("pca2"),
            "tagline": r.get("tagline"),
            "recommended_actions": r.get("recommended_actions", []),
            "color": r.get("color")
        }
        for r in kmeans_recs
    ]

    hierarchical_summaries = [
        {
            "cluster": r["cluster"],
            "label": r["label"],
            "size": r["size"],
            "percentage": r.get("percentage") or r.get("share_pct"),
            "avg_recency": r["avg_recency"],
            "avg_frequency": r["avg_frequency"],
            "avg_monetary": r["avg_monetary"],
            "median_recency": r.get("median_recency"),
            "median_frequency": r.get("median_frequency"),
            "median_monetary": r.get("median_monetary"),
            "centroid_recency_scaled": r.get("centroid_recency_scaled"),
            "centroid_frequency_scaled": r.get("centroid_frequency_scaled"),
            "centroid_monetary_scaled": r.get("centroid_monetary_scaled"),
            "pca1": r.get("pca1"),
            "pca2": r.get("pca2"),
            "tagline": r.get("tagline"),
            "recommended_actions": r.get("recommended_actions", []),
            "color": r.get("color")
        }
        for r in hierarchical_recs
    ]

    # Pre-computed evaluations for K=2..10
    evaluations = get_cached_kmeans_evaluations(df_scaled)

    # 9. Persist cluster assignments to SQLite
    save_cluster_results_to_db(rfm_df)

    # 10. Compute Analytics & KPIs
    total_cust_count = int(rfm_df['customer_id'].nunique())
    kpis = get_overview_kpis(df_tx, total_registered_customers=total_cust_count)
    trend = get_daily_sales_trend(df_tx, days=30)
    category_sales = get_category_analytics(df_tx)
    brand_sales = get_brand_analytics(df_tx)
    channel_sales = get_channel_analytics(df_tx)
    order_status = get_order_status_distribution(df_tx)
    payment_status = get_payment_status_distribution(df_tx)
    top_products = get_top_products_performance(df_tx, top_n=5)

    return {
        "as_of": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "newly_synced_live_items": new_synced,
        "total_transactions": len(df_tx),
        "total_customers": total_cust_count,
        "rfm_df": rfm_df,
        "silhouette": silhouette,
        "dendrogram": dendrogram_data,
        "evaluations": evaluations,
        "kmeans": kmeans_summaries,
        "hierarchical": hierarchical_summaries,
        "recommendations": kmeans_recs,
        "kpis": kpis,
        "trend": trend,
        "category_sales": category_sales,
        "brand_sales": brand_sales,
        "channel_sales": channel_sales,
        "order_status": order_status,
        "payment_status": payment_status,
        "top_products": top_products
    }

if __name__ == "__main__":
    res = run_analysis_pipeline()
    print("Pipeline run successfully!")
    print(f"Total Transactions: {res['total_transactions']}, Total Customers: {res['total_customers']}")
    print(f"Silhouette Score: {res['silhouette']:.4f}")
    print("KPIs:", res['kpis'])
