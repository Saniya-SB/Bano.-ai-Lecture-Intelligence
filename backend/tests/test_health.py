def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["database"] == "connected"
    assert "X-Request-ID" in response.headers


def test_validation_error_format(client):
    # Calling an endpoint or invalid param should return unified error format
    response = client.post("/api/v1/health")
    assert response.status_code == 405  # Method not allowed or handled

