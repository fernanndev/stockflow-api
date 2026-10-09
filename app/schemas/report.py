from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_products: int
    total_categories: int
    total_stock_value: int
    low_stock_count: int
    expiring_count: int