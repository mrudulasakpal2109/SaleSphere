import pandas as pd
import numpy as np
import os

def load_and_clean_raw_data(csv_path="data/synthetic_online_retail_data.csv"):
    """
    Reads the raw e-commerce CSV dataset, applies cleaning routines,
    calculates derived columns, and generates a data-quality audit report.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Source raw data file not found at path: {csv_path}")

    df_raw = pd.read_csv(csv_path)
    
    # Audit metrics before cleaning
    initial_rows = len(df_raw)
    initial_cols = len(df_raw.columns)
    missing_review_init = df_raw['review_score'].isnull().sum() if 'review_score' in df_raw.columns else 0
    missing_gender_init = df_raw['gender'].isnull().sum() if 'gender' in df_raw.columns else 0
    duplicate_rows_init = df_raw.duplicated().sum()

    df_clean = df_raw.copy()

    # 1. Deduplication
    df_clean = df_clean.drop_duplicates()

    # 2. Impute missing values responsibly
    if 'review_score' in df_clean.columns:
        median_review = df_clean['review_score'].median()
        df_clean['review_score'] = df_clean['review_score'].fillna(median_review)

    if 'gender' in df_clean.columns:
        df_clean['gender'] = df_clean['gender'].fillna('Unknown')

    # 3. Datetime conversion & validation
    if 'order_date' in df_clean.columns:
        df_clean['order_date'] = pd.to_datetime(df_clean['order_date'], errors='coerce')
        # Drop rows with invalid dates if any
        df_clean = df_clean.dropna(subset=['order_date'])
        # Sort chronologically
        df_clean = df_clean.sort_values(by='order_date').reset_index(drop=True)
        # Store as string ISO YYYY-MM-DD for SQLite persistence
        df_clean['order_date_str'] = df_clean['order_date'].dt.strftime('%Y-%m-%d')
    
    # 4. Filter invalid numerical anomalies
    df_clean = df_clean[(df_clean['quantity'] > 0) & (df_clean['price'] > 0)]

    # 5. Derive transaction_amount
    df_clean['transaction_amount'] = (df_clean['quantity'] * df_clean['price']).round(2)

    # 6. Audit report summary dictionary
    audit_report = {
        "raw_row_count": initial_rows,
        "raw_col_count": initial_cols,
        "clean_row_count": len(df_clean),
        "duplicate_rows_removed": duplicate_rows_init,
        "missing_reviews_imputed": missing_review_init,
        "missing_gender_imputed": missing_gender_init,
        "unique_customers_raw": df_raw['customer_id'].nunique() if 'customer_id' in df_raw.columns else 0,
        "min_order_date": df_clean['order_date_str'].min() if not df_clean.empty else None,
        "max_order_date": df_clean['order_date_str'].max() if not df_clean.empty else None,
        "total_revenue": float(df_clean['transaction_amount'].sum()),
    }

    return df_clean, audit_report

if __name__ == "__main__":
    df, audit = load_and_clean_raw_data()
    print("Data cleaning completed successfully.")
    print("Audit summary:", audit)
