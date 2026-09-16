from supabase import create_client
import os, re
from dotenv import dotenv_values

env = dotenv_values(".env")
sb = create_client(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

res = sb.from_("contents").select("id, campaign, location, influencer_name, channel, upload_url, profile_url").execute()
rows = res.data

def is_profile(url):
    if not url:
        return False
    u = url.strip()
    if "instagram.com" in u:
        if any(x in u for x in ["/p/", "/reel/", "/tv/"]):
            return False
        return True
    if "tiktok.com" in u:
        if "/video/" in u or "vt.tiktok.com" in u or "vm.tiktok.com" in u or "tiktok.com/t/" in u:
            return False
        return True
    if "user/profile" in u:
        return True
    return False

profile_rows = [r for r in rows if is_profile(r.get("upload_url"))]
print(f"Total rows in DB: {len(rows)}")
print(f"Rows where upload_url is a profile URL: {len(profile_rows)}")
for r in profile_rows:
    print(f"ID {r['id']} | {r['campaign']} | {r['influencer_name']} ({r['channel']}) -> upload_url: {r['upload_url']}")
