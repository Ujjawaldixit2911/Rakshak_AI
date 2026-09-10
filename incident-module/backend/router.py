"""
router.py
Standalone Incident Module Router.
"""
from backend.app.routers.incidents import (
    router,
    submit_incident_report,
    list_incident_reports,
    get_incident_by_id,
    update_incident_status,
    CreateIncidentRequest,
    UpdateIncidentStatusRequest,
    IncidentResponse,
    PaginatedIncidentsResponse
)

__all__ = [
    "router",
    "submit_incident_report",
    "list_incident_reports",
    "get_incident_by_id",
    "update_incident_status",
    "CreateIncidentRequest",
    "UpdateIncidentStatusRequest",
    "IncidentResponse",
    "PaginatedIncidentsResponse"
]
