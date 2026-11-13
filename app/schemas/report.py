from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_products: int
    total_categories: int
    total_stock_value: float
    projected_profit: float
    low_stock_count: int
    expiring_count: int


class ResultResponse(BaseModel):
    # completed sales with something charged (gift-only and canceledones are not counted) 
    sales_count: int
    revenue: float
    received: float
    open_balance: float
    products_cost: float
    packagings_cost: float
    gifts_cost: float
    losses_cost: float
    profit: float
    # list price of the gifts: sohwn apart, not subtracted from the profit
    gifts_forgone_revenue: float
    # items and losses with no cost registered: the real profit is lower than shown
    items_without_cost: int