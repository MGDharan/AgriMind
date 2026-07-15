import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, hash_password
from app.models.entities import Farm, Field, Listing, Prediction, User, Order, AgentLog
from app.repositories.base import UserRepository
from app.schemas.api import TokenResponse, UserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Admin Schemas ─────────────────────────────────────────────────────────────

class AdminStatsResponse(BaseModel):
    total_farmers: int
    total_farms: int
    total_fields: int
    total_scans: int
    total_listings: int

class AdminFarmerResponse(BaseModel):
    id: int
    email: str
    full_name: str
    location: Optional[str]
    is_active: bool
    created_at: datetime
    farms_count: int
    fields_count: int

    model_config = {"from_attributes": True}

class AdminFarmerDetailResponse(AdminFarmerResponse):
    recent_scans: int

class AdminActivityResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    agent: str
    input_summary: str
    created_at: datetime

class AdminListingResponse(BaseModel):
    id: int
    crop: str
    price_per_kg: float
    quantity_kg: float
    seller_name: str
    seller_email: str
    created_at: datetime

class AdminOrderResponse(BaseModel):
    id: int
    crop: str
    price_per_kg: float
    quantity_kg: float
    buyer_name: str
    buyer_email: str
    seller_name: str
    seller_email: str
    created_at: datetime

class AdminAgentLogResponse(BaseModel):
    id: int
    coordinator_session: str
    agent_name: str
    action: str
    latency_ms: float
    created_at: datetime

class AdminSeedRequest(BaseModel):
    email: str
    secret_key: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str

# ── Setup / Auth Endpoints ────────────────────────────────────────────────────

@router.post("/seed", response_model=dict)
def seed_admin(data: AdminSeedRequest, db: Session = Depends(get_db)):
    """One-time endpoint to promote a user to admin."""
    secret = os.getenv("ADMIN_SECRET_KEY", "agrimind-secret-setup")
    if data.secret_key != secret:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    repo = UserRepository(db)
    user = repo.get_by_email(data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_admin = True
    db.commit()
    return {"message": f"User {user.email} promoted to admin"}

@router.post("/login", response_model=TokenResponse)
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    """Login specifically for admins."""
    repo = UserRepository(db)
    user = repo.get_by_email(data.email)
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized as admin")
        
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


# ── Protected Admin Endpoints ─────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    farmers_count = db.query(User).filter(User.is_admin == False).count()
    farms_count = db.query(Farm).count()
    fields_count = db.query(Field).count()
    scans_count = db.query(Prediction).count()
    listings_count = db.query(Listing).count()
    
    return AdminStatsResponse(
        total_farmers=farmers_count,
        total_farms=farms_count,
        total_fields=fields_count,
        total_scans=scans_count,
        total_listings=listings_count,
    )

@router.get("/farmers", response_model=list[AdminFarmerResponse])
def list_farmers(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    farmers = db.query(User).filter(User.is_admin == False).order_by(User.created_at.desc()).all()
    
    result = []
    for f in farmers:
        farms_count = db.query(Farm).filter(Farm.owner_id == f.id).count()
        fields_count = db.query(Field).join(Farm).filter(Farm.owner_id == f.id).count()
        result.append(AdminFarmerResponse(
            id=f.id,
            email=f.email,
            full_name=f.full_name,
            location=f.location,
            is_active=f.is_active,
            created_at=f.created_at,
            farms_count=farms_count,
            fields_count=fields_count,
        ))
    return result

@router.get("/farmers/{farmer_id}", response_model=AdminFarmerDetailResponse)
def get_farmer_detail(farmer_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    f = db.query(User).filter(User.id == farmer_id, User.is_admin == False).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    farms_count = db.query(Farm).filter(Farm.owner_id == f.id).count()
    fields_count = db.query(Field).join(Farm).filter(Farm.owner_id == f.id).count()
    recent_scans = db.query(Prediction).filter(Prediction.user_id == f.id).count()
    
    return AdminFarmerDetailResponse(
        id=f.id,
        email=f.email,
        full_name=f.full_name,
        location=f.location,
        is_active=f.is_active,
        created_at=f.created_at,
        farms_count=farms_count,
        fields_count=fields_count,
        recent_scans=recent_scans,
    )

@router.put("/farmers/{farmer_id}/toggle", response_model=dict)
def toggle_farmer(farmer_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    f = db.query(User).filter(User.id == farmer_id, User.is_admin == False).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    f.is_active = not f.is_active
    db.commit()
    return {"message": "Farmer status updated", "is_active": f.is_active}

@router.get("/activity", response_model=list[AdminActivityResponse])
def get_activity(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    activities = (
        db.query(Prediction, User)
        .join(User, Prediction.user_id == User.id)
        .order_by(Prediction.created_at.desc())
        .limit(100)
        .all()
    )
    
    return [
        AdminActivityResponse(
            id=pred.id,
            user_id=usr.id,
            user_email=usr.email,
            agent=pred.agent,
            input_summary=pred.input_summary,
            created_at=pred.created_at,
        )
        for pred, usr in activities
    ]

@router.get("/listings", response_model=list[AdminListingResponse])
def get_all_listings(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    listings = (
        db.query(Listing, User)
        .join(User, Listing.seller_id == User.id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    
    return [
        AdminListingResponse(
            id=listg.id,
            crop=listg.crop,
            price_per_kg=listg.price_per_kg,
            quantity_kg=listg.quantity_kg,
            seller_name=usr.full_name,
            seller_email=usr.email,
            created_at=listg.created_at,
        )
        for listg, usr in listings
    ]

@router.get("/orders", response_model=list[AdminOrderResponse])
def get_all_orders(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy.orm import aliased
    Buyer = aliased(User)
    Seller = aliased(User)
    
    orders_data = (
        db.query(Order, Buyer, Listing, Seller)
        .join(Buyer, Order.buyer_id == Buyer.id)
        .join(Listing, Order.listing_id == Listing.id)
        .join(Seller, Listing.seller_id == Seller.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    
    return [
        AdminOrderResponse(
            id=order.id,
            crop=listing.crop,
            price_per_kg=listing.price_per_kg,
            quantity_kg=order.quantity_kg,
            buyer_name=buyer.full_name,
            buyer_email=buyer.email,
            seller_name=seller.full_name,
            seller_email=seller.email,
            created_at=order.created_at,
        )
        for order, buyer, listing, seller in orders_data
    ]

@router.get("/logs", response_model=list[AdminAgentLogResponse])
def get_agent_logs(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(AgentLog).order_by(AgentLog.created_at.desc()).limit(200).all()
    return [
        AdminAgentLogResponse(
            id=log.id,
            coordinator_session=log.coordinator_session,
            agent_name=log.agent_name,
            action=log.action,
            latency_ms=log.latency_ms,
            created_at=log.created_at,
        )
        for log in logs
    ]
