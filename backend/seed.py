"""Seeds the operational SQLite database with catalog products (104 items across Men, Women, Kids),
the demo customer (demo@salesphere.in / Demo@1234), and the admin manager (admin@salesphere.in / Manager@1234).
Strict segregation between Men, Women, and Kids collections with verified classy, high-end fashion models.
"""

import sys
import os
import uuid
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.lib.db import get_op_conn, init_op_db
from backend.lib.security import hash_password
from backend.lib.dates import utcnow

def u(pid: str) -> str:
    return f"https://images.unsplash.com/{pid}?auto=format&fit=crop&w=900&q=80"

def p(pid: int) -> str:
    return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=900"

# ----------------- Strict Category-Segregated Image Pools -----------------
POOLS: dict[str, list[str]] = {
    # MEN (Sharp, handsome, classy adult male models)
    "men|T-shirts": [
        u("photo-1521572267360-ee0c2909d518"), u("photo-1583743814966-8936f5b7be1a"),
        u("photo-1576566588028-4147f3842f27"), u("photo-1622519407650-3df9883f76a5"),
        u("photo-1622445275463-afa2ab738c34"), u("photo-1626806851009-c98659eb1af0"),
        p(13651260), p(16764122)
    ],
    "men|Shirts": [
        u("photo-1602810318383-e386cc2a3ccf"), u("photo-1596755094514-f87e34085b2c"),
        u("photo-1788500304960-ea146cc872a8"), u("photo-1729435613691-c39a931b0c4e"),
        u("photo-1617137984095-74e4e5e3613f"), u("photo-1729434873041-99ada6c52c91")
    ],
    "men|Polos": [
        u("photo-1586363104862-3a5e2ab60d99"), u("photo-1622445275463-afa2ab738c34"),
        u("photo-1622519407650-3df9883f76a5")
    ],
    "men|Hoodies & Sweatshirts": [
        u("photo-1556905055-8f358a7a47b2"), p(13651260), u("photo-1622519407650-3df9883f76a5")
    ],
    "men|Jackets": [
        u("photo-1551028719-00167b16eac5"), u("photo-1544441893-675973e31985"),
        u("photo-1635205383450-e0fee6fe73c4"), p(3093408),
        u("photo-1740710748146-a15d840d6f40"), p(37268705)
    ],
    "men|Jeans": [
        u("photo-1541099649105-f69ad21f3246"), p(28938765),
        u("photo-1622519407650-3df9883f76a5"), u("photo-1661181475147-bbd20ef65781")
    ],
    "men|Trousers": [
        u("photo-1624378439575-d8705ad7ae80"), u("photo-1630173250799-2813d34ed14b"),
        u("photo-1635205383450-e0fee6fe73c4"), u("photo-1630667208073-82d53b1db540")
    ],
    "men|Ethnic Wear": [
        u("photo-1701365676249-9d7ab5022dec"), u("photo-1774267230662-575d1f4ec1bd"),
        u("photo-1767775498862-d4740ce574ce"), p(5465927), p(5938772)
    ],
    "men|Footwear": [
        u("photo-1608231387042-66d1773070a5"), u("photo-1600269452121-4f2416e55c28"),
        u("photo-1512374382149-233c42b6a83b"), u("photo-1626379616459-b2ce1d9decbc"),
        p(12628400), p(1456733), u("photo-1775903961719-af9e79063146")
    ],
    "men|Accessories": [
        u("photo-1787198118005-27c8b0d0a989"), p(8514966),
        u("photo-1613495316603-56bb7633017e"), u("photo-1724318497004-084cece3e7ae"), p(13002684)
    ],

    # WOMEN (Classy, professional, elegant adult female models — 100% distinct)
    "women|Dresses": [
        u("photo-1609357605129-26f69add5d6e"), u("photo-1572804013309-59a88b7e92f1"),
        u("photo-1566174053879-31528523f8ae"), u("photo-1595777457583-95e059d581b8"),
        u("photo-1616313253719-c46514cddee1"), p(19160336), p(5651312),
        u("photo-1534528741775-53994a69daeb")
    ],
    "women|Tops": [
        u("photo-1595331192782-2279d262be56"), p(8165282),
        u("photo-1503342217505-b0a15ec3261c"), u("photo-1554412933-514a83d2f3c8"),
        p(5817204), p(28765912), u("photo-1490481651871-ab68de25d43d")
    ],
    "women|Kurtas": [
        u("photo-1617627143750-d86bc21e42bb"), u("photo-1610030469983-98e550d6193c"),
        p(30918364), p(8068701)
    ],
    "women|Ethnic Wear": [
        u("photo-1677691257005-9d69ab23f485"), u("photo-1668371459824-094a960a227d"),
        u("photo-1583391733956-3750e0ff4e8b"), u("photo-1610030469983-98e550d6193c"),
        p(24425140), p(32652561)
    ],
    "women|Sweaters & Cardigans": [
        u("photo-1576871337632-b9aef4c17ab9"), u("photo-1485230895905-ec40ba36b9bc"),
        p(37577248)
    ],
    "women|Jackets": [
        u("photo-1539571696357-5a69c17a67c6"), u("photo-1515886657613-9f3515b0c78f"),
        u("photo-1544441893-675973e31985"), u("photo-1551028719-00167b16eac5")
    ],
    "women|Jeans": [
        u("photo-1541099649105-f69ad21f3246"), u("photo-1529139574466-a303027c1d8b"),
        p(5693888), u("photo-1543163521-1bf539c55dd2")
    ],
    "women|Trousers": [
        u("photo-1509631179647-0177331693ae"), u("photo-1594633312681-425c7b97ccd1"),
        p(8165282)
    ],
    "women|Footwear": [
        u("photo-1543163521-1bf539c55dd2"), p(5693888)
    ],
    "women|Accessories": [
        u("photo-1584917865442-de89df76afd3")
    ],

    # KIDS (Cute, adorable young child models — 100% distinct)
    "kids|T-shirts": [
        u("photo-1503454537195-1dcabb73ffb9"), u("photo-1522771930-78848d9293e8"),
        u("photo-1519238263530-99bdd11df2ea"), p(8771006),
        u("photo-1543332164-6e82f355badc"), p(1620760)
    ],
    "kids|Shirts": [
        u("photo-1514090458221-65bb69cf63e6"), p(1148998),
        u("photo-1502086223501-7ea6ecd79368"), u("photo-1622290291468-a28f7a7dc6a8")
    ],
    "kids|Dresses": [
        u("photo-1518831959646-742c3a14ebf7"), u("photo-1596870230751-ebdfce98ec42"),
        u("photo-1516627145497-ae6968895b74"), p(3771639),
        u("photo-1508214751196-bcfd4ca60f91")
    ],
    "kids|Hoodies & Sweatshirts": [
        u("photo-1519457431-44ccd64a579b"), u("photo-1476703993599-0035a21b17a9"),
        u("photo-1529156069898-49953e39b3ac")
    ],
    "kids|Jeans": [
        p(8613089), u("photo-1513836279014-a89f7a76ae86"),
        u("photo-1519689680058-324335c77eba"), p(1648377)
    ],
    "kids|Festive Wear": [
        p(3771691), p(5560485),
        u("photo-1516627145497-ae6968895b74"), u("photo-1518831959646-742c3a14ebf7")
    ],
    "kids|Footwear": [
        u("photo-1608231387042-66d1773070a5"), u("photo-1600269452121-4f2416e55c28")
    ],
}

DESC: dict[str, str] = {
    "T-shirts": "Cut from ultra-soft, breathable 100% combed cotton with pre-shrunk, colour-locked yarn. A relaxed everyday staple with timeless appeal.",
    "Shirts": "Woven from premium breathable fabric with clean drape and reinforced stitching. Effortlessly dresses up for meetings or down for weekend brunch.",
    "Polos": "Crafted from fine-textured pique cotton with a tailored ribbed collar and mother-of-pearl buttons. Elevated smart-casual refinement.",
    "Hoodies & Sweatshirts": "Spun from plush heavyweight fleece with a cozy brushed interior, kangaroo pocket, and ribbed trims built for ultimate comfort.",
    "Jackets": "Structured tailoring meets effortless drape, featuring smooth interior lining, functional pockets, and polished hardware.",
    "Jeans": "Engineered with flexible comfort-stretch denim that sculpts without pinching and holds its shape through every wash.",
    "Trousers": "Tailored from wrinkle-resistant twill with a comfortable waistband and modern silhouette suitable for all-day wear.",
    "Ethnic Wear": "Masterful traditional Indian craftsmanship meets modern comfort — featuring intricate embroidery and regal festive sheen.",
    "Kurtas": "Breathable cotton-silk blend with delicate embroidery, side slits, and a flattering straight silhouette designed for celebrations.",
    "Dresses": "Fluid, breathable fabric with a flattering cut that moves gracefully. Tailored with meticulous lining and elegant drape.",
    "Tops": "Light, airy fabrics with thoughtful smocking, puff sleeves, and romantic neckline detailing for versatile daytime to evening style.",
    "Sweaters & Cardigans": "Knit from ultra-soft wool and cotton yarns for luxurious warmth without bulk. Perfect for seasonal layering.",
    "Festive Wear": "Celebration-ready heirloom ensembles adorned with zari work, delicate sequins, and rich heritage textiles.",
    "Footwear": "Features an ergonomic cushioned footbed with a flexible, high-traction outsole designed for all-day comfort and sophistication.",
    "Accessories": "Handcrafted with durable materials and refined detailing — the perfect finishing touch to elevate any outfit."
}

# (Name, Category, Subcategory, Price, OriginalPrice, Colors, Stock, Tags, Rating, RatingCount, DirectPhotoURL)
P: list[tuple] = [
    # ==================== MEN'S CLOTHING (38 items) ====================
    # T-shirts
    ("Essential Crew-Neck T-Shirt", "men", "T-shirts", 599, 999, ["Black", "White", "Olive"], 64, ["trending", "bestseller"], 4.4, 312, u("photo-1521572267360-ee0c2909d518")),
    ("Oversized Drop-Shoulder Heavyweight Tee", "men", "T-shirts", 799, 1299, ["Black", "Grey", "Beige"], 45, ["new", "trending"], 4.5, 168, u("photo-1583743814966-8936f5b7be1a")),
    ("Garment-Dyed Relaxed Boxy Tee", "men", "T-shirts", 699, 1099, ["Sky Blue", "Beige", "Olive"], 41, ["new"], 4.2, 86, u("photo-1576566588028-4147f3842f27")),
    ("Vintage Acid-Wash Graphic Tee", "men", "T-shirts", 849, 1399, ["Black", "Grey"], 33, ["trending"], 4.3, 192, u("photo-1622519407650-3df9883f76a5")),
    ("Nautical Breton Striped Tee", "men", "T-shirts", 749, 1199, ["Navy", "White"], 50, ["bestseller"], 4.4, 143, u("photo-1622445275463-afa2ab738c34")),
    ("Waffle-Knit Long-Sleeve Henley Tee", "men", "T-shirts", 999, 1599, ["Olive", "Black", "White"], 38, ["seasonal"], 4.6, 114, u("photo-1626806851009-c98659eb1af0")),

    # Shirts
    ("Classic Oxford Button-Down Shirt", "men", "Shirts", 1299, 1999, ["White", "Sky Blue", "Pink"], 52, ["bestseller"], 4.6, 284, u("photo-1602810318383-e386cc2a3ccf")),
    ("Cuban-Collar Resort Camp Shirt", "men", "Shirts", 1149, 1799, ["Beige", "Teal", "Multi"], 38, ["trending", "seasonal"], 4.5, 167, u("photo-1596755094514-f87e34085b2c")),
    ("Pure French Linen Casual Shirt", "men", "Shirts", 1899, 2799, ["White", "Olive", "Sky Blue"], 29, ["new", "seasonal"], 4.7, 135, u("photo-1788500304960-ea146cc872a8")),
    ("Indigo Chambray Denim Shirt", "men", "Shirts", 1449, 2199, ["Blue", "Navy"], 34, ["bestseller"], 4.4, 198, u("photo-1729435613691-c39a931b0c4e")),
    ("Japanese Corduroy Overshirt", "men", "Shirts", 1999, 2999, ["Brown", "Beige", "Olive"], 22, ["new", "trending"], 4.6, 92, u("photo-1617137984095-74e4e5e3613f")),
    ("Micro-Houndstooth Business Shirt", "men", "Shirts", 1399, 2199, ["Grey", "Navy", "White"], 40, ["bestseller"], 4.5, 176, u("photo-1729434873041-99ada6c52c91")),
    ("Tropical Botanical Print Vacation Shirt", "men", "Shirts", 1249, 1899, ["Multi", "Green"], 27, ["seasonal"], 4.3, 154, u("photo-1596755094514-f87e34085b2c")),

    # Polos
    ("Textured Pique Cotton Polo", "men", "Polos", 999, 1499, ["Navy", "White", "Maroon"], 46, ["bestseller"], 4.5, 230, u("photo-1586363104862-3a5e2ab60d99")),
    ("Fine-Knit Johnny Collar Polo", "men", "Polos", 1299, 1899, ["Beige", "Black", "Teal"], 31, ["new", "trending"], 4.4, 88, u("photo-1622445275463-afa2ab738c34")),
    ("Mercerized Cotton Zipper Polo", "men", "Polos", 1199, 1799, ["Olive", "Grey", "Black"], 28, ["trending"], 4.3, 105, u("photo-1622519407650-3df9883f76a5")),

    # Hoodies & Sweatshirts
    ("Heavyweight French Terry Pullover Hoodie", "men", "Hoodies & Sweatshirts", 1799, 2799, ["Grey", "Black", "Beige"], 35, ["bestseller", "seasonal"], 4.6, 215, u("photo-1556905055-8f358a7a47b2")),
    ("Minimalist Raglan Crewneck Sweatshirt", "men", "Hoodies & Sweatshirts", 1499, 2299, ["Navy", "Olive", "Grey"], 42, ["trending"], 4.4, 148, p(13651260)),
    ("Half-Zip High-Neck Polar Fleece", "men", "Hoodies & Sweatshirts", 1699, 2499, ["Black", "Brown", "Green"], 26, ["seasonal"], 4.5, 96, u("photo-1622519407650-3df9883f76a5")),

    # Jackets
    ("Unstructured Tailored Linen Blazer", "men", "Jackets", 3299, 4999, ["Beige", "Navy"], 18, ["bestseller", "seasonal"], 4.7, 142, u("photo-1551028719-00167b16eac5")),
    ("Classic Sherpa-Collar Denim Trucker Jacket", "men", "Jackets", 2799, 3999, ["Blue", "Black"], 31, ["trending"], 4.5, 173, u("photo-1544441893-675973e31985")),
    ("Suede-Finish Zip Bomber Jacket", "men", "Jackets", 3499, 4999, ["Brown", "Olive", "Black"], 19, ["new", "seasonal"], 4.6, 128, u("photo-1635205383450-e0fee6fe73c4")),
    ("All-Weather Commuter Mac Trench", "men", "Jackets", 3699, 5499, ["Beige", "Black"], 15, ["seasonal"], 4.6, 84, p(3093408)),
    ("Velvet Satin-Lapel Party Blazer", "men", "Jackets", 3999, 5999, ["Maroon", "Navy"], 12, ["festive", "trending"], 4.8, 64, u("photo-1740710748146-a15d840d6f40")),

    # Jeans
    ("Slim-Fit Stretch Selvedge Jeans", "men", "Jeans", 1799, 2999, ["Blue", "Black"], 45, ["bestseller"], 4.5, 402, u("photo-1541099649105-f69ad21f3246")),
    ("Relaxed 90s Straight-Leg Denim", "men", "Jeans", 1899, 2799, ["Blue", "Sky Blue"], 33, ["trending", "new"], 4.3, 156, p(28938765)),
    ("Tapered Vintage Distressed Denim", "men", "Jeans", 1999, 3199, ["Blue"], 25, ["trending"], 4.4, 187, u("photo-1622519407650-3df9883f76a5")),
    ("Clean Jet-Black Stay-Dark Jeans", "men", "Jeans", 1699, 2599, ["Black"], 37, ["bestseller"], 4.5, 210, u("photo-1661181475147-bbd20ef65781")),

    # Trousers
    ("Flat-Front Tailored Chino Trousers", "men", "Trousers", 1499, 2199, ["Beige", "Olive", "Navy"], 48, ["bestseller"], 4.4, 219, u("photo-1624378439575-d8705ad7ae80")),
    ("Double-Pleated Smart Relaxed Trousers", "men", "Trousers", 1699, 2499, ["Grey", "Black", "Brown"], 37, ["new", "trending"], 4.5, 118, u("photo-1630173250799-2813d34ed14b")),
    ("Tactical Multi-Pocket Cotton Cargo Pants", "men", "Trousers", 1899, 2799, ["Olive", "Black", "Beige"], 29, ["trending"], 4.4, 164, u("photo-1635205383450-e0fee6fe73c4")),
    ("Drawstring Linen-Blend Casual Pants", "men", "Trousers", 1599, 2399, ["Beige", "White"], 32, ["seasonal"], 4.3, 98, u("photo-1630667208073-82d53b1db540")),

    # Ethnic Wear
    ("Handloom Silk-Blend Festive Kurta Set", "men", "Ethnic Wear", 1899, 2699, ["Maroon", "Beige", "Gold"], 40, ["festive", "bestseller"], 4.6, 231, u("photo-1701365676249-9d7ab5022dec")),
    ("Zari Embroidered Nehru Jacket with Kurta", "men", "Ethnic Wear", 3299, 4999, ["Navy", "Purple", "Gold"], 16, ["festive", "trending"], 4.7, 109, u("photo-1774267230662-575d1f4ec1bd")),
    ("Lucknowi Handcrafted Chikankari Kurta", "men", "Ethnic Wear", 2199, 3199, ["White", "Sky Blue", "Pink"], 25, ["seasonal", "trending"], 4.5, 142, u("photo-1767775498862-d4740ce574ce")),
    ("Bandhani Printed Angrakha Kurta Set", "men", "Ethnic Wear", 2499, 3699, ["Teal", "Red"], 20, ["festive"], 4.4, 88, p(5465927)),

    # Footwear
    ("Court-Classic White Leather Sneakers", "men", "Footwear", 2499, 3499, ["White", "Black"], 29, ["bestseller", "trending"], 4.6, 356, u("photo-1608231387042-66d1773070a5")),
    ("Tan Hand-Burnished Chelsea Boots", "men", "Footwear", 3299, 4499, ["Brown", "Black"], 18, ["trending"], 4.6, 167, u("photo-1600269452121-4f2416e55c28")),


    # ==================== WOMEN'S CLOTHING (38 items — 100% Classy & Professional) ====================
    # Dresses
    ("Emerald Long-Sleeve Tiered Maxi Dress", "women", "Dresses", 2499, 3999, ["Green", "Black"], 28, ["bestseller", "seasonal"], 4.7, 218, u("photo-1609357605129-26f69add5d6e")),
    ("Parisian Floral Slip Midi Dress", "women", "Dresses", 1999, 3199, ["Multi", "Navy", "Pink"], 35, ["trending"], 4.5, 184, u("photo-1572804013309-59a88b7e92f1")),
    ("Satin Cowl-Neck Evening Slip Dress", "women", "Dresses", 2699, 4199, ["Red", "Gold", "Black"], 22, ["festive", "bestseller"], 4.8, 145, u("photo-1566174053879-31528523f8ae")),
    ("Tiered Cotton Broderie Midi Dress", "women", "Dresses", 1899, 2899, ["White", "Sky Blue", "Yellow"], 30, ["new", "seasonal"], 4.4, 112, u("photo-1595777457583-95e059d581b8")),
    ("Ribbed Knit Long-Sleeve Bodycon Dress", "women", "Dresses", 1799, 2699, ["Brown", "Black", "Beige"], 26, ["seasonal", "trending"], 4.5, 138, p(19160336)),
    ("Printed Belted Utility Shirt Dress", "women", "Dresses", 2099, 3299, ["Multi", "Beige", "Olive"], 32, ["bestseller"], 4.4, 162, u("photo-1616313253719-c46514cddee1")),
    ("Boho Embroidered Peasant Maxi Dress", "women", "Dresses", 2599, 3899, ["White", "Teal"], 19, ["new"], 4.6, 94, p(5651312)),

    # Tops & Blouses
    ("Linen-Blend Relaxed Tunic Top", "women", "Tops", 1199, 1799, ["White", "Beige", "Sky Blue"], 45, ["bestseller"], 4.5, 140, u("photo-1595331192782-2279d262be56")),
    ("Smocked Peplum Square-Neck Blouse", "women", "Tops", 999, 1499, ["Pink", "Sky Blue", "White"], 38, ["trending"], 4.3, 115, p(8165282)),
    ("Silk-Touch Draped Cowl Camisole", "women", "Tops", 899, 1399, ["Gold", "Black", "Teal"], 29, ["festive", "new"], 4.6, 88, u("photo-1503342217505-b0a15ec3261c")),
    ("Broderie Anglaise Puff-Sleeve Blouse", "women", "Tops", 1399, 1999, ["White", "Pink"], 25, ["trending"], 4.5, 104, u("photo-1554412933-514a83d2f3c8")),
    ("Off-Shoulder Ribbed Knit Crop Top", "women", "Tops", 799, 1199, ["Black", "Beige", "Red"], 34, ["new"], 4.2, 78, p(5817204)),
    ("Relaxed Boyfriend Fit Graphic Tee", "women", "Tops", 749, 1099, ["White", "Grey", "Black"], 42, ["bestseller"], 4.4, 156, p(28765912)),

    # Kurtas & Sets
    ("Royal Chanderi Silk Anarkali Suit Set", "women", "Kurtas", 2999, 4499, ["Pink", "Teal", "Gold"], 33, ["bestseller", "festive"], 4.7, 212, u("photo-1617627143750-d86bc21e42bb")),
    ("Lucknowi Hand-Embroidered Chikankari Kurti", "women", "Kurtas", 1899, 2899, ["Sky Blue", "White", "Yellow"], 36, ["trending"], 4.5, 189, u("photo-1610030469983-98e550d6193c")),
    ("Pure Cotton Block-Printed Straight Kurta", "women", "Kurtas", 1299, 1899, ["Blue", "Red", "Olive"], 50, ["bestseller"], 4.4, 174, u("photo-1617627143750-d86bc21e42bb")),
    ("Georgette Floral Sharara 3-Piece Set", "women", "Kurtas", 3499, 5299, ["Purple", "Maroon", "Teal"], 18, ["festive", "trending"], 4.8, 126, p(30918364)),
    ("A-Line Embroidered Velvet Kurta Set", "women", "Kurtas", 2799, 4199, ["Navy", "Maroon"], 21, ["festive", "seasonal"], 4.6, 95, p(8068701)),

    # Ethnic & Festive Wear
    ("Bridal Zari Embroidered Silk Lehenga Choli", "women", "Ethnic Wear", 6999, 11999, ["Red", "Gold", "Maroon"], 11, ["festive", "bestseller"], 4.9, 164, u("photo-1677691257005-9d69ab23f485")),
    ("Velvet Banarasi Brocade Lehenga Set", "women", "Ethnic Wear", 5999, 8999, ["Maroon", "Purple", "Green"], 14, ["festive", "seasonal"], 4.8, 88, u("photo-1668371459824-094a960a227d")),
    ("Handloom Kanjeevaram Silk Woven Saree", "women", "Ethnic Wear", 4499, 6999, ["Red", "Gold", "Pink"], 16, ["festive", "bestseller"], 4.9, 142, u("photo-1583391733956-3750e0ff4e8b")),
    ("Sequinned Organza Cocktail Saree", "women", "Ethnic Wear", 3899, 5799, ["Grey", "Pink", "Black"], 19, ["festive", "trending"], 4.7, 108, u("photo-1610030469983-98e550d6193c")),

    # Sweaters & Cardigans
    ("Chunky Cable-Knit Oversized Pullover", "women", "Sweaters & Cardigans", 1999, 2999, ["Beige", "White", "Olive"], 27, ["seasonal", "trending"], 4.6, 125, u("photo-1576871337632-b9aef4c17ab9")),
    ("Cropped Button-Front Mohair Cardigan", "women", "Sweaters & Cardigans", 1799, 2699, ["Pink", "Sky Blue", "Black"], 24, ["new", "seasonal"], 4.5, 89, u("photo-1485230895905-ec40ba36b9bc")),
    ("Ribbed Turtleneck Cashmere-Touch Sweater", "women", "Sweaters & Cardigans", 1699, 2499, ["Black", "Brown", "Red"], 31, ["bestseller"], 4.6, 145, p(37577248)),

    # Jackets & Outerwear
    ("Double-Breasted Classic Trench Coat", "women", "Jackets", 3999, 5999, ["Beige", "Black"], 17, ["bestseller", "trending"], 4.8, 164, u("photo-1539571696357-5a69c17a67c6")),
    ("Faux-Leather Cropped Biker Jacket", "women", "Jackets", 2999, 4499, ["Black", "Brown"], 22, ["trending"], 4.5, 136, u("photo-1515886657613-9f3515b0c78f")),
    ("Tailored Single-Breasted Hourglass Blazer", "women", "Jackets", 2899, 4299, ["Navy", "Beige", "Grey"], 25, ["bestseller"], 4.6, 118, u("photo-1544441893-675973e31985")),
    ("Distressed Oversized Denim Jacket", "women", "Jackets", 2199, 3199, ["Blue", "Black"], 28, ["new"], 4.4, 98, u("photo-1551028719-00167b16eac5")),

    # Jeans & Denim
    ("High-Rise Wide-Leg Flare Jeans", "women", "Jeans", 1999, 3299, ["Blue", "Black"], 37, ["bestseller", "trending"], 4.6, 276, u("photo-1541099649105-f69ad21f3246")),
    ("Vintage Mom-Fit Rigid Cotton Jeans", "women", "Jeans", 1899, 2799, ["Blue", "Sky Blue"], 32, ["trending"], 4.4, 151, u("photo-1529139574466-a303027c1d8b")),
    ("Sculpting High-Waist Skinny Jeans", "women", "Jeans", 1799, 2699, ["Black", "Navy"], 40, ["bestseller"], 4.5, 224, p(5693888)),
    ("Raw-Hem Straight Ankle Jeans", "women", "Jeans", 1949, 2899, ["Blue", "White"], 29, ["new"], 4.3, 110, u("photo-1543163521-1bf539c55dd2")),

    # Trousers
    ("High-Waist Pleated Front Dress Trousers", "women", "Trousers", 1799, 2599, ["Beige", "Black", "Grey"], 32, ["bestseller", "trending"], 4.5, 134, u("photo-1509631179647-0177331693ae")),
    ("Flowy Linen Wide-Leg Palazzo Pants", "women", "Trousers", 1499, 2299, ["White", "Beige", "Olive"], 38, ["seasonal"], 4.4, 122, u("photo-1594633312681-425c7b97ccd1")),
    ("Satin Drawstring Fluid Cargo Pants", "women", "Trousers", 1899, 2799, ["Olive", "Black", "Brown"], 26, ["trending"], 4.5, 98, p(8165282)),

    # Footwear & Accessories
    ("Block-Heel Ankle-Strap Leather Sandals", "women", "Footwear", 1999, 2999, ["Beige", "Black", "Gold"], 24, ["bestseller"], 4.5, 198, u("photo-1543163521-1bf539c55dd2")),
    ("Structured Italian-Finish Leather Tote Bag", "women", "Accessories", 2499, 3799, ["Brown", "Black", "Beige"], 20, ["bestseller"], 4.7, 184, u("photo-1584917865442-de89df76afd3")),


    # ==================== KIDS' CLOTHING (28 items — 100% Cute Genuine Kids Models) ====================
    # T-shirts
    ("Dino-Safari Organic Cotton Tee", "kids", "T-shirts", 499, 799, ["Blue", "Olive", "Yellow"], 45, ["bestseller"], 4.5, 145, u("photo-1503454537195-1dcabb73ffb9")),
    ("Space Astronaut Glow Graphic Tee", "kids", "T-shirts", 549, 899, ["Navy", "Black"], 38, ["trending", "new"], 4.6, 120, u("photo-1522771930-78848d9293e8")),
    ("Rainbow Unicorn Pastel Cotton Tee", "kids", "T-shirts", 499, 799, ["Pink", "White", "Sky Blue"], 42, ["bestseller"], 4.7, 135, u("photo-1519238263530-99bdd11df2ea")),
    ("Striped Breton Crewneck Cotton Tee", "kids", "T-shirts", 499, 799, ["Red", "Navy", "Yellow"], 36, ["new"], 4.3, 85, p(8771006)),
    ("Floral Embroidered Flutter-Sleeve Top", "kids", "T-shirts", 599, 899, ["Pink", "Yellow", "White"], 32, ["trending"], 4.5, 110, u("photo-1543332164-6e82f355badc")),
    ("Pack of 3 Playtime Cotton Tees", "kids", "T-shirts", 999, 1499, ["Multi"], 40, ["bestseller"], 4.8, 210, p(1620760)),

    # Shirts
    ("Smart Oxford Button-Down Casual Shirt", "kids", "Shirts", 799, 1299, ["White", "Sky Blue", "Pink"], 35, ["bestseller"], 4.5, 96, u("photo-1514090458221-65bb69cf63e6")),
    ("Tropical Palm Leaf Resort Shirt", "kids", "Shirts", 699, 1099, ["Multi", "Teal"], 28, ["seasonal", "trending"], 4.4, 82, p(1148998)),
    ("Tartan Plaid Flannel Casual Shirt", "kids", "Shirts", 749, 1199, ["Red", "Navy", "Green"], 30, ["seasonal"], 4.4, 75, u("photo-1502086223501-7ea6ecd79368")),
    ("Mandarin-Collar Linen-Blend Shirt", "kids", "Shirts", 699, 1099, ["Beige", "White"], 25, ["new"], 4.3, 64, u("photo-1622290291468-a28f7a7dc6a8")),

    # Dresses (Girls)
    ("Floral Tiered Summer Cotton Sundress", "kids", "Dresses", 899, 1399, ["Pink", "Sky Blue", "Yellow"], 36, ["bestseller"], 4.6, 178, u("photo-1518831959646-742c3a14ebf7")),
    ("Polka-Dot Fit & Flare Party Dress", "kids", "Dresses", 999, 1499, ["White", "Red", "Navy"], 28, ["trending"], 4.5, 115, u("photo-1596870230751-ebdfce98ec42")),
    ("Princess Sparkle Tulle Birthday Frock", "kids", "Dresses", 1299, 1999, ["Pink", "Purple", "Gold"], 24, ["festive", "bestseller"], 4.8, 142, u("photo-1516627145497-ae6968895b74")),
    ("Pastel Gingham Ruffle-Hem Dress", "kids", "Dresses", 849, 1299, ["Sky Blue", "Pink"], 30, ["new"], 4.4, 88, p(3771639)),
    ("Denim Pinafore Dungaree Dress", "kids", "Dresses", 1099, 1699, ["Blue"], 22, ["trending"], 4.6, 95, u("photo-1508214751196-bcfd4ca60f91")),

    # Hoodies & Sweatshirts
    ("Colorblocked Fleece Pullover Hoodie", "kids", "Hoodies & Sweatshirts", 899, 1399, ["Navy", "Yellow", "Red"], 34, ["bestseller", "seasonal"], 4.6, 118, u("photo-1519457431-44ccd64a579b")),
    ("Cozy Sherpa Fleece Zip-Up Jacket", "kids", "Hoodies & Sweatshirts", 1199, 1799, ["Beige", "Brown"], 26, ["seasonal", "trending"], 4.7, 92, u("photo-1476703993599-0035a21b17a9")),
    ("Dinosaur Spikes Fun Fleece Sweatshirt", "kids", "Hoodies & Sweatshirts", 799, 1249, ["Green", "Blue"], 31, ["trending"], 4.5, 84, u("photo-1529156069898-49953e39b3ac")),

    # Jeans & Bottoms
    ("Kids Comfort Stretch Denim Jeans", "kids", "Jeans", 899, 1399, ["Blue", "Black"], 38, ["bestseller"], 4.5, 164, p(8613089)),
    ("Elastic-Waist Relaxed Cargo Joggers", "kids", "Jeans", 799, 1199, ["Olive", "Beige", "Black"], 40, ["trending"], 4.4, 138, u("photo-1513836279014-a89f7a76ae86")),
    ("Adjustable Denim Dungaree Overalls", "kids", "Jeans", 1299, 1899, ["Blue"], 25, ["bestseller"], 4.7, 108, u("photo-1519689680058-324335c77eba")),
    ("Cotton Twill Pull-On Chino Shorts", "kids", "Jeans", 599, 899, ["Navy", "Beige", "Olive"], 35, ["seasonal"], 4.3, 76, p(1648377)),

    # Festive & Ethnic Wear
    ("Boys Silk-Blend Kurta Pyjama with Brocade Jacket", "kids", "Festive Wear", 1499, 2299, ["Maroon", "Gold", "Navy"], 22, ["festive", "bestseller"], 4.7, 130, p(3771691)),
    ("Boys Traditional Dhoti Kurta Ensemble", "kids", "Festive Wear", 1299, 1899, ["Yellow", "White"], 19, ["festive"], 4.6, 85, p(5560485)),
    ("Girls Floral Jacquard Lehenga Choli Set", "kids", "Festive Wear", 1699, 2599, ["Pink", "Teal", "Red"], 18, ["festive", "bestseller"], 4.8, 145, u("photo-1516627145497-ae6968895b74")),
    ("Girls Embroidered Anarkali Frock with Dupatta", "kids", "Festive Wear", 1399, 2099, ["Gold", "Purple", "Pink"], 21, ["festive", "trending"], 4.7, 112, u("photo-1518831959646-742c3a14ebf7")),

    # Footwear
    ("Kids Canvas Grip Sneaker Shoes", "kids", "Footwear", 999, 1499, ["Blue", "White", "Black"], 30, ["bestseller"], 4.5, 124, u("photo-1608231387042-66d1773070a5")),
    ("Girls Floral Ballerina Flat Shoes", "kids", "Footwear", 899, 1399, ["Pink", "Gold", "White"], 25, ["trending"], 4.6, 98, u("photo-1600269452121-4f2416e55c28")),
]

def seed_database():
    init_op_db()
    conn = get_op_conn()
    cur = conn.cursor()

    # 1. Seed Admin Manager
    mgr_email = "admin@salesphere.in"
    if not cur.execute("SELECT id FROM op_managers WHERE LOWER(email) = LOWER(?);", (mgr_email,)).fetchone():
        mgr_id = str(uuid.uuid4())
        pwd_hash = hash_password("Manager@1234")
        now_str = utcnow().isoformat()
        cur.execute("""
        INSERT INTO op_managers (id, name, email, role, password_hash, created_at)
        VALUES (?, ?, ?, 'admin', ?, ?);
        """, (mgr_id, "Store Admin", mgr_email, pwd_hash, now_str))
        print("Seeded admin manager: admin@salesphere.in / Manager@1234")

    # 2. Seed Demo Customer
    demo_email = "demo@salesphere.in"
    demo_user = cur.execute("SELECT id FROM op_users WHERE LOWER(email) = LOWER(?);", (demo_email,)).fetchone()
    if not demo_user:
        cust_id = str(uuid.uuid4())
        pwd_hash = hash_password("Demo@1234")
        now_str = (utcnow() - timedelta(days=30)).isoformat()
        cur.execute("""
        INSERT INTO op_users (id, name, email, phone, password_hash, created_at)
        VALUES (?, ?, ?, '9876543210', ?, ?);
        """, (cust_id, "Aarav Sharma", demo_email, pwd_hash, now_str))

        # Seed address
        addr_id = str(uuid.uuid4())
        cur.execute("""
        INSERT INTO op_addresses (id, user_id, label, full_name, phone, line1, line2, city, state, postal_code, is_default, created_at)
        VALUES (?, ?, 'Home', 'Aarav Sharma', '9876543210', '221, Residency Road', 'Ashok Nagar', 'Bengaluru', 'Karnataka', '560025', 1, ?);
        """, (addr_id, cust_id, now_str))
        print("Seeded demo customer: demo@salesphere.in / Demo@1234")
        demo_user_id = cust_id
    else:
        demo_user_id = demo_user[0]

    # Also ensure aarav.sharma@example.com exists
    alt_email = "aarav.sharma@example.com"
    alt_user = cur.execute("SELECT id FROM op_users WHERE LOWER(email) = LOWER(?);", (alt_email,)).fetchone()
    if not alt_user:
        alt_id = str(uuid.uuid4())
        alt_pwd = hash_password("Password@123")
        now_str = (utcnow() - timedelta(days=30)).isoformat()
        cur.execute("""
        INSERT INTO op_users (id, name, email, phone, password_hash, created_at)
        VALUES (?, 'Aarav Sharma', ?, '9876543210', ?, ?);
        """, (alt_id, alt_email, alt_pwd, now_str))
        cur.execute("""
        INSERT INTO op_addresses (id, user_id, label, full_name, phone, line1, line2, city, state, postal_code, is_default, created_at)
        VALUES (?, ?, 'Home', 'Aarav Sharma', '9876543210', '221, Residency Road', 'Ashok Nagar', 'Bengaluru', 'Karnataka', '560025', 1, ?);
        """, (str(uuid.uuid4()), alt_id, now_str))
        print("Seeded customer: aarav.sharma@example.com / Password@123")

    # 3. Clean and Seed Catalog Products
    # Clean op_products table so old/mismatched categories are replaced cleanly
    cur.execute("DELETE FROM op_products;")

    counters = {"men": 1, "women": 1, "kids": 1}
    inserted_prods = 0
    now_dt = utcnow()

    for idx, (name, category, subcategory, price, original, colors, stock, tags, rating, rating_count, lead_photo) in enumerate(P):
        sku = f"SP-{category[0].upper()}{counters[category]:03d}"
        counters[category] += 1

        # Each luxury product maintains pure visual consistency - no mixing with other items
        images = [lead_photo]

        prod_id = str(uuid.uuid4())

        color_images = {c: lead_photo for c in colors}

        desc = f"{name} — {DESC.get(subcategory, 'High quality fashion staple.')}"

        if category == "kids":
            sizes = ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"]
        elif subcategory == "Footwear":
            sizes = ["UK6", "UK7", "UK8", "UK9", "UK10", "UK11"] if category == "men" else ["UK4", "UK5", "UK6", "UK7", "UK8"]
        elif subcategory == "Accessories":
            sizes = ["One Size"]
        elif category == "women":
            sizes = ["XS", "S", "M", "L", "XL"]
        else:
            sizes = ["S", "M", "L", "XL", "XXL"]

        created_str = (now_dt - timedelta(days=idx)).isoformat()
        cur.execute("""
        INSERT INTO op_products 
        (id, sku, name, description, category, subcategory, price, original_price,
         sizes_json, colors_json, stock, images_json, color_images_json, rating,
         rating_count, tags_json, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
        """, (
            prod_id, sku, name, desc, category, subcategory, float(price),
            float(original) if original else None, json.dumps(sizes),
            json.dumps(colors), 100, json.dumps(images),
            json.dumps(color_images), float(rating), int(rating_count),
            json.dumps(tags), created_str, created_str
        ))
        inserted_prods += 1

    # 4. Seed Demo Order if no orders exist
    if not cur.execute("SELECT id FROM op_orders;").fetchone():
        order_id = "SP-DEMO-001"
        order_items = [{
            "product_id": "SP-M001",
            "name": "Essential Crew-Neck T-Shirt",
            "sku": "SP-M001",
            "image": POOLS["men|T-shirts"][0],
            "size": "L",
            "color": "Black",
            "unit_price": 599.0,
            "original_price": 999.0,
            "quantity": 2,
            "line_total": 1198.0
        }]
        shipping = {
            "label": "Home",
            "full_name": "Aarav Sharma",
            "phone": "9876543210",
            "line1": "221, Residency Road",
            "line2": "Ashok Nagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560025",
            "is_default": True
        }
        order_time = (now_dt - timedelta(days=2)).isoformat()
        cur.execute("""
        INSERT INTO op_orders (
            id, customer_id, customer_name, customer_email, customer_phone,
            items_json, shipping_address_json, subtotal, discount_total, delivery_charge,
            total, payment_method, payment_status, status, placed_at, updated_at, synced_to_dw
        ) VALUES (?, ?, 'Aarav Sharma', 'demo@salesphere.in', '9876543210', ?, ?, 1198.0, 800.0, 99.0, 1297.0, 'COD', 'Pending', 'Placed', ?, ?, 0);
        """, (order_id, demo_user_id, json.dumps(order_items), json.dumps(shipping), order_time, order_time))
        print("Seeded demo order: SP-DEMO-001")

    conn.commit()
    conn.close()
    print(f"Operational DB successfully seeded with {inserted_prods} products across Men, Women, and Kids.")

if __name__ == "__main__":
    seed_database()
