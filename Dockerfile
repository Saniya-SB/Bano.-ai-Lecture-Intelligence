FROM python:3.11-slim

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition
COPY backend/requirements.txt ./requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend /app/backend

# Expose port (Render automatically sets $PORT)
ENV PORT=8000
EXPOSE 8000

# Set Python path so `backend.app.main` is importable
ENV PYTHONPATH=/app

# Start command: runs database migrations first from backend directory, then launches uvicorn
CMD cd /app/backend && alembic upgrade head && cd /app && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}
