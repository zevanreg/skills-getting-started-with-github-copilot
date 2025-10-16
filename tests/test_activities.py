from fastapi.testclient import TestClient
import importlib
import uuid
import urllib.parse


app_mod = importlib.import_module("src.app")
app = getattr(app_mod, "app")

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # make sure a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Programming Class"
    # use a unique email per test run to avoid collisions
    email = f"test.student+{uuid.uuid4().hex}@mergington.edu"

    # sign up (URL-encode the email so "+" isn't treated as a space)
    enc = urllib.parse.quote(email, safe='')
    resp = client.post(f"/activities/{activity}/signup?email={enc}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # verify it appears
    resp = client.get("/activities")
    assert resp.status_code == 200
    participants = resp.json()[activity]["participants"]
    assert email in participants

    # now unregister
    resp = client.post(f"/activities/{activity}/unregister?email={enc}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # final check: email not present
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]
