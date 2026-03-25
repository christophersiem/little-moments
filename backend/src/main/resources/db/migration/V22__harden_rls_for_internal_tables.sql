-- Harden internal/public tables that should not remain unrestricted in Supabase.
-- Note: flyway_schema_history is intentionally left unchanged for migration/runtime stability.

CREATE OR REPLACE FUNCTION public.current_request_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.can_access_memory(p_memory_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := public.current_request_user_id();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'children'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'family_members'
  ) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.memories m
      JOIN public.children c ON c.id = m.child_id
      JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE m.id = p_memory_id
        AND fm.user_id = v_user_id
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.memories m
    WHERE m.id = p_memory_id
      AND (
        m.user_id = v_user_id
        OR m.created_by = v_user_id
        OR m.owner_id = v_user_id
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_request_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_request_user_id() TO authenticated;

REVOKE ALL ON FUNCTION public.can_access_memory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_memory(uuid) TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self_only ON public.users;
CREATE POLICY users_select_self_only
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = public.current_request_user_id());

DROP POLICY IF EXISTS users_insert_self_only ON public.users;
CREATE POLICY users_insert_self_only
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = public.current_request_user_id());

DROP POLICY IF EXISTS users_update_self_only ON public.users;
CREATE POLICY users_update_self_only
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = public.current_request_user_id())
  WITH CHECK (id = public.current_request_user_id());

DROP POLICY IF EXISTS users_delete_self_only ON public.users;
CREATE POLICY users_delete_self_only
  ON public.users
  FOR DELETE
  TO authenticated
  USING (id = public.current_request_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_tags_select_if_memory_accessible ON public.memory_tags;
CREATE POLICY memory_tags_select_if_memory_accessible
  ON public.memory_tags
  FOR SELECT
  TO authenticated
  USING (public.can_access_memory(memory_id));

DROP POLICY IF EXISTS memory_tags_insert_denied_direct ON public.memory_tags;
CREATE POLICY memory_tags_insert_denied_direct
  ON public.memory_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS memory_tags_update_denied_direct ON public.memory_tags;
CREATE POLICY memory_tags_update_denied_direct
  ON public.memory_tags
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS memory_tags_delete_denied_direct ON public.memory_tags;
CREATE POLICY memory_tags_delete_denied_direct
  ON public.memory_tags
  FOR DELETE
  TO authenticated
  USING (FALSE);

GRANT SELECT ON public.memory_tags TO authenticated;

ALTER TABLE public.memory_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_enrichments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_enrichments_select_if_memory_accessible ON public.memory_enrichments;
CREATE POLICY memory_enrichments_select_if_memory_accessible
  ON public.memory_enrichments
  FOR SELECT
  TO authenticated
  USING (public.can_access_memory(memory_id));

DROP POLICY IF EXISTS memory_enrichments_insert_denied_direct ON public.memory_enrichments;
CREATE POLICY memory_enrichments_insert_denied_direct
  ON public.memory_enrichments
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS memory_enrichments_update_denied_direct ON public.memory_enrichments;
CREATE POLICY memory_enrichments_update_denied_direct
  ON public.memory_enrichments
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS memory_enrichments_delete_denied_direct ON public.memory_enrichments;
CREATE POLICY memory_enrichments_delete_denied_direct
  ON public.memory_enrichments
  FOR DELETE
  TO authenticated
  USING (FALSE);

GRANT SELECT ON public.memory_enrichments TO authenticated;

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS embeddings_select_if_memory_accessible ON public.embeddings;
CREATE POLICY embeddings_select_if_memory_accessible
  ON public.embeddings
  FOR SELECT
  TO authenticated
  USING (public.can_access_memory(memory_id));

DROP POLICY IF EXISTS embeddings_insert_denied_direct ON public.embeddings;
CREATE POLICY embeddings_insert_denied_direct
  ON public.embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS embeddings_update_denied_direct ON public.embeddings;
CREATE POLICY embeddings_update_denied_direct
  ON public.embeddings
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS embeddings_delete_denied_direct ON public.embeddings;
CREATE POLICY embeddings_delete_denied_direct
  ON public.embeddings
  FOR DELETE
  TO authenticated
  USING (FALSE);

GRANT SELECT ON public.embeddings TO authenticated;

ALTER TABLE public.embedding_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_dlq FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS embedding_dlq_select_denied_direct ON public.embedding_dlq;
CREATE POLICY embedding_dlq_select_denied_direct
  ON public.embedding_dlq
  FOR SELECT
  TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS embedding_dlq_insert_denied_direct ON public.embedding_dlq;
CREATE POLICY embedding_dlq_insert_denied_direct
  ON public.embedding_dlq
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS embedding_dlq_update_denied_direct ON public.embedding_dlq;
CREATE POLICY embedding_dlq_update_denied_direct
  ON public.embedding_dlq
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS embedding_dlq_delete_denied_direct ON public.embedding_dlq;
CREATE POLICY embedding_dlq_delete_denied_direct
  ON public.embedding_dlq
  FOR DELETE
  TO authenticated
  USING (FALSE);
