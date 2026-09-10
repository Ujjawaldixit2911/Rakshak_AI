"""
router.py
Standalone What-If Simulator Module Router.
"""
from backend.app.routers.simulator import router, simulate_what_if_scenario, WhatIfSimulateRequest, WhatIfSimulateResponse

__all__ = ["router", "simulate_what_if_scenario", "WhatIfSimulateRequest", "WhatIfSimulateResponse"]
