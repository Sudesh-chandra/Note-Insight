from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str
    firebase_project_id: str
    firebase_private_key_id: str
    firebase_private_key: str
    firebase_client_email: str
    firebase_client_id: str
    firebase_auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    firebase_token_uri: str = "https://oauth2.googleapis.com/token"
    firebase_cert_url: str
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
