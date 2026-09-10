"""
base.py
Base abstract interface for delivery channels.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseNotificationChannel(ABC):
    """
    Abstract delivery channel interface (FCM, SMS, Email, InApp).
    Adding new delivery providers never touches calling business modules.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def deliver(self, user_id: str, formatted_message: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        pass
