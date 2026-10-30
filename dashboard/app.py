import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import dendrogram
import os
import sys
import base64

# Add project root directory to path for backend imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.pipeline import run_analysis_pipeline
from backend.warehouse import (
    get_all_transactions,
    get_all_customers,
    add_customer,
    update_customer,
    delete_customer,
    add_transaction,
    update_transaction,
    delete_transaction,
    get_warehouse_schema_info,
    get_inventory,
    get_low_stock_alerts,
    get_order_items,
    get_customer_activity
)

# -----------------------------------------------------------------------------
# 1. PAGE CONFIGURATION & ENTERPRISE DESIGN SYSTEM
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="SalesSphere | Customer Intelligence Platform",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Sidebar Collapsed/Expanded Session State
if 'sidebar_expanded' not in st.session_state:
    st.session_state.sidebar_expanded = True

if 'current_page' not in st.session_state:
    st.session_state.current_page = "Overview Dashboard"

# Sidebar Width CSS based on Collapsed/Expanded State
sidebar_width_css = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .main {
        background: #0B0C18;
        color: #F8FAFC;
    }

    /* Top Breadcrumb & Header Bar */
    .top-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 24px;
        background: #111224;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 24px;
        border-radius: 12px;
    }
    .breadcrumb-text {
        font-size: 0.85rem;
        color: #94A3B8;
        font-weight: 500;
    }
    .breadcrumb-text span {
        color: #C084FC;
        font-weight: 600;
    }

    /* Hero Banner Header */
    .page-banner {
        margin-bottom: 24px;
    }
    .page-banner-title {
        font-size: 2.2rem;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: -0.02em;
        margin: 0;
    }
    .page-banner-sub {
        color: #94A3B8;
        font-size: 0.95rem;
        margin-top: 4px;
    }

    /* Gradient KPI Cards */
    .kpi-card-purple {
        background: linear-gradient(135deg, #A855F7 0%, #7E22CE 100%);
        border-radius: 16px;
        padding: 22px 26px;
        color: #FFFFFF;
        box-shadow: 0 10px 25px rgba(168, 85, 247, 0.3);
        position: relative;
    }
    .kpi-card-cyan {
        background: linear-gradient(135deg, #06B6D4 0%, #0284C7 100%);
        border-radius: 16px;
        padding: 22px 26px;
        color: #FFFFFF;
        box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);
        position: relative;
    }
    .kpi-card-dark {
        background: #17192D;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 22px 26px;
        color: #FFFFFF;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        transition: border-color 0.2s;
    }
    .kpi-card-dark:hover {
        border-color: rgba(168, 85, 247, 0.4);
    }
    .kpi-card-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.9;
    }
    .kpi-card-val {
        font-size: 2.1rem;
        font-weight: 900;
        margin-top: 8px;
        letter-spacing: -0.02em;
    }
    .kpi-card-sub {
        font-size: 0.82rem;
        margin-top: 6px;
        opacity: 0.85;
    }

    /* Panel Card Container */
    .panel-card {
        background: #17192D;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 16px;
        padding: 22px 26px;
        margin-bottom: 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .panel-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Sidebar Section Headers */
    .sidebar-section-header {
        font-size: 0.7rem;
        font-weight: 800;
        color: #A855F7;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-top: 16px;
        margin-bottom: 6px;
        padding-left: 6px;
    }

    /* Filter Toolbar Card */
    .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(168, 85, 247, 0.15);
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 20px;
        padding: 4px 12px;
        font-size: 0.8rem;
        color: #E9D5FF;
        margin-right: 8px;
        margin-bottom: 8px;
    }

    /* Split Screen Login Page Styles */
    .login-left-banner {
        background: linear-gradient(135deg, #17192D 0%, #0B0C18 100%);
        border-radius: 20px;
        padding: 40px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .login-card {
        background: #17192D;
        border: 1px solid rgba(168, 85, 247, 0.3);
        border-radius: 20px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
"""

if not st.session_state.sidebar_expanded:
    sidebar_width_css += """
    [data-testid="stSidebar"] {
        min-width: 95px !important;
        max-width: 95px !important;
        transition: all 0.3s ease-in-out;
    }
    """
else:
    sidebar_width_css += """
    [data-testid="stSidebar"] {
        min-width: 275px !important;
        max-width: 275px !important;
        transition: all 0.3s ease-in-out;
    }
    """

sidebar_width_css += "</style>"
st.markdown(sidebar_width_css, unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 2. SESSION STATE & AUTHENTICATION
# -----------------------------------------------------------------------------
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False

if 'k_kmeans' not in st.session_state:
    st.session_state.k_kmeans = 4

if 'k_hierarchical' not in st.session_state:
    st.session_state.k_hierarchical = 4

if 'selected_cat_filters' not in st.session_state:
    st.session_state.selected_cat_filters = []

if 'selected_pay_filters' not in st.session_state:
    st.session_state.selected_pay_filters = []

if 'selected_segment_filters' not in st.session_state:
    st.session_state.selected_segment_filters = []

# Base64 Logo Renderer
def get_logo_html(width="210px"):
    logo_path = os.path.join("assets", "salesphere_logo.svg")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            svg_bytes = f.read()
        encoded_svg = base64.b64encode(svg_bytes).decode("utf-8")
        return f'<img src="data:image/svg+xml;base64,{encoded_svg}" style="max-width: {width};" />'
    return '<h2 style="color: #FFFFFF; font-weight: 800;">Sales<span>Sphere</span></h2>'

# -----------------------------------------------------------------------------
# 3. SPLIT-SCREEN ENTERPRISE LOGIN PAGE
# -----------------------------------------------------------------------------
if not st.session_state.authenticated:
    st.markdown("<br>", unsafe_allow_html=True)
    col_left, col_right = st.columns([5, 4])
    
    with col_left:
        st.markdown(f"""
        <div class="login-left-banner">
            <div style="margin-bottom: 24px;">{get_logo_html('240px')}</div>
            <h1 style="color: #FFFFFF; font-size: 2.6rem; font-weight: 900; line-height: 1.2;">
                Turn Customer Data into <span style="color: #C084FC;">Actionable Intelligence</span>
            </h1>
            <p style="color: #94A3B8; font-size: 1.05rem; margin-top: 14px; max-width: 480px;">
                Enterprise-grade Data Warehousing, RFM Behavioral Segmentation, and Predictive Clustering for E-Commerce Growth.
            </p>
            <div style="margin-top: 32px; display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); padding: 8px 16px; border-radius: 20px; color: #E9D5FF; font-size: 0.85rem; font-weight: 600;">✨ Star Schema Data Warehouse</div>
                <div style="background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.4); padding: 8px 16px; border-radius: 20px; color: #CFFAFE; font-size: 0.85rem; font-weight: 600;">🎯 Behavioral RFM Analytics</div>
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 8px 16px; border-radius: 20px; color: #D1FAE5; font-size: 0.85rem; font-weight: 600;">🔵 K-Means & Dendrogram Mining</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_right:
        st.markdown(f"""
        <div class="login-card">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #FFFFFF; font-weight: 800; margin: 0;">Welcome Back</h2>
                <p style="color: #94A3B8; font-size: 0.9rem; margin-top: 4px;">Sign in to your SalesSphere workspace</p>
            </div>
        """, unsafe_allow_html=True)

        with st.form("split_login_form"):
            username = st.text_input("Username / Email", placeholder="Enter username")
            password = st.text_input("Password", type="password", placeholder="Enter password")
            remember_me = st.checkbox("Remember me on this device", value=True)
            submit_login = st.form_submit_button("🔒 Sign In to Workspace", use_container_width=True)

            if submit_login:
                if username == "admin" and password == "salesphere2026":
                    st.session_state.authenticated = True
                    st.toast("⚡ Welcome back, Sales Manager!", icon="✅")
                    st.rerun()
                else:
                    st.error("❌ Invalid Username or Password. Please check credentials.")

        st.markdown("</div>", unsafe_allow_html=True)

    st.stop()

# -----------------------------------------------------------------------------
# 4. PIPELINE EXECUTOR & CACHING
# -----------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def get_pipeline_results(k_kmeans, k_hierarchical):
    return run_analysis_pipeline(
        n_clusters_kmeans=k_kmeans,
        n_clusters_hierarchical=k_hierarchical,
        force_reseed=False
    )

def refresh_pipeline():
    st.cache_data.clear()

try:
    with st.spinner("Connecting to Data Warehouse & Mining Engine..."):
        pipeline_data = get_pipeline_results(st.session_state.k_kmeans, st.session_state.k_hierarchical)
except Exception as e:
    st.error(f"Error executing backend analytics engine: {e}")
    st.stop()

# Extract pipeline data components
kpis = pipeline_data["kpis"]
df_tx = pipeline_data["df_transactions"]
df_cust = pipeline_data["df_customers"]
rfm_df = pipeline_data["rfm_df"]
df_scaled = pipeline_data["df_scaled"]
kmeans_eval_df = pipeline_data["kmeans_eval_df"]
profiles_km = pipeline_data["cluster_profiles_kmeans"]
profiles_h = pipeline_data["cluster_profiles_hierarchical"]
recs_km = pipeline_data["recommendations_kmeans"]

# -----------------------------------------------------------------------------
# 5. NO-RADIO PRO COLLAPSIBLE SIDEBAR NAVIGATION
# -----------------------------------------------------------------------------
with st.sidebar:
    # Sidebar Header & Toggle Button
    if st.session_state.sidebar_expanded:
        st.markdown(f'<div style="margin-bottom: 12px;">{get_logo_html("190px")}</div>', unsafe_allow_html=True)
        if st.button("◀ Collapse Sidebar", use_container_width=True):
            st.session_state.sidebar_expanded = False
            st.rerun()
    else:
        st.markdown('<h2 style="color: #C084FC; text-align: center; margin: 0; font-weight: 900;">S</h2>', unsafe_allow_html=True)
        if st.button("▶", help="Expand Sidebar", use_container_width=True):
            st.session_state.sidebar_expanded = True
            st.rerun()

    st.markdown("---")

    nav_options = [
        "Overview Dashboard",
        "Transaction Explorer",
        "Customer RFM Analytics",
        "Customer Segmentation",
        "K-Means Clustering",
        "Hierarchical Clustering",
        "Sales & Demographics",
        "Customer Insights",
        "Inventory & Stock Analytics",
        "Data Management (CRUD)",
        "Data Warehouse Schema",
        "About SalesSphere"
    ]

    selected_page = st.sidebar.radio(
        "Platform Navigation",
        options=nav_options,
        index=0
    )

    st.markdown("---")
    st.markdown("### ⚙️ Cluster Model Parameters")
    new_k_kmeans = st.slider("K-Means Clusters (K)", 2, 10, st.session_state.k_kmeans)
    new_k_hierarchical = st.slider("Hierarchical Clusters (K)", 2, 10, st.session_state.k_hierarchical)
    
    if new_k_kmeans != st.session_state.k_kmeans or new_k_hierarchical != st.session_state.k_hierarchical:
        st.session_state.k_kmeans = new_k_kmeans
        st.session_state.k_hierarchical = new_k_hierarchical
        refresh_pipeline()
        st.toast(f"⚡ Pipeline updated to K={new_k_kmeans} clusters!", icon="🔄")
        st.rerun()

    if st.button("🔄 Sync & Re-run Pipeline", use_container_width=True):
        refresh_pipeline()
        st.toast("⚡ Data Warehouse & RFM Pipeline Refreshed!", icon="✅")
        st.rerun()

    st.markdown("---")
    st.markdown("""
    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div>
            <div style="color: #FFFFFF; font-weight: 700; font-size: 0.88rem;">Sales Manager</div>
            <div style="color: #94A3B8; font-size: 0.76rem;">sales.manager (admin)</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    if st.button("🚪 Logout", use_container_width=True):
        st.session_state.authenticated = False
        st.rerun()

page = selected_page

# -----------------------------------------------------------------------------
# 6. TOP HEADER BREADCRUMB BAR
# -----------------------------------------------------------------------------
st.markdown(f"""
<div class="top-header-bar">
    <div class="breadcrumb-text">SalesSphere Platform / Analytics / <span>{page}</span></div>
    <div style="display: flex; align-items: center; gap: 14px;">
        <span style="color: #10B981; font-size: 0.82rem; font-weight: 600;">🟢 Live Warehouse Sync</span>
    </div>
</div>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 1: OVERVIEW DASHBOARD
# -----------------------------------------------------------------------------
if page == "Overview Dashboard":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Customer Intelligence</h1>
        <div class="page-banner-sub">Monitor customer behavior, revenue performance and segmentation insights.</div>
    </div>
    """, unsafe_allow_html=True)

    # Professional Interactive Filter Toolbar
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title"><span>🎛️ Filter Toolbar</span></div>', unsafe_allow_html=True)
    
    col_f1, col_f2, col_f3, col_f4 = st.columns([3, 3, 3, 2])
    with col_f1:
        cat_choices = st.multiselect("Category:", df_tx['category_name'].unique(), default=st.session_state.selected_cat_filters)
    with col_f2:
        pay_choices = st.multiselect("Payment Method:", df_tx['payment_method'].unique(), default=st.session_state.selected_pay_filters)
    with col_f3:
        seg_choices = st.multiselect("RFM Segment:", rfm_df['RFM_Segment'].unique(), default=st.session_state.selected_segment_filters)
    with col_f4:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Reset Filters", use_container_width=True):
            st.session_state.selected_cat_filters = []
            st.session_state.selected_pay_filters = []
            st.session_state.selected_segment_filters = []
            st.rerun()

    st.session_state.selected_cat_filters = cat_choices
    st.session_state.selected_pay_filters = pay_choices
    st.session_state.selected_segment_filters = seg_choices

    # Render Removable Filter Chips
    chips_html = ""
    for c in cat_choices: chips_html += f'<span class="filter-chip">Category: {c}</span>'
    for p in pay_choices: chips_html += f'<span class="filter-chip">Payment: {p}</span>'
    for s in seg_choices: chips_html += f'<span class="filter-chip">Segment: {s}</span>'
    if chips_html:
        st.markdown(f'<div style="margin-top: 10px;">{chips_html}</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # Filtered Transaction Dataset
    filtered_tx = df_tx.copy()
    if cat_choices: filtered_tx = filtered_tx[filtered_tx['category_name'].isin(cat_choices)]
    if pay_choices: filtered_tx = filtered_tx[filtered_tx['payment_method'].isin(pay_choices)]

    curr_rev = filtered_tx['transaction_amount'].sum()
    curr_tx = len(filtered_tx)
    curr_cust = filtered_tx['customer_id'].nunique()
    curr_aov = filtered_tx['transaction_amount'].mean() if curr_tx > 0 else 0

    # Top KPI Cards (Reference Image Aesthetic)
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="kpi-card-purple">
            <div class="kpi-card-title">Total Revenue</div>
            <div class="kpi-card-val">₹{curr_rev:,.2f}</div>
            <div class="kpi-card-sub">Across {curr_tx:,} transactions</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="kpi-card-cyan">
            <div class="kpi-card-title">Active Customers</div>
            <div class="kpi-card-val">{curr_cust:,}</div>
            <div class="kpi-card-sub">Avg {kpis['avg_frequency']:.1f} orders / customer</div>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
        <div class="kpi-card-dark">
            <div class="kpi-card-title">Average Order Value</div>
            <div class="kpi-card-val">₹{curr_aov:,.2f}</div>
            <div class="kpi-card-sub" style="color: #10B981;">▲ Spend / Transaction</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
        <div class="kpi-card-dark">
            <div class="kpi-card-title">Active Segments</div>
            <div class="kpi-card-val">{kpis['n_clusters_kmeans']} Segments</div>
            <div class="kpi-card-sub" style="color: #C084FC;">▲ K-Means & Hierarchical</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Grid Analytics Panels
    col_left, col_right = st.columns([6, 4])
    with col_left:
        st.markdown("""
        <div class="panel-card">
            <div class="panel-title">Revenue & Order Volume Trend</div>
        """, unsafe_allow_html=True)
        sales_time = pipeline_data["sales_time"]
        fig_trend = px.area(
            sales_time, 
            x='YearMonth', 
            y='Total_Sales', 
            markers=True,
            labels={'YearMonth': 'Month', 'Total_Sales': 'Revenue (₹)'},
            template='plotly_dark'
        )
        fig_trend.update_traces(line_color='#C084FC', fillcolor='rgba(168, 85, 247, 0.15)', line_width=3, marker_size=8)
        fig_trend.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=340)
        st.plotly_chart(fig_trend, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col_right:
        st.markdown("""
        <div class="panel-card">
            <div class="panel-title">Customer RFM Segment Distribution</div>
        """, unsafe_allow_html=True)
        seg_counts = rfm_df['RFM_Segment'].value_counts().reset_index()
        seg_counts.columns = ['Segment', 'Count']
        fig_pie = px.pie(
            seg_counts, 
            names='Segment', 
            values='Count',
            hole=0.5,
            template='plotly_dark',
            color_discrete_sequence=['#C084FC', '#06B6D4', '#3B82F6', '#EC4899', '#10B981', '#F59E0B']
        )
        fig_pie.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=340)
        st.plotly_chart(fig_pie, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    # Bottom Row Charts
    c_cat, c_pay = st.columns(2)
    with c_cat:
        st.markdown("""
        <div class="panel-card">
            <div class="panel-title">Sales by Product Category</div>
        """, unsafe_allow_html=True)
        df_cat = pipeline_data["sales_category"]
        fig_cat = px.bar(
            df_cat, 
            x='category_name', 
            y='Total_Revenue', 
            color='category_name',
            template='plotly_dark',
            labels={'category_name': 'Category', 'Total_Revenue': 'Revenue (₹)'},
            color_discrete_sequence=px.colors.sequential.Purples_r
        )
        fig_cat.update_layout(showlegend=False, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=300)
        st.plotly_chart(fig_cat, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with c_pay:
        st.markdown("""
        <div class="panel-card">
            <div class="panel-title">Payment Method Share</div>
        """, unsafe_allow_html=True)
        df_pay = pipeline_data["sales_payment"]
        fig_pay = px.pie(
            df_pay,
            names='payment_method',
            values='Total_Revenue',
            template='plotly_dark',
            hole=0.4,
            color_discrete_sequence=['#06B6D4', '#8B5CF6', '#3B82F6']
        )
        fig_pay.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=300)
        st.plotly_chart(fig_pay, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 2: TRANSACTION EXPLORER
# -----------------------------------------------------------------------------
elif page == "Transaction Explorer":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Transaction Explorer</h1>
        <div class="page-banner-sub">Filter, search, and export normalized transaction records from the Data Warehouse.</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    col1, col2, col3 = st.columns(3)
    with col1:
        search_cust = st.text_input("🔍 Search Customer ID:", "")
    with col2:
        categories = ["All"] + list(df_tx['category_name'].unique())
        selected_cat = st.selectbox("Filter Category:", categories)
    with col3:
        payment_methods = ["All"] + list(df_tx['payment_method'].unique())
        selected_pay = st.selectbox("Filter Payment Method:", payment_methods)

    filtered_df = df_tx.copy()
    if search_cust: filtered_df = filtered_df[filtered_df['customer_id'].astype(str).str.contains(search_cust)]
    if selected_cat != "All": filtered_df = filtered_df[filtered_df['category_name'] == selected_cat]
    if selected_pay != "All": filtered_df = filtered_df[filtered_df['payment_method'] == selected_pay]

    st.markdown(f"**Showing {len(filtered_df):,} of {len(df_tx):,} records**")

    st.dataframe(
        filtered_df[[
            'transaction_id', 'customer_id', 'order_date', 'product_name', 
            'category_name', 'quantity', 'price', 'transaction_amount', 
            'payment_method', 'city', 'review_score', 'gender', 'age'
        ]],
        use_container_width=True,
        height=480
    )

    csv_bytes = filtered_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Export Filtered Transactions CSV",
        data=csv_bytes,
        file_name="salesphere_transactions.csv",
        mime="text/csv"
    )
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 3: CUSTOMER RFM ANALYTICS
# -----------------------------------------------------------------------------
elif page == "Customer RFM Analytics":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Customer RFM Analytics</h1>
        <div class="page-banner-sub">Recency (days), Frequency (orders), and Monetary (total spend) aggregated at customer level.</div>
    </div>
    """, unsafe_allow_html=True)

    m1, m2, m3, m4 = st.columns(4)
    with m1: st.metric("Avg Recency", f"{rfm_df['Recency'].mean():.1f} Days")
    with m2: st.metric("Avg Frequency", f"{rfm_df['Frequency'].mean():.1f} Orders")
    with m3: st.metric("Avg Monetary", f"₹{rfm_df['Monetary'].mean():,.2f}")
    with m4: st.metric("Top Customer Spend", f"₹{rfm_df['Monetary'].max():,.2f}")

    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">RFM Feature Distributions</div>', unsafe_allow_html=True)
    f1, f2, f3 = st.columns(3)
    with f1:
        fig_r = px.histogram(rfm_df, x='Recency', nbins=20, title="Recency (Days)", template="plotly_dark", color_discrete_sequence=['#C084FC'])
        fig_r.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=260)
        st.plotly_chart(fig_r, use_container_width=True)
    with f2:
        fig_f = px.histogram(rfm_df, x='Frequency', nbins=15, title="Frequency (Orders)", template="plotly_dark", color_discrete_sequence=['#06B6D4'])
        fig_f.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=260)
        st.plotly_chart(fig_f, use_container_width=True)
    with f3:
        fig_m = px.histogram(rfm_df, x='Monetary', nbins=20, title="Monetary (₹)", template="plotly_dark", color_discrete_sequence=['#10B981'])
        fig_m.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=260)
        st.plotly_chart(fig_m, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Customer RFM Score Table</div>', unsafe_allow_html=True)
    st.dataframe(
        rfm_df[[
            'customer_id', 'Latest_Order', 'Recency', 'Frequency', 'Monetary', 
            'Avg_Order_Value', 'R_Score', 'F_Score', 'M_Score', 'RFM_Score', 'RFM_Segment'
        ]].sort_values(by='Monetary', ascending=False),
        use_container_width=True,
        height=400
    )
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 4: CUSTOMER SEGMENTATION
# -----------------------------------------------------------------------------
elif page == "Customer Segmentation":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Multi-Dimensional Customer Segmentation</h1>
        <div class="page-banner-sub">Explore customer clusters in 3D and 2D feature spaces.</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">3D Customer Segment Feature Space</div>', unsafe_allow_html=True)
    fig_3d = px.scatter_3d(
        rfm_df,
        x='Recency',
        y='Frequency',
        z='Monetary',
        color='kmeans_cluster',
        hover_data=['customer_id', 'RFM_Segment', 'Monetary'],
        title="3D Scatter: Recency vs Frequency vs Monetary",
        template='plotly_dark'
    )
    fig_3d.update_layout(height=580, paper_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig_3d, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Configurable 2D Projection Scatter</div>', unsafe_allow_html=True)
    col_x, col_y = st.columns(2)
    with col_x: x_axis = st.selectbox("X-Axis Feature:", ['Frequency', 'Recency', 'Monetary', 'PCA1'], index=0)
    with col_y: y_axis = st.selectbox("Y-Axis Feature:", ['Monetary', 'Recency', 'Frequency', 'PCA2'], index=0)

    fig_2d = px.scatter(
        rfm_df,
        x=x_axis,
        y=y_axis,
        color='kmeans_cluster',
        size='Monetary',
        hover_data=['customer_id', 'RFM_Segment'],
        template='plotly_dark',
        title=f"2D Scatter: {x_axis} vs {y_axis}"
    )
    fig_2d.update_layout(height=450, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig_2d, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 5: K-MEANS CLUSTERING
# -----------------------------------------------------------------------------
elif page == "K-Means Clustering":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">K-Means Customer Clustering</h1>
        <div class="page-banner-sub">Evaluate optimal cluster counts and profile customer segments.</div>
    </div>
    """, unsafe_allow_html=True)

    c_elbow, c_sil = st.columns(2)
    with c_elbow:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        st.markdown('<div class="panel-title">1. Elbow Method (K vs Inertia)</div>', unsafe_allow_html=True)
        fig_elbow = px.line(kmeans_eval_df, x='K', y='Inertia', markers=True, template="plotly_dark")
        fig_elbow.add_vline(x=st.session_state.k_kmeans, line_dash="dash", line_color="#EF4444", annotation_text=f"K={st.session_state.k_kmeans}")
        fig_elbow.update_traces(line_color="#C084FC", marker_size=8)
        fig_elbow.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=300)
        st.plotly_chart(fig_elbow, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with c_sil:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        st.markdown('<div class="panel-title">2. Silhouette Score Analysis</div>', unsafe_allow_html=True)
        fig_sil = px.line(kmeans_eval_df, x='K', y='Silhouette_Score', markers=True, template="plotly_dark")
        fig_sil.add_vline(x=st.session_state.k_kmeans, line_dash="dash", line_color="#EF4444", annotation_text=f"K={st.session_state.k_kmeans}")
        fig_sil.update_traces(line_color="#06B6D4", marker_size=8)
        fig_sil.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=300)
        st.plotly_chart(fig_sil, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">K-Means Cluster Profiles Summary</div>', unsafe_allow_html=True)
    st.dataframe(profiles_km, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Strategic Marketing Personas & Actions</div>', unsafe_allow_html=True)
    for idx, row in recs_km.iterrows():
        with st.expander(f"📌 Cluster {row['Cluster']} — {row['Persona']} ({row['Customer_Count']} Customers, {row['Share_Pct']}%)", expanded=True):
            st.markdown(f"**Tagline:** {row['Tagline']} | **Risk Level:** `{row['Risk_Level']}`")
            st.markdown(f"- **Avg Recency:** {row['Avg_Recency_Days']} days | **Avg Frequency:** {row['Avg_Frequency']} orders | **Avg Monetary:** ₹{row['Avg_Monetary_INR']:,.2f}")
            st.markdown("**Actionable Marketing Strategy:**")
            for act in row['Recommended_Actions']:
                st.markdown(f"  * {act}")
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 6: HIERARCHICAL CLUSTERING
# -----------------------------------------------------------------------------
elif page == "Hierarchical Clustering":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Hierarchical Agglomerative Clustering</h1>
        <div class="page-banner-sub">Constructing a bottom-up tree hierarchy (Dendrogram) with Ward Linkage.</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Dendrogram Tree Visualization</div>', unsafe_allow_html=True)
    linkage_matrix = pipeline_data["linkage_matrix"]
    
    fig, ax = plt.subplots(figsize=(12, 5))
    fig.patch.set_facecolor('#17192D')
    ax.set_facecolor('#17192D')
    
    dendrogram(
        linkage_matrix,
        truncate_mode='lastp',
        p=30,
        leaf_rotation=90.,
        leaf_font_size=10.,
        show_contracted=True,
        ax=ax
    )
    ax.set_title(f"Agglomerative Clustering Dendrogram (Ward Linkage, K={st.session_state.k_hierarchical})", color='white', fontsize=14)
    ax.set_xlabel("Sample Index or (Cluster Size)", color='white')
    ax.set_ylabel("Ward Distance", color='white')
    ax.tick_params(colors='white')
    for spine in ax.spines.values(): spine.set_color('#334155')

    st.pyplot(fig)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Hierarchical Cluster Profiles</div>', unsafe_allow_html=True)
    st.dataframe(profiles_h, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 7: SALES & DEMOGRAPHICS
# -----------------------------------------------------------------------------
elif page == "Sales & Demographics":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Sales & Demographics Analytics</h1>
        <div class="page-banner-sub">Geographic and demographic customer performance breakdowns.</div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        st.markdown('<div class="panel-title">Top 10 Cities by Revenue</div>', unsafe_allow_html=True)
        df_city = pipeline_data["sales_city"]
        fig_c = px.bar(df_city, x='Total_Revenue', y='city', orientation='h', template='plotly_dark', color='Total_Revenue')
        fig_c.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=340)
        st.plotly_chart(fig_c, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        st.markdown('<div class="panel-title">Review Score Distribution</div>', unsafe_allow_html=True)
        df_rev = pipeline_data["sales_review"]
        fig_r = px.pie(df_rev, names='review_score', values='Count', template='plotly_dark', hole=0.3)
        fig_r.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=340)
        st.plotly_chart(fig_r, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-title">Demographic Spend Breakdown (Age & Gender)</div>', unsafe_allow_html=True)
    df_demo = pipeline_data["sales_demo"]
    fig_demo = px.bar(df_demo, x='Age_Group', y='Total_Spend', color='gender', barmode='group', template='plotly_dark')
    fig_demo.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', height=340)
    st.plotly_chart(fig_demo, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 8: CUSTOMER INSIGHTS
# -----------------------------------------------------------------------------
elif page == "Customer Insights":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Customer Insights Explorer</h1>
        <div class="page-banner-sub">Look up individual customer purchase history and explore cluster personas.</div>
    </div>
    """, unsafe_allow_html=True)

    tab_cust, tab_clust = st.tabs(["👤 Customer Lookup & History", "👥 Cluster Persona Explorer"])

    with tab_cust:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        cust_list = rfm_df['customer_id'].unique()
        selected_cust_id = st.selectbox("Select Customer ID:", cust_list)
        
        c_info = rfm_df[rfm_df['customer_id'] == selected_cust_id].iloc[0]
        c_txs = df_tx[df_tx['customer_id'] == selected_cust_id]
        
        st.markdown(f"### Customer ID: `{selected_cust_id}`")
        i1, i2, i3, i4 = st.columns(4)
        i1.metric("Recency", f"{c_info['Recency']} Days")
        i2.metric("Frequency", f"{c_info['Frequency']} Orders")
        i3.metric("Monetary", f"₹{c_info['Monetary']:,.2f}")
        i4.metric("RFM Segment", c_info['RFM_Segment'])
        
        st.markdown(f"**K-Means Cluster:** Cluster {c_info['kmeans_cluster']} | **Hierarchical Cluster:** Cluster {c_info['hierarchical_cluster']}")
        st.markdown("#### Transaction History")
        st.dataframe(c_txs[['transaction_id', 'order_date', 'product_name', 'category_name', 'quantity', 'price', 'transaction_amount', 'city']], use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with tab_clust:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        selected_c_id = st.selectbox("Select Cluster to Explore:", range(st.session_state.k_kmeans))
        
        # Extract classification info for the selected cluster
        c_rec = recs_km[recs_km['Cluster'] == selected_c_id].iloc[0]
        c_members = rfm_df[rfm_df['kmeans_cluster'] == selected_c_id]
        
        # Prominent Classification Header Card
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 14px; padding: 20px 24px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 style="color: #FFFFFF; margin: 0; font-weight: 800;">Cluster {selected_c_id} Classification: <span style="color: #C084FC;">{c_rec['Persona']}</span></h2>
                    <p style="color: #94A3B8; margin-top: 4px; font-size: 0.95rem;"><b>Business Persona Description:</b> {c_rec['Tagline']}</p>
                </div>
                <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #EF4444; color: #FCA5A5; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">
                    Risk Level: {c_rec['Risk_Level']}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # 4 Summary KPI Metrics for the Cluster
        m_col1, m_col2, m_col3, m_col4 = st.columns(4)
        with m_col1:
            st.metric("Total Customers in Cluster", f"{c_rec['Customer_Count']:,} ({c_rec['Share_Pct']}%)")
        with m_col2:
            st.metric("Avg Recency", f"{c_rec['Avg_Recency_Days']} Days")
        with m_col3:
            st.metric("Avg Frequency", f"{c_rec['Avg_Frequency']} Orders")
        with m_col4:
            st.metric("Avg Monetary", f"₹{c_rec['Avg_Monetary_INR']:,.2f}")

        # Tailored Marketing Actions for this Cluster
        st.markdown("#### 🚀 Recommended Business & Marketing Actions")
        for act in c_rec['Recommended_Actions']:
            st.markdown(f"  * {act}")

        st.markdown("---")
        st.markdown(f"### Customer Members of Cluster {selected_c_id} ({len(c_members)} Customers)")
        st.dataframe(c_members[['customer_id', 'Recency', 'Frequency', 'Monetary', 'RFM_Score', 'RFM_Segment']], use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 9: DATA MANAGEMENT (CRUD)
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# PAGE: INVENTORY & STOCK ANALYTICS
# -----------------------------------------------------------------------------
elif page == "Inventory & Stock Analytics":
    st.markdown('''
    <div class="page-banner">
        <h1 class="page-banner-title">Inventory & Stock Analytics</h1>
        <div class="page-banner-sub">Real-Time Stock Monitoring, Variant Tracking, and Automated Low-Stock Alert System.</div>
    </div>
    ''', unsafe_allow_html=True)

    df_inv = get_inventory()
    df_low = get_low_stock_alerts(threshold=15)

    tot_variants = len(df_inv)
    low_count = len(df_low)
    out_count = len(df_inv[df_inv['available_stock'] == 0])
    normal_count = tot_variants - low_count

    # KPI Summary Cards
    ic1, ic2, ic3, ic4 = st.columns(4)
    with ic1:
        st.markdown(f'''
        <div class="kpi-card-purple">
            <div class="kpi-card-title">Total Active SKUs</div>
            <div class="kpi-card-val">{tot_variants:,}</div>
            <div class="kpi-card-sub">Across 60 Catalog Products</div>
        </div>
        ''', unsafe_allow_html=True)
    with ic2:
        st.markdown(f'''
        <div class="kpi-card-cyan">
            <div class="kpi-card-title">In-Stock Variants</div>
            <div class="kpi-card-val">{normal_count:,}</div>
            <div class="kpi-card-sub">Healthy Inventory Status</div>
        </div>
        ''', unsafe_allow_html=True)
    with ic3:
        st.markdown(f'''
        <div class="kpi-card-dark">
            <div class="kpi-card-title">Low Stock Alerts</div>
            <div class="kpi-card-val" style="color: #F59E0B;">{low_count:,}</div>
            <div class="kpi-card-sub" style="color: #F59E0B;">⚠ At or Below Reorder Point (15)</div>
        </div>
        ''', unsafe_allow_html=True)
    with ic4:
        st.markdown(f'''
        <div class="kpi-card-dark">
            <div class="kpi-card-title">Out of Stock</div>
            <div class="kpi-card-val" style="color: #EF4444;">{out_count:,}</div>
            <div class="kpi-card-sub" style="color: #EF4444;">✖ Immediate Restock Required</div>
        </div>
        ''', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Low Stock Priority Alerts Table
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown("### 🚨 Urgent Low-Stock & Reorder Alerts")
    st.markdown("The following product variants require manager procurement action to prevent out-of-stock lost sales:")
    st.dataframe(df_low, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # Full Catalog Inventory Explorer with Filters
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown("### 📦 Product Variants & Live Stock Explorer")
    
    col_fc1, col_fc2, col_fc3 = st.columns(3)
    with col_fc1:
        cat_filter = st.multiselect("Filter Category", options=df_inv['category_name'].unique().tolist(), default=[])
    with col_fc2:
        status_filter = st.multiselect("Filter Stock Status", options=df_inv['stock_status'].unique().tolist(), default=[])
    with col_fc3:
        search_query = st.text_input("Search Product / SKU", placeholder="e.g. Saree, Shirt, SLSP-...")

    filtered_inv = df_inv.copy()
    if cat_filter:
        filtered_inv = filtered_inv[filtered_inv['category_name'].isin(cat_filter)]
    if status_filter:
        filtered_inv = filtered_inv[filtered_inv['stock_status'].isin(status_filter)]
    if search_query:
        filtered_inv = filtered_inv[
            filtered_inv['product_name'].str.contains(search_query, case=False, na=False) |
            filtered_inv['sku'].str.contains(search_query, case=False, na=False)
        ]

    st.markdown(f"**Showing {len(filtered_inv):,} variants matching criteria:**")
    st.dataframe(filtered_inv, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)


elif page == "Data Management (CRUD)":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Data Management (CRUD)</h1>
        <div class="page-banner-sub">Manage customer profiles and transaction records in the Data Warehouse.</div>
    </div>
    """, unsafe_allow_html=True)

    crud_entity = st.radio("Select Management Entity:", ["👥 Customer Management", "📦 Transaction Management"], horizontal=True)

    # -------------------------------------------------------
    # CUSTOMER CRUD
    # -------------------------------------------------------
    if crud_entity == "👥 Customer Management":
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        
        c_top1, c_top2 = st.columns([7, 3])
        with c_top1:
            search_c = st.text_input("🔍 Search Customers:", "")
        with c_top2:
            st.markdown("<br>", unsafe_allow_html=True)
            open_add_cust = st.button("➕ Add New Customer", type="primary", use_container_width=True)

        filtered_customers = df_cust.copy()
        if search_c:
            filtered_customers = filtered_customers[filtered_customers['customer_id'].astype(str).str.contains(search_c)]

        st.dataframe(filtered_customers[['customer_id', 'gender', 'age', 'city', 'total_orders', 'total_spend', 'latest_order_date']], use_container_width=True, height=360)

        # Dialog Modal for Add Customer
        @st.dialog("➕ Add New Customer Profile")
        def modal_add_customer():
            with st.form("modal_add_cust"):
                m_cid = st.number_input("Customer ID", min_value=10000, max_value=999999, value=99200)
                m_gender = st.selectbox("Gender", ["M", "F", "Unknown"])
                m_age = st.number_input("Age", min_value=18, max_value=100, value=28)
                m_city = st.text_input("City", value="Delhi")
                if st.form_submit_button("Submit Profile", use_container_width=True):
                    try:
                        add_customer(m_cid, m_gender, m_age, m_city)
                        refresh_pipeline()
                        st.toast(f"✅ Customer #{m_cid} added!", icon="🎉")
                        st.rerun()
                    except Exception as ex:
                        st.error(f"Error: {ex}")

        if open_add_cust:
            modal_add_customer()

        # Edit / Delete Section
        col_ed1, col_ed2 = st.columns(2)
        with col_ed1:
            st.markdown("### ✏️ Edit Customer Profile")
            sel_cid_upd = st.selectbox("Select Customer ID:", df_cust['customer_id'].unique(), key="sel_c_upd")
            c_row = df_cust[df_cust['customer_id'] == sel_cid_upd].iloc[0]
            with st.form("edit_c_form"):
                u_gen = st.selectbox("Gender", ["M", "F", "Unknown"], index=["M", "F", "Unknown"].index(c_row['gender']) if c_row['gender'] in ["M", "F", "Unknown"] else 2)
                u_ag = st.number_input("Age", 18, 100, value=int(c_row['age']))
                u_ct = st.text_input("City", value=str(c_row['city']))
                if st.form_submit_button("Update Profile", use_container_width=True):
                    try:
                        update_customer(sel_cid_upd, u_gen, u_ag, u_ct)
                        refresh_pipeline()
                        st.toast(f"✅ Customer #{sel_cid_upd} updated!", icon="⚡")
                        st.rerun()
                    except Exception as ex: st.error(f"Error: {ex}")

        with col_ed2:
            st.markdown("### 🗑️ Delete Customer")
            del_cid_target = st.selectbox("Select Customer ID to Delete:", df_cust['customer_id'].unique(), key="sel_c_del")
            
            @st.dialog("⚠️ Confirm Delete Customer")
            def modal_del_customer(cid):
                st.write(f"Are you sure you want to permanently delete Customer **#{cid}** and all associated transactions?")
                c_d1, c_d2 = st.columns(2)
                with c_d1:
                    if st.button("Cancel", use_container_width=True): st.rerun()
                with c_d2:
                    if st.button("Delete Permanently", type="primary", use_container_width=True):
                        try:
                            delete_customer(cid)
                            refresh_pipeline()
                            st.toast(f"✅ Customer #{cid} deleted.", icon="🗑️")
                            st.rerun()
                        except Exception as ex: st.error(f"Error: {ex}")

            if st.button("Delete Customer Record", type="primary", use_container_width=True):
                modal_del_customer(del_cid_target)

        st.markdown('</div>', unsafe_allow_html=True)

    # -------------------------------------------------------
    # TRANSACTION CRUD
    # -------------------------------------------------------
    else:
        st.markdown('<div class="panel-card">', unsafe_allow_html=True)
        t_top1, t_top2 = st.columns([7, 3])
        with t_top1:
            search_t = st.text_input("🔍 Search Transactions:", "")
        with t_top2:
            st.markdown("<br>", unsafe_allow_html=True)
            open_add_tx = st.button("➕ Add New Transaction", type="primary", use_container_width=True)

        filtered_txs = df_tx.copy()
        if search_t: filtered_txs = filtered_txs[filtered_txs['transaction_id'].astype(str).str.contains(search_t) | filtered_txs['customer_id'].astype(str).str.contains(search_t)]

        st.dataframe(filtered_txs[['transaction_id', 'customer_id', 'order_date', 'product_name', 'category_name', 'quantity', 'price', 'transaction_amount', 'city']], use_container_width=True, height=360)

        # Modal Add Transaction
        @st.dialog("➕ Insert Transaction Record")
        def modal_add_tx():
            with st.form("modal_add_tx_form"):
                m_cid = st.number_input("Customer ID", 10000, 999999, 12345)
                m_dt = st.date_input("Order Date").strftime('%Y-%m-%d')
                m_pid = st.number_input("Product ID", 100, 999, 500)
                m_pname = st.text_input("Product Name", "Pro Wireless Mouse")
                m_cat_id = st.number_input("Category ID", 1, 10, 1)
                m_cat_name = st.selectbox("Category", ["Electronics", "Fashion", "Sports & Outdoors", "Books & Stationery", "Home & Living"])
                m_qty = st.number_input("Quantity", 1, 100, 2)
                m_price = st.number_input("Price (₹)", 1.0, 5000.0, 150.0)
                m_pay = st.selectbox("Payment Method", ["Cash on Delivery", "Credit Card", "Bank Transfer"])
                m_city = st.text_input("City", "Mumbai")
                m_rev = st.slider("Review Score", 1.0, 5.0, 4.0)
                m_gen = st.selectbox("Gender", ["M", "F", "Unknown"])
                m_age = st.number_input("Age", 18, 90, 30)

                if st.form_submit_button("Submit Transaction", use_container_width=True):
                    try:
                        add_transaction(m_cid, m_dt, m_pid, m_cat_id, m_cat_name, m_pname, m_qty, m_price, m_pay, m_city, m_rev, m_gen, m_age)
                        refresh_pipeline()
                        st.toast("✅ Transaction added!", icon="🎉")
                        st.rerun()
                    except Exception as ex: st.error(f"Error: {ex}")

        if open_add_tx: modal_add_tx()

        # Edit / Delete Transaction
        col_tx_e1, col_tx_e2 = st.columns(2)
        with col_tx_e1:
            st.markdown("### ✏️ Edit Transaction")
            sel_tx_edit = st.selectbox("Select Transaction ID:", df_tx['transaction_id'].unique(), key="sel_t_edit")
            tx_row = df_tx[df_tx['transaction_id'] == sel_tx_edit].iloc[0]
            with st.form("edit_tx_form"):
                u_cid = st.number_input("Customer ID", value=int(tx_row['customer_id']))
                u_odt = st.text_input("Order Date (YYYY-MM-DD)", value=str(tx_row['order_date']))
                u_pname = st.text_input("Product Name", value=str(tx_row['product_name']))
                u_qty = st.number_input("Quantity", value=int(tx_row['quantity']))
                u_prc = st.number_input("Price (₹)", value=float(tx_row['price']))
                if st.form_submit_button("Save Transaction Updates", use_container_width=True):
                    try:
                        update_transaction(sel_tx_edit, u_cid, u_odt, int(tx_row['product_id']), int(tx_row['category_id']), str(tx_row['category_name']), u_pname, u_qty, u_prc, str(tx_row['payment_method']), str(tx_row['city']), float(tx_row['review_score']), str(tx_row['gender']), int(tx_row['age']))
                        refresh_pipeline()
                        st.toast(f"✅ Transaction #{sel_tx_edit} updated!", icon="⚡")
                        st.rerun()
                    except Exception as ex: st.error(f"Error: {ex}")

        with col_tx_e2:
            st.markdown("### 🗑️ Delete Transaction")
            del_tx_target = st.selectbox("Select Transaction ID to Delete:", df_tx['transaction_id'].unique(), key="sel_t_del")
            
            @st.dialog("⚠️ Confirm Delete Transaction")
            def modal_del_tx(tx_id):
                st.write(f"Are you sure you want to delete Transaction **#{tx_id}**?")
                t_d1, t_d2 = st.columns(2)
                with t_d1:
                    if st.button("Cancel", use_container_width=True): st.rerun()
                with t_d2:
                    if st.button("Delete Permanently", type="primary", use_container_width=True):
                        try:
                            delete_transaction(tx_id)
                            refresh_pipeline()
                            st.toast(f"✅ Transaction #{tx_id} deleted.", icon="🗑️")
                            st.rerun()
                        except Exception as ex: st.error(f"Error: {ex}")

            if st.button("Delete Transaction Record", type="primary", use_container_width=True):
                modal_del_tx(del_tx_target)

        st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 10: DATA WAREHOUSE SCHEMA
# -----------------------------------------------------------------------------
elif page == "Data Warehouse Schema":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">Data Warehouse Star & Snowflake Schema</h1>
        <div class="page-banner-sub">Enterprise Relational Model of Fact and Dimension Tables in SQLite Database (15,410+ Transactions, 5,000 Customers).</div>
    </div>
    """, unsafe_allow_html=True)

    schema_info = get_warehouse_schema_info()

    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown("""
    ```text
                                         ┌─────────────────────────┐
                                         │       dim_date          │
                                         ├─────────────────────────┤
                                         │ date (PK)               │
                                         │ day, month, quarter, yr │
                                         └────────────┬────────────┘
                                                      │
                                                      ▼
    ┌─────────────────────────┐         ┌───────────────────────────┐         ┌─────────────────────────┐
    │      dim_customer       │         │     fact_transactions     │         │       dim_product       │
    ├─────────────────────────┤         ├───────────────────────────┤         ├─────────────────────────┤
    │ customer_id (PK)        │◄────────┼─ customer_id (FK)         │         │ product_id (PK)         │◄──┐
    │ registration_date       │         │ order_id (Unique)         │         │ product_name            │   │
    │ customer_type, age, gen │         │ order_date (FK)           │         │ category_id, subcategory│   │
    │ city, state, region     │         │ order_status, payment_mthd│         │ brand, unit_price, cost │   │
    │ loyalty_tier, spend     │         │ tx_amount, net_eligible   │         └────────────┬────────────┘   │
    └────────────┬────────────┘         └─────────────┬─────────────┘                      │                │
                 │                                    │                                    ▼                │
                 │                                    ▼                       ┌─────────────────────────┐   │
                 │                      ┌───────────────────────────┐         │  dim_product_variants   │   │
                 │                      │     fact_order_items      │         ├─────────────────────────┤   │
                 │                      ├───────────────────────────┤         │ product_variant_id (PK) │   │
                 │                      │ order_item_id (PK)        │         │ product_id (FK) ────────┼───┘
                 │                      │ order_id (FK)             │         │ sku, size, colour       │
                 │                      │ product_id (FK)           │         │ available_stock, status │
                 │                      │ quantity, price, discount │         └────────────┬────────────┘
                 ▼                      └───────────────────────────┘                      │
    ┌─────────────────────────┐                                                            │
    │  fact_customer_activity │                                                            │
    ├─────────────────────────┤                                                            │
    │ activity_id (PK)        │                                                            │
    │ customer_id (FK)        │                                                            │
    │ timestamp, type, session│                                                            │
    └─────────────────────────┘                                                            ▼
    ```
    """)
    st.markdown('</div>', unsafe_allow_html=True)

    # Interactive Table Explorer
    tbl_names = list(schema_info.keys())
    sel_tbl = st.selectbox("Inspect Table Schema & Live Record Counts", options=tbl_names, index=0)
    
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown(f"### 📋 Table: `{sel_tbl}`")
    st.markdown(f"**Total Live Records:** `{schema_info[sel_tbl]['row_count']:,}` rows")
    st.markdown(f"**Total Attributes:** `{len(schema_info[sel_tbl]['columns'])}` columns")
    st.dataframe(pd.DataFrame(schema_info[sel_tbl]['columns']), use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# PAGE 11: ABOUT SALESPHERE
# -----------------------------------------------------------------------------
elif page == "About SalesSphere":
    st.markdown("""
    <div class="page-banner">
        <h1 class="page-banner-title">About SalesSphere Platform</h1>
        <div class="page-banner-sub">Enterprise Customer Intelligence & Data Mining Specifications.</div>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="panel-card">
        <h3>Enterprise System Architecture</h3>
        <p style="color: #94A3B8;">SalesSphere is a high-performance customer intelligence platform designed for e-commerce sales managers to analyze customer behavior, RFM metrics, and predictive clusters in real time.</p>
        <hr style="border-color: rgba(255, 255, 255, 0.08);">
        <h4>🚀 Core Platform Pillars</h4>
        <ol style="color: #CBD5E1;">
            <li><b>Star Schema Data Warehouse:</b> Relational SQLite database separating Fact transactions and Customer/Product/Date dimensions.</li>
            <li><b>Customer RFM Engine:</b> Automated Recency, Frequency, and Monetary scoring algorithms.</li>
            <li><b>Machine Learning Analytics:</b> K-Means clustering (Elbow & Silhouette evaluation) and Hierarchical Dendrogram tree mining.</li>
            <li><b>Real-Time CRUD Persistence:</b> Instant Data Warehouse synchronization and multi-layer pipeline recalculation upon modifying records.</li>
        </ol>
    </div>
    """, unsafe_allow_html=True)
