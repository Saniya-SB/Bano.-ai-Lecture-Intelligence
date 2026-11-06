import json
import pytest
from fastapi.testclient import TestClient
from backend.app.core.config import settings
from backend.app.main import app


def test_startup_refusal_when_prod_and_dev_auth():
    """App must refuse to start with AUTH_MODE=dev when ENVIRONMENT=production."""
    from backend.app.main import lifespan
    original_env = settings.ENVIRONMENT
    original_mode = settings.AUTH_MODE
    try:
        settings.ENVIRONMENT = "production"
        settings.AUTH_MODE = "dev"
        with pytest.raises(RuntimeError, match="Refusing to start"):
            with TestClient(app):
                pass
    finally:
        settings.ENVIRONMENT = original_env
        settings.AUTH_MODE = original_mode


def test_auth_dev_mode_creates_user_on_first_login(client: TestClient):
    """Ensure user row is created on first login and response matches frontend expectations."""
    # Custom dev token containing JSON
    token_payload = json.dumps({
        "id": "usr_test_first_login",
        "email": "firstlogin@bano.ai",
        "full_name": "First Login User",
    })
    headers = {"Authorization": f"Bearer {token_payload}"}

    res = client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "usr_test_first_login"
    assert data["email"] == "firstlogin@bano.ai"
    assert data["full_name"] == "First Login User"
    assert "created_at" in data


def test_auth_firebase_mode_untested_marker(client: TestClient):
    """
    When AUTH_MODE=firebase and no credentials or bad token,
    unauthorized or config error occurs.
    """
    original_mode = settings.AUTH_MODE
    try:
        settings.AUTH_MODE = "firebase"
        # Without credentials / missing auth header
        res = client.get("/api/v1/users/me")
        assert res.status_code == 401
    finally:
        settings.AUTH_MODE = original_mode


def test_lecture_crud_and_ownership(client: TestClient):
    """
    Test POST, GET list, GET one, PATCH, DELETE for lectures.
    Verifies response shape matches frontend LectureDto.
    """
    user_a_token = json.dumps({"id": "usr_alice", "email": "alice@bano.ai", "full_name": "Alice"})
    headers_a = {"Authorization": f"Bearer {user_a_token}"}

    # 1. Create Lecture
    create_payload = {
        "title": "Computer Networks - TCP/IP",
        "subject": "Computer Science",
        "topic": "3-Way Handshake",
    }
    create_res = client.post("/api/v1/lectures", json=create_payload, headers=headers_a)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["title"] == create_payload["title"]
    assert created_data["subject"] == create_payload["subject"]
    assert created_data["topic"] == create_payload["topic"]
    assert created_data["status"] == "uploaded"
    assert created_data["duration_seconds"] == 0
    assert "id" in created_data
    assert "created_at" in created_data
    assert "updated_at" in created_data
    lecture_id = created_data["id"]

    # 2. Get Single Lecture
    get_res = client.get(f"/api/v1/lectures/{lecture_id}", headers=headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == lecture_id

    # 3. List Lectures
    list_res = client.get("/api/v1/lectures", headers=headers_a)
    assert list_res.status_code == 200
    lectures_list = list_res.json()
    assert len(lectures_list) == 1
    assert lectures_list[0]["id"] == lecture_id

    # 4. Patch (Rename) Lecture
    patch_payload = {"title": "Computer Networks - OSI Model"}
    patch_res = client.patch(f"/api/v1/lectures/{lecture_id}", json=patch_payload, headers=headers_a)
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Computer Networks - OSI Model"

    # 5. Delete Lecture
    del_res = client.delete(f"/api/v1/lectures/{lecture_id}", headers=headers_a)
    assert del_res.status_code == 204

    # Confirm deletion
    get_after_del = client.get(f"/api/v1/lectures/{lecture_id}", headers=headers_a)
    assert get_after_del.status_code == 404


def test_cross_user_access_idor_prevention(client: TestClient):
    """
    Enforce ownership on all operations:
    User B should not be able to read, update, or delete User A's lecture.
    """
    token_a = json.dumps({"id": "usr_owner", "email": "owner@bano.ai", "full_name": "Owner"})
    token_b = json.dumps({"id": "usr_intruder", "email": "intruder@bano.ai", "full_name": "Intruder"})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a lecture
    create_res = client.post(
        "/api/v1/lectures",
        json={"title": "Secret Lecture", "subject": "Math"},
        headers=headers_a,
    )
    assert create_res.status_code == 201
    lecture_id = create_res.json()["id"]

    # User B lists lectures -> Should not see User A's lecture
    b_list = client.get("/api/v1/lectures", headers=headers_b)
    assert b_list.status_code == 200
    assert all(lec["id"] != lecture_id for lec in b_list.json())

    # User B attempts to GET User A's lecture -> 404 (IDOR prevention)
    b_get = client.get(f"/api/v1/lectures/{lecture_id}", headers=headers_b)
    assert b_get.status_code == 404

    # User B attempts to PATCH User A's lecture -> 404
    b_patch = client.patch(
        f"/api/v1/lectures/{lecture_id}",
        json={"title": "Hacked Title"},
        headers=headers_b,
    )
    assert b_patch.status_code == 404

    # User B attempts to DELETE User A's lecture -> 404
    b_del = client.delete(f"/api/v1/lectures/{lecture_id}", headers=headers_b)
    assert b_del.status_code == 404

    # Verify User A's lecture is still untouched
    a_get = client.get(f"/api/v1/lectures/{lecture_id}", headers=headers_a)
    assert a_get.status_code == 200
    assert a_get.json()["title"] == "Secret Lecture"


def test_unauthorised_access_in_firebase_mode(client: TestClient):
    """
    In AUTH_MODE=firebase, unauthenticated requests must be rejected with 401.
    """
    original_mode = settings.AUTH_MODE
    try:
        settings.AUTH_MODE = "firebase"
        res = client.get("/api/v1/lectures")
        assert res.status_code == 401
        assert res.json()["code"] == "UNAUTHORIZED"
    finally:
        settings.AUTH_MODE = original_mode

