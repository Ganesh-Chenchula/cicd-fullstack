
import json

from django.test import TestCase


class HealthEndpointTests(TestCase):
    url = "/api/health/"

    def test_health_endpoint_returns_http_200(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)

    def test_health_endpoint_returns_correct_json(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "message": "Django API is running",
            },
        )

    def test_health_endpoint_returns_json_content_type(self):
        response = self.client.get(self.url)

        self.assertTrue(
            response["Content-Type"].startswith("application/json")
        )

    def test_health_endpoint_rejects_post_requests(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"test": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 405)

    def test_unknown_endpoint_returns_404(self):
        response = self.client.get("/api/does-not-exist/")

        self.assertEqual(response.status_code, 404)
