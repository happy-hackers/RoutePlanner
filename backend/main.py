from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.optimize_route import router as optimize_router
from routes.osrm_proxy import router as osrm_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize_router)
app.include_router(osrm_router)


@app.get("/")
async def root():
    return {"message": "hello"}
