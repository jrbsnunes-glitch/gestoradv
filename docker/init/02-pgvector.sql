-- Extensão pgvector e coluna de embedding para RAG jurídico
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS search_embedding vector(1536);

CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_hnsw_idx
  ON knowledge_documents USING hnsw (search_embedding vector_cosine_ops);
