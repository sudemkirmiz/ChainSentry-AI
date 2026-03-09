"""
RAG Builder for ChainSentry AI
Loads markdown documents from the 'data' directory, splits them into chunks,
generates embeddings using HuggingFace, and stores them in a FAISS vector index.
"""

import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# --- Configuration ---
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FAISS_INDEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faiss_index")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def build_index():
    """Load documents, split, embed, and save to FAISS index."""

    # 1. Load markdown files from the data directory
    print(f"[1/4] Loading documents from '{DATA_DIR}' ...")
    loader = DirectoryLoader(DATA_DIR, glob="**/*.md", loader_cls=TextLoader)
    documents = loader.load()
    print(f"      Loaded {len(documents)} document(s).")

    if not documents:
        print("ERROR: No documents found. Exiting.")
        return

    # 2. Split documents into chunks
    print(f"[2/4] Splitting documents (chunk_size={CHUNK_SIZE}, chunk_overlap={CHUNK_OVERLAP}) ...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"      Created {len(chunks)} chunk(s).")

    # 3. Create embeddings using HuggingFace model
    print(f"[3/4] Generating embeddings with '{EMBEDDING_MODEL}' ...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    # 4. Build FAISS vector store and save locally
    print(f"[4/4] Building FAISS index and saving to '{FAISS_INDEX_DIR}' ...")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(FAISS_INDEX_DIR)

    print(f"\n✅ FAISS index successfully created at '{FAISS_INDEX_DIR}'")
    print(f"   Total chunks indexed: {len(chunks)}")


if __name__ == "__main__":
    build_index()
