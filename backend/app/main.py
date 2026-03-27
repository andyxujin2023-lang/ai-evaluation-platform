from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .core.database import init_database
from .api import datasets, test_runs, test_batches, config

settings = get_settings()

app = FastAPI(
    title="AI Operations Evaluation Platform",
    description="AIOps Evaluation Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(test_runs.router)
app.include_router(test_batches.router)
app.include_router(config.router)


@app.on_event("startup")
async def startup_event():
    init_database()


@app.get("/")
async def root():
    return {
        "name": "AI Operations Evaluation Platform",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
