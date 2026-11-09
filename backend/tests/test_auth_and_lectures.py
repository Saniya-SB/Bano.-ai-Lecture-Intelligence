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


def test_is_test_data_permissions_dev_vs_production(client: TestClient):
    """
    is_test_data may only be set in dev or non-production environments.
    In production (with firebase auth), is_test_data in client requests must be ignored (forced to false).
    """
    token_payload = json.dumps({
        "id": "usr_test_data_perm",
        "email": "testdata@bano.ai",
        "full_name": "Test Data Perm User",
    })
    headers = {"Authorization": f"Bearer {token_payload}"}

    # 1. In dev mode: is_test_data=True is honored
    res_dev = client.post(
        "/api/v1/lectures",
        json={"title": "Dev Test Lecture", "subject": "CS", "is_test_data": True},
        headers=headers,
    )
    assert res_dev.status_code == 201
    assert res_dev.json()["is_test_data"] is True

    # 2. In production mode: is_test_data=True from client is ignored and set to False
    original_env = settings.ENVIRONMENT
    original_auth = settings.AUTH_MODE
    try:
        settings.ENVIRONMENT = "production"
        settings.AUTH_MODE = "firebase"

        # Mock authentication dependency for production test
        from backend.app.api.deps import get_current_user
        from backend.app.models.entities import User
        mock_user = User(id="usr_test_data_perm", email="testdata@bano.ai", full_name="Test User")
        app.dependency_overrides[get_current_user] = lambda: mock_user

        res_prod = client.post(
            "/api/v1/lectures",
            json={"title": "Prod Test Lecture", "subject": "CS", "is_test_data": True},
        )
        assert res_prod.status_code == 201
        assert res_prod.json()["is_test_data"] is False, "Production must ignore client is_test_data"

        # Also verify PATCH cannot flip is_test_data in production
        lec_id = res_prod.json()["id"]
        patch_res = client.patch(
            f"/api/v1/lectures/{lec_id}",
            json={"is_test_data": True},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["is_test_data"] is False
    finally:
        settings.ENVIRONMENT = original_env
        settings.AUTH_MODE = original_auth
        app.dependency_overrides.pop(get_current_user, None)


def test_create_then_fetch_immediate_consistency(client: TestClient):
    """
    Test create-then-fetch: Ensure that right after creating a lecture,
    immediate GET by ID and GET in list return 200 with matching properties,
    and DB transaction has committed properly.
    """
    token = json.dumps({"id": "usr_immediate_fetch", "email": "immed@bano.ai", "full_name": "Immediate User"})
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "title": "Operating Systems - Virtual Memory",
        "subject": "Computer Science",
        "topic": "Paging",
        "is_test_data": True,
    }
    create_res = client.post("/api/v1/lectures", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    lecture_id = created_data["id"]

    # Immediate fetch by ID
    get_res = client.get(f"/api/v1/lectures/{lecture_id}", headers=headers)
    assert get_res.status_code == 200
    fetched_data = get_res.json()
    assert fetched_data["id"] == lecture_id
    assert fetched_data["title"] == create_payload["title"]
    assert fetched_data["subject"] == create_payload["subject"]

    # Immediate list fetch contains it
    list_res = client.get("/api/v1/lectures", headers=headers)
    assert list_res.status_code == 200
    ids = [item["id"] for item in list_res.json()]
    assert lecture_id in ids



