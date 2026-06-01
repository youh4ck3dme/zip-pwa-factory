


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



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_booking_exists BOOLEAN;
  v_tenant_id UUID;
BEGIN
  -- Check if booking exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
    AND user_id = p_user_id
    AND status != 'cancelled'
  ) INTO v_booking_exists;

  IF NOT v_booking_exists THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;

  -- Get tenant ID for RLS check
  SELECT tenant_id INTO v_tenant_id FROM bookings WHERE id = p_booking_id;

  -- Update booking status
  UPDATE bookings
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_service_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_booking_id UUID;
  v_service_duration INT;
  v_service_tenant_id UUID;
  v_time_slot_valid BOOLEAN;
BEGIN
  -- Validate service exists and belongs to tenant
  SELECT duration, tenant_id INTO v_service_duration, v_service_tenant_id
  FROM services
  WHERE id = p_service_id AND is_active = TRUE;

  IF v_service_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Service not found or inactive';
  END IF;

  IF v_service_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Service does not belong to tenant';
  END IF;

  -- Validate time slot
  SELECT EXISTS(
    SELECT 1 FROM time_slots_config
    WHERE tenant_id = p_tenant_id
    AND is_active = TRUE
    AND start_time <= p_start_time::TIME
    AND end_time >= p_end_time::TIME
  ) INTO v_time_slot_valid;

  IF NOT v_time_slot_valid THEN
    RAISE EXCEPTION 'Selected time slot is not available';
  END IF;

  -- Validate booking time logic
  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Invalid time range: start must be before end';
  END IF;

  -- Validate service duration matches
  IF (EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60) != v_service_duration THEN
    RAISE EXCEPTION 'Booking duration does not match service duration';
  END IF;

  -- Check for overlapping bookings
  IF EXISTS(
    SELECT 1 FROM bookings
    WHERE tenant_id = p_tenant_id
    AND service_id = p_service_id
    AND status != 'cancelled'
    AND (
      (p_start_time < end_time AND p_end_time > start_time) OR
      (p_start_time = start_time AND p_end_time = end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Time slot already booked';
  END IF;

  -- Create the booking
  INSERT INTO bookings (tenant_id, user_id, service_id, start_time, end_time, status)
  VALUES (p_tenant_id, p_user_id, p_service_id, p_start_time, p_end_time, 'confirmed')
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;


ALTER FUNCTION "public"."create_booking"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_service_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_booking_email"("p_booking_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- In production, this would integrate with an email service
  -- For now, just return true
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."send_booking_email"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- In production, this would send reminders for upcoming bookings
  -- For now, do nothing
  RETURN;
END;
$$;


ALTER FUNCTION "public"."send_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_conversions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "impression_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "converted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_experiments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_experiments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_impressions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "experiment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "variant" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_impressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['confirmed'::"text", 'cancelled'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "duration" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_branding" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "logo_url" "text",
    "favicon_url" "text",
    "primary_color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_branding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tenant_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_slots_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."time_slots_config" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_conversions"
    ADD CONSTRAINT "ai_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_experiments"
    ADD CONSTRAINT "ai_experiments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_impressions"
    ADD CONSTRAINT "ai_impressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_branding"
    ADD CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."time_slots_config"
    ADD CONSTRAINT "time_slots_config_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ai_impressions_experiment" ON "public"."ai_impressions" USING "btree" ("experiment_id");



CREATE INDEX "idx_ai_impressions_user" ON "public"."ai_impressions" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_service" ON "public"."bookings" USING "btree" ("service_id");



CREATE INDEX "idx_bookings_tenant_user" ON "public"."bookings" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_bookings_time" ON "public"."bookings" USING "btree" ("start_time", "end_time");



CREATE INDEX "idx_services_tenant" ON "public"."services" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_users_tenant_user" ON "public"."tenant_users" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug");



CREATE INDEX "idx_time_slots_tenant" ON "public"."time_slots_config" USING "btree" ("tenant_id");



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_branding_updated_at" BEFORE UPDATE ON "public"."tenant_branding" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_users_updated_at" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_slots_config_updated_at" BEFORE UPDATE ON "public"."time_slots_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_conversions"
    ADD CONSTRAINT "ai_conversions_impression_id_fkey" FOREIGN KEY ("impression_id") REFERENCES "public"."ai_impressions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_experiments"
    ADD CONSTRAINT "ai_experiments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_impressions"
    ADD CONSTRAINT "ai_impressions_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."ai_experiments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_branding"
    ADD CONSTRAINT "tenant_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_slots_config"
    ADD CONSTRAINT "time_slots_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."services"
  WHERE (("services"."id" = "bookings"."service_id") AND ("services"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "bookings"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Platform admins can manage tenants" ON "public"."tenants" TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public can view active services" ON "public"."services" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view time slots" ON "public"."time_slots_config" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Tenant users can access their AI conversions" ON "public"."ai_conversions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."tenant_users" "tu"
     JOIN "public"."ai_experiments" "ae" ON (("ae"."tenant_id" = "tu"."tenant_id")))
     JOIN "public"."ai_impressions" "ai" ON (("ai"."experiment_id" = "ae"."id")))
  WHERE (("ai"."id" = "ai_conversions"."impression_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant users can access their AI experiments" ON "public"."ai_experiments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "ai_experiments"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant users can access their AI impressions" ON "public"."ai_impressions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."tenant_users" "tu"
     JOIN "public"."ai_experiments" "ae" ON (("ae"."tenant_id" = "tu"."tenant_id")))
  WHERE (("ae"."id" = "ai_impressions"."experiment_id") AND ("tu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant users can access their bookings" ON "public"."bookings" TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "bookings"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['admin'::"text", 'staff'::"text"])))))));



CREATE POLICY "Tenant users can access their branding" ON "public"."tenant_branding" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "tenant_branding"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant users can access their own tenant users" ON "public"."tenant_users" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tenant_users_1"
  WHERE (("tenant_users_1"."tenant_id" = "tenant_users_1"."tenant_id") AND ("tenant_users_1"."user_id" = "auth"."uid"()) AND ("tenant_users_1"."role" = ANY (ARRAY['admin'::"text", 'staff'::"text"]))))));



CREATE POLICY "Tenant users can access their services" ON "public"."services" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "services"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Tenant users can access their time slots" ON "public"."time_slots_config" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "time_slots_config"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."ai_conversions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_experiments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_impressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_branding" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_slots_config" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_booking"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_service_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_service_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_service_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_booking_email"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_booking_email"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_booking_email"("p_booking_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_conversions" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_experiments" TO "anon";
GRANT ALL ON TABLE "public"."ai_experiments" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_experiments" TO "service_role";



GRANT ALL ON TABLE "public"."ai_impressions" TO "anon";
GRANT ALL ON TABLE "public"."ai_impressions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_impressions" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_branding" TO "anon";
GRANT ALL ON TABLE "public"."tenant_branding" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_branding" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."time_slots_config" TO "anon";
GRANT ALL ON TABLE "public"."time_slots_config" TO "authenticated";
GRANT ALL ON TABLE "public"."time_slots_config" TO "service_role";









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



































