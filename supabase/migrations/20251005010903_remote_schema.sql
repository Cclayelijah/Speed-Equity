


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."project_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    CONSTRAINT "pi_accepted_not_before_created_chk" CHECK ((("accepted_at" IS NULL) OR ("accepted_at" >= "created_at"))),
    CONSTRAINT "pi_once_accepted_chk" CHECK ((("accepted_at" IS NULL) OR ("user_id" IS NOT NULL)))
);


ALTER TABLE "public"."project_invitations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_project_invite"("p_invite_id" "uuid") RETURNS "public"."project_invitations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inv public.project_invitations;
  v_email text;
BEGIN
  SELECT * INTO v_inv
  FROM public.project_invitations
  WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE='22023';
  END IF;

  v_email := public.current_user_email();

  IF v_inv.user_id IS NOT NULL AND v_inv.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'This invitation is addressed to another user' USING ERRCODE='42501';
  END IF;

  IF v_inv.user_id IS NULL AND (v_inv.email IS NULL OR v_inv.email <> v_email) THEN
    RAISE EXCEPTION 'This invitation is not addressed to your email' USING ERRCODE='42501';
  END IF;

  UPDATE public.project_invitations
     SET user_id    = auth.uid(),
         accepted_at = NOW()
   WHERE id = p_invite_id
   RETURNING * INTO v_inv;

  INSERT INTO public.project_members (project_id, user_id, email, invite_date, join_date, equity)
  VALUES (v_inv.project_id, auth.uid(), v_email, CURRENT_DATE, CURRENT_DATE, 0)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_inv;
END;
$$;


ALTER FUNCTION "public"."accept_project_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pr.email
  FROM public.profiles pr
  WHERE pr.id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_project_equity_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  proj_id uuid;
  total_equity numeric;
  epsilon numeric := 0;  -- set to e.g. 0.000001 if you expect rounding noise
BEGIN
  -- Check the NEW project (after INSERT/UPDATE)…
  proj_id := COALESCE(NEW.project_id, OLD.project_id);

  IF proj_id IS NOT NULL THEN
    SELECT COALESCE(SUM(equity), 0)::numeric
      INTO total_equity
    FROM public.project_members
    WHERE project_id = proj_id;

    IF total_equity > 100::numeric + epsilon THEN
      RAISE EXCEPTION
        'Total equity for project % (%.3f%%) exceeds 100%%',
        proj_id, total_equity
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;

  -- If an UPDATE moved a member between projects, also re-check the OLD project
  IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    SELECT COALESCE(SUM(equity), 0)::numeric
      INTO total_equity
    FROM public.project_members
    WHERE project_id = OLD.project_id;

    IF total_equity > 100::numeric + epsilon THEN
      RAISE EXCEPTION
        'Total equity for project % (%.3f%%) exceeds 100%%',
        OLD.project_id, total_equity
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NULL; -- constraint trigger ignores result
END;
$$;


ALTER FUNCTION "public"."enforce_project_equity_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_project_member"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_current_user_project_member"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_project_owner"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_current_user_project_owner"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."project_insert_default_projection"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a minimal, valid active projection so dashboards always have data.
  -- valuation = 0; work_hours_until_completion = 1 hour (placeholder).
  INSERT INTO public.project_projections
    (project_id, valuation, work_hours_until_completion, effective_from, active)
  VALUES
    (NEW.id, 0, 1, CURRENT_DATE, true);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."project_insert_default_projection"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."project_owner_auto_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, email, invite_date, join_date, equity)
  VALUES (
    NEW.id,
    NEW.owner_id,
    (SELECT email FROM public.profiles WHERE id = NEW.owner_id),
    CURRENT_DATE,
    CURRENT_DATE,
    0
  )
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."project_owner_auto_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."projections_set_single_active"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Deactivate previous active rows for the affected projects,
  -- but only if the new/updated rows are active=true.
  UPDATE public.project_projections p
     SET active = false
   WHERE p.project_id IN (
           SELECT DISTINCT n.project_id
           FROM newrows n
           WHERE n.active = true
         )
     AND p.active = true
     AND p.id NOT IN (SELECT id FROM newrows);

  RETURN NULL; -- statement-level trigger
END;
$$;


ALTER FUNCTION "public"."projections_set_single_active"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_projections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "valuation" numeric NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "work_hours_until_completion" numeric NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "project_projections_whuc_positive_check" CHECK (("work_hours_until_completion" > (0)::numeric)),
    CONSTRAINT "project_valuations_valuation_check" CHECK (("valuation" >= (0)::numeric))
);


ALTER TABLE "public"."project_projections" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_projection"("p_project_id" "uuid", "p_valuation" numeric, "p_work_hours_until_completion" numeric, "p_effective_from" "date" DEFAULT CURRENT_DATE, "p_projection_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."project_projections"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _row public.project_projections;
BEGIN
  -- Authorization (RLS-friendly): only project owner may call
  IF NOT public.is_current_user_project_owner(p_project_id) THEN
    RAISE EXCEPTION 'Only the project owner can change projections'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize per project to avoid concurrent “double active”
  PERFORM pg_advisory_xact_lock(hashtextextended(p_project_id::text, 42));

  -- Deactivate any currently-active rows for this project
  UPDATE public.project_projections
     SET active = false
   WHERE project_id = p_project_id
     AND active = true;

  IF p_projection_id IS NULL THEN
    -- Insert a new active projection
    INSERT INTO public.project_projections
      (project_id, valuation, work_hours_until_completion, effective_from, active)
    VALUES
      (p_project_id, p_valuation, p_work_hours_until_completion, p_effective_from, true)
    RETURNING * INTO _row;
  ELSE
    -- Update the given projection and mark it active
    UPDATE public.project_projections
       SET valuation = p_valuation,
           work_hours_until_completion = p_work_hours_until_completion,
           effective_from = p_effective_from,
           active = true
     WHERE id = p_projection_id
       AND project_id = p_project_id
    RETURNING * INTO _row;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Projection % not found for project %', p_projection_id, p_project_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN _row;
END;
$$;


ALTER FUNCTION "public"."set_active_projection"("p_project_id" "uuid", "p_valuation" numeric, "p_work_hours_until_completion" numeric, "p_effective_from" "date", "p_projection_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "hours_worked" numeric DEFAULT 0 NOT NULL,
    "completed" "text",
    "hours_wasted" numeric DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"(),
    "plan_to_complete" "text",
    CONSTRAINT "daily_entries_hours_wasted_check" CHECK (("hours_wasted" >= (0)::numeric)),
    CONSTRAINT "daily_entries_hours_worked_check" CHECK (("hours_worked" >= (0)::numeric))
);


ALTER TABLE "public"."daily_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_projections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "planned_hours_per_week" numeric NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT "member_projections_planned_hours_per_week_check" CHECK (("planned_hours_per_week" >= (0)::numeric))
);


ALTER TABLE "public"."member_projections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "invite_date" "date" DEFAULT CURRENT_DATE,
    "join_date" "date",
    "equity" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "project_members_equity_bound_check" CHECK ((("equity" >= (0)::numeric) AND ("equity" <= (100)::numeric)))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."member_dashboard" AS
 WITH "active_proj" AS (
         SELECT "p"."id" AS "project_id",
            "p"."name",
            "v"."valuation" AS "active_valuation",
            "v"."work_hours_until_completion" AS "active_work_hours_until_completion"
           FROM ("public"."projects" "p"
             LEFT JOIN LATERAL ( SELECT "v1"."id",
                    "v1"."project_id",
                    "v1"."valuation",
                    "v1"."work_hours_until_completion",
                    "v1"."effective_from"
                   FROM "public"."project_projections" "v1"
                  WHERE (("v1"."project_id" = "p"."id") AND ("v1"."active" = true))
                  ORDER BY "v1"."effective_from" DESC
                 LIMIT 1) "v" ON (true))
        ), "active_member_hours" AS (
         SELECT "p"."id" AS "project_id",
            COALESCE(( SELECT "sum"("mp_latest"."planned_hours_per_week") AS "sum"
                   FROM ( SELECT DISTINCT ON ("mp_1"."user_id") "mp_1"."user_id",
                            "mp_1"."planned_hours_per_week"
                           FROM "public"."member_projections" "mp_1"
                          WHERE (("mp_1"."project_id" = "p"."id") AND ("mp_1"."effective_from" <= CURRENT_DATE))
                          ORDER BY "mp_1"."user_id", "mp_1"."effective_from" DESC) "mp_latest"), (0)::numeric) AS "active_planned_hours_per_week"
           FROM "public"."projects" "p"
        ), "member_plans" AS (
         SELECT "mp_1"."project_id",
            "mp_1"."user_id",
            "mp_1"."planned_hours_per_week"
           FROM ( SELECT DISTINCT ON ("member_projections"."project_id", "member_projections"."user_id") "member_projections"."project_id",
                    "member_projections"."user_id",
                    "member_projections"."planned_hours_per_week"
                   FROM "public"."member_projections"
                  WHERE ("member_projections"."effective_from" <= CURRENT_DATE)
                  ORDER BY "member_projections"."project_id", "member_projections"."user_id", "member_projections"."effective_from" DESC) "mp_1"
        ), "member_totals" AS (
         SELECT "d"."project_id",
            "d"."created_by" AS "user_id",
            COALESCE("sum"("d"."hours_worked"), (0)::numeric) AS "member_hours_worked",
            COALESCE("sum"("d"."hours_wasted"), (0)::numeric) AS "member_hours_wasted"
           FROM "public"."daily_entries" "d"
          GROUP BY "d"."project_id", "d"."created_by"
        ), "equity" AS (
         SELECT "pm"."project_id",
            "pm"."user_id",
            (LEAST(GREATEST(COALESCE("pm"."equity", (0)::numeric), (0)::numeric), (100)::numeric) / 100.0) AS "equity_fraction"
           FROM "public"."project_members" "pm"
        )
 SELECT "ap"."project_id",
    "ap"."name",
    "mt"."user_id",
    ( SELECT "pr"."email"
           FROM "public"."profiles" "pr"
          WHERE ("pr"."id" = "mt"."user_id")) AS "member_email",
    "ap"."active_valuation",
    "amh"."active_planned_hours_per_week",
    "mp"."planned_hours_per_week" AS "member_active_planned_hours_per_week",
    "ap"."active_work_hours_until_completion",
        CASE
            WHEN (("amh"."active_planned_hours_per_week" > (0)::numeric) AND ("ap"."active_work_hours_until_completion" IS NOT NULL)) THEN ("ap"."active_work_hours_until_completion" / "amh"."active_planned_hours_per_week")
            ELSE NULL::numeric
        END AS "active_weeks_to_goal",
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END AS "implied_hour_value",
    COALESCE("mt"."member_hours_worked", (0)::numeric) AS "member_hours_worked",
    COALESCE("mt"."member_hours_wasted", (0)::numeric) AS "member_hours_wasted",
    ((COALESCE("mt"."member_hours_worked", (0)::numeric) * COALESCE("eq"."equity_fraction", (0)::numeric)) *
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END) AS "member_sweat_equity_earned_weighted",
    (COALESCE("mt"."member_hours_wasted", (0)::numeric) *
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END) AS "member_money_lost",
        CASE
            WHEN ("ap"."active_work_hours_until_completion" IS NULL) THEN (0)::numeric
            WHEN (("ap"."active_work_hours_until_completion" + COALESCE(( SELECT "sum"("x"."member_hours_worked") AS "sum"
               FROM "member_totals" "x"
              WHERE ("x"."project_id" = "ap"."project_id")), (0)::numeric)) > (0)::numeric) THEN (COALESCE(( SELECT "sum"("x"."member_hours_worked") AS "sum"
               FROM "member_totals" "x"
              WHERE ("x"."project_id" = "ap"."project_id")), (0)::numeric) / ("ap"."active_work_hours_until_completion" + COALESCE(( SELECT "sum"("x"."member_hours_worked") AS "sum"
               FROM "member_totals" "x"
              WHERE ("x"."project_id" = "ap"."project_id")), (0)::numeric)))
            ELSE (0)::numeric
        END AS "project_progress"
   FROM (((("active_proj" "ap"
     LEFT JOIN "active_member_hours" "amh" ON (("amh"."project_id" = "ap"."project_id")))
     LEFT JOIN "member_totals" "mt" ON (("mt"."project_id" = "ap"."project_id")))
     LEFT JOIN "member_plans" "mp" ON ((("mp"."project_id" = "ap"."project_id") AND ("mp"."user_id" = "mt"."user_id"))))
     LEFT JOIN "equity" "eq" ON ((("eq"."project_id" = "ap"."project_id") AND ("eq"."user_id" = "mt"."user_id"))))
  WHERE ("mt"."user_id" IS NOT NULL);


ALTER VIEW "public"."member_dashboard" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."project_dashboard" AS
 WITH "active_proj" AS (
         SELECT "p"."id" AS "project_id",
            "p"."name",
            "v"."valuation" AS "active_valuation",
            "v"."work_hours_until_completion" AS "active_work_hours_until_completion"
           FROM ("public"."projects" "p"
             LEFT JOIN LATERAL ( SELECT "v1"."id",
                    "v1"."project_id",
                    "v1"."valuation",
                    "v1"."work_hours_until_completion",
                    "v1"."effective_from"
                   FROM "public"."project_projections" "v1"
                  WHERE (("v1"."project_id" = "p"."id") AND ("v1"."active" = true))
                  ORDER BY "v1"."effective_from" DESC
                 LIMIT 1) "v" ON (true))
        ), "active_member_hours" AS (
         SELECT "p"."id" AS "project_id",
            COALESCE(( SELECT "sum"("mp_latest"."planned_hours_per_week") AS "sum"
                   FROM ( SELECT DISTINCT ON ("mp"."user_id") "mp"."user_id",
                            "mp"."planned_hours_per_week"
                           FROM "public"."member_projections" "mp"
                          WHERE (("mp"."project_id" = "p"."id") AND ("mp"."effective_from" <= CURRENT_DATE))
                          ORDER BY "mp"."user_id", "mp"."effective_from" DESC) "mp_latest"), (0)::numeric) AS "active_planned_hours_per_week"
           FROM "public"."projects" "p"
        ), "totals" AS (
         SELECT "d"."project_id",
            COALESCE("sum"("d"."hours_worked"), (0)::numeric) AS "total_hours_worked",
            COALESCE("sum"("d"."hours_wasted"), (0)::numeric) AS "total_hours_wasted"
           FROM "public"."daily_entries" "d"
          GROUP BY "d"."project_id"
        ), "member_hours" AS (
         SELECT "d"."project_id",
            "d"."created_by" AS "user_id",
            COALESCE("sum"("d"."hours_worked"), (0)::numeric) AS "member_hours_worked",
            COALESCE("sum"("d"."hours_wasted"), (0)::numeric) AS "member_hours_wasted"
           FROM "public"."daily_entries" "d"
          GROUP BY "d"."project_id", "d"."created_by"
        ), "equity" AS (
         SELECT "pm"."project_id",
            "pm"."user_id",
            (LEAST(GREATEST(COALESCE("pm"."equity", (0)::numeric), (0)::numeric), (100)::numeric) / 100.0) AS "equity_fraction"
           FROM "public"."project_members" "pm"
        )
 SELECT "ap"."project_id",
    "ap"."name",
    "ap"."active_valuation",
    "amh"."active_planned_hours_per_week",
    "ap"."active_work_hours_until_completion",
        CASE
            WHEN (("amh"."active_planned_hours_per_week" > (0)::numeric) AND ("ap"."active_work_hours_until_completion" IS NOT NULL)) THEN ("ap"."active_work_hours_until_completion" / "amh"."active_planned_hours_per_week")
            ELSE NULL::numeric
        END AS "active_weeks_to_goal",
    COALESCE("t"."total_hours_worked", (0)::numeric) AS "total_hours_worked",
    COALESCE("t"."total_hours_wasted", (0)::numeric) AS "total_hours_wasted",
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END AS "implied_hour_value",
    (COALESCE(( SELECT "sum"(("mh"."member_hours_worked" * "eq"."equity_fraction")) AS "sum"
           FROM ("member_hours" "mh"
             JOIN "equity" "eq" ON ((("eq"."project_id" = "mh"."project_id") AND ("eq"."user_id" = "mh"."user_id"))))
          WHERE ("mh"."project_id" = "ap"."project_id")), (0)::numeric) *
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END) AS "sweat_equity_earned_weighted",
    (COALESCE("t"."total_hours_wasted", (0)::numeric) *
        CASE
            WHEN (("ap"."active_work_hours_until_completion" IS NOT NULL) AND ("ap"."active_work_hours_until_completion" > (0)::numeric)) THEN ("ap"."active_valuation" / "ap"."active_work_hours_until_completion")
            ELSE (0)::numeric
        END) AS "money_lost",
        CASE
            WHEN ("ap"."active_work_hours_until_completion" IS NULL) THEN (0)::numeric
            WHEN (("ap"."active_work_hours_until_completion" + COALESCE("t"."total_hours_worked", (0)::numeric)) > (0)::numeric) THEN (COALESCE("t"."total_hours_worked", (0)::numeric) / ("ap"."active_work_hours_until_completion" + COALESCE("t"."total_hours_worked", (0)::numeric)))
            ELSE (0)::numeric
        END AS "project_progress"
   FROM (("active_proj" "ap"
     LEFT JOIN "active_member_hours" "amh" ON (("amh"."project_id" = "ap"."project_id")))
     LEFT JOIN "totals" "t" ON (("t"."project_id" = "ap"."project_id")));


ALTER VIEW "public"."project_dashboard" OWNER TO "postgres";


ALTER TABLE ONLY "public"."daily_entries"
    ADD CONSTRAINT "daily_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_entries"
    ADD CONSTRAINT "daily_entries_project_id_entry_date_key" UNIQUE ("project_id", "entry_date");



ALTER TABLE ONLY "public"."member_projections"
    ADD CONSTRAINT "member_projections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_invitations"
    ADD CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_user_unique" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."project_projections"
    ADD CONSTRAINT "project_valuations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE INDEX "member_projections_project_user_effective_idx" ON "public"."member_projections" USING "btree" ("project_id", "user_id", "effective_from" DESC);



CREATE INDEX "project_invitations_accepted_idx" ON "public"."project_invitations" USING "btree" ("accepted_at");



CREATE INDEX "project_invitations_email_idx" ON "public"."project_invitations" USING "btree" ("email");



CREATE INDEX "project_invitations_project_idx" ON "public"."project_invitations" USING "btree" ("project_id");



CREATE INDEX "project_invitations_user_idx" ON "public"."project_invitations" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_one_active_projection_per_project" ON "public"."project_projections" USING "btree" ("project_id") WHERE "active";



CREATE UNIQUE INDEX "uq_pi_pending_per_email" ON "public"."project_invitations" USING "btree" ("project_id", "email") WHERE (("accepted_at" IS NULL) AND ("email" IS NOT NULL));



CREATE CONSTRAINT TRIGGER "trg_enforce_project_equity_cap" AFTER INSERT OR DELETE OR UPDATE ON "public"."project_members" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."enforce_project_equity_cap"();



CREATE OR REPLACE TRIGGER "trg_project_insert_default_projection" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."project_insert_default_projection"();



CREATE OR REPLACE TRIGGER "trg_project_owner_auto_member" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."project_owner_auto_member"();



ALTER TABLE ONLY "public"."daily_entries"
    ADD CONSTRAINT "daily_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_entries"
    ADD CONSTRAINT "daily_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_projections"
    ADD CONSTRAINT "member_projections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_projections"
    ADD CONSTRAINT "member_projections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invitations"
    ADD CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invitations"
    ADD CONSTRAINT "project_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_projections"
    ADD CONSTRAINT "project_valuations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."daily_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_entries_delete" ON "public"."daily_entries" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



CREATE POLICY "daily_entries_insert" ON "public"."daily_entries" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



CREATE POLICY "daily_entries_select" ON "public"."daily_entries" FOR SELECT USING ("public"."is_current_user_project_member"("project_id"));



CREATE POLICY "daily_entries_update" ON "public"."daily_entries" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id"))) WITH CHECK ((("created_by" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



ALTER TABLE "public"."member_projections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_projections_delete" ON "public"."member_projections" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



CREATE POLICY "member_projections_insert" ON "public"."member_projections" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



CREATE POLICY "member_projections_select" ON "public"."member_projections" FOR SELECT USING ("public"."is_current_user_project_member"("project_id"));



CREATE POLICY "member_projections_update" ON "public"."member_projections" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id"))) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_current_user_project_member"("project_id")));



CREATE POLICY "pi_delete_owner" ON "public"."project_invitations" FOR DELETE USING ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "pi_insert" ON "public"."project_invitations" FOR INSERT WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "pi_select" ON "public"."project_invitations" FOR SELECT USING (("public"."is_current_user_project_owner"("project_id") OR ("user_id" = "auth"."uid"()) OR (("email" IS NOT NULL) AND ("email" = "public"."current_user_email"()))));



CREATE POLICY "pi_update_owner" ON "public"."project_invitations" FOR UPDATE USING ("public"."is_current_user_project_owner"("project_id")) WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."project_members" "pm_self"
     JOIN "public"."project_members" "pm_other" ON (("pm_self"."project_id" = "pm_other"."project_id")))
  WHERE (("pm_self"."user_id" = "auth"."uid"()) AND ("pm_other"."user_id" = "profiles"."id"))))));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."project_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_members_delete" ON "public"."project_members" FOR DELETE USING ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "project_members_insert" ON "public"."project_members" FOR INSERT WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "project_members_select" ON "public"."project_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_current_user_project_owner"("project_id")));



CREATE POLICY "project_members_update" ON "public"."project_members" FOR UPDATE USING ("public"."is_current_user_project_owner"("project_id")) WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



ALTER TABLE "public"."project_projections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_projections_delete" ON "public"."project_projections" FOR DELETE USING ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "project_projections_insert" ON "public"."project_projections" FOR INSERT WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



CREATE POLICY "project_projections_select" ON "public"."project_projections" FOR SELECT USING ("public"."is_current_user_project_member"("project_id"));



CREATE POLICY "project_projections_update" ON "public"."project_projections" FOR UPDATE USING ("public"."is_current_user_project_owner"("project_id")) WITH CHECK ("public"."is_current_user_project_owner"("project_id"));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete" ON "public"."projects" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR "public"."is_current_user_project_member"("id")));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON TABLE "public"."project_invitations" TO "anon";
GRANT ALL ON TABLE "public"."project_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."project_invitations" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_project_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_project_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_project_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_project_equity_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_project_equity_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_project_equity_cap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_project_member"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_project_member"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_project_member"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_project_owner"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_project_owner"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_project_owner"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."project_insert_default_projection"() TO "anon";
GRANT ALL ON FUNCTION "public"."project_insert_default_projection"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."project_insert_default_projection"() TO "service_role";



GRANT ALL ON FUNCTION "public"."project_owner_auto_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."project_owner_auto_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."project_owner_auto_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."projections_set_single_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."projections_set_single_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."projections_set_single_active"() TO "service_role";



GRANT ALL ON TABLE "public"."project_projections" TO "anon";
GRANT ALL ON TABLE "public"."project_projections" TO "authenticated";
GRANT ALL ON TABLE "public"."project_projections" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_projection"("p_project_id" "uuid", "p_valuation" numeric, "p_work_hours_until_completion" numeric, "p_effective_from" "date", "p_projection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_projection"("p_project_id" "uuid", "p_valuation" numeric, "p_work_hours_until_completion" numeric, "p_effective_from" "date", "p_projection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_projection"("p_project_id" "uuid", "p_valuation" numeric, "p_work_hours_until_completion" numeric, "p_effective_from" "date", "p_projection_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."daily_entries" TO "anon";
GRANT ALL ON TABLE "public"."daily_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_entries" TO "service_role";



GRANT ALL ON TABLE "public"."member_projections" TO "anon";
GRANT ALL ON TABLE "public"."member_projections" TO "authenticated";
GRANT ALL ON TABLE "public"."member_projections" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."member_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."member_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."member_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."project_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."project_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."project_dashboard" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;

  create policy "Authenticated can upload logos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'project-logos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Public can read logos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'project-logos'::text));



  create policy "auth delete project logos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'project-logos'::text));



  create policy "auth insert project logos"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'project-logos'::text));



  create policy "auth update project logos"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'project-logos'::text))
with check ((bucket_id = 'project-logos'::text));



  create policy "public read project logos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'project-logos'::text));



