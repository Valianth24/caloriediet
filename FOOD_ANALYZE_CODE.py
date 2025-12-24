
# -------------------------
# FOOD ANALYZE (OpenAI Vision)
# -------------------------
import openai
from PIL import Image
import io

# Read OpenAI API Key (OPENAI_KEY or OPENAI_API_KEY)
OPENAI_API_KEY = os.getenv("OPENAI_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()

# Model configuration for diet app
VISION_MODEL_PRIMARY = "gpt-4o-mini"  # Cost-effective for food analysis
VISION_MODEL_FALLBACK = "gpt-4o"      # More accurate for difficult images

class FoodItem(BaseModel):
    name: str
    quantity_estimate: Dict[str, Any] = Field(default_factory=lambda: {"grams": 100, "range_grams": [80, 120]})
    calories_kcal: int
    macros: Dict[str, float] = Field(default_factory=lambda: {"protein_g": 0, "carbs_g": 0, "fat_g": 0})
    confidence: float = 0.7

class FoodAnalyzeRequest(BaseModel):
    image_base64: str
    locale: str = "tr-TR"

class FoodAnalyzeResponse(BaseModel):
    items: List[FoodItem] = []
    total: Dict[str, float] = Field(default_factory=lambda: {"calories_kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0})
    questions: List[str] = []
    notes: str = ""

# Legacy response model for backward compatibility
class AnalyzeFoodRequest(BaseModel):
    image_base64: str
    locale: str = "tr-TR"

class AnalyzeFoodResponse(BaseModel):
    items: List[Dict[str, Any]] = []
    notes: List[str] = []
    needs_user_confirmation: bool = False
    total_calories: int = 0
    total_protein: float = 0
    total_carbs: float = 0
    total_fat: float = 0

def resize_image_base64(base64_str: str, max_size: int = 1280) -> str:
    """Resize image to reduce payload size for API calls."""
    try:
        # Remove data URL prefix if present
        if base64_str.startswith("data:"):
            base64_str = base64_str.split(",", 1)[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        
        # Calculate new size maintaining aspect ratio
        width, height = image.size
        if max(width, height) > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Convert to JPEG with quality reduction
        buffer = io.BytesIO()
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        image.save(buffer, format='JPEG', quality=75)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.warning(f"Image resize failed: {e}, using original")
        return base64_str

async def call_openai_vision(image_base64: str, locale: str = "tr-TR", use_fallback: bool = False) -> Dict[str, Any]:
    """Call OpenAI Vision API to analyze food image."""
    
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured (set OPENAI_KEY or OPENAI_API_KEY)")
    
    # Choose model
    model = VISION_MODEL_FALLBACK if use_fallback else VISION_MODEL_PRIMARY
    
    # Resize image to reduce costs
    resized_base64 = resize_image_base64(image_base64)
    
    # Prepare image URL
    if not resized_base64.startswith("data:"):
        image_url = f"data:image/jpeg;base64,{resized_base64}"
    else:
        image_url = resized_base64
    
    # System prompt for structured food analysis
    system_prompt = """Sen bir yemek ve besin analiz uzmanısın. Fotoğraftaki yiyecekleri analiz et ve JSON formatında yanıt ver.

KURALLAR:
1. Sadece JSON formatında yanıt ver, başka hiçbir metin ekleme
2. Yemek tespit edemezsen items: [] olarak boş döndür
3. Porsiyon tahmininde görsel ipuçlarını kullan (tabak boyutu, el referansı vb.)
4. Güven skoru 0.0-1.0 arasında olmalı
5. Türkçe yemek isimleri kullan

JSON ŞEMASI:
{
  "items": [
    {
      "name": "Yemek adı (Türkçe)",
      "quantity_estimate": {
        "grams": 150,
        "range_grams": [120, 180]
      },
      "calories_kcal": 250,
      "macros": {
        "protein_g": 15.5,
        "carbs_g": 30.0,
        "fat_g": 8.5
      },
      "confidence": 0.85
    }
  ],
  "total": {
    "calories_kcal": 250,
    "protein_g": 15.5,
    "carbs_g": 30.0,
    "fat_g": 8.5
  },
  "questions": ["Soru varsa buraya"],
  "notes": "Önemli notlar"
}"""

    user_prompt = f"""Bu fotoğraftaki yiyecekleri analiz et. Locale: {locale}

Her yiyeceği tespit et ve besin değerlerini tahmin et. Porsiyon büyüklüğünü görsel ipuçlarından belirle.
Kesin JSON formatında yanıt ver."""

    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        # Parse response
        content = response.choices[0].message.content
        result = json.loads(content)
        
        logger.info(f"OpenAI Vision analysis complete. Model: {model}, Items found: {len(result.get('items', []))}")
        return result
        
    except openai.RateLimitError as e:
        logger.error(f"OpenAI rate limit: {e}")
        if not use_fallback:
            # Retry with fallback model
            logger.info("Retrying with fallback model...")
            return await call_openai_vision(image_base64, locale, use_fallback=True)
        raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
    
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        if not use_fallback:
            logger.info("Retrying with fallback model...")
            return await call_openai_vision(image_base64, locale, use_fallback=True)
        raise HTTPException(status_code=502, detail="Food analysis service temporarily unavailable")
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}, content: {content[:200] if content else 'empty'}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis results")
    
    except Exception as e:
        logger.error(f"Unexpected error in vision analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.post("/food/analyze", response_model=AnalyzeFoodResponse)
async def analyze_food(request_data: AnalyzeFoodRequest, current_user: Optional[User] = Depends(get_current_user)):
    """
    Analyze food image using OpenAI Vision API.
    Returns detected food items with calorie and macro estimates.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured. Set OPENAI_KEY environment variable.")
    
    try:
        # Call OpenAI Vision
        result = await call_openai_vision(
            image_base64=request_data.image_base64,
            locale=request_data.locale
        )
        
        # Transform to legacy response format for frontend compatibility
        items = result.get("items", [])
        questions = result.get("questions", [])
        notes = result.get("notes", "")
        
        # Calculate totals
        total_calories = sum(item.get("calories_kcal", 0) for item in items)
        total_protein = sum(item.get("macros", {}).get("protein_g", 0) for item in items)
        total_carbs = sum(item.get("macros", {}).get("carbs_g", 0) for item in items)
        total_fat = sum(item.get("macros", {}).get("fat_g", 0) for item in items)
        
        # Transform items to frontend expected format
        transformed_items = []
        for item in items:
            qty = item.get("quantity_estimate", {})
            macros = item.get("macros", {})
            
            transformed_items.append({
                "label": item.get("name", "Bilinmeyen yemek"),
                "aliases": [],
                "portion": {
                    "estimate_g": qty.get("grams", 100),
                    "range_g": qty.get("range_grams", [80, 120]),
                    "basis": "visual"
                },
                "confidence": item.get("confidence", 0.7),
                "food_id": None,  # Not from database
                "calories": item.get("calories_kcal", 0),
                "protein": macros.get("protein_g", 0),
                "carbs": macros.get("carbs_g", 0),
                "fat": macros.get("fat_g", 0)
            })
        
        # Build notes list
        notes_list = []
        if notes:
            notes_list.append(notes)
        if questions:
            notes_list.extend(questions)
        
        return AnalyzeFoodResponse(
            items=transformed_items,
            notes=notes_list,
            needs_user_confirmation=len(questions) > 0 or any(item.get("confidence", 0) < 0.7 for item in items),
            total_calories=int(total_calories),
            total_protein=round(total_protein, 1),
            total_carbs=round(total_carbs, 1),
            total_fat=round(total_fat, 1)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Food analyze error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# New endpoint with cleaner response format
@api_router.post("/food/analyze/v2", response_model=FoodAnalyzeResponse)
async def analyze_food_v2(request_data: FoodAnalyzeRequest, current_user: Optional[User] = Depends(get_current_user)):
    """
    Analyze food image using OpenAI Vision API (v2 with cleaner response).
    Returns detected food items with calorie and macro estimates.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    
    try:
        result = await call_openai_vision(
            image_base64=request_data.image_base64,
            locale=request_data.locale
        )
        
        return FoodAnalyzeResponse(
            items=[FoodItem(**item) for item in result.get("items", [])],
            total=result.get("total", {"calories_kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}),
            questions=result.get("questions", []),
            notes=result.get("notes", "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Food analyze v2 error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# -------------------------
# WATER TRACKING
# -------------------------
class AddWaterRequest(BaseModel):
  amount: int  # ml


