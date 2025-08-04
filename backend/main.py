from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jd_extractor_agent import classify_and_merge_blocks
from fit_checker import check_fit

app = FastAPI()

# cors config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

class JDRequest(BaseModel):
    blocks: list[str]

@app.post("/clean-jd")
async def clean_jd(req: JDRequest):
    cleaned_jd = classify_and_merge_blocks(req.blocks)
    return {"cleaned_jd": cleaned_jd}

class FitRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/evaluate-fit")
async def evaluate_fit(req: FitRequest):
    fit_result = check_fit(req.resume_text, req.job_description)
    print("paging doc shiva",fit_result)
    return {"fit_result": fit_result}