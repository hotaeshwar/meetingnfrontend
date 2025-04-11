# utils.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "6ea31c4820f2f3b5a232a4397f5c808e93c481c61fee4af986db1404ff4d41de"  # In production, use a secure secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_mobile(db: Session, mobile_number: str):
    return db.query(models.User).filter(models.User.mobile_number == mobile_number).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        first_name=user.first_name,
        last_name=user.last_name,
        mobile_number=user.mobile_number,
        email=user.email,
        password=hashed_password,
        country_id=user.country_id,
        state_id=user.state_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def get_countries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Country).offset(skip).limit(limit).all()

def get_states_by_country(db: Session, country_id: int):
    return db.query(models.State).filter(models.State.country_id == country_id).all()

def create_initial_data(db: Session):
    # Check if data already exists
    if db.query(models.Country).count() > 0:
        return
    
    # Create countries with their states
    countries_data = {
        "USA": [
            "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
            "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
            "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
            "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
            "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
            "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
            "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
            "Wisconsin", "Wyoming", "District of Columbia"
        ],
        "Canada": [
            "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", 
            "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", 
            "Quebec", "Saskatchewan", "Yukon"
        ],
        "India": [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
            "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
            "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
            "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
            "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
            "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
        ],
        "United Kingdom": [
            "England", "Scotland", "Wales", "Northern Ireland"
        ],
        "Australia": [
            "New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia", 
            "Australian Capital Territory", "Northern Territory"
        ],
        "Brazil": [
            "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Espírito Santo", "Goiás", "Maranhão", 
            "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", 
            "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", 
            "Santa Catarina", "São Paulo", "Sergipe", "Tocantins", "Federal District"
        ],
        "China": [
            "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi", "Guizhou", "Hainan", 
            "Hebei", "Heilongjiang", "Henan", "Hong Kong", "Hubei", "Hunan", "Inner Mongolia", "Jiangsu", 
            "Jiangxi", "Jilin", "Liaoning", "Macau", "Ningxia", "Qinghai", "Shaanxi", "Shandong", "Shanghai", 
            "Shanxi", "Sichuan", "Taiwan", "Tianjin", "Tibet", "Xinjiang", "Yunnan", "Zhejiang"
        ],
        "Germany": [
            "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse", 
            "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate", 
            "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
        ],
        "France": [
            "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany", "Centre-Val de Loire", "Corsica", 
            "Grand Est", "Hauts-de-France", "Île-de-France", "Normandy", "Nouvelle-Aquitaine", "Occitanie", 
            "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "Guadeloupe", "Martinique", "French Guiana", 
            "Réunion", "Mayotte"
        ],
        "Japan": [
            "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima", "Ibaraki", "Tochigi", 
            "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa", "Niigata", "Toyama", "Ishikawa", "Fukui", 
            "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie", "Shiga", "Kyoto", "Osaka", "Hyogo", 
            "Nara", "Wakayama", "Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi", "Tokushima", 
            "Kagawa", "Ehime", "Kochi", "Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki", 
            "Kagoshima", "Okinawa"
        ],
        "South Africa": [
            "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", 
            "North West", "Northern Cape", "Western Cape"
        ],
        "Mexico": [
            "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", 
            "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Mexico City", 
            "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", 
            "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", 
            "Veracruz", "Yucatán", "Zacatecas"
        ],
        "Italy": [
            "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", 
            "Friuli Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche", "Molise", "Piedmont", 
            "Sardinia", "Sicily", "Trentino-South Tyrol", "Tuscany", "Umbria", "Veneto"
        ],
        "Spain": [
            "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country", "Canary Islands", 
            "Cantabria", "Castile and León", "Castilla–La Mancha", "Catalonia", "Extremadura", "Galicia", 
            "Community of Madrid", "Region of Murcia", "Navarre", "La Rioja", "Valencian Community", 
            "Ceuta", "Melilla"
        ],
        "Russia": [
            "Adygea", "Altai Krai", "Altai Republic", "Amur Oblast", "Arkhangelsk Oblast", "Astrakhan Oblast", 
            "Bashkortostan", "Belgorod Oblast", "Bryansk Oblast", "Buryatia", "Chechen Republic", "Chelyabinsk Oblast", 
            "Chukotka Autonomous Okrug", "Chuvashia", "Crimea", "Dagestan", "Ingushetia", "Irkutsk Oblast", 
            "Ivanovo Oblast", "Jewish Autonomous Oblast", "Kabardino-Balkaria", "Kaliningrad Oblast", "Kalmykia", 
            "Kaluga Oblast", "Kamchatka Krai", "Karachay-Cherkessia", "Karelia", "Kemerovo Oblast", "Khabarovsk Krai", 
            "Khakassia", "Khanty-Mansi Autonomous Okrug", "Kirov Oblast", "Komi Republic", "Kostroma Oblast", 
            "Krasnodar Krai", "Krasnoyarsk Krai", "Kurgan Oblast", "Kursk Oblast", "Leningrad Oblast", "Lipetsk Oblast", 
            "Magadan Oblast", "Mari El Republic", "Moscow", "Moscow Oblast", "Murmansk Oblast", "Nenets Autonomous Okrug", 
            "Nizhny Novgorod Oblast", "North Ossetia-Alania", "Novgorod Oblast", "Novosibirsk Oblast", "Omsk Oblast", 
            "Orenburg Oblast", "Oryol Oblast", "Penza Oblast", "Perm Krai", "Primorsky Krai", "Pskov Oblast", 
            "Rostov Oblast", "Ryazan Oblast", "Saint Petersburg", "Sakha Republic", "Sakhalin Oblast", "Samara Oblast", 
            "Saratov Oblast", "Sevastopol", "Smolensk Oblast", "Stavropol Krai", "Sverdlovsk Oblast", "Tambov Oblast", 
            "Tatarstan", "Tomsk Oblast", "Tula Oblast", "Tuva Republic", "Tver Oblast", "Tyumen Oblast", 
            "Udmurt Republic", "Ulyanovsk Oblast", "Vladimir Oblast", "Volgograd Oblast", "Vologda Oblast", 
            "Voronezh Oblast", "Yamalo-Nenets Autonomous Okrug", "Yaroslavl Oblast", "Zabaykalsky Krai"
        ]
    }
    
    # Add countries and states to the database
    for country_name, states in countries_data.items():
        # Create country
        country = models.Country(name=country_name)
        db.add(country)
        db.commit()
        db.refresh(country)
        
        # Create states for this country
        for state_name in states:
            state = models.State(name=state_name, country_id=country.id)
            db.add(state)
        
    db.commit()

# ----------------- Zoom API Integration -----------------
import base64
import requests
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

# Zoom API Credentials
ZOOM_ACCOUNT_ID = "DN9AAp02SEiZNdAeCSqXDg"
ZOOM_CLIENT_ID = "JkskHb7HTye7Rv9QX81cZQ"
ZOOM_CLIENT_SECRET = "StXD1AMndHCr262oNO22AXticdLVGNa5"
ZOOM_USER_ID = "me"  # Use "me" for account-level apps

def get_zoom_access_token() -> Optional[str]:
    """Generates a Zoom API access token with updated scopes."""
    url = "https://zoom.us/oauth/token"
    credentials = f"{ZOOM_CLIENT_ID}:{ZOOM_CLIENT_SECRET}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {"grant_type": "account_credentials", "account_id": ZOOM_ACCOUNT_ID}

    response = requests.post(url, headers=headers, data=data)

    if response.status_code == 200:
        access_token = response.json().get("access_token")
        print(f"New Zoom Access Token: {access_token}")  # Debugging log
        return access_token

    print("Zoom API Error:", response.text)  # Debug log
    return None

def create_zoom_meeting(topic: str, start_time: datetime, timezone: str = "UTC") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Creates a Zoom meeting without saving to database."""

    access_token = get_zoom_access_token()
    if not access_token:
        return False, "Failed to authenticate with Zoom API", None

    url = f"https://api.zoom.us/v2/users/{ZOOM_USER_ID}/meetings"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "topic": topic,
        "type": 2,
        "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "duration": 60,
        "timezone": timezone,  # Use the provided timezone
        "settings": {
            "host_video": True,
            "participant_video": True,
            "mute_upon_entry": True,
            "waiting_room": False,
            "auto_recording": "cloud"
        }
    }

    print(f"Sending to Zoom API: {payload}")  # Debug log
    response = requests.post(url, headers=headers, json=payload)
    print(f"Zoom API Response: {response.status_code}")  # Debug log

    if response.status_code == 201:
        meeting_data = response.json()
        # Extract the important URLs from the response
        meeting_data['formatted_info'] = {
            'join_url': meeting_data.get('join_url', ''),
            'host_url': meeting_data.get('start_url', ''),  # In Zoom API, host URL is called start_url
            'meeting_id': meeting_data.get('id', ''),
            'password': meeting_data.get('password', ''),
            'formatted_start_time': meeting_data.get('start_time', '')
        }
        return True, "Meeting created successfully", meeting_data

    return False, f"Error creating meeting: {response.text}", None


def get_all_zoom_meetings() -> Tuple[bool, str, Optional[List[Dict[str, Any]]]]:
    """
    Retrieves all Zoom meetings for the authenticated user with complete details including host URLs.
    
    Returns:
        Tuple containing:
        - success: Boolean indicating if the operation was successful
        - message: String message about the result
        - data: List of dictionaries with meeting details (if successful)
    """
    try:
        # Get access token using the existing function
        access_token = get_zoom_access_token()
        if not access_token:
            return False, "Failed to authenticate with Zoom API", None
        
        # Prepare API request
        url = f"https://api.zoom.us/v2/users/{ZOOM_USER_ID}/meetings"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Optional parameters for pagination and filtering
        params = {
            "type": "scheduled",  # Get scheduled meetings
            "page_size": 100      # Maximum number of meetings per request
        }
        
        # Make the API request to Zoom
        response = requests.get(url, headers=headers, params=params)
        
        # Check if the request was successful
        if response.status_code == 200:
            response_data = response.json()
            meetings = response_data.get("meetings", [])
            enhanced_meetings = []
            
            # For each meeting in the list, fetch its detailed information
            for meeting in meetings:
                meeting_id = meeting.get("id")
                if meeting_id:
                    # Make a separate API call to get detailed meeting information
                    detail_url = f"https://api.zoom.us/v2/meetings/{meeting_id}"
                    detail_response = requests.get(detail_url, headers=headers)
                    
                    if detail_response.status_code == 200:
                        # Get detailed meeting data which includes start_url (host URL)
                        meeting_details = detail_response.json()
                        
                        # Add formatted_info with complete information
                        meeting_details['formatted_info'] = {
                            'join_url': meeting_details.get('join_url', ''),
                            'host_url': meeting_details.get('start_url', ''),
                            'meeting_id': meeting_details.get('id', ''),
                            'password': meeting_details.get('password', ''),
                            'formatted_start_time': meeting_details.get('start_time', '')
                        }
                        
                        enhanced_meetings.append(meeting_details)
                    else:
                        # If we can't get details, just use the list data
                        meeting['formatted_info'] = {
                            'join_url': meeting.get('join_url', ''),
                            'host_url': "Details not available",
                            'meeting_id': meeting.get('id', ''),
                            'password': meeting.get('password', ''),
                            'formatted_start_time': meeting.get('start_time', '')
                        }
                        enhanced_meetings.append(meeting)
            
            return True, "Meetings retrieved successfully", enhanced_meetings
        else:
            error_info = response.json() if response.text else {"message": f"HTTP error {response.status_code}"}
            error_message = error_info.get("message", "Failed to retrieve meetings")
            return False, error_message, None
            
    except Exception as e:
        return False, f"Error retrieving meetings: {str(e)}", None