import re
import requests
from bs4 import BeautifulSoup

DOCTOR_OF_CREDIT_URL = 'https://www.doctorofcredit.com/best-bank-account-bonuses/'


def parse_bonus_entry(text):
    """Parse a TOC entry like 'Chase $300-$400 ($900 With Savings)' into bank name and amount."""
    dollar_idx = text.find('$')
    if dollar_idx == -1:
        return text.strip(), 0

    bank_name = text[:dollar_idx].strip()
    amount_part = text[dollar_idx:]

    amounts = []
    for part in amount_part.split('$'):
        part = part.strip()
        if part:
            num_str = ''
            for ch in part:
                if ch.isdigit() or ch == ',':
                    num_str += ch
                else:
                    break
            if num_str:
                amounts.append(int(num_str.replace(',', '')))

    bonus_amount = max(amounts) if amounts else 0
    return bank_name, bonus_amount


def scrape():
    """Scrape Doctor of Credit for checking, business checking, and OH state bonuses."""
    resp = requests.get(DOCTOR_OF_CREDIT_URL, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, 'html.parser')
    toc = soup.find('div', id='toc_container')
    if not toc:
        return []

    depth1_items = toc.find_all('li', class_='toc_depth_1')
    results = []

    for item in depth1_items:
        link = item.find('a')
        if not link:
            continue
        text = link.get_text(strip=True).lower()

        is_checking = text.startswith('checking') and 'business' not in text
        is_business = 'business' in text and 'checking' in text
        is_state = text.startswith('state') or 'state bonuses' in text

        if is_checking:
            results.extend(_parse_section_entries(item))
        elif is_business:
            results.extend(_parse_section_entries(item))
        elif is_state:
            results.extend(_parse_state_entries(item, 'OH'))

    return results


def _parse_section_entries(section_li):
    """Parse all toc_depth_2 entries under a section."""
    results = []
    sub_items = section_li.find_all('li', class_='toc_depth_2', recursive=False)
    for item in sub_items:
        link = item.find('a')
        if not link:
            continue
        text = link.get_text(strip=True)
        bank_name, bonus_amount = parse_bonus_entry(text)
        if bank_name and bonus_amount:
            results.append({
                'bankName': bank_name,
                'bonusAmount': bonus_amount,
                'description': text,
            })
    return results


def _parse_state_entries(section_li, state_abbr):
    """Parse state-specific entries filtering by state abbreviation."""
    results = []
    sub_items = section_li.find_all('li', class_='toc_depth_2', recursive=False)
    for item in sub_items:
        link = item.find('a')
        if not link:
            continue
        text = link.get_text(strip=True)

        if state_abbr not in text.upper() and 'ohio' not in text.lower():
            continue

        bank_name, bonus_amount = parse_bonus_entry(text)
        if bank_name and bonus_amount:
            results.append({
                'bankName': bank_name,
                'bonusAmount': bonus_amount,
                'description': text,
            })
    return results
