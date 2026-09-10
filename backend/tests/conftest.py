"""
conftest.py
Pytest fixtures and database initialization for backend tests.
"""
import pytest
from app.database import engine, Base

@pytest.fixture(scope="session", autouse=True)
async def initialize_test_database():
    """Ensure all SQLAlchemy tables are created before running tests."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
