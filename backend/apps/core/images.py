import io

from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError

from apps.core.exceptions import DomainError

_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"
_ALLOWED = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


class PreparedImage:
    def __init__(self, data, content_type, ext, width, height):
        self.data = data
        self.content_type = content_type
        self.ext = ext
        self.width = width
        self.height = height


def read_limited(upload, max_bytes):
    size = getattr(upload, "size", None)
    if size is not None and size > max_bytes:
        raise DomainError("file_too_large", "Upload exceeds the size limit", 413)
    data = upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise DomainError("file_too_large", "Upload exceeds the size limit", 413)
    if not data:
        raise DomainError(
            "validation_error", "file is empty", 400, {"file": ["This field is required."]}
        )
    return data


def detect_format(data):
    if data.startswith(_JPEG):
        return "JPEG"
    if data.startswith(_PNG):
        return "PNG"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    raise DomainError("unsupported_media_type", "Only JPEG, PNG and WebP images are allowed", 415)


def prepare_image(data, max_bytes):
    if len(data) > max_bytes:
        raise DomainError("file_too_large", "Upload exceeds the size limit", 413)
    detected = detect_format(data)
    try:
        with Image.open(io.BytesIO(data)) as image:
            pillow_format = (image.format or "").upper()
            if pillow_format == "JPG":
                pillow_format = "JPEG"
            if pillow_format != detected:
                raise DomainError(
                    "unsupported_media_type",
                    "Only JPEG, PNG and WebP images are allowed",
                    415,
                )
            image = ImageOps.exif_transpose(image)
            width, height = image.size
            if width < 1 or height < 1 or width > 8000 or height > 8000:
                raise DomainError("validation_error", "Image dimensions are not allowed", 400)
            buffer = io.BytesIO()
            if detected == "JPEG":
                image = image.convert("RGB")
                image.save(buffer, format="JPEG", quality=85, optimize=True)
            elif detected == "PNG":
                image.save(buffer, format="PNG", optimize=True)
            else:
                image.save(buffer, format="WEBP", quality=85)
    except DomainError:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise DomainError(
            "unsupported_media_type",
            "Only JPEG, PNG and WebP images are allowed",
            415,
        ) from exc
    encoded = buffer.getvalue()
    if len(encoded) > max_bytes:
        raise DomainError("file_too_large", "Upload exceeds the size limit", 413)
    content_type, ext = _ALLOWED[detected]
    return PreparedImage(encoded, content_type, ext, width, height)


def avatar_limit():
    return settings.AVATAR_MAX_BYTES


def attachment_limit():
    return settings.ATTACHMENT_MAX_BYTES
