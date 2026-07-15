import json
import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.agents.coordinator import CoordinatorAgent
from app.agents.market_agent import MarketAgent
from app.agents.rag_agent import RAGAgent
from app.agents.soil_agent import SoilAgent
from app.agents.weather_agent import WeatherAgent
from app.api.deps import get_current_user, get_optional_user, save_image, validate_image
from app.core.database import get_db
from app.models.entities import User
from app.repositories.base import PredictionRepository, ListingRepository, UserRepository, OrderRepository
from app.schemas.api import (
    CoordinatorRequest,
    CoordinatorResponse,
    MarketResponse,
    RAGRequest,
    RAGResponse,
    SoilAnalysisRequest,
    VisionResponse,
    WeatherResponse,
    ListingResponse,
    PurchaseRequest,
    OrderResponse,
    PurchaseResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["predictions"])

coordinator = CoordinatorAgent()


@router.post("/ndvi/analyze")
async def analyze_ndvi(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """
    Upload the Warwan data.zip (all 3 datasets) OR a single CSV/Excel.
    Returns 30-day XGBoost forecast + field health suggestions.
    """
    from app.agents.ndvi_agent import NDVIAgent
    from fastapi import HTTPException

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 50MB limit")

    agent = NDVIAgent()
    fname = (file.filename or "upload").lower()

    if fname.endswith(".zip"):
        result = agent.analyze_zip(content)
    else:
        result = agent.analyze_file(content, file.filename or "upload.xlsx")

    return result


@router.post("/image", response_model=CoordinatorResponse)
async def analyze_image(
    file: UploadFile = File(...),
    crop: str = Form(default=""),
    latitude: float = Form(default=13.0827),
    longitude: float = Form(default=80.2707),
    location: str = Form(default="Tamil Nadu, India"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await validate_image(file)
    filepath = save_image(content, user.id)
    logger.info("Image saved: %s for user %d", filepath, user.id)

    result = await coordinator.process_image(
        content,
        crop_hint=crop or None,
        latitude=latitude,
        longitude=longitude,
        location=location,
    )

    PredictionRepository(db).create(
        user.id, "coordinator_image", f"Image: {file.filename}", json.dumps(result), None
    )

    return CoordinatorResponse(**result)


@router.post("/predict", response_model=CoordinatorResponse)
async def predict(
    request: CoordinatorRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await coordinator.process_query(request.model_dump())
    PredictionRepository(db).create(
        user.id, "coordinator", request.query or request.crop or "general", json.dumps(result), None
    )
    return CoordinatorResponse(**result)


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    latitude: float = 13.0827,
    longitude: float = 80.2707,
    crop: str = "tomato",
    user: User | None = Depends(get_optional_user),
):
    agent = WeatherAgent()
    result = await agent.analyze(latitude, longitude, crop)
    return WeatherResponse(**{k: result[k] for k in WeatherResponse.model_fields})


@router.post("/soil", response_model=dict)
async def analyze_soil(request: SoilAnalysisRequest, user: User = Depends(get_current_user)):
    agent = SoilAgent()
    return agent.analyze(request.nitrogen, request.phosphorus, request.potassium, request.ph, request.crop)


@router.get("/market", response_model=MarketResponse)
async def get_market(crop: str = "tomato", user: User | None = Depends(get_optional_user)):
    agent = MarketAgent()
    result = agent.analyze(crop)
    return MarketResponse(**{k: result[k] for k in MarketResponse.model_fields})


@router.post("/market/listings", response_model=ListingResponse)
async def create_listing(
    crop: str = Form(...),
    price_per_kg: float = Form(...),
    quantity_kg: float = Form(...),
    file: UploadFile | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image_path = None
    if file is not None:
        content = await validate_image(file)
        image_path = save_image(content, user.id)

    listing = ListingRepository(db).create(user.id, crop, price_per_kg, quantity_kg, image_path)
    # include seller info
    resp = ListingResponse.model_validate(listing)
    resp.seller_name = user.full_name
    resp.seller_email = user.email
    return resp


@router.get("/market/listings", response_model=list[ListingResponse])
async def list_listings(crop: str | None = None, db: Session = Depends(get_db)):
    listings = ListingRepository(db).list_by_crop(crop)
    results = []
    for l in listings:
        seller = UserRepository(db).get_by_id(l.seller_id)
        item = ListingResponse.model_validate(l)
        item.seller_name = seller.full_name if seller else None
        item.seller_email = seller.email if seller else None
        results.append(item)
    return results


@router.post("/market/purchase", response_model=PurchaseResponse)
async def purchase_listing(request: PurchaseRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = ListingRepository(db).get_by_id(request.listing_id)
    if not listing:
        from fastapi import HTTPException

        raise HTTPException(404, "Listing not found")

    seller = UserRepository(db).get_by_id(listing.seller_id)
    if not seller:
        from fastapi import HTTPException

        raise HTTPException(404, "Seller not found")

    # Persist the order
    order = OrderRepository(db).create(
        listing_id=listing.id,
        buyer_id=user.id,
        buyer_name=request.buyer_name,
        buyer_phone=request.buyer_phone,
        buyer_address=request.buyer_address,
        quantity_kg=request.quantity_kg,
    )

    # Notify seller by email
    from app.services.email_service import send_purchase_notification

    sent = send_purchase_notification(
        to_email=seller.email,
        to_name=seller.full_name,
        buyer_name=request.buyer_name,
        buyer_phone=request.buyer_phone,
        buyer_address=request.buyer_address,
        crop=listing.crop,
        quantity_kg=request.quantity_kg,
        listing_id=listing.id,
    )

    order_resp = OrderResponse(
        id=order.id,
        listing_id=listing.id,
        crop=listing.crop,
        price_per_kg=listing.price_per_kg,
        listing_quantity_kg=listing.quantity_kg,
        quantity_kg=order.quantity_kg,
        buyer_name=order.buyer_name,
        buyer_phone=order.buyer_phone,
        buyer_address=order.buyer_address,
        created_at=order.created_at,
    )

    return PurchaseResponse(sent=sent, order=order_resp)


@router.get("/market/orders", response_model=list[OrderResponse])
async def list_seller_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = OrderRepository(db).list_by_seller(user.id)
    results = []
    for order in orders:
        listing = ListingRepository(db).get_by_id(order.listing_id)
        if not listing:
            continue
        results.append(
            OrderResponse(
                id=order.id,
                listing_id=listing.id,
                crop=listing.crop,
                price_per_kg=listing.price_per_kg,
                listing_quantity_kg=listing.quantity_kg,
                quantity_kg=order.quantity_kg,
                buyer_name=order.buyer_name,
                buyer_phone=order.buyer_phone,
                buyer_address=order.buyer_address,
                created_at=order.created_at,
            )
        )
    return results


@router.post("/rag", response_model=RAGResponse)
async def ask_rag(request: RAGRequest, user: User = Depends(get_current_user)):
    agent = RAGAgent()
    result = agent.analyze(request.question)
    return RAGResponse(
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"],
    )
