CREATE OR REPLACE FUNCTION public.rpc_memory_chat_search(
    p_query_embedding_text text,
    p_match_count integer DEFAULT 12,
    p_family_id uuid DEFAULT NULL
)
RETURNS TABLE (
    memory_id uuid,
    recorded_at timestamptz,
    created_at timestamptz,
    title text,
    summary text,
    transcript text,
    tags text[],
    is_highlight boolean,
    importance_score smallint,
    enrichment_summary text,
    similarity double precision
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    -- Keep this aligned with the embeddings table dimension and memory-chat embedding model.
    v_query vector(1536);
    v_limit integer;
BEGIN
    IF p_query_embedding_text IS NULL OR btrim(p_query_embedding_text) = '' THEN
        RETURN;
    END IF;

    v_query := p_query_embedding_text::vector(1536);
    v_limit := GREATEST(1, LEAST(COALESCE(p_match_count, 12), 50));

    RETURN QUERY
    SELECT
        m.id AS memory_id,
        m.recorded_at,
        m.created_at,
        m.title,
        m.summary,
        m.transcript,
        m.tags,
        m.is_highlight,
        me.importance_score,
        me.summary AS enrichment_summary,
        GREATEST(0::double precision, 1 - (e.embedding <=> v_query)) AS similarity
    FROM public.embeddings e
    JOIN public.memories m
      ON m.id = e.memory_id
    LEFT JOIN public.memory_enrichments me
      ON me.memory_id = m.id
    LEFT JOIN public.children c
      ON c.id = m.child_id
    WHERE m.status = 'READY'
      AND public.can_access_memory(m.id)
      AND (p_family_id IS NULL OR c.family_id = p_family_id)
    ORDER BY (e.embedding <=> v_query) ASC, m.recorded_at ASC
    LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_memory_chat_search(text, integer, uuid) TO authenticated;
