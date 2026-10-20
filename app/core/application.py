from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.storage import UPLOAD_DIR
from app.api.routers.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.category import router as category_router
from app.routes.product import router as product_router
from app.routes.stock_movement import router as stock_movement_router
from app.routes.report import router as report_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="StockFlow API",
        version="1.0.0",
        description="API para gerenciamento de estoque."
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(category_router)
    app.include_router(product_router)
    app.include_router(stock_movement_router)
    app.include_router(report_router)

    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

    return app