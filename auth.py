# auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List, Dict, Any, Optional, Tuple

import schemas
import utils
import models
from database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.ResponseModel)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user_email = utils.get_user_by_email(db, email=user.email)
    if db_user_email:
        return schemas.ResponseModel(
            success=False,
            status_code=400,
            message="Email already registered",
            data={}
        )
    
    # Check if mobile already exists
    db_user_mobile = utils.get_user_by_mobile(db, mobile_number=user.mobile_number)
    if db_user_mobile:
        return schemas.ResponseModel(
            success=False,
            status_code=400,
            message="Mobile number already registered",
            data={}
        )
    
    # Create user
    user = utils.create_user(db=db, user=user)
    return schemas.ResponseModel(
        success=True,
        status_code=200,
        message="User registered successfully",
        data={"user_id": user.id}
    )

@router.post("/login", response_model=schemas.ResponseModel)
def login_for_access_token(form_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # First try to authenticate by email
    user = utils.authenticate_user(db, form_data.email, form_data.password)
    
    if not user:
        return schemas.ResponseModel(
            success=False,
            status_code=400,
            message="Incorrect credentials",
            data={}
        )
    
    # Get user's country and state information
    country = db.query(models.Country).filter(models.Country.id == user.country_id).first()
    state = db.query(models.State).filter(models.State.id == user.state_id).first()
    
    access_token_expires = timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return schemas.ResponseModel(
        success=True,
        status_code=200,
        message="Login successful",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "mobile_number": user.mobile_number,
                "country_id": user.country_id,
                "country_name": country.name if country else None,
                "state_id": user.state_id,
                "state_name": state.name if state else None
            }
        }
    )

@router.get("/countries-with-states", response_model=schemas.ResponseModel)
def get_all_countries_with_states(db: Session = Depends(get_db)):
    # Query all countries with their states
    countries = db.query(models.Country).all()
    
    # Format the response
    countries_with_states = []
    for country in countries:
        country_data = {
            "id": country.id,
            "name": country.name,
            "states": [{"id": state.id, "name": state.name} for state in country.states]
        }
        countries_with_states.append(country_data)
    
    return schemas.ResponseModel(
        success=True,
        status_code=200,
        message="Countries with states retrieved successfully",
        data={"countries": countries_with_states}
    )

@router.post("/create-meeting/", response_model=schemas.ResponseModel)
def create_meeting(meeting: schemas.MeetingCreate):
    """Creates a new Zoom meeting without database operations."""
    # Log the incoming request
    print(f"Creating meeting with topic: {meeting.topic} at time: {meeting.start_time}")

    # Get timezone from request or use default
    timezone = getattr(meeting, 'timezone', 'UTC')

    # Create the Zoom meeting
    success, message, data = utils.create_zoom_meeting(meeting.topic, meeting.start_time, timezone)

    if success:
        # Extract relevant details for the response
        meeting_info = {
            'id': data.get('id'),
            'topic': data.get('topic'),
            'start_time': data.get('start_time'),
            'timezone': data.get('timezone'),
            'join_url': data.get('join_url'),
            'start_url': data.get('start_url'),  # This is the host URL
            'password': data.get('password'),
            'formatted_info': data.get('formatted_info', {})
        }
        
        return schemas.ResponseModel(
            success=True,
            status_code=200,
            message="Meeting created successfully",
            data=meeting_info
        )

    # Return error as a proper response without raising an exception
    return schemas.ResponseModel(
        success=False,
        status_code=400,
        message=message,
        data={}
    )
@router.get("/meetings", response_model=schemas.ResponseModel)
def get_all_meetings():
    """Retrieves all Zoom meetings for the user."""
    # Log the request
    print(f"Fetching all meetings")
    
    # Call the Zoom API to get meeting list
    success, message, meetings_data = utils.get_all_zoom_meetings()
    
    if success:
        return schemas.ResponseModel(
            success=True,
            status_code=200,
            message="Meetings retrieved successfully",
            data={"meetings": meetings_data}
        )
    
    # Return error response
    return schemas.ResponseModel(
        success=False,
        status_code=404,
        message=message,
        data={}
    )