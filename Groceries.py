from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("Outputs")

PAGES = [
    ("Spar", "https://www.just-eat.ie/restaurants-spar-artane-artane/menu"),
    ("Centra", "https://www.just-eat.ie/restaurants-centra-coolock-lane-santry-dublin/menu"),
    ("Mace", "https://www.just-eat.ie/restaurants-mace-raheny-dublin/menu"),
    ("Shuppa", "https://www.just-eat.ie/restaurants-shuppa-dublin/menu"),
]

PRICE_RE = re.compile(r"(€\s?\d+(?:[.,]\d{1,2})?)")


# Cleans text by collapsing repeated whitespace into single spaces.
def clean(text):
    return " ".join((text or "").split())


# Converts text into a safe filename-friendly slug.
def slugify(text):
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


# Extracts the first euro price found in a text block.
def get_price(text):
    m = PRICE_RE.search(text or "")
    return m.group(1).replace(" ", "").replace(",", ".") if m else None


# Attempts to click common consent or popup buttons.
def accept_popups(page):
    for label in [
        "Accept all", "Accept All", "Accept",
        "I understand", "Continue", "I agree"
    ]:
        try:
            btn = page.get_by_role("button", name=label).first
            if btn.is_visible(timeout=1200):
                btn.click(timeout=2500)
                page.wait_for_timeout(1200)
        except:
            pass


# Opens a menu page and waits for initial content and popups to settle.
def open_menu(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    accept_popups(page)
    page.wait_for_timeout(1500)


# Scrolls through the live page and collects likely category names.
def discover_categories(page):
    """
    Find categories directly from the live page.
    Repeatedly scroll and collect likely category labels.
    """
    found = []

    def collect_once():
        try:
            return page.evaluate(
                """
                () => {
                    function clean(s) {
                        return (s || "").replace(/\\s+/g, " ").trim();
                    }

                    const skip = new Set([
                        "Categories",
                        "Safety checks",
                        "Skip to main content",
                        "I understand",
                        "Stay inside until the drone flies away",
                        "Keep delivery spot clear",
                        "Do not pull the string",
                        "Do not cut the string",
                        "Search",
                        "Menu"
                    ]);

                    const out = [];
                    const seen = new Set();

                    const imgs = [...document.querySelectorAll("img[alt]")];
                    for (const img of imgs) {
                        const alt = clean(img.getAttribute("alt"));
                        if (!alt) continue;
                        if (alt.endsWith("-avatar")) continue;
                        if (skip.has(alt)) continue;
                        if (alt.length > 80) continue;
                        if (!seen.has(alt)) {
                            seen.add(alt);
                            out.push(alt);
                        }
                    }

                    const nodes = [...document.querySelectorAll("a, button, h2, h3, div, span")];
                    for (const node of nodes) {
                        const txt = clean(node.innerText || node.textContent || "");
                        if (!txt) continue;
                        if (skip.has(txt)) continue;
                        if (txt.length > 80) continue;
                        if (!/[A-Za-z]/.test(txt)) continue;
                        if (!seen.has(txt)) {
                            seen.add(txt);
                            out.push(txt);
                        }
                    }

                    return out;
                }
                """
            )
        except:
            return []

    last_count = -1
    stable_rounds = 0

    for _ in range(24):
        current = collect_once()
        for item in current:
            if item not in found and item.lower() != "highlights":
                found.append(item)

        if len(found) == last_count:
            stable_rounds += 1
        else:
            stable_rounds = 0
            last_count = len(found)

        if stable_rounds >= 4:
            break

        try:
            page.mouse.wheel(0, 1400)
        except:
            pass
        page.wait_for_timeout(700)

    for _ in range(12):
        try:
            page.mouse.wheel(0, -2200)
        except:
            pass
        page.wait_for_timeout(200)

    return found


# Tries multiple strategies to click into a category.
def click_category(page, category_name):
    attempts = [
        lambda: page.get_by_role("link", name=category_name).first.click(timeout=2500),
        lambda: page.get_by_role("button", name=category_name).first.click(timeout=2500),
        lambda: page.get_by_text(category_name, exact=True).first.click(timeout=2500),
        lambda: page.locator(f'img[alt="{category_name}"]').first.click(timeout=2500),
    ]

    for attempt in attempts:
        try:
            attempt()
            page.wait_for_timeout(1800)
            return True
        except:
            pass

    try:
        ok = page.evaluate(
            """
            (name) => {
                function clean(s) {
                    return (s || "").replace(/\\s+/g, " ").trim();
                }

                const img = document.querySelector(`img[alt="${name}"]`);
                if (img) {
                    let node = img;
                    for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
                        if (typeof node.click === "function") {
                            node.click();
                            return true;
                        }
                    }
                }

                const els = [...document.querySelectorAll("a,button,div,span")];
                for (const el of els) {
                    const txt = clean(el.innerText || el.textContent || "");
                    if (txt === name) {
                        let node = el;
                        for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
                            if (typeof node.click === "function") {
                                node.click();
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
            """,
            category_name,
        )
        if ok:
            page.wait_for_timeout(1800)
            return True
    except:
        pass

    return False


# Extracts product names and prices from the currently opened category.
def extract_products_from_open_category(page, category_name):
    products = []
    seen = set()

    selectors = [
        '[data-test-id*="product"]',
        '[data-test-id*="menu-item"]',
        '[data-testid*="product"]',
        '[data-testid*="menu-item"]',
        'article',
        'li',
        'div[class*="product"]',
        'div[class*="item"]',
    ]

    for _ in range(6):
        try:
            page.mouse.wheel(0, 1200)
        except:
            pass
        page.wait_for_timeout(450)

    for sel in selectors:
        try:
            cards = page.locator(sel)
            count = min(cards.count(), 1500)
        except:
            continue

        for i in range(count):
            try:
                raw = cards.nth(i).inner_text(timeout=350)
            except:
                continue

            if not raw:
                continue

            price = get_price(raw)
            if not price:
                continue

            lines = [x.strip() for x in raw.splitlines() if x.strip()]
            name = None
            for line in lines:
                if get_price(line):
                    continue
                if category_name and line.lower() == category_name.lower():
                    continue
                if len(line) > 160:
                    continue
                name = line
                break

            if not name:
                continue

            key = (name.lower(), price.lower(), category_name.lower())
            if key in seen:
                continue
            seen.add(key)
            products.append({
                "name": clean(name),
                "price": price,
                "category": category_name,
            })

    return products


# Returns from a category view back to the categories list.
def go_back_to_categories(page, url):
    try:
        page.go_back(timeout=10000)
        page.wait_for_timeout(2000)
    except:
        open_menu(page, url)


# Scrapes one store page, deduplicates products, and saves them to JSON.
def scrape_store(page, store_name, url):
    print(f"\n=== {store_name} ===")
    open_menu(page, url)
    categories = discover_categories(page)
    categories = [c for c in categories if c.lower() != "highlights"]

    print(f"Discovered {len(categories)} categories")
    print(categories)

    all_products = []

    for idx, category in enumerate(categories, start=1):
        print(f"[{idx}/{len(categories)}] {category}")

        clicked = click_category(page, category)
        print(f"  Clicked: {clicked}")
        if not clicked:
            continue

        products = extract_products_from_open_category(page, category)
        print(f"  Found {len(products)} products")

        if products:
            all_products.extend(products)

        go_back_to_categories(page, url)
        page.wait_for_timeout(1500)

    deduped = []
    seen = set()
    for item in all_products:
        key = (item["name"].lower(), item["price"].lower(), item["category"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    final_data = []
    for i, item in enumerate(deduped, start=1):
        final_data.append({
            "id": i,
            "name": item["name"],
            "price": item["price"],
            "category": item["category"],
        })

    OUTPUT_DIR.mkdir(exist_ok=True)
    output_path = OUTPUT_DIR / f"{slugify(store_name)}.json"
    output_path.write_text(
        json.dumps(final_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Saved {len(final_data)} products to {output_path}")
    return output_path


# Runs the browser workflow across all configured store pages.
def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=120)
        context = browser.new_context(
            viewport={"width": 1440, "height": 2200},
            locale="en-IE",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        saved_files = []
        for store_name, url in PAGES:
            try:
                saved_files.append(scrape_store(page, store_name, url))
            except Exception as e:
                print(f"Failed on {store_name}: {e}")

        browser.close()

    print("\nDone.")
    print("Output files:")
    for path in saved_files:
        print(f" - {path}")


# Starts the script when run directly.
if __name__ == "__main__":
    main()
