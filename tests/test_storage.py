import io

import pytest

from app.core import storage

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPEG = b"\xff\xd8\xff" + b"0" * 32
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 32


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)


@pytest.mark.parametrize(
    "content, extension",
    [(PNG, ".png"), (JPEG, ".jpg"), (WEBP, ".webp")],
)
def test_valid_images_are_saved_with_the_detected_extension(content, extension, tmp_path):
    filename = storage.save_image(io.BytesIO(content))

    assert filename.endswith(extension)
    assert (tmp_path / filename).exists()


def test_content_that_is_not_an_image_is_rejected():
    with pytest.raises(ValueError, match="Invalid image"):
        storage.save_image(io.BytesIO(b"just some text"))


def test_files_above_the_size_limit_are_rejected():
    too_big = b"\xff\xd8\xff" + b"0" * storage.MAX_IMAGE_SIZE

    with pytest.raises(ValueError, match="too large"):
        storage.save_image(io.BytesIO(too_big))