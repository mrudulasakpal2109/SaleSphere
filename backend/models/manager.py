"""Pydantic models for the Salesphere Manager Dashboard (separate from customer models)."""

import uuid
from datetime import datetime
from typing import Literal, Optional, List, Union

from pydantic import BaseModel, EmailStr, Field

from lib.dates import utcnow
from models.orders import Order


class ManagerLogin(BaseModel):
    email: EmailStr
    password: str


class ManagerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["admin", "manager"] = "manager"


class ManagerOut(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: Literal["admin", "manager"] = "manager"
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------- overview
class Kpis(BaseModel):
    registered_customers: int
    total_orders: int
    open_orders: int
    cancelled_orders: int
    completed_sales: int  # payment_status == Paid and not cancelled
    paid_revenue: float  # revenue only from collected payments
    pending_cod_value: float  # placed COD orders awaiting collection (not revenue)
    avg_order_value: float  # over non-cancelled orders
    active_products: int
    units_in_stock: int
    low_stock_products: int
    out_of_stock_products: int


class TrendPoint(BaseModel):
    date: str
    orders: int
    order_value: float
    paid_revenue: float


class LabelCount(BaseModel):
    label: str
    count: int


class ProductPerformance(BaseModel):
    product_id: str
    name: str
    sku: str
    units: int
    order_value: float


class CategorySales(BaseModel):
    category: str
    units: int
    order_value: float


class RecentOrder(BaseModel):
    id: str
    customer_name: str
    is_guest: bool
    total: float
    status: str
    payment_status: str
    placed_at: Union[datetime, str]


class LiveSalesChartPoint(BaseModel):
    label: str
    interval_start: str
    orders: int
    revenue: float
    items: int


class LiveTransactionItem(BaseModel):
    id: str
    customer_name: str
    customer_email: str
    is_guest: bool
    items_count: int
    items_summary: str
    total: float
    subtotal: float
    discount_total: float
    status: str
    payment_status: str
    payment_method: str
    placed_at: str
    synced_to_dw: bool


class WarehouseSyncStatus(BaseModel):
    last_sync_timestamp: Optional[str] = None
    unsynced_live_orders: int
    synced_live_orders: int
    total_warehouse_records: int
    total_warehouse_revenue: float
    data_source_operational: str = "database/operational.db (op_orders)"
    data_source_warehouse: str = "database/ecommerce_dw.db (fact_transactions)"


class LiveSalesMetrics(BaseModel):
    orders_count: int
    total_orders_placed: int
    cancelled_orders: int
    revenue: float
    avg_order_value: float
    items_sold: int
    unsynced_orders: int


class LiveSalesOverview(BaseModel):
    period: str
    period_label: str
    start_date: str
    end_date: str
    as_of: str
    metrics: LiveSalesMetrics
    chart: list[LiveSalesChartPoint]
    chart_interval: str
    transactions: list[LiveTransactionItem]
    warehouse_status: WarehouseSyncStatus


class Overview(BaseModel):
    as_of: str
    kpis: Kpis
    trend: list[TrendPoint]
    order_status: list[LabelCount]
    payment_status: list[LabelCount]
    top_products: list[ProductPerformance]
    category_sales: list[CategorySales]
    recent_orders: list[RecentOrder]
    live_sales: Optional[LiveSalesOverview] = None


# ---------------------------------------------------------------- inventory
class InventoryItem(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    subcategory: str
    price: float
    stock: int
    stock_status: Literal["in_stock", "low", "out"]
    units_ordered: int


# ---------------------------------------------------------------- customers
class CustomerRow(BaseModel):
    key: str  # customer id, or "guest:<email>" for guest checkouts
    name: str
    email: str
    is_guest: bool
    registered_at: datetime | None = None
    orders: int
    completed_purchases: int
    paid_spend: float
    order_value: float
    last_order_at: datetime | None = None


class CustomerListResponse(BaseModel):
    items: list[CustomerRow]
    total: int


class CustomerDetail(BaseModel):
    customer: CustomerRow
    orders: list[Order]


# ---------------------------------------------------------------- RFM + clustering
class RfmCustomer(BaseModel):
    key: str
    name: str
    email: str
    recency_days: int
    frequency: int
    monetary: float
    r_score: int
    f_score: int
    m_score: int
    rfm_score: str
    segment: str | None = None
    kmeans_cluster: int | None = None
    hierarchical_cluster: int | None = None


class ClusterSummary(BaseModel):
    cluster: int
    label: str
    size: int
    avg_recency: float
    avg_frequency: float
    avg_monetary: float
    percentage: Optional[float] = None
    median_recency: Optional[float] = None
    median_frequency: Optional[float] = None
    median_monetary: Optional[float] = None
    centroid_recency_scaled: Optional[float] = None
    centroid_frequency_scaled: Optional[float] = None
    centroid_monetary_scaled: Optional[float] = None
    pca1: Optional[float] = None
    pca2: Optional[float] = None
    tagline: str | None = None
    recommended_actions: list[str] | None = None
    color: str | None = None


class Dendrogram(BaseModel):
    icoord: list[list[float]]
    dcoord: list[list[float]]
    labels: list[str]


class KMeansEvaluationPoint(BaseModel):
    k: int
    inertia: float
    silhouette_score: float


class RfmResponse(BaseModel):
    status: Literal["ok", "insufficient_data"]
    message: str
    as_of: str
    rules: list[str]
    min_customers: int
    eligible_customers: int
    completed_orders: int
    excluded_orders: int
    customers: list[RfmCustomer]
    kmeans: list[ClusterSummary]
    hierarchical: list[ClusterSummary]
    silhouette: float | None = None
    dendrogram: Dendrogram | None = None
    evaluations: Optional[list[KMeansEvaluationPoint]] = None
    optimal_k_explanation: Optional[str] = None
    centroids: Optional[list[dict]] = None
    k_selected: Optional[int] = 4


# ---------------------------------------------------------------- Data Warehouse & ETL Explorer
class TableColumnMeta(BaseModel):
    name: str
    type: str
    nullable: bool
    is_primary_key: bool
    is_foreign_key: bool
    references: Optional[str] = None
    description: Optional[str] = None


class WarehouseTableSchema(BaseModel):
    table_name: str
    display_name: str
    table_type: Literal["fact", "dimension", "analytics", "audit"]
    row_count: int
    column_count: int
    description: str
    primary_key: list[str]
    foreign_keys: list[dict]
    columns: list[TableColumnMeta]


class WarehouseSchemaResponse(BaseModel):
    database: str
    tables: list[WarehouseTableSchema]
    total_records: int
    star_schema_role: dict[str, str]


class TableDataResponse(BaseModel):
    table_name: str
    total_rows: int
    page: int
    limit: int
    columns: list[str]
    rows: list[dict]


class DatabaseComparisonFeature(BaseModel):
    dimension: str
    oltp_operational: str
    olap_warehouse: str
    salesphere_implementation: str


class DatabaseComparisonResponse(BaseModel):
    title: str
    summary: str
    oltp_name: str
    oltp_db: str
    olap_name: str
    olap_db: str
    features: list[DatabaseComparisonFeature]


class EtlAuditRecord(BaseModel):
    run_id: str
    timestamp: str
    trigger_type: str
    status: str
    duration_ms: float
    records_examined: int
    eligible_orders: int
    inserted_rows: int
    skipped_duplicates: int
    rejected_rows: int
    silhouette_score: Optional[float] = None
    step_timings: dict[str, float] = Field(default_factory=dict)
    notes: Optional[str] = None


class EtlAuditHistoryResponse(BaseModel):
    runs: list[EtlAuditRecord]
    total_runs: int


class DataQualityCheck(BaseModel):
    id: str
    name: str
    category: Literal["referential_integrity", "uniqueness", "completeness", "business_logic", "temporal_consistency"]
    table: str
    description: str
    status: Literal["PASS", "FAIL", "WARNING"]
    total_records_checked: int
    violations_count: int
    details: str
    sql_query: str


class DataQualityResponse(BaseModel):
    timestamp: str
    overall_status: Literal["PASS", "FAIL", "WARNING"]
    checks_passed: int
    checks_total: int
    checks: list[DataQualityCheck]


class TransformationPreviewItem(BaseModel):
    operational_order_id: str
    customer_id: str
    source_fields: dict
    transformed_dw_row: dict
    validation_status: str
    rules_applied: list[str]


class TransformationPreviewResponse(BaseModel):
    description: str
    rules_explained: list[dict]
    sample_items: list[TransformationPreviewItem]


class DataLineageNode(BaseModel):
    id: str
    label: str
    stage: str
    type: Literal["source", "table", "process", "storage", "analytics"]
    description: str


class DataLineageEdge(BaseModel):
    source: str
    target: str
    label: str
    transformation: Optional[str] = None


class DataLineageResponse(BaseModel):
    nodes: list[DataLineageNode]
    edges: list[DataLineageEdge]
    pipeline_stages: list[dict]

