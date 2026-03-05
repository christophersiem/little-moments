# Supabase SQL Steps

Run these scripts in the Supabase SQL Editor against your target project.

Recommended order:

1. `step2_supabase_families_family_members.sql`
2. `step3_supabase_rls_select_policies.sql`
3. `step4_supabase_rpc_create_family_with_owner.sql`
4. `step5_supabase_children_and_memory_scope.sql`
5. `step6_supabase_invitations.sql`
6. `step7_supabase_security_hardening.sql`
7. `step8_supabase_profiles_account.sql`
8. `step9_supabase_multi_owner_management.sql`
9. `step10_memories_owner_only_insert.sql`
10. `step11_memories_owner_only_update.sql`

`step10_memories_owner_only_insert.sql` should be applied once the family/member/child RLS helpers are already present (from step5+). It tightens memory writes so only `OWNER` can insert and delete memories.

`step11_memories_owner_only_update.sql` tightens memory updates so only `OWNER` can edit memories.
