
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, ConversationMember, Message, Reaction

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )
    password2 = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "password2"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "email": {"required": False, "allow_blank": True},
        }

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password2 = attrs.pop("password2", None)

        if password2 is not None and password != password2:
            raise serializers.ValidationError({
                "password2": "Passwords do not match."
            })

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("password2", None)
        return User.objects.create_user(password=password, **validated_data)


class UserSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "display_name",
            "avatar_url",
            "is_online",
        ]

    def get_display_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.get_username()

    def get_avatar_url(self, obj):
        # Add a profile-image model/field later if you want uploaded photos.
        return None

    def get_is_online(self, obj):
        # Presence is currently tracked through WebSocket events.
        # A persistent online status needs a shared presence store.
        return False


class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Reaction
        fields = ["id", "emoji", "username", "user_id"]


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(
        source="sender.username",
        read_only=True,
    )
    sender_id = serializers.IntegerField(read_only=True)
    sender_profile = UserSummarySerializer(source="sender", read_only=True)
    reactions = ReactionSerializer(many=True, read_only=True)
    is_deleted = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_id",
            "sender_profile",
            "content",
            "reply_to",
            "edited_at",
            "deleted_at",
            "is_deleted",
            "created_at",
            "reactions",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_id",
            "sender_profile",
            "edited_at",
            "deleted_at",
            "is_deleted",
            "created_at",
            "reactions",
        ]

    def get_is_deleted(self, obj):
        return obj.deleted_at is not None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.deleted_at:
            data["content"] = ""
        return data


class ConversationSerializer(serializers.ModelSerializer):
    members = UserSummarySerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    # Accept the frontend's alternate field too.
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        default=None,
    )
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "name",
            "kind",
            "members",
            "member_ids",
            "participant_ids",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "last_message",
            "unread_count",
        ]
        read_only_fields = [
            "id",
            "members",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "last_message",
            "unread_count",
        ]

    def get_last_message(self, obj):
        message = (
            obj.messages.select_related("sender")
            .order_by("-created_at")
            .first()
        )

        if not message:
            return None

        return {
            "id": message.id,
            "sender": message.sender.username,
            "sender_id": message.sender_id,
            "content": (
                "" if message.deleted_at else message.content
            ),
            "is_deleted": message.deleted_at is not None,
            "created_at": message.created_at.isoformat(),
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0

        member = ConversationMember.objects.filter(
            conversation=obj,
            user=request.user,
        ).first()

        if not member:
            return 0

        messages = obj.messages.exclude(sender=request.user)

        if member.last_read_at:
            messages = messages.filter(
                created_at__gt=member.last_read_at
            )

        return messages.count()

    def create(self, validated_data):
        member_ids = set(validated_data.pop("member_ids", []))
        member_ids.update(validated_data.pop("participant_ids", []))

        request = self.context["request"]
        user = request.user
        member_ids.add(user.id)

        kind = validated_data.get("kind", Conversation.GROUP)

        if kind not in {
            Conversation.DIRECT,
            Conversation.GROUP,
            Conversation.CHANNEL,
        }:
            raise serializers.ValidationError({
                "kind": "Choose direct, group, or channel."
            })

        if kind == Conversation.DIRECT:
            other_ids = member_ids - {user.id}
            if len(other_ids) != 1:
                raise serializers.ValidationError({
                    "member_ids": "A direct chat needs exactly one other user."
                })

        if kind in {Conversation.GROUP, Conversation.CHANNEL}:
            if not validated_data.get("name", "").strip():
                raise serializers.ValidationError({
                    "name": "A name is required for groups and channels."
                })

        if len(member_ids) > 100:
            raise serializers.ValidationError({
                "member_ids": "Maximum 100 members."
            })

        existing_ids = set(
            User.objects.filter(
                id__in=member_ids,
                is_active=True,
            ).values_list("id", flat=True)
        )

        if existing_ids != member_ids:
            raise serializers.ValidationError({
                "member_ids": "One or more users do not exist or are inactive."
            })

        # Reuse the existing direct conversation if the same two users
        # already have one.
        if kind == Conversation.DIRECT:
            for conversation in (
                Conversation.objects.filter(kind=Conversation.DIRECT)
                .prefetch_related("members")
            ):
                existing_member_ids = set(
                    conversation.members.values_list("id", flat=True)
                )
                if existing_member_ids == member_ids:
                    return conversation

        validated_data.pop("participant_ids", None)
        validated_data.pop("member_ids", None)

        conversation = Conversation.objects.create(
            created_by=user,
            **validated_data,
        )

        ConversationMember.objects.bulk_create([
            ConversationMember(
                conversation=conversation,
                user_id=member_id,
            )
            for member_id in member_ids
        ])

        return conversation
