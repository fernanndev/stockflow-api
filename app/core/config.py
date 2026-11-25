from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
    )

    cors_origins: str = "http://localhost:5173"

    # how many stores this installation may have (the plan of the customer)
    max_stores: int = 2

    # the interactive API docs (/docs) are turned off in production
    enable_docs: bool = True

settings = Settings()