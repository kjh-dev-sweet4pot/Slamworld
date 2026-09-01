-- brands: 브랜드슬램 → OWM (지점명)
UPDATE contents
SET brands = 'OWM (' || location || ')'
WHERE brands = '브랜드슬램';

-- product: 브랜드슬램 패키지 → OWM 패키지
UPDATE contents
SET product = 'OWM 패키지'
WHERE product = '브랜드슬램 패키지';
