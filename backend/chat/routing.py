
from django.urls import path

from .consumers import ChatConsumer

websocket_urlpatterns = [
    path(
        "ws/chat/conversations/<int:conversation_id>/",
        ChatConsumer.as_asgi(),
    ),
]
