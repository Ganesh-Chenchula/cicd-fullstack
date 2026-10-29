
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, ConversationMember, Message, Reaction
from .serializers import (
    RegisterSerializer,
    UserSummarySerializer,
    ConversationSerializer,
    MessageSerializer,
    ReactionSerializer,
)

User = get_user_model()


# ---------------------------------------------------------
# CSRF
# ---------------------------------------------------------

@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({"detail": "CSRF cookie set"})


# ---------------------------------------------------------
# WebSocket broadcast helper
# ---------------------------------------------------------

def broadcast_chat_message(message):
    """
    Broadcast a REST-created message to every connected member
    of the conversation.

    If the channel layer is unavailable, the REST request still
    succeeds. Configure Redis for reliable production delivery.
    """
    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    payload = MessageSerializer(message).data

    try:
        async_to_sync(channel_layer.group_send)(
            f"conversation_{message.conversation_id}",
            {
                "type": "message_event",
                "conversation_id": message.conversation_id,
                "message": payload,
            },
        )
    except Exception:
        # Do not turn a successfully saved message into an HTTP
        # failure just because real-time delivery is unavailable.
        # Configure logging/monitoring for production.
        import logging
        logging.getLogger(__name__).exception(
            "Failed to broadcast chat message %s",
            message.pk,
        )


# ---------------------------------------------------------
# Registration
# ---------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create a logged-in session after successful registration.
        login(request, user)

        return Response(
            {
                "message": "Account created successfully.",
                "user": UserSummarySerializer(
                    user,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------
# Login
# ---------------------------------------------------------

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        if (
            not isinstance(username, str)
            or not isinstance(password, str)
            or not username.strip()
            or not password
        ):
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request,
            username=username.strip(),
            password=password,
        )

        if user is None:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)

        return Response({
            "message": "Login successful.",
            "user": UserSummarySerializer(
                user,
                context={"request": request},
            ).data,
        })


# ---------------------------------------------------------
# Logout
# ---------------------------------------------------------

class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout(request)

        return Response({
            "message": "Logged out successfully."
        })


# ---------------------------------------------------------
# Current user / profile
# ---------------------------------------------------------

class CurrentUserView(APIView):
    # Return authenticated=False rather than a 401 when the
    # frontend checks whether a session exists.
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({
                "authenticated": False,
                "user": None,
            })

        return Response({
            "authenticated": True,
            "user": UserSummarySerializer(
                request.user,
                context={"request": request},
            ).data,
        })


# ---------------------------------------------------------
# List users
# ---------------------------------------------------------

class UserListView(generics.ListAPIView):
    serializer_class = UserSummarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()

        users = User.objects.filter(
            is_active=True,
        ).exclude(
            id=self.request.user.id,
        )

        if query:
            users = users.filter(username__icontains=query)

        return users.order_by("username")[:100]


# ---------------------------------------------------------
# Conversations
# ---------------------------------------------------------

class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(members=self.request.user)
            .prefetch_related("members", "messages__sender")
            .distinct()
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        serializer.save()


# ---------------------------------------------------------
# Conversation messages: list and create
# ---------------------------------------------------------

class MessageListView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self):
        return (
            Conversation.objects
            .filter(
                id=self.kwargs["conversation_id"],
                members=self.request.user,
            )
            .first()
        )

    def get_queryset(self):
        conversation = self.get_conversation()

        if conversation is None:
            return Message.objects.none()

        queryset = (
            Message.objects
            .filter(conversation=conversation)
            .select_related("sender", "reply_to")
            .prefetch_related("reactions__user")
            .order_by("-created_at", "-id")
        )

        before = self.request.query_params.get("before")

        if before and before.isdigit():
            queryset = queryset.filter(id__lt=int(before))

        # Retrieve the latest 100; list() reverses these for display.
        return queryset[:100]

    def list(self, request, *args, **kwargs):
        conversation = self.get_conversation()

        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Use a list directly so response ordering does not depend
        # on whether DRF pagination is configured.
        messages = list(self.get_queryset())
        messages.reverse()

        data = self.get_serializer(messages, many=True).data

        # This records conversation-level read progress. It is not
        # an individual read receipt for each message.
        ConversationMember.objects.filter(
            conversation=conversation,
            user=request.user,
        ).update(last_read_at=timezone.now())

        return Response(data)

    def create(self, request, *args, **kwargs):
        conversation = self.get_conversation()

        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = request.data.get("content", "")

        if not isinstance(content, str) or not content.strip():
            return Response(
                {"detail": "Message content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = content.strip()

        if len(content) > 5000:
            return Response(
                {"detail": "Messages cannot exceed 5000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reply_to = None
        reply_to_id = request.data.get("reply_to")

        if reply_to_id:
            reply_to = Message.objects.filter(
                id=reply_to_id,
                conversation=conversation,
            ).first()

            if reply_to is None:
                return Response(
                    {
                        "detail": (
                            "Reply target was not found "
                            "in this conversation."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=content,
                reply_to=reply_to,
            )

            Conversation.objects.filter(
                id=conversation.id,
            ).update(updated_at=timezone.now())

        # Notify connected WebSocket clients after saving.
        broadcast_chat_message(message)

        data = self.get_serializer(message).data

        return Response(
            data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------
# Edit or delete the current user's message
# ---------------------------------------------------------

class MessageActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_message(self, message_id, user):
        return (
            Message.objects
            .filter(
                id=message_id,
                sender=user,
                conversation__members=user,
            )
            .select_related("sender", "conversation")
            .first()
        )

    def patch(self, request, message_id):
        message = self.get_message(message_id, request.user)

        if message is None or message.deleted_at:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = request.data.get("content", "")

        if (
            not isinstance(content, str)
            or not content.strip()
            or len(content.strip()) > 5000
        ):
            return Response(
                {
                    "detail": (
                        "Content must contain 1–5000 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        message.content = content.strip()
        message.edited_at = timezone.now()
        message.save(update_fields=["content", "edited_at"])

        return Response(
            MessageSerializer(
                message,
                context={"request": request},
            ).data
        )

    def delete(self, request, message_id):
        message = self.get_message(message_id, request.user)

        if message is None:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if message.deleted_at:
            return Response(
                status=status.HTTP_204_NO_CONTENT,
            )

        message.content = ""
        message.deleted_at = timezone.now()
        message.save(update_fields=["content", "deleted_at"])

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


# ---------------------------------------------------------
# Message reactions
# ---------------------------------------------------------

class ReactionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        message = Message.objects.filter(
            id=message_id,
            conversation__members=request.user,
        ).first()

        if message is None:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        emoji = request.data.get("emoji", "")

        allowed = {
            "👍", "❤️", "😂", "🎉",
            "👀", "🔥", "😮", "😢",
        }

        if emoji not in allowed:
            return Response(
                {"detail": "Unsupported reaction."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reaction, created = Reaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji,
        )

        if not created:
            reaction.delete()

        remaining = (
            Reaction.objects
            .filter(message=message)
            .select_related("user")
        )

        return Response({
            "emoji": emoji,
            "active": created,
            "reactions": ReactionSerializer(
                remaining,
                many=True,
            ).data,
        })


# ---------------------------------------------------------
# Authenticated chat health check
# ---------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def chat_health(request):
    return Response({
        "status": "ok",
        "message": "Chat API is running",
        "authenticated": True,
        "username": request.user.get_username(),
    })
