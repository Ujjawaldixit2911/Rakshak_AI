"""
schemas.py
Pydantic Schemas and Tool Definitions for Rakshak AI Agent Module.
Supports native tool-use schema definitions (Anthropic & OpenAI/Groq formats).
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class UserLocationContext(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 28.6139})
    longitude: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": 77.2090})
    city: Optional[str] = Field("Delhi", json_schema_extra={"example": "Delhi"})


class AgentQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query in English, Hindi, or Hinglish", json_schema_extra={"example": "Mujhe Ghaziabad se Noida jaana hai safest route se."})
    userId: Optional[str] = Field(None, description="Optional user identifier", json_schema_extra={"example": "usr_9921"})
    userLocation: Optional[UserLocationContext] = Field(None, description="Optional current GPS coordinate context")
    conversationHistory: Optional[List[Dict[str, str]]] = Field(default=[], description="Previous conversation turns")


class ToolCallAuditRecord(BaseModel):
    stepIndex: int
    toolName: str
    arguments: Dict[str, Any]
    output: Any
    latencyMs: float
    timestamp: str
    status: Literal["SUCCESS", "FAILED", "AMBIGUOUS"]


class AgentQueryResponse(BaseModel):
    reply: str = Field(..., description="Natural language response synthesized by the AI Agent")
    toolCallsUsed: List[str] = Field(default=[], description="Ordered list of tool names executed")
    route: Optional[Dict[str, Any]] = Field(None, description="Structured route payload if a route was calculated/compared")
    toolLogs: List[ToolCallAuditRecord] = Field(default=[], description="Complete execution audit trail of all tool calls")
    status: Literal["COMPLETED", "CLARIFICATION_NEEDED", "ERROR"] = Field("COMPLETED", description="Agent execution status")


ANTHROPIC_TOOLS = [
    {
        "name": "get_current_location",
        "description": "Retrieves the current GPS coordinates and city of the user.",
        "input_schema": {
            "type": "object",
            "properties": {
                "userId": {
                    "type": "string",
                    "description": "Optional user identifier to retrieve last known GPS location."
                }
            }
        }
    },
    {
        "name": "search_location",
        "description": "Forward geocodes an address or place name (e.g. 'Ghaziabad', 'Noida Sector 62', 'Connaught Place') into latitude and longitude coordinates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The location address or place name to look up."
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "calculate_route",
        "description": "Calculates the driving distance, duration, and GeoJSON polyline geometry between source and destination coordinates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_lat": {"type": "number", "description": "Source latitude"},
                "source_lng": {"type": "number", "description": "Source longitude"},
                "dest_lat": {"type": "number", "description": "Destination latitude"},
                "dest_lng": {"type": "number", "description": "Destination longitude"}
            },
            "required": ["source_lat", "source_lng", "dest_lat", "dest_lng"]
        }
    },
    {
        "name": "get_crime_data",
        "description": "Fetches recent crime incident records in a given radius around specified coordinates from the Crime Data Module.",
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Latitude coordinate"},
                "longitude": {"type": "number", "description": "Longitude coordinate"},
                "radius_km": {"type": "number", "description": "Search radius in km (default 2.0)"}
            },
            "required": ["latitude", "longitude"]
        }
    },
    {
        "name": "analyze_route_risk",
        "description": "Segments a route's GeoJSON geometry and evaluates crime risk level for each segment using historical hotspot analytics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "geometry": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "number"}
                    },
                    "description": "Array of [lng, lat] coordinate pairs"
                }
            },
            "required": ["geometry"]
        }
    },
    {
        "name": "find_safe_route",
        "description": "Orchestrates multi-route comparison to evaluate Fastest, Safest, and Balanced routes with safety scores between source and destination.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_lat": {"type": "number", "description": "Source latitude"},
                "source_lng": {"type": "number", "description": "Source longitude"},
                "dest_lat": {"type": "number", "description": "Destination latitude"},
                "dest_lng": {"type": "number", "description": "Destination longitude"},
                "at_time": {"type": "string", "description": "Optional ISO-8601 timestamp for time-of-day risk"}
            },
            "required": ["source_lat", "source_lng", "dest_lat", "dest_lng"]
        }
    },
    {
        "name": "get_nearby_emergency_services",
        "description": "Finds nearby emergency services (police stations, hospitals, fire stations, pharmacies) within a radius around coordinates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Latitude coordinate"},
                "longitude": {"type": "number", "description": "Longitude coordinate"},
                "radius_km": {"type": "number", "description": "Search radius in km (default 3.0)"},
                "service_type": {
                    "type": "string",
                    "enum": ["police", "hospital", "fire_station", "pharmacy"],
                    "description": "Optional filter for emergency facility type"
                }
            },
            "required": ["latitude", "longitude"]
        }
    }
]

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["input_schema"]
        }
    }
    for tool in ANTHROPIC_TOOLS
]
