import os
import time
import random
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import tiktoken  # Token counter for safety

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Constants
MODEL_NAME = "llama3-8b-8192"
TOKEN_THRESHOLD = 7000  # Safe buffer under model limit
MAX_TOKENS = 8192

# Initialize LLM
llm = ChatGroq(
    model=MODEL_NAME,
    api_key=GROQ_API_KEY,
    temperature=0.3,
    max_tokens=MAX_TOKENS
)

# Token counting function (OpenAI-style for safety estimate)
def count_tokens(text: str, model_name: str = "gpt-3.5-turbo") -> int:
    enc = tiktoken.encoding_for_model(model_name)
    return len(enc.encode(text))

# Trim beginning and ending blocks (noise)
def trim_noise_blocks(blocks: list[str], max_trim=3) -> list[str]:
    if len(blocks) <= 2 * max_trim:
        return blocks  # Avoid trimming too much
    return blocks[max_trim : len(blocks) - max_trim]

# Retry-safe wrapper for LLM call
def safe_llm_call(prompt: str, retries: int = 5) -> str:
    for attempt in range(retries):
        try:
            response = llm([HumanMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            if "over capacity" in str(e) or "503" in str(e):
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                print(f"[Retry {attempt+1}] Model over capacity. Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
            else:
                raise e
    raise RuntimeError("Failed to get response after several retries.")

# Main block classifier
def classify_and_merge_blocks(blocks: list[str]) -> str:
    trimmed_blocks = blocks[:]
    prompt_base = """
You are an expert at extracting clean job descriptions from messy web pages.

Below is a list of text blocks from a job post. Your tasks:
- Extract and merge only the **relevant job description** content
- **Must include**:
  - Job title
  - Location and work type (e.g. remote/hybrid)
  - Years of experience
  - Required skills & qualifications
  - Visa requirements (if any)
  - Reporting structure
  - Responsibilities
  - Preferred or “nice to have” skills
- **Remove** unrelated content like:
  - Cookie notices, menus, disclaimers,Wage Transparency, pay, benefits, diversity, equity, inclusion, boilerplate, or social buttons

Respond ONLY with the cleaned job description. Do not add commentary.

Blocks:
"""

    # Assemble prompt with initial blocks
    full_prompt = prompt_base + "\n".join(trimmed_blocks)
    while count_tokens(full_prompt) > 7800 and len(trimmed_blocks) > 6:
        print(" Trimming noisy blocks to stay under token limit...")
        trimmed_blocks = trim_noise_blocks(trimmed_blocks, max_trim=2)
        full_prompt = prompt_base + "\n".join(trimmed_blocks)

    return safe_llm_call(full_prompt)