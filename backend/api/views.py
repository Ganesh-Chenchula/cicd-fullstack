from django.http import JsonResponse


def health(request):
    return JsonResponse({
        "status": "ok",
        "message": "Django API is running",
    })