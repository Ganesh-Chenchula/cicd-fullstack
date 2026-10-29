
from django.urls import path

from .views import (
    csrf_cookie,
    RegisterView,
    LoginView,
    LogoutView,
    CurrentUserView,
    UserListView,
    ConversationListCreateView,
    MessageListView,
    MessageActionView,
    ReactionView,
    chat_health,
)

urlpatterns = [
    path("csrf/", csrf_cookie, name="chat-csrf"),
    path("health/", chat_health, name="chat-health"),
    path("register/", RegisterView.as_view(), name="chat-register"),
    path("login/", LoginView.as_view(), name="chat-login"),
    path("logout/", LogoutView.as_view(), name="chat-logout"),
    path("me/", CurrentUserView.as_view(), name="chat-me"),
    path("users/", UserListView.as_view(), name="chat-users"),
    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="chat-conversations",
    ),
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListView.as_view(),
        name="chat-messages",
    ),
    path(
        "messages/<int:message_id>/",
        MessageActionView.as_view(),
        name="chat-message-action",
    ),
    path(
        "messages/<int:message_id>/reactions/",
        ReactionView.as_view(),
        name="chat-message-reactions",
    ),
]
