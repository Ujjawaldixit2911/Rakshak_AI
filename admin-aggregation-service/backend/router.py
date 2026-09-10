"""
router.py
Standalone Admin Aggregation Service Router.
"""
from backend.app.routers.admin import (
    router,
    get_admin_dashboard_summary,
    assign_sos_response_team,
    AdminSummaryResponse,
    AssignResponseTeamRequest
)

__all__ = [
    "router",
    "get_admin_dashboard_summary",
    "assign_sos_response_team",
    "AdminSummaryResponse",
    "AssignResponseTeamRequest"
]
