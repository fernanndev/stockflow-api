import os

# The settings are read as soon as the app is imported,
# so these defaults must exist before any "app" import.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/stockflow"
)
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import settings
from app.database.base import Base
from app.database.dependencies import get_db
from app.main import app
from app.schemas.user import UserCreate
from app.services.user_service import UserService

TEST_DB_NAME = "stockflow_test"


@pytest.fixture(scope="session")
def engine():
    main_url = make_url(settings.database_url)
    admin_url = main_url.set(database="postgres")
    test_url = main_url.set(database=TEST_DB_NAME)

    # Safety net: tests drop and recreate tables, so never point them at a real database.
    assert test_url.database.endswith("_test")

    # CREATE DATABASE cannot run inside a transaction, hence AUTOCOMMIT.
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DB_NAME},
        ).scalar()

        if not exists:
            connection.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    admin_engine.dispose()

    test_engine = create_engine(test_url)
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)

    yield test_engine

    test_engine.dispose()


@pytest.fixture()
def client(engine):
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()

        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

    # Every test starts from empty tables.
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


@pytest.fixture()
def auth_headers(client, engine):
    testing_session = sessionmaker(bind=engine)

    with testing_session() as session:
        UserService(session).create(
            UserCreate(name="Tester", email="tester@example.com", password="password123")
        )

    response = client.post(
        "/auth/login",
        data={"username": "tester@example.com", "password": "password123"},
    )

    return {"Authorization": f"Bearer {response.json()['access_token']}"}