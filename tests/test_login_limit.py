def login(client, password, email="tester@example.com"):
    return client.post("/auth/login", data={"username": email, "password": password})


def test_too_many_wrong_passwords_block_the_login_for_a_while(client, auth_headers):
    for _ in range(5):
        assert login(client, "wrong-password").status_code == 401

    blocked = login(client, "wrong-password")

    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    # even the right password waits: otherwise the block would be useless
    assert login(client, "password123").status_code == 429


def test_the_block_only_affects_the_email_that_was_guessed(client, auth_headers):
    for _ in range(5):
        login(client, "wrong-password")

    assert login(client, "password123").status_code == 429
    assert login(client, "whatever", email="other@example.com").status_code == 401


def test_a_correct_login_clears_the_failed_attempts(client, auth_headers):
    for _ in range(4):
        login(client, "wrong-password")

    assert login(client, "password123").status_code == 200

    # the count started over: four more mistakes are still allowed
    for _ in range(4):
        assert login(client, "wrong-password").status_code == 401

    assert login(client, "password123").status_code == 200
