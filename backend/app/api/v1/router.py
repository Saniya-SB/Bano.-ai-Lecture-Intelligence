from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, lectures, users, uploads, jobs, benchmark, benchmark_public

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(users.router)
api_router.include_router(lectures.router)
api_router.include_router(uploads.router)
api_router.include_router(jobs.router)
api_router.include_router(benchmark.router, tags=["Benchmark"])
from .endpoints import auth as auth_router
api_router.include_router(auth_router.router)
api_router.include_router(benchmark_public.router)


