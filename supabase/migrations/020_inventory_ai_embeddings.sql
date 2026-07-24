-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to inventory_products
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_inventory_products_embedding
  ON inventory_products USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Function to search products by embedding similarity
CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding json,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  category text,
  color text,
  size text,
  barcode text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  embedding_vector vector(1024);
BEGIN
  embedding_vector := query_embedding::vector;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.category,
    p.color,
    p.size,
    p.barcode,
    1 - (p.embedding <=> embedding_vector) AS similarity
  FROM inventory_products p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> embedding_vector) > match_threshold
  ORDER BY p.embedding <=> embedding_vector
  LIMIT match_count;
END;
$$;

-- Function to upsert product embedding
CREATE OR REPLACE FUNCTION upsert_product_embedding(
  p_product_id uuid,
  p_embedding json
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_products
  SET embedding = p_embedding::vector
  WHERE id = p_product_id;
END;
$$;
