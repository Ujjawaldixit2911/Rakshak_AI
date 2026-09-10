"""
channels package.
"""
from .base import BaseNotificationChannel
from .fcm import FCMChannel
from .twilio_sms import TwilioSMSChannel
from .sendgrid_email import SendGridEmailChannel
from .in_app import InAppChannel

CHANNEL_ADAPTERS = {
    "PUSH": FCMChannel(),
    "SMS": TwilioSMSChannel(),
    "EMAIL": SendGridEmailChannel(),
    "IN_APP": InAppChannel(),
}

__all__ = [
    "BaseNotificationChannel",
    "FCMChannel",
    "TwilioSMSChannel",
    "SendGridEmailChannel",
    "InAppChannel",
    "CHANNEL_ADAPTERS",
]
