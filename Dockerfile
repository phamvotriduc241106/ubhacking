# Build a single-origin frontend + FastAPI service. Model download is pinned.
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FOLLAND_SERVE_FRONTEND=1
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
# CPU wheels avoid pulling the CUDA stack; the final image remains substantial.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY knowledge/ knowledge/
COPY scripts/download_models.py scripts/download_models.py
RUN python scripts/download_models.py
COPY --from=frontend /app/frontend/dist frontend/dist
EXPOSE 8000
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
