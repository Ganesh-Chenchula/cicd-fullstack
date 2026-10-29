
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from django.urls import path

@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({"detail": "CSRF cookie set"})


urlpatterns = [
    # Keep all your existing URL patterns here.
    path("api/csrf/", csrf_cookie, name="csrf-cookie"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("chat/", include("chat.urls")),
]
