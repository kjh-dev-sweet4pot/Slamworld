#!/usr/bin/env python3
"""Parse OWM Excel sheets → JSON metric records for DB import."""
from __future__ import annotations

import json
import re
import sys
from typing import Any

import pandas as pd

FILES = [
    "/Users/eunbee/Downloads/OWM 명동 - 본시트.xlsx",
    "/Users/eunbee/Downloads/브랜드슬램 x OWM.xlsx",
]


def num(v: Any) -> int | None:
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    if isinstance(v, str):
        s = v.strip().replace(",", "")
        if s in ("", "-", "—", "NaN", "nan"):
            return None
        try:
            return int(float(s))
        except ValueError:
            return None
    try:
        if pd.isna(v):
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def url(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    if not s or s.lower() == "nan" or not s.startswith("http"):
        return None
    return s


def name(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def sns_id(v: Any) -> str | None:
    n = name(v)
    if not n:
        return None
    if n.startswith("http"):
        return None
    return n


def norm_name(s: str | None) -> str | None:
    if not s:
        return None
    return re.sub(r"\s+", " ", s.strip().lower())


CHANNEL_MAP = {
    "샤오홍슈": "샤오홍슈",
    "xiaohongshu": "샤오홍슈",
    "xhs": "샤오홍슈",
    "인스타그램": "인스타그램",
    "instagram": "인스타그램",
    "ig": "인스타그램",
    "틱톡": "틱톡",
    "tiktok": "틱톡",
    "tt": "틱톡",
    "도우인": "도우인",
    "douyin": "도우인",
    "웨이보": "웨이보",
    "weibo": "웨이보",
}


def channel(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    if not s:
        return None
    return CHANNEL_MAP.get(s.lower(), CHANNEL_MAP.get(s, s))


def record(
    *,
    source: str,
    urls: list[str | None],
    names: list[str | None],
    sns_ids: list[str | None],
    channel_hint: str | None,
    views: int | None,
    likes: int | None,
    saves: int | None,
    comments: int | None,
    out: list[dict],
) -> None:
    u = [x for x in urls if x]
    n = [x for x in (norm_name(x) for x in names) if x]
    s = [x for x in (sns_id(x) for x in sns_ids) if x]
    if not u and not n and not s:
        return
    if views is None and likes is None and saves is None and comments is None:
        return
    out.append(
        {
            "source": source,
            "urls": u,
            "names": n,
            "sns_ids": s,
            "channel": channel_hint,
            "views": views,
            "likes": likes,
            "saves": saves,
            "comments": comments,
        }
    )


def parse_myeongdong_style(df: pd.DataFrame, source: str, out: list[dict], ch: str = "샤오홍슈") -> None:
    cols = {str(c).strip(): c for c in df.columns}
    for _, row in df.iterrows():
        record(
            source=source,
            urls=[url(row.get(cols.get("Upload_URL", "Upload_URL")))],
            names=[name(row.get(cols.get("Name", "Name")))],
            sns_ids=[row.get(cols.get("SNS_ID", "SNS_ID"))],
            channel_hint=ch,
            views=num(row.get(cols.get("조회수", "조회수"))),
            likes=num(row.get(cols.get("좋아요수", "좋아요수"))),
            saves=num(row.get(cols.get("저장수", "저장수"))),
            comments=None,
            out=out,
        )


def parse_dual_platform(
    df: pd.DataFrame,
    source: str,
    out: list[dict],
    *,
    name_col: str = "name",
    tt_url_col: str = "Posting URL (TT)",
    ig_url_col: str = "Posting URL (IG)",
) -> None:
    cols = {str(c).strip().lower(): c for c in df.columns}
    ncol = cols.get(name_col.lower()) or cols.get("full name")
    tt_url = cols.get(tt_url_col.lower())
    ig_url = cols.get(ig_url_col.lower())
    for _, row in df.iterrows():
        nm = name(row.get(ncol)) if ncol else None
        if tt_url:
            record(
                source=source,
                urls=[url(row.get(tt_url))],
                names=[nm],
                sns_ids=[],
                channel_hint="틱톡",
                views=num(row.get(cols.get("views"))),
                likes=num(row.get(cols.get("likes♥")) or row.get(cols.get("likes"))),
                saves=num(row.get(cols.get("saves"))),
                comments=num(row.get(cols.get("comments"))),
                out=out,
            )
        if ig_url:
            record(
                source=source,
                urls=[url(row.get(ig_url))],
                names=[nm],
                sns_ids=[],
                channel_hint="인스타그램",
                views=num(row.get(cols.get("views(ig)"))),
                likes=num(row.get(cols.get("likes♥(ig)")) or row.get(cols.get("likes(ig)"))),
                saves=num(row.get(cols.get("saves(ig)"))),
                comments=num(row.get(cols.get("comments(ig)"))),
                out=out,
            )


def parse_june_cn(df: pd.DataFrame, source: str, out: list[dict]) -> None:
    cols = {str(c).strip().lower(): c for c in df.columns}
    url_col = cols.get("posting url")
    for _, row in df.iterrows():
        record(
            source=source,
            urls=[url(row.get(url_col)) if url_col else None],
            names=[name(row.get(cols.get("name")))],
            sns_ids=[],
            channel_hint="샤오홍슈",
            views=None,
            likes=num(row.get(cols.get("likes♥"))),
            saves=None,
            comments=num(row.get(cols.get("comments"))),
            out=out,
        )


def parse_mega(df: pd.DataFrame, source: str, out: list[dict]) -> None:
    if df.empty:
        return
    cols = {str(c).strip().lower(): c for c in df.columns}
    for _, row in df.iterrows():
        nm = name(row.get(cols.get("name")))
        pairs = [
            ("틱톡", cols.get("posting url (tt)"), cols.get("views"), cols.get("likes♥"), cols.get("comments"), cols.get("saves")),
            ("인스타그램", cols.get("posting url (ig)"), cols.get("views"), cols.get("likes♥"), cols.get("comments"), cols.get("saves")),
            ("도우인", cols.get("도우인"), None, None, None, None),
            ("웨이보", cols.get("웨이보"), cols.get("views"), cols.get("likes♥"), cols.get("comments"), None),
            ("샤오홍슈", cols.get("샤오홍슈"), None, None, None, None),
        ]
        # row 4 리즈 has douyin url in 도우인 col + weibo metrics in TT columns — handle specially below
        dy = url(row.get(cols.get("도우인"))) if cols.get("도우인") else None
        wb = url(row.get(cols.get("웨이보"))) if cols.get("웨이보") else None
        xhs = url(row.get(cols.get("샤오홍슈"))) if cols.get("샤오홍슈") else None
        tt = url(row.get(cols.get("posting url (tt)"))) if cols.get("posting url (tt)") else None
        ig = url(row.get(cols.get("posting url (ig)"))) if cols.get("posting url (ig)") else None

        v = num(row.get(cols.get("views")))
        lk = num(row.get(cols.get("likes♥")))
        cm = num(row.get(cols.get("comments")))
        sv = num(row.get(cols.get("saves")))

        if tt:
            record(source=source, urls=[tt], names=[nm], sns_ids=[], channel_hint="틱톡",
                   views=v, likes=lk, saves=sv, comments=cm, out=out)
        if ig:
            record(source=source, urls=[ig], names=[nm], sns_ids=[], channel_hint="인스타그램",
                   views=v, likes=lk, saves=sv, comments=cm, out=out)
        if dy and not tt and not ig:
            record(source=source, urls=[dy], names=[nm], sns_ids=[], channel_hint="도우인",
                   views=v, likes=lk, saves=sv, comments=cm, out=out)
        elif dy:
            record(source=source, urls=[dy], names=[nm], sns_ids=[], channel_hint="도우인",
                   views=None, likes=lk, saves=sv, comments=cm, out=out)
        if wb:
            record(source=source, urls=[wb], names=[nm], sns_ids=[], channel_hint="웨이보",
                   views=v, likes=lk, saves=None, comments=cm, out=out)
        if xhs:
            record(source=source, urls=[xhs], names=[nm], sns_ids=[], channel_hint="샤오홍슈",
                   views=None, likes=lk, saves=sv, comments=cm, out=out)


def parse_jonghap(df: pd.DataFrame, source: str, out: list[dict]) -> None:
    """종합 시트 — 섹션별 헤더(이름/채널/조회수/좋아요/URL) 스캔."""
    for i in range(len(df)):
        row = df.iloc[i]
        cells = [str(x).strip() if pd.notna(x) else "" for x in row.tolist()]
        if "이름" in cells and "채널" in cells and "조회수" in cells:
            idx = {h: cells.index(h) for h in ["이름", "채널", "조회수", "저장수", "좋아요"] if h in cells}
            url_idx = next((j for j, c in enumerate(cells) if c.upper() == "URL"), None)
            if url_idx is None:
                continue
            for j in range(i + 1, len(df)):
                r = df.iloc[j]
                vals = [r.iloc[k] if k < len(r) else None for k in range(len(cells))]
                if all(pd.isna(x) or str(x).strip() == "" for x in vals):
                    break
                nm = name(r.iloc[idx["이름"]])
                ch = channel(r.iloc[idx["채널"]])
                if not nm or not ch:
                    continue
                if str(nm) in ("이름", "강남", "북촌", "성수", "종각", "이태원", "신사"):
                    break
                record(
                    source=source,
                    urls=[url(r.iloc[url_idx])],
                    names=[nm],
                    sns_ids=[],
                    channel_hint=ch,
                    views=num(r.iloc[idx["조회수"]]),
                    likes=num(r.iloc[idx["좋아요"]]),
                    saves=num(r.iloc[idx["저장수"]]) if "저장수" in idx else None,
                    comments=None,
                    out=out,
                )


def main() -> None:
    out: list[dict] = []
    f1, f2 = FILES

    xl = pd.ExcelFile(f1)
    if "명동오픈(0811)_리엔장,텔로엑트,옵티팜" in xl.sheet_names:
        parse_myeongdong_style(
            pd.read_excel(f1, sheet_name="명동오픈(0811)_리엔장,텔로엑트,옵티팜"),
            "명동오픈(0811)",
            out,
        )
    if "남포오픈(텔로엑트)" in xl.sheet_names:
        parse_myeongdong_style(
            pd.read_excel(f1, sheet_name="남포오픈(텔로엑트)"),
            "남포오픈",
            out,
        )

    xl2 = pd.ExcelFile(f2)
    parsers = {
        "종합": parse_jonghap,
        "6월 영미권 OWM(강남, 북촌, 성수, 종각, 이태원)": lambda df, s, o: parse_dual_platform(df, s, o),
        "6월 중화권 OWM(강남, 북촌, 성수, 종각, 이태원)": parse_june_cn,
        "6월 신사점 메가": parse_mega,
        "4,5월 성수지점": lambda df, s, o: parse_dual_platform(df, s, o, name_col="name"),
        "4,5월 이태원지점": lambda df, s, o: parse_dual_platform(df, s, o, name_col="Full Name"),
        "이태원성수레포트": lambda df, s, o: parse_dual_platform(df, s, o, name_col="Full Name"),
        "두지점통합레포트": lambda df, s, o: parse_dual_platform(df, s, o, name_col="Full Name"),
        "4,5월  레포트 원본": lambda df, s, o: parse_dual_platform(
            df, s, o, name_col="Full Name", tt_url_col="Posting URL(TT)", ig_url_col="Posting URL(IG)"
        ),
    }
    for sheet, fn in parsers.items():
        if sheet in xl2.sheet_names:
            fn(pd.read_excel(f2, sheet_name=sheet), sheet, out)

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
