import re, os
import pandas as pd

def is_profile_url(url):
    if not url or str(url).strip() in ("", "NULL", "none", "nan"):
        return False
    u = str(url).strip()
    # Instagram profile
    if "instagram.com" in u:
        if any(x in u for x in ["/p/", "/reel/", "/reels/", "/tv/"]):
            return False
        return True
    # TikTok profile
    if "tiktok.com" in u:
        if "/video/" in u or "vt.tiktok.com" in u or "vm.tiktok.com" in u or "tiktok.com/t/" in u:
            return False
        return True
    # Xiaohongshu profile
    if "user/profile" in u:
        return True
    return False

with open("supabase/seed.sql", "r", encoding="utf8") as f:
    seed = f.read()

lines = [l.strip() for l in seed.split("\n") if l.strip().startswith("('")]
print(f"Total lines in seed.sql: {len(lines)}")

profile_urls_found = []
for idx, l in enumerate(lines):
    # Regex split to handle commas inside quotes or URLs properly
    # A simple split by ', ' when outside quotes, or using re.findall
    # Each row is ('val', 'val', ...)
    match = re.match(r"^\((.*)\),?$", l)
    if not match:
        continue
    content = match.group(1)
    parts = []
    # simple csv parsing
    cur = []
    in_quote = False
    for char in content:
        if char == "'" and not in_quote:
            in_quote = True
        elif char == "'" and in_quote:
            in_quote = False
        elif char == "," and not in_quote:
            parts.append("".join(cur).strip().strip("'"))
            cur = []
            continue
        cur.append(char)
    parts.append("".join(cur).strip().strip("'"))

    if len(parts) > 12:
        camp = parts[0]
        loc = parts[1]
        name = parts[3]
        ch = parts[6]
        prof = parts[4]
        up_url = parts[12]
        if is_profile_url(up_url):
            profile_urls_found.append({
                "line": idx + 1,
                "camp": camp,
                "loc": loc,
                "name": name,
                "channel": ch,
                "profile_url": prof,
                "upload_url": up_url
            })

print(f"Upload URLs that are actually Profile URLs in seed.sql: {len(profile_urls_found)}")
for p in profile_urls_found:
    print(f"[{p['camp']}] {p['loc']} | {p['name']} ({p['channel']}) -> upload_url: {p['upload_url']}")
