from django.contrib import admin

from apps.accounts.models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("username", "display_name", "status", "deleted_at", "created_at")
    search_fields = ("username", "display_name")

    def get_queryset(self, request):
        return Profile.all_objects.all()
