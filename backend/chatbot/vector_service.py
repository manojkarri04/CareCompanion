import re
from typing import List, Dict, Any

_embedding_model = None

def get_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"[VectorService] sentence_transformers fallback warning: {e}")
            _embedding_model = "FALLBACK"
    return _embedding_model

def get_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional vector embedding for a given text snippet."""
    model = get_model()
    if model != "FALLBACK" and hasattr(model, 'encode'):
        try:
            vec = model.encode(text, convert_to_numpy=True)
            return vec.tolist()
        except Exception as err:
            print(f"[VectorService] Encoding error: {err}")

    import hashlib
    base_hash = hashlib.sha256(text.encode('utf-8')).digest()
    vec = []
    for i in range(384):
        val = (base_hash[i % len(base_hash)] + i * 7) % 256
        vec.append(round((val / 128.0) - 1.0, 4))
    return vec

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Splits text into overlapping semantic chunks."""
    if not text or not text.strip():
        return []
    cleaned = re.sub(r'\s+', ' ', text).strip()
    if len(cleaned) <= chunk_size:
        return [cleaned]
    chunks = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        if end >= len(cleaned):
            chunks.append(cleaned[start:])
            break
        space_idx = cleaned.rfind('. ', start + chunk_size // 2, end)
        if space_idx == -1:
            space_idx = cleaned.rfind(' ', start + chunk_size // 2, end)
        if space_idx != -1 and space_idx > start:
            end = space_idx + 1
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
    return chunks

def store_document_chunks(db, user_id: str, document_id: str, filename: str, full_text: str) -> bool:
    """Chunks document text, computes 384-dim embeddings, and inserts into Supabase document_embeddings."""
    if not db or not full_text or not full_text.strip():
        return False
    try:
        chunks = chunk_text(full_text, chunk_size=500, overlap=100)
        records = []
        for index, chunk in enumerate(chunks):
            embedding = get_embedding(chunk)
            records.append({
                'user_id': user_id,
                'document_id': document_id,
                'content': chunk,
                'embedding': embedding,
                'metadata': {'filename': filename, 'chunk_index': index, 'total_chunks': len(chunks)}
            })
        if records:
            db.table('document_embeddings').insert(records).execute()
            print(f"[VectorService] Saved {len(records)} vector chunks for document '{filename}'")
            return True
    except Exception as e:
        print(f"[VectorService] Error storing document chunks: {e}")
    return False

def store_profile_embedding(db, user_id: str, full_name: str, email: str) -> bool:
    """Stores user profile metadata as a vector chunk."""
    if not db:
        return False
    try:
        profile_str = f"User Profile Details: Name is {full_name or 'N/A'}, Email is {email or 'N/A'}."
        embedding = get_embedding(profile_str)
        db.table('document_embeddings').insert({
            'user_id': user_id,
            'content': profile_str,
            'embedding': embedding,
            'metadata': {'type': 'profile_details'}
        }).execute()
        return True
    except Exception as e:
        print(f"[VectorService] Error storing profile embedding: {e}")
        return False

def similarity_search(db, user_id: str, query: str, top_k: int = 5, match_threshold: float = 0.1) -> List[Dict[str, Any]]:
    """Performs vector similarity search using Supabase RPC match_document_chunks."""
    if not db or not query:
        return []
    query_vec = get_embedding(query)
    try:
        rpc_response = db.rpc('match_document_chunks', {
            'query_embedding': query_vec,
            'match_threshold': match_threshold,
            'match_count': top_k,
            'p_user_id': user_id
        }).execute()
        if rpc_response.data:
            return rpc_response.data
    except Exception as rpc_err:
        print(f"[VectorService] RPC match_document_chunks failed: {rpc_err}. Falling back to standard query.")
    try:
        response = db.table('document_embeddings').select('id, content, metadata').eq('user_id', user_id).limit(top_k).execute()
        return response.data or []
    except Exception as query_err:
        print(f"[VectorService] Fallback vector query failed: {query_err}")
        return []
