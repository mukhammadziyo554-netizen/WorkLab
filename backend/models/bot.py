from sqlalchemy import Column, DateTime, Integer, String, Text, func

from database.connection import Base


class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    telegram_bot_token = Column(String(255), nullable=False)
    business_description = Column(Text, nullable=True)
    knowledge_base = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
