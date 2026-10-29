
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .models import Conversation, ConversationMember, Message
from .serializers import MessageSerializer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.conversation_id = self.scope["url_route"]["kwargs"][
            "conversation_id"
        ]
        self.group_name = f"conversation_{self.conversation_id}"

        if not self.user.is_authenticated:
            await self.close(code=4401)
            return

        if not await self.is_member():
            await self.close(code=4404)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence_event",
                "username": self.user.get_username(),
                "user_id": self.user.id,
                "status": "online",
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name") and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "presence_event",
                    "username": self.user.get_username(),
                    "user_id": self.user.id,
                    "status": "offline",
                },
            )

    async def receive_json(self, data, **kwargs):
        if not isinstance(data, dict):
            return

        event_type = data.get("type", "message")

        if event_type == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "typing_event",
                    "username": self.user.get_username(),
                    "user_id": self.user.id,
                    "is_typing": bool(data.get("is_typing", True)),
                },
            )
            return

        if event_type == "read":
            await self.mark_read()

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "read_event",
                    "username": self.user.get_username(),
                    "user_id": self.user.id,
                    "conversation_id": self.conversation_id,
                },
            )
            return

        if event_type != "message":
            await self.send_json({
                "type": "error",
                "message": "Unknown event type.",
            })
            return

        content = data.get("content", "")
        if not isinstance(content, str):
            content = ""

        content = content.strip()

        if not content or len(content) > 5000:
            await self.send_json({
                "type": "error",
                "message": "Message must contain 1–5000 characters.",
            })
            return

        message_data = await self.create_message(content)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "message_event",
                "message": message_data,
                "conversation_id": self.conversation_id,
            },
        )

    
    async def message_event(self, event):
        await self.send_json({
            "type": "message_event",
            "conversation_id": event.get("conversation_id"),
            "message": event.get("message"),
        })


    async def typing_event(self, event):
        if event["user_id"] == self.user.id:
            return

        await self.send_json({
            "type": "typing",
            "username": event["username"],
            "user_id": event["user_id"],
            "is_typing": event["is_typing"],
        })

    async def presence_event(self, event):
        if event["user_id"] == self.user.id:
            return

        await self.send_json({
            "type": "presence",
            "username": event["username"],
            "user_id": event["user_id"],
            "status": event["status"],
        })

    async def read_event(self, event):
        if event["user_id"] == self.user.id:
            return

        await self.send_json({
            "type": "read",
            "username": event["username"],
            "user_id": event["user_id"],
            "conversation_id": event["conversation_id"],
        })

    @database_sync_to_async
    def is_member(self):
        return ConversationMember.objects.filter(
            conversation_id=self.conversation_id,
            user=self.user,
        ).exists()

    @database_sync_to_async
    def mark_read(self):
        ConversationMember.objects.filter(
            conversation_id=self.conversation_id,
            user=self.user,
        ).update(last_read_at=timezone.now())

    @database_sync_to_async
    def create_message(self, content):
        conversation = Conversation.objects.get(
            id=self.conversation_id
        )

        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
        )

        Conversation.objects.filter(
            id=conversation.id
        ).update(updated_at=timezone.now())

        return MessageSerializer(message).data
