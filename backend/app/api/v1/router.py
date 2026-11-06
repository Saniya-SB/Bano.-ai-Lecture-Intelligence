from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, lectures, users, uploads, jobs

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(users.router)
api_router.include_router(lectures.router)
api_router.include_router(uploads.router)
api_router.include_router(jobs.router)


