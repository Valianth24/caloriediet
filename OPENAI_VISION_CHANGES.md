# OpenAI Vision Entegrasyonu - Değişiklik Özeti

## Dosya: backend/server.py

### Kaldırılan Kod (501 stub):
```python
@api_router.post("/food/analyze", response_model=AnalyzeFoodResponse)
async def analyze_food(request_data: AnalyzeFoodRequest, ...):
    raise HTTPException(status_code=501, detail="LLM shim active...")
```

### Eklenen Özellikler:

#### 1. OpenAI API Key Okuma (Line 1058-1059)
```python
OPENAI_API_KEY = os.getenv("OPENAI_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
```

#### 2. Model Konfigürasyonu (Line 1061-1063)
```python
VISION_MODEL_PRIMARY = "gpt-4o-mini"  # Cost-effective
VISION_MODEL_FALLBACK = "gpt-4o"      # More accurate
```

#### 3. Image Resize Fonksiyonu (Line 1096-1127)
- Max 1280px resize
- JPEG %75 kalite
- PNG/RGBA → RGB dönüşümü

#### 4. OpenAI Vision API Çağrısı (Line 1129-1244)
- Async client kullanımı
- JSON structured output (response_format: json_object)
- Rate limit ve API error handling
- Fallback model retry

#### 5. Response Format (Line 1246-1330)
Frontend'in beklediği format:
```json
{
  "items": [
    {
      "label": "Tavuk döner",
      "portion": {"estimate_g": 180, "range_g": [140, 230]},
      "calories": 410,
      "protein": 32,
      "carbs": 28,
      "fat": 18,
      "confidence": 0.72
    }
  ],
  "total_calories": 410,
  "total_protein": 32,
  "total_carbs": 28,
  "total_fat": 18,
  "notes": ["Kalori tahmini porsiyon belirsizliğine göre değişebilir."],
  "needs_user_confirmation": false
}
```

#### 6. V2 Endpoint (Line 1332-1355)
Cleaner response format: `/api/food/analyze/v2`

## Render Deploy Checklist:
1. ✅ OPENAI_KEY environment variable ekle
2. ✅ requirements.txt'te `openai` ve `pillow` var
3. ✅ Backend restart

## Test Komutları:
```bash
# Auth
curl -X POST http://your-backend/api/auth/guest

# Food Analyze (with token)
curl -X POST http://your-backend/api/food/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64>", "locale": "tr-TR"}'
```
