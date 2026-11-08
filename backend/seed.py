from sqlalchemy.orm import Session
from datetime import datetime
import random
import json

from database import engine, SessionLocal, Base
from models import User, Category, Brand, Product, Vehicle, CartItem, WishlistItem, Order, OrderItem
from auth import get_password_hash

Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

def seed_categories():
    categories_data = [
        {"name": "Multimedya CarPlay", "slug": "multimedya-carplay", "icon": "📺", "sort_order": 1},
        {"name": "3D Havuzlu Paspas", "slug": "3d-paspas", "icon": "🛡", "sort_order": 2},
        {"name": "Koltuk Kilifi Minder", "slug": "koltuk-kilifi-minder", "icon": "💺", "sort_order": 3},
        {"name": "Krom Dis Tuning", "slug": "krom-dis-tuning", "icon": "✨", "sort_order": 4},
        {"name": "LED Ambiyans", "slug": "led-ambiyans", "icon": "💡", "sort_order": 5},
        {"name": "Ses Sistemleri Kamera", "slug": "ses-kamera", "icon": "🔊", "sort_order": 6},
        {"name": "Periyodik Bakim Fren", "slug": "periyodik-bakim-fren", "icon": "🔧", "sort_order": 7},
    ]
    for cat_data in categories_data:
        cat = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not cat:
            cat = Category(**cat_data)
            db.add(cat)
    db.commit()
    print("Kategoriler eklendi")

def seed_brands():
    brands_data = [
        {"name": "ADUVA PRO", "slug": "aduva-pro", "sort_order": 1},
        {"name": "ADUVA FIT", "slug": "aduva-fit", "sort_order": 2},
        {"name": "ADUVA DESIGN", "slug": "aduva-design", "sort_order": 3},
        {"name": "BOSCH OEM", "slug": "bosch-oem", "sort_order": 4},
        {"name": "VALEO", "slug": "valeo", "sort_order": 5},
        {"name": "MANN-FILTER", "slug": "mann-filter", "sort_order": 6},
        {"name": "HELLA", "slug": "hella", "sort_order": 7},
        {"name": "BREMBO", "slug": "brembo", "sort_order": 8},
        {"name": "TEXTAR", "slug": "textar", "sort_order": 9},
        {"name": "CONTINENTAL", "slug": "continental", "sort_order": 10},
    ]
    for br_data in brands_data:
        br = db.query(Brand).filter(Brand.slug == br_data["slug"]).first()
        if not br:
            br = Brand(**br_data)
            db.add(br)
    db.commit()
    print("Markalar eklendi")

def seed_vehicles():
    vehicles_data = [
        {"make": "Volkswagen", "model": "Golf 7", "year_start": 2012, "year_end": 2020, "engine": "1.6 TDI", "fuel_type": "dizel"},
        {"make": "Volkswagen", "model": "Golf 7", "year_start": 2012, "year_end": 2020, "engine": "1.5 TSI", "fuel_type": "benzin"},
        {"make": "Volkswagen", "model": "Passat B8", "year_start": 2015, "year_end": 2023, "engine": "1.5 TSI", "fuel_type": "benzin"},
        {"make": "Volkswagen", "model": "Passat B8", "year_start": 2015, "year_end": 2023, "engine": "2.0 TDI", "fuel_type": "dizel"},
        {"make": "Renault", "model": "Clio 5", "year_start": 2019, "year_end": 2026, "engine": "1.0 TCe", "fuel_type": "benzin"},
        {"make": "Renault", "model": "Clio 5", "year_start": 2019, "year_end": 2026, "engine": "1.5 Blue dCi", "fuel_type": "dizel"},
        {"make": "Renault", "model": "Megane 4", "year_start": 2016, "year_end": 2026, "engine": "1.3 TCe", "fuel_type": "benzin"},
        {"make": "Renault", "model": "Megane 4", "year_start": 2016, "year_end": 2026, "engine": "1.5 Blue dCi", "fuel_type": "dizel"},
        {"make": "Toyota", "model": "Corolla", "year_start": 2019, "year_end": 2026, "engine": "1.8 Hybrid", "fuel_type": "hybrid"},
        {"make": "Toyota", "model": "Corolla", "year_start": 2019, "year_end": 2026, "engine": "2.0 Hybrid", "fuel_type": "hybrid"},
        {"make": "Toyota", "model": "Yaris Cross", "year_start": 2021, "year_end": 2026, "engine": "1.5 Hybrid", "fuel_type": "hybrid"},
        {"make": "Peugeot", "model": "3008 II", "year_start": 2017, "year_end": 2024, "engine": "1.5 BlueHDi", "fuel_type": "dizel"},
        {"make": "Peugeot", "model": "3008 II", "year_start": 2017, "year_end": 2024, "engine": "1.6 PureTech", "fuel_type": "benzin"},
        {"make": "Peugeot", "model": "2008 II", "year_start": 2019, "year_end": 2026, "engine": "1.2 PureTech", "fuel_type": "benzin"},
        {"make": "Peugeot", "model": "2008 II", "year_start": 2019, "year_end": 2026, "engine": "1.5 BlueHDi", "fuel_type": "dizel"},
        {"make": "Ford", "model": "Puma", "year_start": 2019, "year_end": 2026, "engine": "1.0 EcoBoost", "fuel_type": "benzin"},
        {"make": "Ford", "model": "Focus 4", "year_start": 2018, "year_end": 2026, "engine": "1.5 EcoBoost", "fuel_type": "benzin"},
        {"make": "Ford", "model": "Focus 4", "year_start": 2018, "year_end": 2026, "engine": "1.5 EcoBlue", "fuel_type": "dizel"},
        {"make": "Fiat", "model": "Egea", "year_start": 2015, "year_end": 2026, "engine": "1.3 MJET", "fuel_type": "dizel"},
        {"make": "Fiat", "model": "Egea", "year_start": 2015, "year_end": 2026, "engine": "1.4 T-Jet", "fuel_type": "benzin"},
        {"make": "Fiat", "model": "Tipo", "year_start": 2016, "year_end": 2026, "engine": "1.6 MJET", "fuel_type": "dizel"},
        {"make": "Opel", "model": "Astra K", "year_start": 2015, "year_end": 2021, "engine": "1.4 Turbo", "fuel_type": "benzin"},
        {"make": "Opel", "model": "Astra K", "year_start": 2015, "year_end": 2021, "engine": "1.6 CDTI", "fuel_type": "dizel"},
        {"make": "Opel", "model": "Astra L", "year_start": 2021, "year_end": 2026, "engine": "1.2 Turbo", "fuel_type": "benzin"},
        {"make": "Opel", "model": "Insignia B", "year_start": 2017, "year_end": 2026, "engine": "1.5 Turbo", "fuel_type": "benzin"},
        {"make": "Opel", "model": "Insignia B", "year_start": 2017, "year_end": 2026, "engine": "1.6 CDTI", "fuel_type": "dizel"},
        {"make": "Mercedes-Benz", "model": "A Sinifi", "year_start": 2018, "year_end": 2026, "engine": "A180 1.3", "fuel_type": "benzin"},
        {"make": "Mercedes-Benz", "model": "C Sinifi", "year_start": 2014, "year_end": 2021, "engine": "C200 1.5", "fuel_type": "benzin"},
        {"make": "BMW", "model": "1 Serisi F40", "year_start": 2019, "year_end": 2026, "engine": "118i 1.5", "fuel_type": "benzin"},
        {"make": "BMW", "model": "3 Serisi G20", "year_start": 2019, "year_end": 2026, "engine": "320i 2.0", "fuel_type": "benzin"},
        {"make": "Audi", "model": "A3 8Y", "year_start": 2020, "year_end": 2026, "engine": "30 TFSI 1.0", "fuel_type": "benzin"},
        {"make": "Audi", "model": "A4 B9", "year_start": 2016, "year_end": 2024, "engine": "35 TFSI 2.0", "fuel_type": "benzin"},
        {"make": "Hyundai", "model": "i20", "year_start": 2020, "year_end": 2026, "engine": "1.0 T-GDI", "fuel_type": "benzin"},
        {"make": "Hyundai", "model": "Tucson", "year_start": 2021, "year_end": 2026, "engine": "1.6 T-GDI Hybrid", "fuel_type": "hybrid"},
        {"make": "Togg", "model": "T10X", "year_start": 2023, "year_end": 2026, "engine": "V2 Uzun Menzil", "fuel_type": "elektrik"},
        {"make": "Togg", "model": "T10F", "year_start": 2024, "year_end": 2026, "engine": "V2 Standart", "fuel_type": "elektrik"},
        {"make": "Chevrolet", "model": "Captiva", "year_start": 2019, "year_end": 2026, "engine": "1.5 Turbo", "fuel_type": "benzin"},
        {"make": "Skoda", "model": "Octavia 3", "year_start": 2013, "year_end": 2020, "engine": "1.5 TSI", "fuel_type": "benzin"},
        {"make": "Skoda", "model": "Octavia 4", "year_start": 2020, "year_end": 2026, "engine": "1.5 TSI", "fuel_type": "benzin"},
        {"make": "Skoda", "model": "Kodiaq", "year_start": 2017, "year_end": 2026, "engine": "2.0 TSI", "fuel_type": "benzin"},
        {"make": "Honda", "model": "Civic FC5", "year_start": 2016, "year_end": 2021, "engine": "1.5 VTEC Turbo", "fuel_type": "benzin"},
        {"make": "Honda", "model": "HR-V", "year_start": 2015, "year_end": 2026, "engine": "1.5 i-VTEC", "fuel_type": "benzin"},
    ]
    for v_data in vehicles_data:
        v = db.query(Vehicle).filter(
            Vehicle.make == v_data["make"],
            Vehicle.model == v_data["model"],
            Vehicle.year_start == v_data["year_start"],
            Vehicle.year_end == v_data["year_end"],
            Vehicle.engine == v_data["engine"]
        ).first()
        if not v:
            v = Vehicle(**v_data)
            db.add(v)
    db.commit()
    print("Arac verileri eklendi")

def seed_users():
    users_data = [
        {"name": "Ahmet Yilmaz", "email": "ahmet@aduvagaraj.com", "password": "123456", "role": "member", "vehicle": {"make": "Volkswagen", "model": "Golf 7", "year": 2018, "engine": "1.5 TSI"}},
        {"name": "Mehmet Kaya", "email": "mehmet@aduvagaraj.com", "password": "123456", "role": "member", "vehicle": {"make": "Opel", "model": "Astra K", "year": 2019, "engine": "1.4 Turbo"}},
        {"name": "Admin", "email": "admin@aduvagaraj.com", "password": "admin123", "role": "admin"},
    ]
    for u_data in users_data:
        u = db.query(User).filter(User.email == u_data["email"]).first()
        if not u:
            vehicle = u_data.pop("vehicle", None)
            u = User(name=u_data["name"], email=u_data["email"], password_hash=get_password_hash(u_data["password"]), role=u_data["role"], vehicle=vehicle)
            db.add(u)
    db.commit()
    print("Kullanicilar eklendi")

def get_category_id(slug):
    cat = db.query(Category).filter(Category.slug == slug).first()
    return cat.id if cat else 1

def get_brand_id(slug):
    br = db.query(Brand).filter(Brand.slug == slug).first()
    return br.id if br else 1

def create_compat_json(make, model, year_start, year_end, engine=None):
    return [{"make": make, "model": model, "year_start": year_start, "year_end": year_end, "engine": engine}]

def seed_products():
    special_products = [
        {"sku": "ADV-1000", "oem_no": "13417363", "title": "Android Auto CarPlay 9 Multimedya Ekran 4GB/64GB", "description": "Kablosuz CarPlay ve Android Auto destekli, DSP ses islemcili, QLED IPS ekranli yeni nesil multimedya sistemi. Direksiyon kumandasi ile tam uyumlu.", "brand_slug": "aduva-pro", "category_slug": "multimedya-carplay", "image": "img/products/adv-1000.jpg", "price": 7499, "old_price": 8999, "stock": 12, "rating": 4.9, "review_count": 48, "badge_type": "Tam Uyum", "free_shipping": True, "compat_json": create_compat_json("Volkswagen", "Golf 7", 2012, 2020, "1.5 TSI")},
        {"sku": "ADV-1001", "oem_no": "5G0061502", "title": "VW Golf 7 (2012-2020) 3D Havuzlu TPE Paspas Seti", "description": "Lazer kesim birebir Golf 7 taban olcusu. Koku yapmayan TPE kauçuk hammadde, klips sabitlemeli, yuksek kenar bariyerli.", "brand_slug": "aduva-fit", "category_slug": "3d-paspas", "image": "img/products/adv-1001.jpg", "price": 1249, "old_price": 1499, "stock": 30, "rating": 4.8, "review_count": 64, "badge_type": "OEM Kalip", "free_shipping": True, "compat_json": create_compat_json("Volkswagen", "Golf 7", 2012, 2020)},
        {"sku": "ADV-1002", "oem_no": "71768789", "title": "Fiat Egea Ozel Kesim Tay Tuyu Deri Koltuk Kilifi (Kirmizi Dikisli)", "description": "Fiat Egea icin ozel kesim, tay tugu dokusu ve yuksek kaliteli deri kombinasyonu. Kirmizi kontrast dikis detaylariyla sport gorunum.", "brand_slug": "aduva-design", "category_slug": "koltuk-kilifi-minder", "image": "img/products/adv-1002.jpg", "price": 3299, "old_price": 3899, "stock": 18, "rating": 4.7, "review_count": 29, "badge_type": "OEM Kalip", "free_shipping": True, "compat_json": create_compat_json("Fiat", "Egea", 2015, 2026)},
        {"sku": "ADV-OPEL-01", "oem_no": "13589742", "title": "Opel Astra J K Insignia Tesla Ekran 9.7 CarPlay Multimedya Cerceve Seti", "description": "Opel Astra J, K ve Insignia icin tasarlanmis 9.7 inc Tesla stil dikey ekran. Wireless CarPlay/Android Auto, cerceve seti dahili.", "brand_slug": "aduva-pro", "category_slug": "multimedya-carplay", "image": "img/products/adv-opel-01.jpg", "price": 8299, "old_price": 9499, "stock": 8, "rating": 4.9, "review_count": 36, "badge_type": "Tam Uyum", "free_shipping": True, "compat_json": create_compat_json("Opel", "Astra K", 2015, 2021, "1.4 Turbo")},
        {"sku": "ADV-BKM-16", "oem_no": "13546879", "title": "Opel Astra J K Insignia 1.6 CDTI Orijinal Bosch Filtre Periyodik Bakim Seti", "description": "Yag filtresi, hava filtresi, polen filtresi ve yakit filtresi iceren tam bakim seti. Orijinal Bosch OEM kalitesinde.", "brand_slug": "bosch-oem", "category_slug": "periyodik-bakim-fren", "image": "img/products/adv-bkm-16.jpg", "price": 1849, "old_price": 2299, "stock": 25, "rating": 4.9, "review_count": 112, "badge_type": "OEM Kalip", "free_shipping": True, "compat_json": create_compat_json("Opel", "Astra K", 2015, 2021, "1.6 CDTI")},
    ]
    for p_data in special_products:
        p = db.query(Product).filter(Product.sku == p_data["sku"]).first()
        if not p:
            p = Product(sku=p_data["sku"], oem_no=p_data["oem_no"], title=p_data["title"], description=p_data["description"], brand_id=get_brand_id(p_data["brand_slug"]), category_id=get_category_id(p_data["category_slug"]), image=p_data["image"], price=p_data["price"], old_price=p_data["old_price"], stock=p_data["stock"], rating=p_data["rating"], review_count=p_data["review_count"], badge_type=p_data["badge_type"], free_shipping=p_data["free_shipping"], compat_json=p_data["compat_json"])
            db.add(p)

    category_configs = [
        {"slug": "multimedya-carplay", "base_price": 3500, "price_step": 130, "count": 16, "brand_slug": "aduva-pro", "prefix": "Multimedya"},
        {"slug": "3d-paspas", "base_price": 800, "price_step": 80, "count": 15, "brand_slug": "aduva-fit", "prefix": "3D Paspas"},
        {"slug": "koltuk-kilifi-minder", "base_price": 1800, "price_step": 150, "count": 14, "brand_slug": "aduva-design", "prefix": "Koltuk Kilifi"},
        {"slug": "krom-dis-tuning", "base_price": 1200, "price_step": 100, "count": 15, "brand_slug": "aduva-design", "prefix": "Krom Aksesuar"},
        {"slug": "led-ambiyans", "base_price": 600, "price_step": 70, "count": 15, "brand_slug": "aduva-pro", "prefix": "LED"},
        {"slug": "ses-kamera", "base_price": 2200, "price_step": 120, "count": 14, "brand_slug": "hella", "prefix": "Ses Sistemi"},
        {"slug": "periyodik-bakim-fren", "base_price": 900, "price_step": 90, "count": 16, "brand_slug": "bosch-oem", "prefix": "Bakim Seti"},
    ]
    vehicles_for_products = [
        {"make": "Renault", "model": "Clio 5", "year_start": 2019, "year_end": 2026},
        {"make": "Renault", "model": "Megane 4", "year_start": 2016, "year_end": 2026},
        {"make": "Toyota", "model": "Corolla", "year_start": 2019, "year_end": 2026},
        {"make": "Peugeot", "model": "3008 II", "year_start": 2017, "year_end": 2024},
        {"make": "Peugeot", "model": "2008 II", "year_start": 2019, "year_end": 2026},
        {"make": "Ford", "model": "Puma", "year_start": 2019, "year_end": 2026},
        {"make": "Volkswagen", "model": "Passat B8", "year_start": 2015, "year_end": 2023},
        {"make": "Fiat", "model": "Egea", "year_start": 2015, "year_end": 2026},
        {"make": "Volkswagen", "model": "Golf 7", "year_start": 2012, "year_end": 2020},
        {"make": "Opel", "model": "Astra K", "year_start": 2015, "year_end": 2021},
        {"make": "Mercedes-Benz", "model": "A Sinifi", "year_start": 2018, "year_end": 2026},
        {"make": "BMW", "model": "1 Serisi F40", "year_start": 2019, "year_end": 2026},
        {"make": "Audi", "model": "A3 8Y", "year_start": 2020, "year_end": 2026},
        {"make": "Hyundai", "model": "i20", "year_start": 2020, "year_end": 2026},
        {"make": "Skoda", "model": "Octavia 4", "year_start": 2020, "year_end": 2026},
        {"make": "Honda", "model": "Civic FC5", "year_start": 2016, "year_end": 2021},
    ]
    sku_counter = 1003
    for cat_config in category_configs:
        cat_id = get_category_id(cat_config["slug"])
        br_id = get_brand_id(cat_config["brand_slug"])
        base_price = cat_config["base_price"]
        step = cat_config["price_step"]
        for i in range(cat_config["count"]):
            vehicle = vehicles_for_products[(sku_counter - 1003) % len(vehicles_for_products)]
            current_price = base_price + (i * step)
            discount_pct = random.randint(13, 21)
            old_price = round(current_price / (1 - discount_pct / 100))
            title = vehicle["make"] + " " + vehicle["model"] + " (" + str(vehicle["year_start"]) + "-" + str(vehicle["year_end"]) + ") Ozel Seri OEM Uyumlu " + cat_config["prefix"] + " Paketi #" + str(i+1)
            p = Product(sku="ADV-" + str(sku_counter).zfill(4), oem_no="OEM" + str(random.randint(1000000, 9999999)), title=title, description=vehicle["make"] + " " + vehicle["model"] + " icin ozel tasarlanmis, OEM kalitesinde " + cat_config["prefix"].lower() + " urunu. Kolay montaj, uzun omurlu kullanim.", brand_id=br_id, category_id=cat_id, image="img/products/adv-" + str(sku_counter).zfill(4) + ".jpg", price=current_price, old_price=old_price, stock=random.randint(5, 50), rating=round(random.uniform(4.5, 4.9), 1), review_count=random.randint(20, 120), badge_type=random.choice(["Tam Uyum", "OEM Kalip"]), free_shipping=random.choice([True, False]), compat_json=create_compat_json(vehicle["make"], vehicle["model"], vehicle["year_start"], vehicle["year_end"]))
            db.add(p)
            sku_counter += 1
    db.commit()
    print("105 urun eklendi (5 ozel + 100 otomatik)")

def main():
    print("=== ADUVA GARAJ Seed Baslatiliyor ===")
    seed_categories()
    seed_brands()
    seed_vehicles()
    seed_users()
    seed_products()
    print("=== Seed Tamamlandi ===")
    print("Demo Hesaplar:")
    print("  Ahmet Yilmaz  -> ahmet@aduvagaraj.com  / 123456")
    print("  Mehmet Kaya   -> mehmet@aduvagaraj.com / 123456")
    print("  Admin         -> admin@aduvagaraj.com  / admin123")

if __name__ == "__main__":
    main()
