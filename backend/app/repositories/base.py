from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.entities import Farm, Field, Prediction, User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def create(self, email: str, full_name: str, password: str, location: str | None, language: str) -> User:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            location=location,
            language=language,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user


class FarmRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, owner_id: int, name: str, location: str, lat: float | None, lng: float | None, area: float | None) -> Farm:
        farm = Farm(name=name, location=location, latitude=lat, longitude=lng, area_acres=area, owner_id=owner_id)
        self.db.add(farm)
        self.db.commit()
        self.db.refresh(farm)
        return farm

    def get_by_id(self, farm_id: int) -> Optional[Farm]:
        return self.db.query(Farm).filter(Farm.id == farm_id).first()

    def list_by_owner(self, owner_id: int) -> list[Farm]:
        return self.db.query(Farm).filter(Farm.owner_id == owner_id).all()


class FieldRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, farm_id: int, name: str, crop: str, age: int | None) -> Field:
        field = Field(name=name, crop=crop, crop_age_days=age, farm_id=farm_id)
        self.db.add(field)
        self.db.commit()
        self.db.refresh(field)
        return field

    def get_by_id(self, field_id: int) -> Optional[Field]:
        return self.db.query(Field).filter(Field.id == field_id).first()

    def list_by_farm(self, farm_id: int) -> list[Field]:
        return self.db.query(Field).filter(Field.farm_id == farm_id).all()


class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, agent: str, summary: str, result: str, confidence: float | None) -> Prediction:
        pred = Prediction(
            user_id=user_id,
            agent=agent,
            input_summary=summary,
            result_json=result,
            confidence=confidence,
        )
        self.db.add(pred)
        self.db.commit()
        self.db.refresh(pred)
        return pred

    def list_by_user(self, user_id: int, limit: int = 50) -> list[Prediction]:
        return (
            self.db.query(Prediction)
            .filter(Prediction.user_id == user_id)
            .order_by(Prediction.created_at.desc())
            .limit(limit)
            .all()
        )

    def count_by_user(self, user_id: int) -> int:
        return self.db.query(Prediction).filter(Prediction.user_id == user_id).count()
