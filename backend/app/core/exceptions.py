from typing import Any, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from backend.app.core.logging import logger


class ApiErrorDetail(BaseModel):
    loc: Optional[list[str | int]] = None
    msg: str
    type: Optional[str] = None


class UnifiedErrorResponse(BaseModel):
    detail: Optional[str | list[ApiErrorDetail]] = None
    message: Optional[str] = None
    code: Optional[str] = None
    field_errors: Optional[dict[str, str]] = None
    request_id: Optional[str] = None


class AppException(Exception):
    def __init__(
        self,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        message: str = "An error occurred",
        code: str = "ERROR",
        field_errors: Optional[dict[str, str]] = None,
        detail: Optional[str] = None,
    ):
        self.status_code = status_code
        self.message = message
        self.code = code
        self.field_errors = field_errors
        self.detail = detail or message
        super().__init__(self.message)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"AppException: {exc.code} - {exc.message} (status: {exc.status_code})")
    
    error_dto = UnifiedErrorResponse(
        detail=exc.detail,
        message=exc.message,
        code=exc.code,
        field_errors=exc.field_errors,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_dto.model_dump(exclude_none=True),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    field_errors: dict[str, str] = {}
    details: list[ApiErrorDetail] = []

    for err in exc.errors():
        loc = list(err.get("loc", []))
        msg = err.get("msg", "Validation error")
        err_type = err.get("type", "value_error")
        field = str(loc[-1]) if loc else "field"
        field_errors[field] = msg
        details.append(ApiErrorDetail(loc=loc, msg=msg, type=err_type))

    logger.warning(f"Validation error on {request.url.path}: {field_errors}")
    error_dto = UnifiedErrorResponse(
        detail=[d.model_dump() for d in details],
        message="Request validation failed",
        code="VALIDATION_ERROR",
        field_errors=field_errors,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_dto.model_dump(exclude_none=True),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.exception(f"Unhandled exception on {request.url.path}: {str(exc)}")
    error_dto = UnifiedErrorResponse(
        detail="Internal server error",
        message="An unexpected internal server error occurred",
        code="INTERNAL_SERVER_ERROR",
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_dto.model_dump(exclude_none=True),
    )

