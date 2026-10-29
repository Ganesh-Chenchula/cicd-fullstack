
from django.contrib import admin

from .models import Conversation, ConversationMember, Message, Reaction


class ConversationMemberInline(admin.TabularInline):
    model = ConversationMember
    extra = 0


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "kind", "created_by", "created_at", "updated_at"
    )
    list_filter = ("kind",)
    search_fields = ("name", "members__username")
    inlines = [ConversationMemberInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id", "conversation", "sender", "created_at", "edited_at", "deleted_at"
    )
    list_filter = ("created_at",)
    search_fields = ("content", "sender__username", "conversation__name")


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ("message", "user", "emoji")
