"""Data Mining & Customer Segmentation Module.
Implements:
1. K-Means Clustering (K=4) with Elbow Method & Silhouette Analysis.
2. Hierarchical Agglomerative Clustering (Ward Linkage).
3. Dendrogram Tree Coordinate Generation for visual manager dashboard.
4. Cluster Profiling and DB Persistence.
"""

import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import numpy as np
import pandas as pd
import sqlite3
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from scipy.cluster.hierarchy import linkage, dendrogram
from backend.warehouse import get_db_connection

def evaluate_kmeans_k(df_scaled, k_range=range(2, 11)):
    """Evaluates K-Means clustering across K=2..10 for Elbow and Silhouette plots."""
    feature_cols = ['Recency_Scaled', 'Frequency_Scaled', 'Monetary_Scaled']
    X = df_scaled[feature_cols].values

    inertias = []
    silhouette_scores = []
    k_values = list(k_range)

    # Use subsample for silhouette if dataset is very large (> 10000) for fast UI response
    sample_size = min(3000, len(X))
    np.random.seed(42)
    sample_idx = np.random.choice(len(X), sample_size, replace=False)
    X_sub = X[sample_idx]

    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)
        inertias.append(float(kmeans.inertia_))
        score = float(silhouette_score(X_sub, labels[sample_idx]))
        silhouette_scores.append(round(score, 4))

    return pd.DataFrame({
        'K': k_values,
        'Inertia': inertias,
        'Silhouette_Score': silhouette_scores
    })

_EVALUATION_CACHE = {}

def get_cached_kmeans_evaluations(df_scaled):
    """Returns cached or freshly computed KMeans evaluations for K=2..10."""
    global _EVALUATION_CACHE
    cache_key = len(df_scaled)
    if cache_key in _EVALUATION_CACHE:
        return _EVALUATION_CACHE[cache_key]
    eval_df = evaluate_kmeans_k(df_scaled, k_range=range(2, 11))
    eval_list = [
        {
            "k": int(r["K"]),
            "inertia": round(float(r["Inertia"]), 2),
            "silhouette_score": round(float(r["Silhouette_Score"]), 4)
        }
        for _, r in eval_df.iterrows()
    ]
    _EVALUATION_CACHE[cache_key] = eval_list
    return eval_list

def run_kmeans_clustering(rfm_df, df_scaled, n_clusters=4):
    """Fits K-Means clustering with K=n_clusters and computes 2D PCA coordinates."""
    feature_cols = ['Recency_Scaled', 'Frequency_Scaled', 'Monetary_Scaled']
    X = df_scaled[feature_cols].values

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    rfm_df = rfm_df.copy()
    rfm_df['kmeans_cluster'] = labels
    rfm_df['Recency_Scaled'] = df_scaled['Recency_Scaled'].values
    rfm_df['Frequency_Scaled'] = df_scaled['Frequency_Scaled'].values
    rfm_df['Monetary_Scaled'] = df_scaled['Monetary_Scaled'].values

    pca_2d = PCA(n_components=2, random_state=42)
    coords = pca_2d.fit_transform(X)
    rfm_df['PCA1'] = coords[:, 0]
    rfm_df['PCA2'] = coords[:, 1]

    # Overall Silhouette Score
    sample_size = min(3000, len(X))
    np.random.seed(42)
    sample_idx = np.random.choice(len(X), sample_size, replace=False)
    sil = float(silhouette_score(X[sample_idx], labels[sample_idx]))

    return rfm_df, kmeans, sil

def run_hierarchical_clustering(rfm_df, df_scaled, n_clusters=4, linkage_method='ward'):
    """Fits Agglomerative Clustering with Ward linkage and n_clusters=4."""
    feature_cols = ['Recency_Scaled', 'Frequency_Scaled', 'Monetary_Scaled']
    X = df_scaled[feature_cols].values

    agg_model = AgglomerativeClustering(n_clusters=n_clusters, linkage=linkage_method)
    agg_labels = agg_model.fit_predict(X)

    rfm_df = rfm_df.copy()
    rfm_df['hierarchical_cluster'] = agg_labels
    return rfm_df

def generate_dendrogram_data(df_scaled, max_leaves=50) -> dict:
    """
    Computes Ward linkage matrix and extracts dendrogram tree coordinates
    (icoord, dcoord, labels) for direct SVG rendering in ManagerSegmentation.tsx.
    """
    feature_cols = ['Recency_Scaled', 'Frequency_Scaled', 'Monetary_Scaled']
    X = df_scaled[feature_cols].values

    sample_size = min(max_leaves, len(X))
    np.random.seed(42)
    sample_idx = np.random.choice(len(X), sample_size, replace=False)
    X_sample = X[sample_idx]
    
    # Customer labels
    customer_ids = df_scaled['customer_id'].values[sample_idx]
    labels = [f"C-{cid}" for cid in customer_ids]

    Z = linkage(X_sample, method='ward')
    dendro = dendrogram(Z, labels=labels, no_plot=True)

    # Convert numpy ndarrays to lists of lists for JSON serialization
    icoord = [list(map(float, row)) for row in dendro['icoord']]
    dcoord = [list(map(float, row)) for row in dendro['dcoord']]
    ivl = [str(lbl) for lbl in dendro['ivl']]

    return {
        "icoord": icoord,
        "dcoord": dcoord,
        "labels": ivl
    }

def generate_cluster_profiles(rfm_df, cluster_col='kmeans_cluster') -> pd.DataFrame:
    """Generates statistical profiles for each customer cluster."""
    profiles = rfm_df.groupby(cluster_col).agg(
        Customer_Count=('customer_id', 'count'),
        Avg_Recency=('Recency', 'mean'),
        Avg_Frequency=('Frequency', 'mean'),
        Avg_Monetary=('Monetary', 'mean'),
        Total_Monetary=('Monetary', 'sum'),
        Avg_Order_Value=('Avg_Order_Value', 'mean')
    ).reset_index()

    total_customers = len(rfm_df)
    profiles['Customer_Share_%'] = ((profiles['Customer_Count'] / total_customers) * 100).round(1)
    profiles['Avg_Recency'] = profiles['Avg_Recency'].round(1)
    profiles['Avg_Frequency'] = profiles['Avg_Frequency'].round(1)
    profiles['Avg_Monetary'] = profiles['Avg_Monetary'].round(2)
    profiles['Total_Monetary'] = profiles['Total_Monetary'].round(2)
    profiles['Avg_Order_Value'] = profiles['Avg_Order_Value'].round(2)

    return profiles

def save_cluster_results_to_db(rfm_df):
    """Persists customer cluster assignments into SQLite cluster_results table."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cluster_results (
        customer_id INTEGER PRIMARY KEY,
        kmeans_cluster INTEGER,
        hierarchical_cluster INTEGER,
        pca1 REAL,
        pca2 REAL,
        FOREIGN KEY (customer_id) REFERENCES customer_rfm (customer_id)
    );
    """)
    cursor.execute("DELETE FROM cluster_results;")

    save_df = rfm_df[['customer_id', 'kmeans_cluster', 'hierarchical_cluster', 'PCA1', 'PCA2']].copy()
    save_df.columns = ['customer_id', 'kmeans_cluster', 'hierarchical_cluster', 'pca1', 'pca2']

    save_df.to_sql('cluster_results', conn, if_exists='append', index=False)
    conn.commit()
    conn.close()
