from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import ollama
import json
import os
from web3 import AsyncWeb3, AsyncHTTPProvider

# --- Web3 Setup ---
# Avalanche Fuji Testnet RPC
w3 = AsyncWeb3(AsyncHTTPProvider('https://api.avax-test.network/ext/bc/C/rpc'))

# Chainlink AVAX/USD Price Feed Contract on Avalanche Fuji Testnet
# Decimals: 8
CHAINLINK_AVAX_USD_ADDRESS = "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD"
CHAINLINK_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

async def get_avax_price() -> float | None:
    """Fetch live AVAX/USD price from Chainlink."""
    try:
        contract = w3.eth.contract(address=w3.to_checksum_address(CHAINLINK_AVAX_USD_ADDRESS), abi=CHAINLINK_ABI)
        round_data = await contract.functions.latestRoundData().call()
        price = round_data[1]  # 'answer' is index 1
        return price / 1e8      # Chainlink USD feeds have 8 decimals
    except Exception as e:
        print(f"⚠️  Error fetching AVAX price from Chainlink: {e}")
        return None

# --- RAG Imports ---
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# ---------------------------------------------------------------------------
# Global FAISS state – populated during lifespan startup
# ---------------------------------------------------------------------------
FAISS_INDEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faiss_index")
faiss_db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavy resources (embedding model + FAISS index) once at startup."""
    global faiss_db
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        faiss_db = FAISS.load_local(
            FAISS_INDEX_DIR,
            embeddings,
            allow_dangerous_deserialization=True,
        )
        print(f"✅ FAISS index loaded successfully from '{FAISS_INDEX_DIR}'")
    except Exception as e:
        faiss_db = None
        print(f"⚠️  WARNING: Could not load FAISS index from '{FAISS_INDEX_DIR}': {e}")
        print("   The API will still work, but RAG context will NOT be available.")
    yield


app = FastAPI(title="Smart Contract Security Analyzer", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Root Health-Check
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "message": "ChainSentry AI - Smart Contract Security Analyzer API is running.",
        "status": "active",
        "rag_enabled": faiss_db is not None,
        "endpoints": {
            "docs": "/docs",
            "analyze": "/analyze",
        },
    }


# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request Model
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    contract_code: str
    language: str = "en"


import asyncio

# ---------------------------------------------------------------------------
# Core LLM Analysis Function (Reusable)
# ---------------------------------------------------------------------------
async def run_llm_analysis(contract_code: str, language: str) -> dict:
    """
    Performs RAG-augmented security analysis on the given Solidity code.

    1. Queries the FAISS vector DB for relevant historical hack context.
    2. Injects that context into the system prompt.
    3. Calls the Ollama LLM and parses the strict JSON response.
    """

    # --- Step 1: Retrieve RAG context ---
    rag_context = ""
    if faiss_db is not None:
        try:
            # Run the synchronous FAISS similarity search in a separate thread
            # so it doesn't block the async event loop and crash uvicorn
            docs = await asyncio.to_thread(faiss_db.similarity_search, contract_code, k=2)
            rag_context = "\n\n---\n\n".join(doc.page_content for doc in docs)
        except Exception as e:
            print(f"⚠️  RAG similarity search failed: {e}")
            rag_context = ""

    # --- Step 2: Build the system prompt ---
    rag_section = ""
    if rag_context:
        rag_section = f"""

HISTORICAL HACK CONTEXT (CRITICAL):
The following context contains real-world vulnerability patterns and exploit techniques extracted from our security knowledge base. You MUST use this context to identify logical flaws in the provided code — especially Oracle manipulation, stale price data, reentrancy, delegatecall misuse, and tx.origin phishing.

--- BEGIN CONTEXT ---
{rag_context}
--- END CONTEXT ---
"""

    SYSTEM_PROMPT = f"""You are a senior Avalanche smart contract auditor. Your goal is to find security vulnerabilities in the provided Solidity code.
{rag_section}
CRITICAL INSTRUCTION: You must strictly output ONLY valid JSON. No conversational text, no pre-amble, no markdown formatting like ```json.
The JSON must have this exact structure:
{{ "status": "success", "risk_level": "Critical/High/Medium/Low", "total_errors": int, "executive_summary": "string", "vulnerabilities": [ {{ "error_type": "string", "line_number": int, "description": "string", "solution": "string", "fixed_code_snippet": "string", "gas_optimization": "string", "estimated_gas_saved": int }} ] }}

NOTE on "executive_summary": Write a professional 2-3 sentence executive summary assessing the overall security posture of the contract. Consider all vulnerabilities found, the risk level, and gas optimization opportunities. This summary should be suitable for a security audit PDF report.

NOTE on "estimated_gas_saved": Provide a rough integer estimate of how much gas the optimization will save (e.g., 2100). If no optimization is possible or applicable, return 0.

LANGUAGE REQUIREMENT:
All string values ('description', 'solution', 'gas_optimization', 'executive_summary') MUST be written in the following language: {language.upper()}.
OUTPUT ONLY PARSABLE JSON."""

    # --- Step 3: Call Ollama ---
    response = ollama.chat(
        model="gpt-oss:120b-cloud",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": contract_code},
        ],
        format="json",
    )

    raw_output = response["message"]["content"]

    # --- Step 4: Parse & Calculate USD Savings ---
    result = json.loads(raw_output)
    
    # Fetch live price
    avax_usd_price = await get_avax_price()
    
    # Base assuming gas price of 25 nAVAX (25 Gwei) on C-chain
    GAS_PRICE_NAVAX = 25 
    
    # Inject calculations
    if "vulnerabilities" in result:
        for vuln in result["vulnerabilities"]:
            gas_saved = vuln.get("estimated_gas_saved", 0)
            
            if gas_saved > 0 and avax_usd_price is not None:
                # Calculation: gas_saved * 25 nAVAX -> Convert to AVAX -> Multiply by USD Price
                # 1 AVAX = 1e9 nAVAX
                avax_saved = (gas_saved * GAS_PRICE_NAVAX) / 1e9
                usd_saved = avax_saved * avax_usd_price
                
                vuln["estimated_savings_usd"] = round(usd_saved, 4)
                
                vuln["gas_optimization"] += f" (With this optimization, you save an estimated ${usd_saved:.4f} USD per transaction.)"
            else:
                vuln["estimated_savings_usd"] = "N/A"
                
    return result


# ---------------------------------------------------------------------------
# /analyze Endpoint
# ---------------------------------------------------------------------------
@app.post("/analyze")
async def analyze_contract(request: AnalyzeRequest):
    """
    Main endpoint for analyzing Solidity smart contracts.
    Takes the raw contract code and an optional language string.
    Delegates to run_llm_analysis which handles RAG retrieval,
    prompt construction, and LLM interaction.
    """
    try:
        result = await run_llm_analysis(request.contract_code, request.language)
        return result

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="The AI model failed to return a valid JSON response format.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
