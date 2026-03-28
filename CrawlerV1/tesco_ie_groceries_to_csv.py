#!/usr/bin/env python3
import csv
import math
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List, Optional, Tuple
from urllib.parse import urlencode, urljoin, urlparse, parse_qs, urlunparse
import requests 
from bs4 import BeautifulSoup

BASE = "https://www.tesco.ie"

SEED_CATEGORY_URLS = [
    f"{BASE}/groceries/en-IE/shop/fresh-food/all",
    f"{BASE}/groceries/en-IE/shop/bakery/all",
    f"{BASE}/groceries/en-IE/shop/frozen-food/all",
    f"{BASE}/groceries/en-IE/shop/treats-and-snacks/all",
    f"{BASE}/groceries/en-IE/shop/food-cupboard/all",
    f"{BASE}/groceries/en-IE/shop/drinks/all",
    f"{BASE}/groceries/en-IE/shop/baby-and-toddler/all",
    f"{BASE}/groceries/en-IE/shop/health-and-beauty/all",
    f"{BASE}/groceries/en-IE/shop/pets/all",
    f"{BASE}/groceries/en-IE/shop/household/all",
]

ITEMS_PER_PAGE = 48
SLEEP_SECONDS = 20
TIMEOUT = 1000

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IE,en;q=0.9,en-GB;q=0.8",
    "Connection": "keep-alive",
    "Referer": "https://www.tesco.ie/",
}

@dataclass
class ProductRow:
    scraped_at_utc: str
    seed_category: str
    page_url: str
    product_id: str
    name: str
    shelf_price_eur: Optional[float]
    unit_price: Optional[str]
    product_url: str

EURO_RE = re.compile(r"€\s*([0-9]+(?:\.[0-9]{1,2})?)")
SHOWING_RE = re.compile(r"Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+([\d,]+)\s+items", re.IGNORECASE)

def with_paging(url: str, page: int, count: int = ITEMS_PER_PAGE, sort_by: str = "relevance") -> str:
    parts = urlparse(url)
    q = parse_qs(parts.query)
    q["count"] = [str(count)]
    q["page"] = [str(page)]
    q["sortBy"] = [sort_by]
    return urlunparse(parts._replace(query=urlencode(q, doseq=True)))

def parse_total_items(html: str) -> Optional[Tuple[int, int]]:
    m = SHOWING_RE.search(html)
    if not m:
        return None
    start = int(m.group(1))
    end = int(m.group(2))
    total = int(m.group(3).replace(",", ""))
    return total, (end - start + 1)

def extract_products_from_listing(html: str, page_url: str, seed_category: str) -> List[ProductRow]:
    soup = BeautifulSoup(html, "html.parser")
    scraped_at = datetime.now(timezone.utc).isoformat()
    rows: List[ProductRow] = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/groceries/en-IE/products/" not in href:
            continue

        product_url = urljoin(BASE, href)
        pid = product_url.rstrip("/").split("/")[-1]
        if not pid.isdigit() or pid in seen:
            continue
        seen.add(pid)

        name = a.get_text(strip=True)
        if not name:
            continue

        container_text = ""
        node = a
        for _ in range(6):
            node = node.parent
            if not node:
                break
            text = node.get_text(" ", strip=True)
            if EURO_RE.search(text):
                container_text = text
                break

        shelf_price = None
        unit_price = None
        if container_text:
            m = EURO_RE.search(container_text)
            if m:
                try:
                    shelf_price = float(m.group(1))
                except ValueError:
                    pass
            for t in container_text.split():
                if "€" in t and "/" in t:
                    unit_price = t
                    break

        rows.append(ProductRow(
            scraped_at_utc=scraped_at,
            seed_category=seed_category,
            page_url=page_url,
            product_id=pid,
            name=name,
            shelf_price_eur=shelf_price,
            unit_price=unit_price,
            product_url=product_url,
        ))
    return rows

def fetch(session: requests.Session, url: str) -> str:
    for attempt in range(3):
        r = session.get(url, timeout=TIMEOUT)

        if r.status_code == 403:
            print(f"[WARN] 403 on attempt {attempt + 1}: {url}")
            time.sleep(5 + attempt * 3)
            continue

        r.raise_for_status()
        return r.text

    raise Exception(f"Blocked with 403 Forbidden: {url}")

def crawl_seed(session: requests.Session, seed_url: str) -> Iterable[ProductRow]:
    page = 1
    seen_ids = set()

    while True:
        page_url = with_paging(seed_url, page=page)
        html = fetch(session, page_url)
        rows = extract_products_from_listing(html, page_url, seed_url)

        # Stop if no products found on this page
        if not rows:
            break

        # Only keep genuinely new products
        new_rows = []
        for row in rows:
            if row.product_id not in seen_ids:
                seen_ids.add(row.product_id)
                new_rows.append(row)

        # Stop if this page contains no new products
        if not new_rows:
            break

        for row in new_rows:
            yield row

        page += 1
        time.sleep(SLEEP_SECONDS)

def main(out_csv: str = "tesco_ie_groceries_shelf_prices.csv"):
    session = requests.Session()
    session.headers.update(HEADERS)
    fieldnames = [
        "scraped_at_utc",
        "seed_category",
        "page_url",
        "product_id",
        "name",
        "shelf_price_eur",
        "unit_price",
        "product_url",
    ]

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for seed in SEED_CATEGORY_URLS:
            try:
                for row in crawl_seed(session, seed):
                    writer.writerow(row.__dict__)
            except Exception as e:
                print(f"[WARN] Failed seed {seed}: {e}")

    print(f"Finished. Output written to {out_csv}")

if __name__ == "__main__":
    main()
