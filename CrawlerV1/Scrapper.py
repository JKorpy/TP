import json
import re
import uuid
from bs4 import BeautifulSoup

INPUT_HTML = "Stores\Tesco\Tesco_Fresh_Food_Page_1.html"
OUTPUT_JSON = "tesco_products.json"

PRICE_RE = re.compile(r"€\s*([0-9]+(?:\.[0-9]{1,2})?)")


def extract_products(html):

    soup = BeautifulSoup(html, "html.parser")
    products = []

    for a in soup.find_all("a", href=True):

        href = a["href"]

        if "/groceries/en-IE/products/" not in href:
            continue

        name = a.get_text(strip=True)

        if not name:
            continue

        product_id = str(uuid.uuid4())

        container = a.parent
        description = ""
        price = ""

        for _ in range(6):

            if container is None:
                break

            text = container.get_text(" ", strip=True)

            price_match = PRICE_RE.search(text)

            if price_match:
                price = price_match.group(1)
                description = text.replace(name, "").strip()
                break

            container = container.parent

        products.append({
            "id": product_id,
            "name": name,
            "price_eur": price,
            "description": description
        })

    return products


def main():

    with open(INPUT_HTML, encoding="utf-8") as f:
        html = f.read()

    products = extract_products(html)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=4, ensure_ascii=False)

    print(f"Extracted {len(products)} products")
    print(f"Saved to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()