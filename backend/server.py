from __future__ import annotations

import os
import uuid
import hashlib
import logging
import secrets
import base64
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode, quote, unquote

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Form, Query
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import re
import json

# Load .env FIRST before reading any env vars
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Configure logging early
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB Configuration (REQUIRED - no memory fallback)
MONGO_URL = os.getenv("MONGO_URL", "").strip()
DB_NAME = os.getenv("DB_NAME", "caloriediet").strip()

# Parse MongoDB host for debug info
def parse_mongo_host(url: str) -> str:
    """Extract host from MongoDB URL for debug purposes."""
    if not url:
        return "not_configured"
    try:
        # Remove protocol
        if "://" in url:
            url = url.split("://")[1]
        # Remove credentials
        if "@" in url:
            url = url.split("@")[1]
        # Get host part
        if "/" in url:
            url = url.split("/")[0]
        if "?" in url:
            url = url.split("?")[0]
        return url
    except:
        return "parse_error"

MONGO_HOST = parse_mongo_host(MONGO_URL)

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
# Callback URL should be your backend's /auth/callback endpoint
OAUTH_CALLBACK_URL = os.getenv("OAUTH_CALLBACK_URL", "").strip()

# Fallback: Auto-construct callback URL from backend URL
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "https://caloriediet-backend.onrender.com").strip()
if not OAUTH_CALLBACK_URL:
    OAUTH_CALLBACK_URL = f"{BACKEND_PUBLIC_URL}/auth/callback"

# In-memory storage for OAuth sessions only (short-lived, 5 min TTL)
_oauth_sessions: Dict[str, Dict[str, Any]] = {}

# MongoDB connection (REQUIRED)
mongo_client = None
mongo_db = None
mongo_connected = False

# Collections used in this app
MONGO_COLLECTIONS = ["users", "user_sessions", "meals", "water", "steps", "vitamins"]

if MONGO_URL:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
        
        mongo_client = AsyncIOMotorClient(MONGO_URL)
        mongo_db = mongo_client[DB_NAME]
        mongo_connected = True
        logger.info(f"✅ MongoDB configured: {DB_NAME} @ {MONGO_HOST}")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        mongo_client = None
        mongo_db = None
        mongo_connected = False
else:
    logger.warning("⚠️ MONGO_URL not set - API write operations will fail!")
    logger.warning("⚠️ Set MONGO_URL environment variable to enable data persistence")

# Optional Emergent integrations (shim exists in repo; still safe-guard)
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # type: ignore
except Exception:
    LlmChat = None
    UserMessage = None
    ImageContent = None

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "").strip()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# -------------------------
# STARTUP EVENT - Run cleanup on server start
# -------------------------
@app.on_event("startup")
async def startup_event():
  """Run cleanup tasks on server startup."""
  logger.info("Starting server...")
  
  # Log storage type
  if mongo_db is not None:
    logger.info(f"Using MongoDB: {DB_NAME}")
  else:
    logger.warning("Using in-memory storage - data will be lost on restart!")
  
  # Run cleanup for expired users (in background)
  try:
    deleted = await cleanup_expired_users()
    if deleted > 0:
      logger.info(f"Startup cleanup: deleted {deleted} expired user accounts")
  except Exception as e:
    logger.error(f"Startup cleanup error: {e}")

# -------------------------
# HEALTH (Render)
# -------------------------
@app.get("/health")
def health():
  return {"ok": True}

@api_router.get("/debug/storage-status")
async def storage_status():
    """Check MongoDB connection status and configuration."""
    # Test actual connection
    actual_connected = False
    if mongo_db is not None:
        try:
            # Ping the database to verify connection
            await mongo_db.command("ping")
            actual_connected = True
        except Exception as e:
            logger.error(f"MongoDB ping failed: {e}")
            actual_connected = False
    
    return {
        "mongoConfigured": bool(MONGO_URL),
        "mongoConnected": actual_connected,
        "dbName": DB_NAME if MONGO_URL else None,
        "mongoHost": MONGO_HOST,
        "collectionsUsed": MONGO_COLLECTIONS,
        "dataRetentionDays": DATA_RETENTION_DAYS if 'DATA_RETENTION_DAYS' in globals() else 35,
        "status": "ready" if actual_connected else "not_connected",
    }


# -------------------------
# GOOGLE OAUTH ENDPOINTS
# -------------------------

def generate_state(redirect_url: str) -> str:
  """Generate a signed state parameter containing the redirect URL."""
  # Simple encoding - in production, use proper signing/encryption
  state_data = f"{redirect_url}|{secrets.token_urlsafe(16)}"
  return base64.urlsafe_b64encode(state_data.encode()).decode()

def decode_state(state: str) -> Optional[str]:
  """Decode state parameter and extract redirect URL."""
  try:
    decoded = base64.urlsafe_b64decode(state.encode()).decode()
    parts = decoded.split("|")
    if len(parts) >= 1:
      return parts[0]
  except Exception as e:
    logger.error(f"Failed to decode state: {e}")
  return None

def validate_redirect_url(redirect_url: str) -> bool:
  """Validate that redirect URL uses allowed schemes."""
  allowed_schemes = ['exp', 'caloriediet', 'http', 'https']
  try:
    # Simple scheme extraction
    scheme = redirect_url.split("://")[0].lower()
    return scheme in allowed_schemes
  except:
    return False

def create_oauth_session(user_data: Dict[str, Any]) -> str:
  """Create a short-lived OAuth session and return session_id."""
  session_id = f"oauth_{secrets.token_urlsafe(32)}"
  _oauth_sessions[session_id] = {
    "user_data": user_data,
    "created_at": datetime.now(timezone.utc),
    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5)
  }
  # Clean up expired sessions
  cleanup_expired_oauth_sessions()
  return session_id

def get_oauth_session(session_id: str) -> Optional[Dict[str, Any]]:
  """Get OAuth session data if valid and not expired."""
  session = _oauth_sessions.get(session_id)
  if not session:
    return None
  if datetime.now(timezone.utc) > session["expires_at"]:
    del _oauth_sessions[session_id]
    return None
  return session["user_data"]

def cleanup_expired_oauth_sessions():
  """Remove expired OAuth sessions."""
  now = datetime.now(timezone.utc)
  expired = [k for k, v in _oauth_sessions.items() if now > v["expires_at"]]
  for k in expired:
    del _oauth_sessions[k]


@app.get("/auth/v1/env/oauth/redirect")
async def oauth_redirect(redirect_url: str = Query(..., description="URL to redirect after OAuth")):
  """
  Start Google OAuth flow.
  Validates redirect_url and redirects to Google OAuth authorize endpoint.
  """
  # Validate redirect URL scheme
  if not validate_redirect_url(redirect_url):
    raise HTTPException(status_code=400, detail="Invalid redirect URL scheme. Must be exp://, caloriediet://, http://, or https://")
  
  # Check if Google OAuth is configured
  if not GOOGLE_OAUTH_CLIENT_ID:
    logger.error("GOOGLE_OAUTH_CLIENT_ID not configured")
    raise HTTPException(status_code=500, detail="Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID environment variable.")
  
  # Generate state with redirect URL embedded
  state = generate_state(redirect_url)
  
  # Build Google OAuth authorize URL
  params = {
    "client_id": GOOGLE_OAUTH_CLIENT_ID,
    "redirect_uri": OAUTH_CALLBACK_URL,
    "response_type": "code",
    "scope": "openid email profile",
    "state": state,
    "access_type": "offline",
    "prompt": "select_account"
  }
  
  google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
  
  logger.info(f"Redirecting to Google OAuth. Callback: {OAUTH_CALLBACK_URL}")
  
  return RedirectResponse(url=google_auth_url, status_code=302)


@app.get("/auth/callback")
async def oauth_callback(
  code: str = Query(None),
  state: str = Query(None),
  error: str = Query(None)
):
  """
  Handle Google OAuth callback.
  Exchanges code for tokens, fetches user info, creates session.
  """
  # Handle OAuth errors
  if error:
    logger.error(f"OAuth error: {error}")
    return HTMLResponse(
      content=f"<html><body><h1>Login Error</h1><p>{error}</p></body></html>",
      status_code=400
    )
  
  if not code or not state:
    raise HTTPException(status_code=400, detail="Missing code or state parameter")
  
  # Decode redirect URL from state
  redirect_url = decode_state(state)
  if not redirect_url:
    raise HTTPException(status_code=400, detail="Invalid state parameter")
  
  # Check if Google OAuth is configured
  if not GOOGLE_OAUTH_CLIENT_ID or not GOOGLE_OAUTH_CLIENT_SECRET:
    raise HTTPException(status_code=500, detail="Google OAuth not fully configured")
  
  try:
    async with httpx.AsyncClient(timeout=30.0) as client:
      # Exchange code for tokens
      token_response = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
          "code": code,
          "client_id": GOOGLE_OAUTH_CLIENT_ID,
          "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
          "redirect_uri": OAUTH_CALLBACK_URL,
          "grant_type": "authorization_code"
        }
      )
      
      if token_response.status_code != 200:
        logger.error(f"Token exchange failed: {token_response.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
      
      tokens = token_response.json()
      access_token = tokens.get("access_token")
      
      if not access_token:
        raise HTTPException(status_code=400, detail="No access token received")
      
      # Fetch user info from Google
      userinfo_response = await client.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
      )
      
      if userinfo_response.status_code != 200:
        logger.error(f"Userinfo fetch failed: {userinfo_response.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
      
      userinfo = userinfo_response.json()
      
      logger.info(f"Google OAuth successful for: {userinfo.get('email')}")
      
      # Create short-lived OAuth session
      session_id = create_oauth_session({
        "email": userinfo.get("email"),
        "name": userinfo.get("name"),
        "picture": userinfo.get("picture"),
        "google_id": userinfo.get("sub")
      })
      
      # Redirect back to app with session_id in hash
      # Using hash (#) so it's not logged in server access logs
      final_redirect = f"{redirect_url}#session_id={session_id}"
      
      logger.info(f"Redirecting to: {redirect_url} with session_id")
      
      return RedirectResponse(url=final_redirect, status_code=302)
      
  except httpx.RequestError as e:
    logger.error(f"HTTP request error during OAuth: {e}")
    raise HTTPException(status_code=500, detail="Failed to complete OAuth flow")


@app.get("/auth/v1/env/oauth/session-data")
async def get_session_data(request: Request):
  """
  Exchange OAuth session_id for user data and create a permanent session.
  This is called by the frontend after OAuth redirect.
  Returns: { session_token: string }
  """
  # Get session_id from header (X-Session-ID) or query param
  session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
  
  if not session_id:
    raise HTTPException(status_code=400, detail="Missing session_id")
  
  # Get user data from OAuth session
  user_data = get_oauth_session(session_id)
  
  if not user_data:
    raise HTTPException(status_code=401, detail="Invalid or expired session_id")
  
  # Remove the OAuth session (one-time use)
  if session_id in _oauth_sessions:
    del _oauth_sessions[session_id]
  
  email = user_data.get("email")
  name = user_data.get("name", "")
  picture = user_data.get("picture")
  google_id = user_data.get("google_id")
  
  if not email:
    raise HTTPException(status_code=400, detail="No email in OAuth data")
  
  # Check if user exists, create if not
  user_id = f"google_{hashlib.sha256(email.encode()).hexdigest()[:12]}"
  
  existing_user = await store_get_user(user_id)
  
  if not existing_user:
    # Create new user
    existing_user = {
      "user_id": user_id,
      "email": email,
      "name": name,
      "picture": picture,
      "google_id": google_id,
      "height": None,
      "weight": None,
      "target_weight": None,
      "age": None,
      "gender": None,
      "activity_level": "moderate",
      "goal": "maintain",
      "daily_calorie_goal": 2000,
      "water_goal": 2500,
      "step_goal": 10000,
      "bmr": None,
      "tdee": None,
      "is_premium": False,
      "premium_expires_at": None,
      "ads_watched": 0,
      "created_at": now_utc().isoformat()
    }
    await store_create_user(existing_user)
    logger.info(f"Created new Google user: {user_id}")
  else:
    # Update name and picture if changed
    if name and existing_user.get("name") != name:
      existing_user["name"] = name
    if picture and existing_user.get("picture") != picture:
      existing_user["picture"] = picture
    await store_update_user(user_id, existing_user)
  
  # Create session token
  session_token = f"sess_{secrets.token_hex(16)}"
  session_doc = {
    "session_token": session_token,
    "user_id": user_id,
    "created_at": now_utc().isoformat(),
    "expires_at": (now_utc() + timedelta(days=30)).isoformat()
  }
  
  # Store session
  if mongo_db is not None:
    await mongo_db.user_sessions.insert_one(session_doc)
  else:
    memory_sessions[session_token] = session_doc
  
  logger.info(f"Created session for Google user: {email}")
  
  return {"session_token": session_token}


# -------------------------
# CORS
# -------------------------
app.add_middleware(
  CORSMiddleware,
  allow_credentials=True,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# -------------------------
# MODELS
# -------------------------
class User(BaseModel):
  user_id: str
  email: str
  name: str
  picture: Optional[str] = None
  created_at: datetime

  height: Optional[float] = None
  weight: Optional[float] = None
  target_weight: Optional[float] = None
  age: Optional[int] = None
  gender: Optional[str] = None
  activity_level: Optional[str] = None
  goal: Optional[str] = None  # lose, loseFast, maintain, gain, gainFast

  daily_calorie_goal: Optional[int] = None
  bmr: Optional[int] = None  # Basal Metabolic Rate
  tdee: Optional[int] = None  # Total Daily Energy Expenditure
  water_goal: int = 2500
  step_goal: int = 10000

  is_premium: bool = False
  premium_expires_at: Optional[datetime] = None
  ads_watched: int = 0


class SessionDataResponse(BaseModel):
  user_id: str
  email: str
  name: str
  picture: Optional[str] = None
  session_token: str


class RegisterRequest(BaseModel):
  email: str
  password: str
  name: str


class LoginRequest(BaseModel):
  email: str
  password: str


class ProfileData(BaseModel):
  height: Optional[float] = None
  weight: Optional[float] = None
  target_weight: Optional[float] = None
  age: Optional[int] = None
  gender: Optional[str] = None
  activity_level: Optional[str] = None
  goal: Optional[str] = None
  daily_calorie_goal: Optional[int] = None
  bmr: Optional[int] = None
  tdee: Optional[int] = None


class UpdateGoals(BaseModel):
  daily_calorie_goal: Optional[int] = None
  water_goal: Optional[int] = None
  step_goal: Optional[int] = None


# -------------------------
# SIMPLE UTIL
# -------------------------
def hash_password(password: str) -> str:
  return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
  return hash_password(password) == hashed

def now_utc() -> datetime:
  return datetime.now(timezone.utc)

def today_str() -> str:
  return now_utc().strftime("%Y-%m-%d")

def calculate_calorie_goal(height: float, weight: float, age: int, gender: str, activity_level: str) -> int:
  if gender == "male":
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
  else:
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

  factors = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
  }
  return int(bmr * factors.get(activity_level, 1.2))

def require_mongo():
    """Raise HTTPException if MongoDB is not configured."""
    if mongo_db is None:
        raise HTTPException(
            status_code=500,
            detail="Database not configured. Please set MONGO_URL environment variable."
        )

# -------------------------
# MEMORY STORE (for OAuth sessions ONLY - short-lived)
# -------------------------
MEM_SESSIONS: Dict[str, Dict[str, Any]] = {}
memory_sessions = MEM_SESSIONS  # Alias for OAuth endpoint

# Data retention policy
DATA_RETENTION_DAYS = 35  # Days to keep data after logout

async def store_create_user(user_doc: Dict[str, Any]):
    """Create a new user in MongoDB."""
    require_mongo()
    await mongo_db.users.insert_one(user_doc)

async def store_get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID from MongoDB."""
    if mongo_db is None:
        return None
    return await mongo_db.users.find_one({"user_id": user_id}, {"_id": 0})

async def store_get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Backward-compatible alias used by older OAuth code paths."""
    return await store_get_user_by_id(user_id)

async def store_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email from MongoDB."""
    if mongo_db is None:
        return None
    return await mongo_db.users.find_one({"email": email}, {"_id": 0})

async def store_update_user(user_id: str, update: Dict[str, Any]):
    """Update user in MongoDB."""
    require_mongo()
    await mongo_db.users.update_one({"user_id": user_id}, {"$set": update})

async def store_mark_user_for_deletion(user_id: str):
    """Mark user for deletion after DATA_RETENTION_DAYS days."""
    require_mongo()
    deletion_date = now_utc() + timedelta(days=DATA_RETENTION_DAYS)
    update = {
        "scheduled_deletion_at": deletion_date.isoformat(),
        "logout_at": now_utc().isoformat(),
    }
    await store_update_user(user_id, update)
    logger.info(f"User {user_id} marked for deletion at {deletion_date.isoformat()}")

async def store_cancel_user_deletion(user_id: str):
    """Cancel scheduled deletion when user logs back in."""
    require_mongo()
    await mongo_db.users.update_one(
        {"user_id": user_id}, 
        {"$unset": {"scheduled_deletion_at": "", "logout_at": ""}}
    )
    logger.info(f"Deletion cancelled for user {user_id}")

async def store_delete_user_data(user_id: str):
    """Permanently delete all user data from MongoDB."""
    require_mongo()
    # Delete all user data
    await mongo_db.meals.delete_many({"user_id": user_id})
    await mongo_db.water.delete_many({"user_id": user_id})
    await mongo_db.steps.delete_many({"user_id": user_id})
    await mongo_db.vitamins.delete_many({"user_id": user_id})
    await mongo_db.user_sessions.delete_many({"user_id": user_id})
    # Delete user
    await mongo_db.users.delete_one({"user_id": user_id})
    logger.info(f"Permanently deleted all data for user {user_id}")

async def cleanup_expired_users():
    """Delete users whose scheduled_deletion_at has passed (non-premium or expired premium)."""
    if mongo_db is None:
        logger.warning("Cleanup skipped - MongoDB not configured")
        return 0
    
    now = now_utc()
    deleted_count = 0
    
    # Find users scheduled for deletion
    cursor = mongo_db.users.find({
        "scheduled_deletion_at": {"$exists": True}
    })
    
    async for user in cursor:
        deletion_str = user.get("scheduled_deletion_at")
        if not deletion_str:
            continue
        
        try:
            deletion_date = datetime.fromisoformat(deletion_str.replace('Z', '+00:00'))
            if deletion_date.tzinfo is None:
                deletion_date = deletion_date.replace(tzinfo=timezone.utc)
        except:
            continue
        
        # Check if deletion date has passed
        if deletion_date < now:
            # Check if premium user with active subscription
            is_premium = user.get("is_premium", False)
            premium_expires = user.get("premium_expires_at")
            
            if is_premium and premium_expires:
                try:
                    exp_date = datetime.fromisoformat(str(premium_expires).replace('Z', '+00:00'))
                    if exp_date.tzinfo is None:
                        exp_date = exp_date.replace(tzinfo=timezone.utc)
                    # If premium is still active, don't delete
                    if exp_date > now:
                        continue
                except:
                    pass
            
            # Delete user data
            await store_delete_user_data(user["user_id"])
            deleted_count += 1
    
    if deleted_count > 0:
        logger.info(f"Cleaned up {deleted_count} expired user accounts")
    
    return deleted_count

async def store_create_session(user_id: str, session_token: str, days: int = 30):
    """Create a new session in MongoDB."""
    require_mongo()
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now_utc() + timedelta(days=days),
        "created_at": now_utc(),
    }
    await mongo_db.user_sessions.insert_one(session_doc)
    
    # Cancel any scheduled deletion when user logs in
    try:
        await store_cancel_user_deletion(user_id)
    except:
        pass  # User might not exist yet
    logger.info(f"Session created for user {user_id}, expires in {days} days")

async def store_get_session(session_token: str) -> Optional[Dict[str, Any]]:
    """Get session from MongoDB."""
    if mongo_db is None:
        return None
    return await mongo_db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})

async def store_delete_session(session_token: str):
    """Delete session from MongoDB."""
    if mongo_db is not None:
        await mongo_db.user_sessions.delete_one({"session_token": session_token})
    MEM_SESSIONS.pop(session_token, None)


# -------------------------
# AUTH DEPENDENCY
# -------------------------
async def get_current_user(request: Request) -> Optional[User]:
  session_token = request.cookies.get("session_token")

  if not session_token:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
      session_token = auth_header.split(" ", 1)[1].strip()

  if not session_token:
    return None

  session = await store_get_session(session_token)
  if not session:
    logger.debug(f"Session not found: {session_token[:20]}...")
    return None

  # Check session expiry
  expires_at = session.get("expires_at")
  if expires_at:
    # Handle both datetime and string formats
    if isinstance(expires_at, str):
      try:
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
      except:
        expires_at = None
    
    if isinstance(expires_at, datetime):
      if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
      if expires_at < now_utc():
        logger.info(f"Session expired for token: {session_token[:20]}...")
        await store_delete_session(session_token)
        return None

  user_doc = await store_get_user_by_id(session["user_id"])
  if not user_doc:
    logger.warning(f"User not found for session: {session['user_id']}")
    return None

  return User(**user_doc)


def set_session_cookie(resp: JSONResponse, request: Request, token: str, max_age_seconds: int):
  # Render is https, local dev might be http. This avoids "cookie never set" locally.
  secure = request.url.scheme == "https"
  resp.set_cookie(
    key="session_token",
    value=token,
    httponly=True,
    secure=secure,
    samesite="none" if secure else "lax",
    max_age=max_age_seconds,
    path="/",
  )


# -------------------------
# AUTH ENDPOINTS
# -------------------------
@api_router.post("/auth/session", response_model=SessionDataResponse)
async def exchange_session(request: Request):
  """
  Exchange session_id for session_token.
  Supports both internal OAuth sessions (oauth_*) and Emergent Auth.
  Requires X-Session-ID header.
  """
  session_id = request.headers.get("X-Session-ID")
  if not session_id:
    raise HTTPException(status_code=400, detail="X-Session-ID header required")

  # Check if this is an internal OAuth session
  if session_id.startswith("oauth_"):
    # Use internal OAuth session
    user_data = get_oauth_session(session_id)
    if not user_data:
      raise HTTPException(status_code=401, detail="Invalid or expired session_id")
    
    # Remove the OAuth session (one-time use)
    if session_id in _oauth_sessions:
      del _oauth_sessions[session_id]
    
    email = user_data.get("email")
    name = user_data.get("name", "User")
    picture = user_data.get("picture")
    google_id = user_data.get("google_id")
    
    if not email:
      raise HTTPException(status_code=400, detail="No email in OAuth data")
    
    # Check if user exists, create if not
    user_id = f"google_{hashlib.sha256(email.encode()).hexdigest()[:12]}"
    existing = await store_get_user(user_id)
    
    if not existing:
      await store_create_user({
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "google_id": google_id,
        "created_at": now_utc(),
        "water_goal": 2500,
        "step_goal": 10000,
        "is_premium": False,
        "ads_watched": 0,
      })
    
    session_token = f"sess_{secrets.token_hex(16)}"
    await store_create_session(user_id, session_token, days=30)
    
    resp = JSONResponse(content={
      "user_id": user_id,
      "email": email,
      "name": name,
      "picture": picture,
      "session_token": session_token,
    })
    set_session_cookie(resp, request, session_token, max_age_seconds=30 * 24 * 60 * 60)
    return resp
  
  # Fallback to Emergent OAuth (legacy support)
  try:
    async with httpx.AsyncClient(timeout=20.0) as client:
      r = await client.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id},
      )
      r.raise_for_status()
      user_data = r.json()
  except Exception as e:
    logger.error(f"exchange_session failed: {e}")
    raise HTTPException(status_code=400, detail="Invalid session ID")

  email = user_data.get("email")
  name = user_data.get("name") or "User"
  picture = user_data.get("picture")
  session_token = user_data.get("session_token") or f"sess_{uuid.uuid4().hex}"

  if not email:
    raise HTTPException(status_code=400, detail="Auth provider returned no email")

  existing = await store_get_user_by_email(email)
  if existing:
    user_id = existing["user_id"]
  else:
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await store_create_user({
      "user_id": user_id,
      "email": email,
      "name": name,
      "picture": picture,
      "created_at": now_utc(),
      "water_goal": 2500,
      "step_goal": 10000,
      "is_premium": False,
      "ads_watched": 0,
    })

  await store_create_session(user_id, session_token, days=7)

  resp = JSONResponse(content={
    "user_id": user_id,
    "email": email,
    "name": name,
    "picture": picture,
    "session_token": session_token,
  })
  set_session_cookie(resp, request, session_token, max_age_seconds=30 * 24 * 60 * 60)
  return resp


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  return current_user


@api_router.post("/auth/logout")
async def logout(request: Request, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")

  user_id = current_user.user_id
  is_premium = current_user.is_premium
  
  # Delete current session
  session_token = request.cookies.get("session_token")
  if not session_token:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
      session_token = auth_header.split(" ", 1)[1].strip()
  
  if session_token:
    await store_delete_session(session_token)
  
  # Mark user for deletion after DATA_RETENTION_DAYS days (unless premium)
  deletion_date = now_utc() + timedelta(days=DATA_RETENTION_DAYS)
  await store_mark_user_for_deletion(user_id)
  
  # Prepare response message
  if is_premium:
    message = f"Çıkış yapıldı. Premium üyeliğiniz devam ettiği sürece verileriniz korunacaktır. Üyelik iptalinden {DATA_RETENTION_DAYS} gün sonra verileriniz silinecektir."
    message_en = f"Logged out. Your data will be preserved while your premium subscription is active. Data will be deleted {DATA_RETENTION_DAYS} days after subscription ends."
  else:
    message = f"Çıkış yapıldı. {DATA_RETENTION_DAYS} gün içinde tekrar giriş yapmazsanız verileriniz kalıcı olarak silinecektir."
    message_en = f"Logged out. If you don't log in again within {DATA_RETENTION_DAYS} days, your data will be permanently deleted."
  
  resp = JSONResponse(content={
    "message": message,
    "message_en": message_en,
    "data_retention_days": DATA_RETENTION_DAYS,
    "scheduled_deletion_date": deletion_date.isoformat(),
    "is_premium": is_premium,
  })
  resp.delete_cookie("session_token", path="/")
  return resp


@api_router.delete("/auth/account")
async def delete_account(request: Request, current_user: Optional[User] = Depends(get_current_user)):
  """
  Delete user account and all associated data immediately.
  This is a permanent action and cannot be undone.
  """
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")

  user_id = current_user.user_id
  
  try:
    # Delete all user data immediately
    await store_delete_user_data(user_id)
    
    logger.info(f"Account deleted immediately: {user_id}")
    
    resp = JSONResponse(content={"message": "Account deleted successfully"})
    resp.delete_cookie("session_token", path="/")
    return resp
    
  except Exception as e:
    logger.error(f"Error deleting account {user_id}: {e}")
    raise HTTPException(status_code=500, detail="Failed to delete account")


@api_router.post("/auth/register", response_model=SessionDataResponse)
async def register(request: Request, data: RegisterRequest):
  existing = await store_get_user_by_email(data.email)
  if existing:
    raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

  user_id = f"user_{uuid.uuid4().hex[:12]}"
  session_token = f"sess_{uuid.uuid4().hex}"

  await store_create_user({
    "user_id": user_id,
    "email": data.email,
    "name": data.name,
    "picture": None,
    "created_at": now_utc(),
    "password_hash": hash_password(data.password),
    "auth_type": "email",
    "water_goal": 2500,
    "step_goal": 10000,
    "is_premium": False,
    "ads_watched": 0,
  })

  await store_create_session(user_id, session_token, days=30)

  resp = JSONResponse(content={
    "user_id": user_id,
    "email": data.email,
    "name": data.name,
    "picture": None,
    "session_token": session_token,
  })
  set_session_cookie(resp, request, session_token, max_age_seconds=30 * 24 * 60 * 60)
  return resp


@api_router.post("/auth/login", response_model=SessionDataResponse)
async def login(request: Request, data: LoginRequest):
  user = await store_get_user_by_email(data.email)
  if not user:
    raise HTTPException(status_code=401, detail="Email veya şifre hatalı")

  if user.get("auth_type") == "email":
    if not verify_password(data.password, user.get("password_hash", "")):
      raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
  elif user.get("auth_type") == "guest":
    raise HTTPException(status_code=400, detail="Misafir hesapla şifreli giriş olmaz")
  else:
    raise HTTPException(status_code=400, detail="Bu hesap Google ile oluşturuldu. Google ile giriş yapın.")

  session_token = f"sess_{uuid.uuid4().hex}"
  await store_create_session(user["user_id"], session_token, days=30)

  resp = JSONResponse(content={
    "user_id": user["user_id"],
    "email": user["email"],
    "name": user["name"],
    "picture": user.get("picture"),
    "session_token": session_token,
  })
  set_session_cookie(resp, request, session_token, max_age_seconds=30 * 24 * 60 * 60)
  return resp


@api_router.post("/auth/guest", response_model=SessionDataResponse)
async def guest_login(request: Request):
  user_id = f"guest_{uuid.uuid4().hex[:12]}"
  session_token = f"sess_{uuid.uuid4().hex}"
  guest_name = f"Misafir_{uuid.uuid4().hex[:6]}"

  await store_create_user({
    "user_id": user_id,
    "email": f"{user_id}@guest.local",
    "name": guest_name,
    "picture": None,
    "created_at": now_utc(),
    "auth_type": "guest",
    "water_goal": 2500,
    "step_goal": 10000,
    "is_premium": False,
    "ads_watched": 0,
  })

  await store_create_session(user_id, session_token, days=7)

  resp = JSONResponse(content={
    "user_id": user_id,
    "email": f"{user_id}@guest.local",
    "name": guest_name,
    "picture": None,
    "session_token": session_token,
  })
  set_session_cookie(resp, request, session_token, max_age_seconds=30 * 24 * 60 * 60)
  return resp


@api_router.put("/auth/profile", response_model=User)
async def update_profile(profile: ProfileData, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")

  update = profile.model_dump(exclude_none=True)

  # Only calculate calorie goal if not provided from onboarding
  if not profile.daily_calorie_goal and all([profile.height, profile.weight, profile.age, profile.gender, profile.activity_level]):
    update["daily_calorie_goal"] = calculate_calorie_goal(
      profile.height, profile.weight, profile.age, profile.gender, profile.activity_level
    )

  await store_update_user(current_user.user_id, update)
  user_doc = await store_get_user_by_id(current_user.user_id)
  return User(**user_doc)


@api_router.put("/user/goals", response_model=User)
async def update_goals(goals: UpdateGoals, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")

  update = goals.model_dump(exclude_none=True)
  await store_update_user(current_user.user_id, update)
  user_doc = await store_get_user_by_id(current_user.user_id)
  return User(**user_doc)


# -------------------------
# FOOD DB (manual)
# -------------------------
FOOD_DATABASE = [
  # Protein kaynakları
  {"food_id": "food_001", "name": "Tavuk Göğsü (100g)", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "name_en": "Chicken Breast (100g)"},
  {"food_id": "food_002", "name": "Tavuk But (100g)", "calories": 209, "protein": 26, "carbs": 0, "fat": 11, "name_en": "Chicken Thigh (100g)"},
  {"food_id": "food_003", "name": "Dana Biftek (100g)", "calories": 271, "protein": 26, "carbs": 0, "fat": 18, "name_en": "Beef Steak (100g)"},
  {"food_id": "food_004", "name": "Kıyma (100g)", "calories": 250, "protein": 26, "carbs": 0, "fat": 17, "name_en": "Ground Beef (100g)"},
  {"food_id": "food_005", "name": "Somon (100g)", "calories": 208, "protein": 20, "carbs": 0, "fat": 13, "name_en": "Salmon (100g)"},
  {"food_id": "food_006", "name": "Levrek (100g)", "calories": 97, "protein": 18, "carbs": 0, "fat": 2, "name_en": "Sea Bass (100g)"},
  {"food_id": "food_007", "name": "Ton Balığı (100g)", "calories": 132, "protein": 28, "carbs": 0, "fat": 1, "name_en": "Tuna (100g)"},
  {"food_id": "food_008", "name": "Yumurta (1 Adet)", "calories": 78, "protein": 6.3, "carbs": 0.6, "fat": 5.3, "name_en": "Egg (1 Piece)"},
  {"food_id": "food_009", "name": "Yumurta Beyazı (1 Adet)", "calories": 17, "protein": 3.6, "carbs": 0.2, "fat": 0.1, "name_en": "Egg White (1 Piece)"},
  
  # Karbonhidrat kaynakları
  {"food_id": "food_010", "name": "Pirinç Pilavı (1 Porsiyon)", "calories": 206, "protein": 4.3, "carbs": 45, "fat": 0.4, "name_en": "Rice Pilaf (1 Serving)"},
  {"food_id": "food_011", "name": "Bulgur Pilavı (1 Porsiyon)", "calories": 151, "protein": 5.6, "carbs": 34, "fat": 0.4, "name_en": "Bulgur Pilaf (1 Serving)"},
  {"food_id": "food_012", "name": "Makarna (1 Porsiyon)", "calories": 221, "protein": 8, "carbs": 43, "fat": 1.3, "name_en": "Pasta (1 Serving)"},
  {"food_id": "food_013", "name": "Ekmek (1 Dilim)", "calories": 79, "protein": 2.7, "carbs": 15, "fat": 1, "name_en": "Bread (1 Slice)"},
  {"food_id": "food_014", "name": "Tam Buğday Ekmeği (1 Dilim)", "calories": 81, "protein": 4, "carbs": 14, "fat": 1.1, "name_en": "Whole Wheat Bread (1 Slice)"},
  {"food_id": "food_015", "name": "Patates (100g)", "calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "name_en": "Potato (100g)"},
  {"food_id": "food_016", "name": "Patates Kızartması (100g)", "calories": 312, "protein": 3.4, "carbs": 41, "fat": 15, "name_en": "French Fries (100g)"},
  {"food_id": "food_017", "name": "Tost (1 Adet)", "calories": 350, "protein": 15, "carbs": 30, "fat": 18, "name_en": "Toast Sandwich (1 Piece)"},
  
  # Süt ürünleri
  {"food_id": "food_018", "name": "Süt (1 Bardak)", "calories": 149, "protein": 8, "carbs": 12, "fat": 8, "name_en": "Milk (1 Glass)"},
  {"food_id": "food_019", "name": "Yoğurt (1 Kase)", "calories": 100, "protein": 17, "carbs": 6, "fat": 0.7, "name_en": "Yogurt (1 Bowl)"},
  {"food_id": "food_020", "name": "Ayran (1 Bardak)", "calories": 66, "protein": 3.2, "carbs": 4.8, "fat": 3.6, "name_en": "Ayran (1 Glass)"},
  {"food_id": "food_021", "name": "Beyaz Peynir (30g)", "calories": 80, "protein": 5.5, "carbs": 0.5, "fat": 6.5, "name_en": "White Cheese (30g)"},
  {"food_id": "food_022", "name": "Kaşar Peyniri (30g)", "calories": 120, "protein": 7, "carbs": 0.4, "fat": 10, "name_en": "Cheddar Cheese (30g)"},
  {"food_id": "food_023", "name": "Lor Peyniri (100g)", "calories": 98, "protein": 11, "carbs": 3.4, "fat": 4.3, "name_en": "Cottage Cheese (100g)"},
  
  # Sebzeler
  {"food_id": "food_024", "name": "Domates (1 Adet)", "calories": 22, "protein": 1.1, "carbs": 4.8, "fat": 0.2, "name_en": "Tomato (1 Piece)"},
  {"food_id": "food_025", "name": "Salatalık (1 Adet)", "calories": 16, "protein": 0.7, "carbs": 3.6, "fat": 0.1, "name_en": "Cucumber (1 Piece)"},
  {"food_id": "food_026", "name": "Salata (1 Porsiyon)", "calories": 35, "protein": 2, "carbs": 7, "fat": 0.3, "name_en": "Salad (1 Serving)"},
  {"food_id": "food_027", "name": "Brokoli (100g)", "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4, "name_en": "Broccoli (100g)"},
  {"food_id": "food_028", "name": "Ispanak (100g)", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4, "name_en": "Spinach (100g)"},
  {"food_id": "food_029", "name": "Havuç (1 Adet)", "calories": 25, "protein": 0.6, "carbs": 6, "fat": 0.1, "name_en": "Carrot (1 Piece)"},
  {"food_id": "food_030", "name": "Biber (1 Adet)", "calories": 20, "protein": 0.9, "carbs": 4.6, "fat": 0.2, "name_en": "Pepper (1 Piece)"},
  
  # Meyveler
  {"food_id": "food_031", "name": "Elma (1 Adet)", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3, "name_en": "Apple (1 Piece)"},
  {"food_id": "food_032", "name": "Muz (1 Adet)", "calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4, "name_en": "Banana (1 Piece)"},
  {"food_id": "food_033", "name": "Portakal (1 Adet)", "calories": 62, "protein": 1.2, "carbs": 15, "fat": 0.2, "name_en": "Orange (1 Piece)"},
  {"food_id": "food_034", "name": "Çilek (100g)", "calories": 32, "protein": 0.7, "carbs": 7.7, "fat": 0.3, "name_en": "Strawberry (100g)"},
  {"food_id": "food_035", "name": "Üzüm (100g)", "calories": 69, "protein": 0.7, "carbs": 18, "fat": 0.2, "name_en": "Grapes (100g)"},
  {"food_id": "food_036", "name": "Karpuz (100g)", "calories": 30, "protein": 0.6, "carbs": 7.6, "fat": 0.2, "name_en": "Watermelon (100g)"},
  {"food_id": "food_037", "name": "Kavun (100g)", "calories": 34, "protein": 0.8, "carbs": 8.2, "fat": 0.2, "name_en": "Melon (100g)"},
  
  # Çorbalar
  {"food_id": "food_038", "name": "Mercimek Çorbası (1 Kase)", "calories": 180, "protein": 9, "carbs": 30, "fat": 4, "name_en": "Lentil Soup (1 Bowl)"},
  {"food_id": "food_039", "name": "Domates Çorbası (1 Kase)", "calories": 90, "protein": 2, "carbs": 15, "fat": 3, "name_en": "Tomato Soup (1 Bowl)"},
  {"food_id": "food_040", "name": "Tavuk Çorbası (1 Kase)", "calories": 120, "protein": 8, "carbs": 12, "fat": 4, "name_en": "Chicken Soup (1 Bowl)"},
  {"food_id": "food_041", "name": "Yayla Çorbası (1 Kase)", "calories": 110, "protein": 4, "carbs": 12, "fat": 5, "name_en": "Yogurt Soup (1 Bowl)"},
  {"food_id": "food_042", "name": "Ezogelin Çorbası (1 Kase)", "calories": 150, "protein": 6, "carbs": 25, "fat": 3, "name_en": "Ezogelin Soup (1 Bowl)"},
  
  # Ana yemekler
  {"food_id": "food_043", "name": "Döner (1 Porsiyon)", "calories": 450, "protein": 25, "carbs": 35, "fat": 22, "name_en": "Doner Kebab (1 Serving)"},
  {"food_id": "food_044", "name": "Lahmacun (1 Adet)", "calories": 270, "protein": 12, "carbs": 35, "fat": 9, "name_en": "Lahmacun (1 Piece)"},
  {"food_id": "food_045", "name": "Pide (1 Dilim)", "calories": 280, "protein": 10, "carbs": 38, "fat": 10, "name_en": "Pide (1 Slice)"},
  {"food_id": "food_046", "name": "Köfte (4 Adet)", "calories": 320, "protein": 24, "carbs": 8, "fat": 22, "name_en": "Meatballs (4 Pieces)"},
  {"food_id": "food_047", "name": "İmam Bayıldı (1 Porsiyon)", "calories": 220, "protein": 3, "carbs": 18, "fat": 16, "name_en": "Imam Bayildi (1 Serving)"},
  {"food_id": "food_048", "name": "Karnıyarık (1 Porsiyon)", "calories": 350, "protein": 15, "carbs": 20, "fat": 24, "name_en": "Karniyarik (1 Serving)"},
  {"food_id": "food_049", "name": "Mantı (1 Porsiyon)", "calories": 380, "protein": 14, "carbs": 45, "fat": 16, "name_en": "Turkish Ravioli (1 Serving)"},
  {"food_id": "food_050", "name": "Pizza (1 Dilim)", "calories": 285, "protein": 12, "carbs": 36, "fat": 10, "name_en": "Pizza (1 Slice)"},
  {"food_id": "food_051", "name": "Hamburger (1 Adet)", "calories": 540, "protein": 25, "carbs": 40, "fat": 29, "name_en": "Hamburger (1 Piece)"},
  
  # Kahvaltılık
  {"food_id": "food_052", "name": "Zeytin (10 Adet)", "calories": 40, "protein": 0.3, "carbs": 1, "fat": 4, "name_en": "Olives (10 Pieces)"},
  {"food_id": "food_053", "name": "Bal (1 Yemek Kaşığı)", "calories": 64, "protein": 0.1, "carbs": 17, "fat": 0, "name_en": "Honey (1 Tbsp)"},
  {"food_id": "food_054", "name": "Reçel (1 Yemek Kaşığı)", "calories": 56, "protein": 0.1, "carbs": 14, "fat": 0, "name_en": "Jam (1 Tbsp)"},
  {"food_id": "food_055", "name": "Tereyağı (10g)", "calories": 72, "protein": 0.1, "carbs": 0, "fat": 8, "name_en": "Butter (10g)"},
  {"food_id": "food_056", "name": "Sucuk (2 Dilim)", "calories": 180, "protein": 8, "carbs": 1, "fat": 16, "name_en": "Sucuk (2 Slices)"},
  {"food_id": "food_057", "name": "Simit (1 Adet)", "calories": 280, "protein": 9, "carbs": 50, "fat": 5, "name_en": "Simit (1 Piece)"},
  {"food_id": "food_058", "name": "Poğaça (1 Adet)", "calories": 250, "protein": 5, "carbs": 30, "fat": 12, "name_en": "Pogaca (1 Piece)"},
  {"food_id": "food_059", "name": "Börek (1 Dilim)", "calories": 300, "protein": 8, "carbs": 25, "fat": 18, "name_en": "Borek (1 Slice)"},
  
  # İçecekler
  {"food_id": "food_060", "name": "Kahve (Sade)", "calories": 5, "protein": 0.3, "carbs": 0, "fat": 0, "name_en": "Coffee (Black)"},
  {"food_id": "food_061", "name": "Çay (Şekersiz)", "calories": 2, "protein": 0, "carbs": 0.5, "fat": 0, "name_en": "Tea (No Sugar)"},
  {"food_id": "food_062", "name": "Türk Kahvesi", "calories": 15, "protein": 0.3, "carbs": 2, "fat": 0.5, "name_en": "Turkish Coffee"},
  {"food_id": "food_063", "name": "Latte (1 Bardak)", "calories": 190, "protein": 10, "carbs": 18, "fat": 7, "name_en": "Latte (1 Cup)"},
  {"food_id": "food_064", "name": "Meyve Suyu (1 Bardak)", "calories": 110, "protein": 1, "carbs": 26, "fat": 0, "name_en": "Fruit Juice (1 Glass)"},
  {"food_id": "food_065", "name": "Kola (330ml)", "calories": 139, "protein": 0, "carbs": 35, "fat": 0, "name_en": "Cola (330ml)"},
  {"food_id": "food_066", "name": "Limonata (1 Bardak)", "calories": 99, "protein": 0, "carbs": 26, "fat": 0, "name_en": "Lemonade (1 Glass)"},
  
  # Atıştırmalıklar
  {"food_id": "food_067", "name": "Ceviz (30g)", "calories": 196, "protein": 4.6, "carbs": 4.1, "fat": 19.5, "name_en": "Walnuts (30g)"},
  {"food_id": "food_068", "name": "Badem (30g)", "calories": 173, "protein": 6.4, "carbs": 6.5, "fat": 15, "name_en": "Almonds (30g)"},
  {"food_id": "food_069", "name": "Fındık (30g)", "calories": 188, "protein": 4.5, "carbs": 5, "fat": 18, "name_en": "Hazelnuts (30g)"},
  {"food_id": "food_070", "name": "Çikolata (30g)", "calories": 160, "protein": 2, "carbs": 17, "fat": 9, "name_en": "Chocolate (30g)"},
  {"food_id": "food_071", "name": "Cips (30g)", "calories": 160, "protein": 2, "carbs": 15, "fat": 10, "name_en": "Chips (30g)"},
  {"food_id": "food_072", "name": "Bisküvi (3 Adet)", "calories": 140, "protein": 2, "carbs": 20, "fat": 6, "name_en": "Biscuits (3 Pieces)"},
  {"food_id": "food_073", "name": "Kraker (5 Adet)", "calories": 85, "protein": 2, "carbs": 14, "fat": 2.5, "name_en": "Crackers (5 Pieces)"},
  
  # Tatlılar
  {"food_id": "food_074", "name": "Baklava (1 Dilim)", "calories": 334, "protein": 5, "carbs": 40, "fat": 18, "name_en": "Baklava (1 Piece)"},
  {"food_id": "food_075", "name": "Sütlaç (1 Porsiyon)", "calories": 220, "protein": 6, "carbs": 35, "fat": 6, "name_en": "Rice Pudding (1 Serving)"},
  {"food_id": "food_076", "name": "Dondurma (1 Top)", "calories": 137, "protein": 2.4, "carbs": 16, "fat": 7, "name_en": "Ice Cream (1 Scoop)"},
  {"food_id": "food_077", "name": "Kek (1 Dilim)", "calories": 290, "protein": 4, "carbs": 40, "fat": 13, "name_en": "Cake (1 Slice)"},
  {"food_id": "food_078", "name": "Kurabiye (2 Adet)", "calories": 140, "protein": 2, "carbs": 20, "fat": 6, "name_en": "Cookies (2 Pieces)"},
  
  # Baklagiller
  {"food_id": "food_079", "name": "Kuru Fasulye (1 Porsiyon)", "calories": 225, "protein": 15, "carbs": 40, "fat": 1, "name_en": "White Beans (1 Serving)"},
  {"food_id": "food_080", "name": "Nohut (1 Porsiyon)", "calories": 269, "protein": 14.5, "carbs": 45, "fat": 4.2, "name_en": "Chickpeas (1 Serving)"},
  {"food_id": "food_081", "name": "Barbunya (1 Porsiyon)", "calories": 225, "protein": 14, "carbs": 41, "fat": 0.8, "name_en": "Kidney Beans (1 Serving)"},
  {"food_id": "food_082", "name": "Yeşil Mercimek (1 Porsiyon)", "calories": 230, "protein": 18, "carbs": 40, "fat": 0.8, "name_en": "Green Lentils (1 Serving)"},
]

@api_router.get("/food/database")
async def get_food_database(lang: str = "tr", current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  if lang == "en":
    return [{"food_id": f["food_id"], "name": f["name_en"], "calories": f["calories"], "protein": f["protein"], "carbs": f["carbs"], "fat": f["fat"]} for f in FOOD_DATABASE]
  return [{"food_id": f["food_id"], "name": f["name"], "calories": f["calories"], "protein": f["protein"], "carbs": f["carbs"], "fat": f["fat"]} for f in FOOD_DATABASE]


# -------------------------
# FOOD/MEAL ENDPOINTS
# -------------------------
class AddMealRequest(BaseModel):
  name: str
  calories: int
  protein: float
  carbs: float
  fat: float
  image_base64: Optional[str] = None
  meal_type: str = "snack"  # breakfast, lunch, dinner, snack


async def get_user_meals(user_id: str, date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get user meals from MongoDB."""
    if mongo_db is None:
        return []
    target_date = date or today_str()
    cursor = mongo_db.meals.find({"user_id": user_id, "date": target_date}, {"_id": 0})
    return await cursor.to_list(length=100)


async def add_user_meal(user_id: str, meal_data: Dict[str, Any]):
    """Add meal to MongoDB."""
    require_mongo()
    await mongo_db.meals.insert_one(meal_data)


@api_router.post("/food/add-meal")
async def add_meal(meal: AddMealRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  meal_doc = {
    "meal_id": f"meal_{uuid.uuid4().hex[:12]}",
    "user_id": current_user.user_id,
    "name": meal.name,
    "calories": meal.calories,
    "protein": meal.protein,
    "carbs": meal.carbs,
    "fat": meal.fat,
    "image_base64": meal.image_base64 or "",
    "meal_type": meal.meal_type,
    "date": today_str(),
    "created_at": now_utc().isoformat(),
  }
  
  await add_user_meal(current_user.user_id, meal_doc)
  return {"message": "Meal added", "meal_id": meal_doc["meal_id"]}


@api_router.get("/food/today")
async def get_today_meals(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  meals = await get_user_meals(current_user.user_id)
  return meals


@api_router.get("/food/daily-summary")
async def get_daily_summary(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  meals = await get_user_meals(current_user.user_id)
  
  total_calories = sum(m.get("calories", 0) for m in meals)
  total_protein = sum(m.get("protein", 0) for m in meals)
  total_carbs = sum(m.get("carbs", 0) for m in meals)
  total_fat = sum(m.get("fat", 0) for m in meals)
  
  return {
    "total_calories": total_calories,
    "total_protein": round(total_protein, 1),
    "total_carbs": round(total_carbs, 1),
    "total_fat": round(total_fat, 1),
    "meal_count": len(meals),
    "date": today_str(),
  }


# -------------------------
# FOOD ANALYZE (OpenAI Vision)
# -------------------------
import openai
from PIL import Image
import io

def get_openai_api_key():
    """Get OpenAI API key from environment, checking multiple possible names."""
    key = os.getenv("OPENAI_KEY", "").strip()
    if not key:
        key = os.getenv("OPENAI_API_KEY", "").strip()
    # Remove any quotes that might be accidentally included
    key = key.strip('"').strip("'")
    return key if key else None

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
    
    api_key = get_openai_api_key()
    if not api_key:
        logger.error("OpenAI API key not found in environment variables (OPENAI_KEY or OPENAI_API_KEY)")
        raise HTTPException(status_code=503, detail="OpenAI API key not configured. Please set OPENAI_KEY environment variable.")
    
    # Log key presence (not the actual key!)
    logger.info(f"OpenAI API key found, length: {len(api_key)}, starts with: {api_key[:7]}...")
    
    # Choose model
    model = VISION_MODEL_FALLBACK if use_fallback else VISION_MODEL_PRIMARY
    logger.info(f"Using model: {model}")
    
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
        client = openai.AsyncOpenAI(api_key=api_key)
        
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
    
    api_key = get_openai_api_key()
    if not api_key:
        logger.error("OpenAI API key missing - check OPENAI_KEY environment variable")
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
    
    api_key = get_openai_api_key()
    if not api_key:
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


# Debug endpoint to check OpenAI key status
@api_router.get("/debug/openai-status")
async def check_openai_status():
    """Check if OpenAI API key is configured (for debugging)."""
    api_key = get_openai_api_key()
    if api_key:
        return {
            "configured": True,
            "key_length": len(api_key),
            "key_prefix": api_key[:7] + "..." if len(api_key) > 7 else "too_short",
            "model_primary": VISION_MODEL_PRIMARY,
            "model_fallback": VISION_MODEL_FALLBACK,
        }
    else:
        return {
            "configured": False,
            "error": "OPENAI_KEY or OPENAI_API_KEY environment variable not found",
            "hint": "Set OPENAI_KEY=sk-your-key in Render environment variables"
        }


# -------------------------
# WATER TRACKING
# -------------------------
class AddWaterRequest(BaseModel):
  amount: int  # ml


async def get_user_water(user_id: str, date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get user water entries from MongoDB."""
    if mongo_db is None:
        return []
    target_date = date or today_str()
    cursor = mongo_db.water.find({"user_id": user_id, "date": target_date}, {"_id": 0})
    return await cursor.to_list(length=100)


async def add_user_water(user_id: str, water_data: Dict[str, Any]):
    """Add water entry to MongoDB."""
    require_mongo()
    await mongo_db.water.insert_one(water_data)


@api_router.post("/water/add")
async def add_water(data: AddWaterRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  water_doc = {
    "water_id": f"water_{uuid.uuid4().hex[:12]}",
    "user_id": current_user.user_id,
    "amount": data.amount,
    "date": today_str(),
    "created_at": now_utc().isoformat(),
  }
  
  await add_user_water(current_user.user_id, water_doc)
  
  # Return updated today total
  entries = await get_user_water(current_user.user_id)
  total = sum(e.get("amount", 0) for e in entries)
  
  return {"message": "Water added", "total_amount": total}


@api_router.get("/water/today")
async def get_today_water(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  entries = await get_user_water(current_user.user_id)
  total = sum(e.get("amount", 0) for e in entries)
  
  return {"total_amount": total, "entries": entries, "date": today_str()}


@api_router.get("/water/weekly")
async def get_weekly_water(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  weekly_data = []
  for i in range(7):
    date = (now_utc() - timedelta(days=i)).strftime("%Y-%m-%d")
    entries = await get_user_water(current_user.user_id, date)
    total = sum(e.get("amount", 0) for e in entries)
    weekly_data.append({"date": date, "total_amount": total})
  
  return {"weekly_data": weekly_data}


# -------------------------
# STEPS TRACKING
# -------------------------
class SyncStepsRequest(BaseModel):
  steps: int
  source: str = "manual"


class ManualStepsRequest(BaseModel):
  steps: int


async def get_user_steps(user_id: str, date: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get user steps from MongoDB."""
    if mongo_db is None:
        return None
    target_date = date or today_str()
    return await mongo_db.steps.find_one({"user_id": user_id, "date": target_date}, {"_id": 0})


async def upsert_user_steps(user_id: str, steps_data: Dict[str, Any]):
    """Upsert steps to MongoDB."""
    require_mongo()
    date = steps_data.get("date", today_str())
    await mongo_db.steps.update_one(
        {"user_id": user_id, "date": date},
        {"$set": steps_data},
        upsert=True
    )


@api_router.post("/steps/sync")
async def sync_steps(data: SyncStepsRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  steps_doc = {
    "user_id": current_user.user_id,
    "steps": data.steps,
    "source": data.source,
    "date": today_str(),
    "updated_at": now_utc().isoformat(),
  }
  
  await upsert_user_steps(current_user.user_id, steps_doc)
  return {"message": "Steps synced", "steps": data.steps}


@api_router.post("/steps/manual")
async def add_manual_steps(data: ManualStepsRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  existing = await get_user_steps(current_user.user_id)
  current_steps = existing.get("steps", 0) if existing else 0
  new_total = current_steps + data.steps
  
  steps_doc = {
    "user_id": current_user.user_id,
    "steps": new_total,
    "source": "manual",
    "date": today_str(),
    "updated_at": now_utc().isoformat(),
  }
  
  await upsert_user_steps(current_user.user_id, steps_doc)
  return {"message": "Steps added", "steps": new_total}


@api_router.get("/steps/today")
async def get_today_steps(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  steps_data = await get_user_steps(current_user.user_id)
  
  if steps_data:
    return {"steps": steps_data.get("steps", 0), "source": steps_data.get("source", "none"), "date": today_str()}
  
  return {"steps": 0, "source": "none", "date": today_str()}


# -------------------------
# VITAMINS TRACKING
# -------------------------
VITAMIN_TEMPLATES = [
  {"template_id": "vit_001", "name": "D Vitamini", "default_time": "Sabah"},
  {"template_id": "vit_002", "name": "B12 Vitamini", "default_time": "Öğlen"},
  {"template_id": "vit_003", "name": "C Vitamini", "default_time": "Akşam"},
  {"template_id": "vit_004", "name": "Omega 3", "default_time": "Sabah"},
  {"template_id": "vit_005", "name": "Demir", "default_time": "Öğlen"},
]


class AddVitaminRequest(BaseModel):
  name: str
  time: str


class ToggleVitaminRequest(BaseModel):
  vitamin_id: str


async def get_user_vitamins(user_id: str) -> List[Dict[str, Any]]:
    """Get user vitamins from MongoDB."""
    if mongo_db is None:
        return []
    today = today_str()
    cursor = mongo_db.vitamins.find({"user_id": user_id}, {"_id": 0})
    vitamins = await cursor.to_list(length=100)
    # Reset is_taken if date changed
    for v in vitamins:
        if v.get("last_taken_date") != today:
            v["is_taken"] = False
    return vitamins


async def add_user_vitamin(user_id: str, vitamin_data: Dict[str, Any]):
    """Add vitamin to MongoDB."""
    require_mongo()
    await mongo_db.vitamins.insert_one(vitamin_data)


async def update_vitamin(user_id: str, vitamin_id: str, update: Dict[str, Any]):
    """Update vitamin in MongoDB."""
    require_mongo()
    await mongo_db.vitamins.update_one(
        {"user_id": user_id, "vitamin_id": vitamin_id},
        {"$set": update}
    )


async def delete_user_vitamin(user_id: str, vitamin_id: str):
    """Delete vitamin from MongoDB."""
    require_mongo()
    await mongo_db.vitamins.delete_one({"user_id": user_id, "vitamin_id": vitamin_id})


@api_router.get("/vitamins/templates")
async def get_vitamin_templates(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  return VITAMIN_TEMPLATES


@api_router.get("/vitamins/user")
async def get_vitamins_user(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  vitamins = await get_user_vitamins(current_user.user_id)
  return vitamins


@api_router.post("/vitamins/add")
async def add_vitamin(data: AddVitaminRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  vitamin_doc = {
    "vitamin_id": f"vit_{uuid.uuid4().hex[:12]}",
    "user_id": current_user.user_id,
    "name": data.name,
    "time": data.time,
    "is_taken": False,
    "last_taken_date": None,
    "created_at": now_utc().isoformat(),
  }
  
  await add_user_vitamin(current_user.user_id, vitamin_doc)
  return {"message": "Vitamin added", "vitamin_id": vitamin_doc["vitamin_id"]}


@api_router.put("/vitamins/toggle")
async def toggle_vitamin(data: ToggleVitaminRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  vitamins = await get_user_vitamins(current_user.user_id)
  vitamin = next((v for v in vitamins if v["vitamin_id"] == data.vitamin_id), None)
  
  if not vitamin:
    raise HTTPException(status_code=404, detail="Vitamin not found")
  
  new_is_taken = not vitamin.get("is_taken", False)
  await update_vitamin(current_user.user_id, data.vitamin_id, {
    "is_taken": new_is_taken,
    "last_taken_date": today_str() if new_is_taken else vitamin.get("last_taken_date"),
  })
  
  return {"message": "Vitamin toggled", "is_taken": new_is_taken}


@api_router.delete("/vitamins/{vitamin_id}")
async def delete_vitamin(vitamin_id: str, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  await delete_user_vitamin(current_user.user_id, vitamin_id)
  return {"message": "Vitamin deleted"}


@api_router.get("/vitamins/today")
async def get_vitamins_today(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  vitamins = await get_user_vitamins(current_user.user_id)
  taken_count = sum(1 for v in vitamins if v.get("is_taken", False))
  
  return {
    "vitamins": vitamins,
    "taken_count": taken_count,
    "total_count": len(vitamins),
    "date": today_str(),
  }


# -------------------------
# PREMIUM & ADS
# -------------------------
@api_router.post("/premium/activate")
async def activate_premium(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  # NOTE: Guest users CAN activate premium for Play Store testing
  # In production, uncomment the check below:
  # if current_user.user_id.startswith("guest_"):
  #   raise HTTPException(status_code=403, detail="Guest users cannot activate premium. Please create an account.")
  
  # Free premium activation for 30 days
  expires_at = now_utc() + timedelta(days=30)
  
  await store_update_user(current_user.user_id, {
    "is_premium": True,
    "premium_expires_at": expires_at,
  })
  
  return {
    "message": "Premium activated",
    "is_premium": True,
    "premium_expires_at": expires_at.isoformat(),
  }


@api_router.get("/premium/status")
async def get_premium_status(current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  user_doc = await store_get_user_by_id(current_user.user_id)
  
  is_premium = user_doc.get("is_premium", False)
  expires_at = user_doc.get("premium_expires_at")
  
  # Check if premium expired
  if is_premium and expires_at:
    if isinstance(expires_at, str):
      expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
      expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
      is_premium = False
      await store_update_user(current_user.user_id, {"is_premium": False})
  
  return {
    "is_premium": is_premium,
    "premium_expires_at": expires_at.isoformat() if expires_at else None,
    "ads_watched": user_doc.get("ads_watched", 0),
  }


class WatchAdRequest(BaseModel):
  ad_count: int = 1


@api_router.post("/ads/watch")
async def watch_ad(data: WatchAdRequest, current_user: Optional[User] = Depends(get_current_user)):
  if not current_user:
    raise HTTPException(status_code=401, detail="Not authenticated")
  
  user_doc = await store_get_user_by_id(current_user.user_id)
  current_ads = user_doc.get("ads_watched", 0)
  new_ads = current_ads + data.ad_count
  
  update_data = {"ads_watched": new_ads}
  
  # Every 3 ads = 24h premium
  if new_ads >= 3:
    remaining = new_ads % 3
    premium_days = new_ads // 3
    
    expires_at = now_utc() + timedelta(hours=24 * premium_days)
    update_data["is_premium"] = True
    update_data["premium_expires_at"] = expires_at
    update_data["ads_watched"] = remaining
  
  await store_update_user(current_user.user_id, update_data)
  
  updated_user = await store_get_user_by_id(current_user.user_id)
  
  return {
    "message": "Ad watched",
    "ads_watched": updated_user.get("ads_watched", 0),
    "ads_until_premium": 3 - updated_user.get("ads_watched", 0),
    "is_premium": updated_user.get("is_premium", False),
  }


# -------------------------
# ACCOUNT DELETION (Google Play Console requirement)
# -------------------------

# Rate limiting storage (simple in-memory)
_deletion_request_times: Dict[str, List[datetime]] = {}
RATE_LIMIT_REQUESTS = 5  # max requests per IP
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds

def check_rate_limit(ip: str) -> bool:
  """Check if IP is rate limited. Returns True if allowed, False if blocked."""
  now = datetime.now(timezone.utc)
  window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
  
  if ip not in _deletion_request_times:
    _deletion_request_times[ip] = []
  
  # Clean old entries
  _deletion_request_times[ip] = [t for t in _deletion_request_times[ip] if t > window_start]
  
  if len(_deletion_request_times[ip]) >= RATE_LIMIT_REQUESTS:
    return False
  
  _deletion_request_times[ip].append(now)
  return True

def validate_email(email: str) -> bool:
  """Basic email validation."""
  pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  return bool(re.match(pattern, email))

async def store_deletion_request(request_data: dict):
  """Store deletion request in MongoDB or fallback to file."""
  if mongo_db is not None:
    await mongo_db.deletion_requests.insert_one(request_data)
  else:
    # Fallback to JSONL file
    requests_file = ROOT_DIR / "deletion_requests.jsonl"
    with open(requests_file, "a", encoding="utf-8") as f:
      f.write(json.dumps(request_data, default=str) + "\n")

ACCOUNT_DELETION_PAGE_HTML = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hesap Silme - CalorieDiet</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #4CAF50;
            font-size: 18px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .section h2::before {
            content: "•";
            color: #4CAF50;
        }
        .section p, .section li {
            color: #555;
            font-size: 14px;
        }
        .section ul {
            padding-left: 20px;
            margin-top: 8px;
        }
        .section li {
            margin-bottom: 6px;
        }
        .highlight-box {
            background: #f8f9fa;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin: 15px 0;
        }
        .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin: 15px 0;
        }
        .form-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin-top: 20px;
        }
        .form-section h2 {
            margin-bottom: 15px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            color: #333;
            font-size: 14px;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #4CAF50;
        }
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        .honeypot {
            position: absolute;
            left: -9999px;
        }
        .submit-btn {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
        }
        .footer a {
            color: #4CAF50;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .emoji { font-size: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍎 CalorieDiet (Calorie & Diet Tracker)</h1>
            <p>Hesap Silme ve Veri Yönetimi</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Hesabınızı Nasıl Silebilirsiniz?</h2>
                <p>CalorieDiet hesabınızı aşağıdaki yöntemlerden biriyle silebilirsiniz:</p>
                
                <div class="highlight-box">
                    <strong>📱 Uygulama İçinden (Önerilen):</strong>
                    <ol style="margin-top: 8px; padding-left: 20px;">
                        <li>Uygulamayı açın</li>
                        <li>Profil sekmesine gidin</li>
                        <li>"Çıkış Yap" butonuna tıklayın</li>
                        <li>Hesabınız ve verileriniz silinecektir</li>
                    </ol>
                </div>
                
                <div class="highlight-box">
                    <strong>🌐 Web Üzerinden:</strong>
                    <p style="margin-top: 8px;">Uygulamaya erişemiyorsanız, aşağıdaki formu kullanarak hesap silme talebinde bulunabilirsiniz.</p>
                </div>
            </div>
            
            <div class="section">
                <h2>Silinecek Veriler</h2>
                <p>Hesabınız silindiğinde aşağıdaki veriler kalıcı olarak kaldırılacaktır:</p>
                <ul>
                    <li><strong>Hesap Bilgileri:</strong> E-posta adresi, kullanıcı adı, profil bilgileri</li>
                    <li><strong>Sağlık Verileri:</strong> Boy, kilo, yaş, cinsiyet, aktivite seviyesi</li>
                    <li><strong>Öğün Kayıtları:</strong> Tüm yemek ve kalori kayıtları</li>
                    <li><strong>Su Tüketimi:</strong> Günlük su içme kayıtları</li>
                    <li><strong>Adım Verileri:</strong> Günlük adım sayısı kayıtları</li>
                    <li><strong>Vitamin Takibi:</strong> Vitamin ve takviye kayıtları</li>
                    <li><strong>Diyet Planları:</strong> Oluşturulan veya kaydedilen diyet planları</li>
                    <li><strong>Premium Üyelik:</strong> Premium abonelik durumu</li>
                </ul>
            </div>
            
            <div class="section">
                <h2>Saklanan Veriler</h2>
                <div class="warning-box">
                    <p>Yasal zorunluluklar ve güvenlik nedeniyle aşağıdaki veriler belirli bir süre saklanabilir:</p>
                    <ul style="margin-top: 8px;">
                        <li>Hesap silme talep kayıtları (1 yıl)</li>
                        <li>Güvenlik logları (90 gün)</li>
                    </ul>
                    <p style="margin-top: 8px;"><em>Not: Uygulamamızda ödeme/faturalama sistemi bulunmamaktadır.</em></p>
                </div>
            </div>
            
            <div class="section">
                <h2>İşlem Süresi</h2>
                <p>Hesap silme işlemi <strong>7-30 gün</strong> içinde tamamlanır. İşlem tamamlandığında size e-posta ile bilgi verilecektir.</p>
            </div>
            
            <div class="form-section">
                <h2>📝 Hesap Silme Talebi</h2>
                <p style="margin-bottom: 15px; color: #666;">Uygulamaya erişemiyorsanız, aşağıdaki formu doldurun:</p>
                
                <form action="/api/account-deletion-request" method="POST">
                    <div class="form-group">
                        <label for="email">E-posta Adresi *</label>
                        <input type="email" id="email" name="email" required 
                               placeholder="hesabiniz@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="note">Ek Not (İsteğe bağlı)</label>
                        <textarea id="note" name="note" maxlength="500"
                                  placeholder="Varsa eklemek istediğiniz bilgiler..."></textarea>
                    </div>
                    
                    <!-- Honeypot field for spam protection -->
                    <div class="honeypot">
                        <input type="text" name="website" tabindex="-1" autocomplete="off">
                    </div>
                    
                    <button type="submit" class="submit-btn">Silme Talebi Gönder</button>
                </form>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Destek:</strong> <a href="mailto:eystudio.3d@gmail.com">eystudio.3d@gmail.com</a></p>
            <p style="margin-top: 8px; font-size: 12px; color: #888;">
                © 2024 CalorieDiet. Tüm hakları saklıdır.
            </p>
        </div>
    </div>
</body>
</html>
"""

DELETION_REQUEST_SUCCESS_HTML = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talep Alındı - CalorieDiet</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #4CAF50;
            margin-bottom: 15px;
            font-size: 24px;
        }
        p {
            color: #555;
            margin-bottom: 10px;
        }
        .request-id {
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: monospace;
            margin: 20px 0;
            font-size: 14px;
        }
        .info-box {
            background: #e8f5e9;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .info-box ul {
            padding-left: 20px;
            margin-top: 8px;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #4CAF50;
            text-decoration: none;
            font-weight: 600;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Talebiniz Alındı!</h1>
        <p>Hesap silme talebiniz başarıyla kaydedildi.</p>
        
        <div class="request-id">
            <strong>Talep No:</strong> __REQUEST_ID__
        </div>
        
        <div class="info-box">
            <strong>📋 Sonraki Adımlar:</strong>
            <ul>
                <li>Talebiniz 7-30 gün içinde işleme alınacak</li>
                <li>İşlem tamamlandığında e-posta ile bilgilendirileceksiniz</li>
                <li>Sorularınız için: <a href="mailto:eystudio.3d@gmail.com">eystudio.3d@gmail.com</a></li>
            </ul>
        </div>
        
        <a href="/account-deletion" class="back-link">← Geri Dön</a>
    </div>
</body>
</html>
"""

DELETION_REQUEST_ERROR_HTML = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hata - CalorieDiet</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #f44336; margin-bottom: 15px; font-size: 24px; }
        p { color: #555; margin-bottom: 10px; }
        .error-msg {
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #4CAF50;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>Bir Hata Oluştu</h1>
        <div class="error-msg">__ERROR_MESSAGE__</div>
        <a href="/account-deletion" class="back-link">← Tekrar Dene</a>
    </div>
</body>
</html>
"""

@app.get("/account-deletion", response_class=HTMLResponse)
async def account_deletion_page():
  """
  Public page for Google Play Console account deletion requirement.
  Displays information about how to delete account and a request form.
  """
  return HTMLResponse(content=ACCOUNT_DELETION_PAGE_HTML, status_code=200)

@app.head("/account-deletion")
async def account_deletion_head():
  # Some validators (and curl -I) use HEAD requests.
  # Explicitly support HEAD so the endpoint never returns 405.
  return Response(status_code=200)

@app.get("/account-deletion/", response_class=HTMLResponse)
async def account_deletion_page_trailing_slash():
  # Serve the same content for trailing slash to avoid 404/redirect issues.
  return HTMLResponse(content=ACCOUNT_DELETION_PAGE_HTML, status_code=200)

@app.head("/account-deletion/")
async def account_deletion_head_trailing_slash():
  return Response(status_code=200)



@api_router.post("/account-deletion-request", response_class=HTMLResponse)
async def submit_deletion_request(
  request: Request,
  email: str = Form(...),
  note: str = Form(""),
  website: str = Form("")  # Honeypot field
):
  """
  Handle account deletion request form submission.
  Validates input, checks rate limit, and stores the request.
  """
  # Get client IP for rate limiting
  client_ip = request.client.host if request.client else "unknown"
  forwarded_for = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
  if forwarded_for:
    client_ip = forwarded_for
  
  # Honeypot check - if filled, it's likely a bot
  if website:
    logger.warning(f"Honeypot triggered from IP: {client_ip}")
    return HTMLResponse(
      content=DELETION_REQUEST_ERROR_HTML.replace("__ERROR_MESSAGE__", "İstek işlenemedi. Lütfen daha sonra tekrar deneyin."),
      status_code=400
    )
  
  # Rate limit check
  if not check_rate_limit(client_ip):
    logger.warning(f"Rate limit exceeded for IP: {client_ip}")
    return HTMLResponse(
      content=DELETION_REQUEST_ERROR_HTML.replace("__ERROR_MESSAGE__", "Çok fazla istek gönderildi. Lütfen 1 saat sonra tekrar deneyin."),
      status_code=429
    )
  
  # Validate email
  email = email.strip().lower()
  if not email or not validate_email(email):
    return HTMLResponse(
      content=DELETION_REQUEST_ERROR_HTML.replace("__ERROR_MESSAGE__", "Geçerli bir e-posta adresi giriniz."),
      status_code=400
    )
  
  # Validate note length
  note = note.strip()[:500] if note else ""
  
  # Generate request ID
  request_id = f"DEL-{uuid.uuid4().hex[:8].upper()}"
  
  # Prepare request data
  request_data = {
    "request_id": request_id,
    "email": email,
    "note": note,
    "ip_address": client_ip,
    "user_agent": request.headers.get("User-Agent", ""),
    "created_at": datetime.now(timezone.utc).isoformat(),
    "status": "pending"
  }
  
  try:
    # Store the request
    await store_deletion_request(request_data)
    logger.info(f"Account deletion request stored: {request_id} for {email}")
    
    return HTMLResponse(
      content=DELETION_REQUEST_SUCCESS_HTML.replace("__REQUEST_ID__", request_id),
      status_code=200
    )
  except Exception as e:
    logger.error(f"Failed to store deletion request: {e}")
    return HTMLResponse(
      content=DELETION_REQUEST_ERROR_HTML.replace("__ERROR_MESSAGE__", "Talep kaydedilemedi. Lütfen daha sonra tekrar deneyin."),
      status_code=500
    )


# -------------------------
# APP ROUTER
# -------------------------
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
  global mongo_client
  try:
    if mongo_client:
      mongo_client.close()
  except Exception:
    pass
