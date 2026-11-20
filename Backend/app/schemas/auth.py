import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[a-z0-9_.-]{3,30}$")
BCRYPT_MAX_BYTES = 72


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_names(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not USERNAME_PATTERN.match(v):
            raise ValueError(
                "must be 3-30 characters: letters, digits, underscore, dot or hyphen"
            )
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, v: str) -> str:
        # bcrypt only supports 72 bytes, and multibyte characters count more than once
        if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError("must be at most 72 bytes")
        return v


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=254)  # username or email
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    username: str
    email: str
    joined_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"