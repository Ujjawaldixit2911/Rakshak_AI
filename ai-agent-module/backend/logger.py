"""
logger.py
Execution & Tool Audit Logger for Rakshak AI Agent Module.
Logs every tool call with input arguments, raw output, execution duration, and audit status.
"""
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from .schemas import ToolCallAuditRecord

logger = logging.getLogger("RakshakAI.Agent.Logger")


class AgentExecutionLogger:
    """
    Tracks and records the exact chronological steps and tool executions of the Agent.
    """
    def __init__(self):
        self.records: List[ToolCallAuditRecord] = []
        self._step_counter: int = 0

    def log_tool_call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        output: Any,
        duration_ms: float,
        status: str = "SUCCESS"
    ) -> ToolCallAuditRecord:
        self._step_counter += 1
        record = ToolCallAuditRecord(
            stepIndex=self._step_counter,
            toolName=tool_name,
            arguments=arguments,
            output=output,
            latencyMs=round(duration_ms, 2),
            timestamp=datetime.now(timezone.utc).isoformat(),
            status=status
        )
        self.records.append(record)
        logger.info(
            "[Agent Audit] Step %d: Tool '%s' executed in %.2fms with status '%s'.",
            self._step_counter,
            tool_name,
            duration_ms,
            status
        )
        return record

    def get_tool_names_used(self) -> List[str]:
        return [r.toolName for r in self.records]

    def get_audit_trail(self) -> List[ToolCallAuditRecord]:
        return self.records
