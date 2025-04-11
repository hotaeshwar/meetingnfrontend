# models.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    states = relationship("State", back_populates="country")

class State(Base):
    __tablename__ = "states"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"))
    country = relationship("Country", back_populates="states")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    mobile_number = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    country_id = Column(Integer, ForeignKey("countries.id"))
    state_id = Column(Integer, ForeignKey("states.id"))