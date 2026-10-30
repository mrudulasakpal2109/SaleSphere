"""Business Strategy & Customer Recommendations Engine.
Derives actionable, data-backed marketing strategies and persona profiles
from actual RFM segments, cluster centroids, and sales performance metrics.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any

def generate_cluster_recommendations(rfm_df: pd.DataFrame, cluster_col: str = 'kmeans_cluster') -> List[Dict[str, Any]]:
    """
    Dynamically interprets cluster characteristics based on feature means (Recency, Frequency, Monetary)
    relative to population benchmarks, and assigns business personas, risk levels, and actionable marketing recommendations.
    """
    if rfm_df.empty or cluster_col not in rfm_df.columns:
        return []

    avg_r = rfm_df['Recency'].mean()
    avg_f = rfm_df['Frequency'].mean()
    avg_m = rfm_df['Monetary'].mean()

    cluster_groups = rfm_df.groupby(cluster_col)
    recs = []

    for cluster_id, group in cluster_groups:
        c_r = group['Recency'].mean()
        c_f = group['Frequency'].mean()
        c_m = group['Monetary'].mean()
        count = len(group)
        pct = round((count / len(rfm_df)) * 100, 1)

        is_low_recency = c_r < avg_r       # Bought recently
        is_high_freq = c_f >= avg_f        # Frequently purchases
        is_high_money = c_m >= avg_m       # High monetary contribution

        if is_low_recency and is_high_freq and is_high_money:
            persona = "VIP Champions"
            tagline = "High Value & Frequent Active Shoppers"
            risk_level = "Low Risk"
            actions = [
                "Enroll in exclusive VIP Loyalty Tier & early-access festive sales.",
                "Provide dedicated concierge support and personalized cross-category bundles.",
                "Offer referral bonuses and product review advocacy incentives."
            ]
            color = "#B8860B" # Gold
        elif is_low_recency and is_high_freq and not is_high_money:
            persona = "Loyal Regulars"
            tagline = "Frequent Buyers with Moderate Basket Sizes"
            risk_level = "Low Risk"
            actions = [
                "Implement tiered basket-size incentives (e.g. Free shipping above ₹1499).",
                "Promote multi-buy apparel packs and festive accessory pairings.",
                "Target with weekend reward point accelerators."
            ]
            color = "#1A1A1A" # Dark Slate
        elif is_low_recency and not is_high_freq and is_high_money:
            persona = "Recent Big Spenders"
            tagline = "High-Ticket First/Recent Buyers Needing Nurturing"
            risk_level = "Moderate"
            actions = [
                "Send personalized welcome onboarding series with founder greeting.",
                "Offer 15% discount voucher for second purchase within 30 days.",
                "Recommend trending luxury items in their preferred category."
            ]
            color = "#06B6D4" # Cyan
        elif not is_low_recency and is_high_freq and is_high_money:
            persona = "At-Risk VIPs"
            tagline = "High Lifetime Value Showing Noticeable Purchase Inactivity"
            risk_level = "High Risk"
            actions = [
                "Launch targeted win-back re-engagement campaign via SMS & WhatsApp.",
                "Offer high-value retention voucher (₹500 off next order).",
                "Conduct a 1-question feedback check to identify service friction."
            ]
            color = "#C85A32" # Rust Red
        elif not is_low_recency and not is_high_freq and is_high_money:
            persona = "Lapsed Spenders"
            tagline = "Past High Spenders Who Have Stopped Browsing"
            risk_level = "High Risk"
            actions = [
                "Deploy dynamic retargeting showcasing newest seasonal arrivals.",
                "Provide limited-time anniversary discount code.",
                "Re-engage through category spotlight lookbooks."
            ]
            color = "#EC4899" # Pink
        elif is_low_recency and not is_high_freq and not is_high_money:
            persona = "Recent Promising Buyers"
            tagline = "New Shoppers with Modest Initial Spend"
            risk_level = "Moderate"
            actions = [
                "Send post-purchase thank-you with easy return / exchange tips.",
                "Feature customer testimonials and top-rated wardrobe essentials.",
                "Incentivize second purchase with free standard delivery."
            ]
            color = "#2E8B8B" # Teal
        else:
            persona = "Hibernating / Low Engagement"
            tagline = "Lapsed Low-Frequency & Low-Monetary Shoppers"
            risk_level = "Critical / Dormant"
            actions = [
                "Automated low-cost email reactivation drip sequence.",
                "Suppress from expensive paid advertising to prevent budget waste.",
                "Offer clearance flash sale discounts to stimulate clearance inventory."
            ]
            color = "#8A8A8A" # Muted Grey

        # Compute medians
        med_r = float(group['Recency'].median())
        med_f = float(group['Frequency'].median())
        med_m = float(group['Monetary'].median())

        # Compute scaled feature centroids if scaled columns exist
        c_r_scaled = round(float(group['Recency_Scaled'].mean()), 3) if 'Recency_Scaled' in group.columns else None
        c_f_scaled = round(float(group['Frequency_Scaled'].mean()), 3) if 'Frequency_Scaled' in group.columns else None
        c_m_scaled = round(float(group['Monetary_Scaled'].mean()), 3) if 'Monetary_Scaled' in group.columns else None

        # Compute average PCA coordinates if present
        c_pca1 = round(float(group['PCA1'].mean()), 3) if 'PCA1' in group.columns else None
        c_pca2 = round(float(group['PCA2'].mean()), 3) if 'PCA2' in group.columns else None

        recs.append({
            "cluster": int(cluster_id),
            "label": persona,
            "persona": persona,
            "tagline": tagline,
            "risk_level": risk_level,
            "size": count,
            "customer_count": count,
            "percentage": pct,
            "share_pct": pct,
            "avg_recency": round(c_r, 1),
            "avg_frequency": round(c_f, 1),
            "avg_monetary": round(c_m, 2),
            "median_recency": round(med_r, 1),
            "median_frequency": round(med_f, 1),
            "median_monetary": round(med_m, 2),
            "centroid_recency_scaled": c_r_scaled,
            "centroid_frequency_scaled": c_f_scaled,
            "centroid_monetary_scaled": c_m_scaled,
            "pca1": c_pca1,
            "pca2": c_pca2,
            "recommended_actions": actions,
            "color": color
        })

    return recs
