"""Customer-Level RFM (Recency, Frequency, Monetary) Engine.
Calculates Recency (days elapsed), Frequency (DISTINCT orders, not transaction items),
and Monetary (realized revenue, net of refunds).
Applies 1-5 quantile scoring, segment categorization, and log+standard feature scaling.
"""

import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
import numpy as np
import sqlite3
from sklearn.preprocessing import StandardScaler
from backend.warehouse import get_db_connection

def calculate_customer_rfm(df_transactions=None):
    """
    Computes Customer-Level Recency, Frequency, and Monetary (RFM) metrics.
    Ensures Frequency counts distinct orders (order_id), not transaction rows.
    Realized revenue excludes refunded amounts on returned items.
    """
    if df_transactions is None:
        conn = get_db_connection()
        df_transactions = pd.read_sql_query("SELECT * FROM fact_transactions;", conn)
        conn.close()

    if df_transactions.empty:
        return pd.DataFrame(), pd.DataFrame()

    df = df_transactions.copy()
    df['order_date_dt'] = pd.to_datetime(df['order_date'])
    
    # Realized revenue rule:
    # If returned, refund_amount equals net_sales -> realized revenue = 0
    # If not returned or exchanged, realized revenue = net_sales
    df['realized_revenue'] = np.where(df['return_status'] == 'Returned', 0.0, df['net_sales'])

    # Reference Date = Max order_date + 1 day
    max_date = df['order_date_dt'].max()
    ref_date = max_date + pd.Timedelta(days=1)

    # Customer-Level Aggregation:
    # FREQUENCY counts DISTINCT orders (order_id nunique), NOT transaction-item rows!
    rfm_df = df.groupby('customer_id').agg(
        Latest_Order=('order_date_dt', 'max'),
        Frequency=('order_id', 'nunique'),
        Monetary=('realized_revenue', 'sum'),
        Gross_Spend=('gross_amount', 'sum'),
        Total_Items=('order_item_id', 'count')
    ).reset_index()

    rfm_df['Avg_Order_Value'] = (rfm_df['Monetary'] / np.maximum(1, rfm_df['Frequency'])).round(2)
    rfm_df['Recency'] = (ref_date - rfm_df['Latest_Order']).dt.days

    # Quantile-Based RFM Scoring (1 to 5)
    # Recency: Lower days = Better score (5 = most recent, 1 = least recent)
    try:
        rfm_df['R_Score'] = pd.qcut(rfm_df['Recency'], q=5, labels=[5, 4, 3, 2, 1], duplicates='drop').astype(int)
    except Exception:
        rfm_df['R_Score'] = pd.cut(rfm_df['Recency'], bins=5, labels=[5, 4, 3, 2, 1]).astype(int)

    # Frequency: Higher count = Better score (1 to 5)
    try:
        rfm_df['F_Score'] = pd.qcut(rfm_df['Frequency'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    except Exception:
        rfm_df['F_Score'] = pd.cut(rfm_df['Frequency'], bins=5, labels=[1, 2, 3, 4, 5]).astype(int)

    # Monetary: Higher spend = Better score (1 to 5)
    try:
        rfm_df['M_Score'] = pd.qcut(rfm_df['Monetary'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    except Exception:
        rfm_df['M_Score'] = pd.cut(rfm_df['Monetary'], bins=5, labels=[1, 2, 3, 4, 5]).astype(int)

    rfm_df['RFM_Score'] = rfm_df['R_Score'].astype(str) + rfm_df['F_Score'].astype(str) + rfm_df['M_Score'].astype(str)
    rfm_df['RFM_Sum'] = rfm_df['R_Score'] + rfm_df['F_Score'] + rfm_df['M_Score']

    # Transparent Segment Labeling
    def segment_customer(row):
        r, f, m = row['R_Score'], row['F_Score'], row['M_Score']
        if r >= 4 and f >= 4 and m >= 4:
            return "VIP Champions"
        elif f >= 4:
            return "Loyal Regulars"
        elif r >= 4 and f >= 2:
            return "Potential Loyalists"
        elif r >= 4 and f == 1:
            return "Recent / New Customers"
        elif r <= 2 and f >= 4 and m >= 4:
            return "At-Risk VIPs"
        elif r <= 2 and f >= 3:
            return "At Risk"
        elif r <= 2 and f <= 2 and m <= 2:
            return "Hibernating / Low Engagement"
        else:
            return "Occasional Shoppers"

    rfm_df['RFM_Segment'] = rfm_df.apply(segment_customer, axis=1)

    # Feature Scaling: Log1p + StandardScaler
    rfm_features = rfm_df[['Recency', 'Frequency', 'Monetary']].copy()
    rfm_log = np.log1p(np.maximum(0, rfm_features))
    scaler = StandardScaler()
    scaled_array = scaler.fit_transform(rfm_log)

    df_scaled = pd.DataFrame(scaled_array, columns=['Recency_Scaled', 'Frequency_Scaled', 'Monetary_Scaled'])
    df_scaled['customer_id'] = rfm_df['customer_id']

    # Persist customer_rfm table into SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customer_rfm (
        customer_id INTEGER PRIMARY KEY,
        latest_order TEXT,
        recency INTEGER,
        frequency INTEGER,
        monetary REAL,
        avg_order_value REAL,
        r_score INTEGER,
        f_score INTEGER,
        m_score INTEGER,
        rfm_score TEXT,
        rfm_sum INTEGER,
        rfm_segment TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cluster_results (
        customer_id INTEGER PRIMARY KEY,
        kmeans_cluster INTEGER,
        hierarchical_cluster INTEGER,
        pca1 REAL,
        pca2 REAL
    );
    """)
    cursor.execute("DELETE FROM cluster_results;")
    cursor.execute("DELETE FROM customer_rfm;")

    save_df = rfm_df[['customer_id', 'Latest_Order', 'Recency', 'Frequency', 'Monetary',
                      'Avg_Order_Value', 'R_Score', 'F_Score', 'M_Score', 'RFM_Score', 'RFM_Sum', 'RFM_Segment']].copy()
    save_df['Latest_Order'] = save_df['Latest_Order'].dt.strftime('%Y-%m-%d')
    save_df.columns = ['customer_id', 'latest_order', 'recency', 'frequency', 'monetary',
                       'avg_order_value', 'r_score', 'f_score', 'm_score', 'rfm_score', 'rfm_sum', 'rfm_segment']

    save_df.to_sql('customer_rfm', conn, if_exists='append', index=False)
    conn.commit()
    conn.close()

    return rfm_df, df_scaled

if __name__ == "__main__":
    rfm_df, df_scaled = calculate_customer_rfm()
    print("Calculated RFM for customers:", len(rfm_df))
    print(rfm_df.head())
