from django.contrib import admin

from apps.rooms.models import Room, RoomInvite, RoomMember


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "is_private", "max_members", "deleted_at", "created_at")
    search_fields = ("name",)

    def get_queryset(self, request):
        return Room.all_objects.all()


@admin.register(RoomMember)
class RoomMemberAdmin(admin.ModelAdmin):
    list_display = ("room", "user", "role", "joined_at", "muted")


@admin.register(RoomInvite)
class RoomInviteAdmin(admin.ModelAdmin):
    list_display = ("code", "room", "uses", "max_uses", "expires_at")
