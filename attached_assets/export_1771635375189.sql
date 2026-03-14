--
-- PostgreSQL database dump
--

\restrict esggmDIDh1gaVGbHMB6lRL9lqsxsC9dnYioFH2i1ILqXeGjuwkUJPJdzBQTHOYk

-- Dumped from database version 16.11 (df20cf9)
-- Dumped by pg_dump version 16.10

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

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(20) DEFAULT 'ADMIN'::character varying,
    profile_image text,
    must_change_password boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_users OWNER TO neondb_owner;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.applications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    applicant_user_id character varying,
    property_id character varying,
    unit_id character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    application_data jsonb,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.applications OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id character varying,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: entities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.entities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) DEFAULT 'llc'::character varying,
    tax_id character varying(50),
    address character varying(500),
    city character varying(100),
    state character varying(50),
    zip character varying(20),
    contact_name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(20),
    stripe_account_id character varying(255),
    stripe_account_status character varying(50) DEFAULT 'pending'::character varying,
    payment_enabled boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.entities OWNER TO neondb_owner;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.expenses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying,
    tenant_id character varying,
    maintenance_request_id character varying,
    date character varying(20) NOT NULL,
    amount character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    notes text,
    file_url character varying(1000),
    file_name character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO neondb_owner;

--
-- Name: files; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    owner_type character varying(50) NOT NULL,
    owner_id character varying NOT NULL,
    filename character varying(255) NOT NULL,
    mime_type character varying(100),
    size integer,
    storage_key character varying(500) NOT NULL,
    tags text[],
    uploaded_by_user_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.files OWNER TO neondb_owner;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rent_charge_id character varying NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoice_items OWNER TO neondb_owner;

--
-- Name: lease_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lease_documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lease_id character varying,
    lease_date character varying(100),
    landlord_name character varying(255),
    tenant_names character varying(500),
    premises_address character varying(500),
    lease_term character varying(100),
    commencing_date character varying(100),
    ending_date character varying(100),
    monthly_rent character varying(50),
    first_month_rent character varying(50),
    last_month_rent character varying(50),
    security_deposit character varying(50),
    late_fee_percent character varying(10) DEFAULT '5'::character varying,
    payment_info text,
    no_pets boolean DEFAULT true,
    no_smoking boolean DEFAULT true,
    landlord_signature text,
    landlord_signed_at timestamp without time zone,
    landlord_signed_by character varying(255),
    tenant_signature text,
    tenant_signed_at timestamp without time zone,
    tenant_signed_by character varying(255),
    tenant_signing_token character varying(100),
    status character varying(30) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    insurance_minimum character varying(50) DEFAULT '$300,000.00'::character varying,
    repair_copay character varying(50) DEFAULT '$250'::character varying,
    ac_filter_checkbox boolean DEFAULT true,
    tenant_phone character varying(50),
    tenant_email character varying(255),
    landlord_phone character varying(50),
    landlord_email character varying(255)
);


ALTER TABLE public.lease_documents OWNER TO neondb_owner;

--
-- Name: leases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.leases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    property_id character varying NOT NULL,
    unit_id character varying,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    deposit_amount numeric(10,2),
    status character varying(20) DEFAULT 'active'::character varying,
    lease_file_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    lease_type character varying(20) DEFAULT 'annual'::character varying,
    late_fee_rate numeric(5,4) DEFAULT 0.0500,
    late_fee_grace_days integer DEFAULT 5,
    last_month_rent numeric(10,2)
);


ALTER TABLE public.leases OWNER TO neondb_owner;

--
-- Name: maintenance_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.maintenance_attachments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying NOT NULL,
    file_id character varying NOT NULL
);


ALTER TABLE public.maintenance_attachments OWNER TO neondb_owner;

--
-- Name: maintenance_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.maintenance_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_user_id character varying,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.maintenance_messages OWNER TO neondb_owner;

--
-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.maintenance_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying,
    property_id character varying,
    unit_id character varying,
    ticket_number character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    property_address character varying(500),
    unit_label character varying(50),
    category character varying(100),
    description text NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    entry_permission boolean DEFAULT false,
    has_pets boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    photos text[]
);


ALTER TABLE public.maintenance_requests OWNER TO neondb_owner;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying,
    property_id character varying,
    property_code character varying(50),
    email character varying(255),
    amount numeric(10,2) NOT NULL,
    method character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying,
    stripe_payment_intent_id character varying(255),
    paid_at timestamp without time zone,
    receipt_url character varying(500),
    description character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    entity_id character varying,
    stripe_transfer_id character varying(255)
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.properties (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(500) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(50) NOT NULL,
    zip character varying(20) NOT NULL,
    type character varying(50) DEFAULT 'house'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    description text,
    image_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    entity_id character varying,
    bedrooms integer DEFAULT 1,
    bathrooms numeric(3,1) DEFAULT '1'::numeric,
    sqft integer,
    nickname character varying(100)
);


ALTER TABLE public.properties OWNER TO neondb_owner;

--
-- Name: public_properties; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.public_properties (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying(50) NOT NULL,
    address character varying(500) NOT NULL,
    unit_number character varying(50),
    bedrooms integer DEFAULT 0,
    bathrooms numeric(3,1) DEFAULT '0'::numeric,
    owner_name character varying(255),
    description text,
    amenities text[],
    images text[],
    is_available boolean DEFAULT true,
    monthly_rent numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.public_properties OWNER TO neondb_owner;

--
-- Name: rent_charges; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rent_charges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lease_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    property_id character varying NOT NULL,
    charge_month character varying(7) NOT NULL,
    base_rent numeric(10,2) NOT NULL,
    late_fee_amount numeric(10,2) DEFAULT '0'::numeric,
    late_fee_applied boolean DEFAULT false,
    late_fee_applied_at timestamp without time zone,
    total_due numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT '0'::numeric,
    status character varying(20) DEFAULT 'open'::character varying,
    due_date timestamp without time zone NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rent_charges OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: tenant_invitations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant_invitations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    token character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_invitations OWNER TO neondb_owner;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenants (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    property_id character varying,
    unit_id character varying,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    status character varying(20) DEFAULT 'inactive'::character varying,
    move_in_date timestamp without time zone,
    move_out_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    rent_amount numeric(10,2),
    security_deposit numeric(10,2),
    last_month_payment numeric(10,2)
);


ALTER TABLE public.tenants OWNER TO neondb_owner;

--
-- Name: units; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.units (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    unit_label character varying(50) NOT NULL,
    bedrooms integer DEFAULT 1,
    bathrooms numeric(3,1) DEFAULT '1'::numeric,
    sqft integer,
    rent_amount numeric(10,2),
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.units OWNER TO neondb_owner;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    role character varying(20) DEFAULT 'TENANT'::character varying,
    phone character varying(20),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    profile_image text
);


ALTER TABLE public.user_profiles OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	2468ee66-5376-469e-9270-fd5aa40f9aa7	112a6625-236f-4f8e-a52a-56658fd4e81d	6	2026-01-29 03:26:21.914434+00
2	b7ad7581-b8f9-473d-8053-8c5c0e5e295c	112a6625-236f-4f8e-a52a-56658fd4e81d	8	2026-02-02 17:13:15.96953+00
3	eedf05f7-b511-48a5-8070-fd3f284d2696	112a6625-236f-4f8e-a52a-56658fd4e81d	1	2026-02-04 22:06:36.306072+00
4	51ecf4d6-438f-4561-ad51-c0045b82dee6	112a6625-236f-4f8e-a52a-56658fd4e81d	1	2026-02-04 22:39:08.926612+00
5	ac8cf597-f7cb-475c-920f-28c1ef670e09	112a6625-236f-4f8e-a52a-56658fd4e81d	1	2026-02-05 20:12:50.530575+00
6	76a4454f-b0fa-4164-b776-7bfb0cb37b7a	112a6625-236f-4f8e-a52a-56658fd4e81d	1	2026-02-05 22:09:28.712346+00
7	a81b60ed-add2-4b4f-9681-86386df9ff12	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-07 01:19:03.7504+00
8	b9e8812e-1a5b-43b7-b93c-529dd721d652	112a6625-236f-4f8e-a52a-56658fd4e81d	5	2026-02-10 00:28:53.30705+00
9	b0978cf0-fa1e-4347-b5ac-1ef267b52e04	112a6625-236f-4f8e-a52a-56658fd4e81d	4	2026-02-11 05:01:55.606753+00
10	f3f75b40-6009-422b-9fe4-a423d4682438	112a6625-236f-4f8e-a52a-56658fd4e81d	6	2026-02-11 05:53:39.018519+00
11	cc6bf83f-f499-448c-8579-1f354f29e66e	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-16 21:08:25.394536+00
12	544360db-ced8-49e3-8e39-4c767d1d2d9c	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-16 23:18:38.319401+00
13	5186dfc5-79a3-4e72-8379-b8a50999ac34	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-17 16:00:46.771071+00
14	f1ae5f28-9433-4286-a3bc-6de053db61a0	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-17 21:34:38.312616+00
15	eb884d18-69d7-461a-b4a0-858ebee26bb5	112a6625-236f-4f8e-a52a-56658fd4e81d	2	2026-02-18 20:03:47.322007+00
16	cecb5f54-7ce2-4f86-8926-d2850ee3af41	112a6625-236f-4f8e-a52a-56658fd4e81d	1	2026-02-18 20:32:10.719674+00
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_users (id, email, password, first_name, last_name, role, profile_image, must_change_password, status, last_login_at, created_at, updated_at) FROM stdin;
9c3ffe01-bcd0-443b-a249-3816aa2c2521	info@atidrealty.com	$2b$10$RRsT98CXNj1G3RDD86hq7.k8lKU1r0HWh.52JXvBCM07h.06i5OZS	Yanni	Sabag	ADMIN	data:image/jpeg;base64,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	f	active	2026-02-20 13:16:10.534	2026-02-05 05:10:11.826877	2026-02-20 13:16:10.534
33fa6fcc-d5ca-4671-aab3-3c40310d20bd	billing@atidrealty.com	$2b$10$REhIQy8OLf3A29AzNOHCEeYin/v4YXDWuWBeAhAYi63bfmeehtJ/O	Marcela	Sabag	MANAGER	data:image/jpeg;base64,/9j/4AAQSkZJRgABAgEASABIAAD/4QOERXhpZgAATU0AKgAAAAgACwEPAAIAAAASAAAAkgEQAAIAAAALAAAApAESAAMAAAABAAEAAAEaAAUAAAABAAAAsAEbAAUAAAABAAAAuAEoAAMAAAABAAIAAAEyAAIAAAAUAAAAwAE7AAIAAAAOAAAA1AITAAMAAAABAAEAAIKYAAIAAAAVAAAA4odpAAQAAAABAAAA+AAAAABOSUtPTiBDT1JQT1JBVElPTgBOSUtPTiBEODUwAAAAAABIAAAAAQAAAEgAAAABMjAxOTowMzowNCAwMDoyOToyMQBOSVNTSU0gSEFST1NIAFNOQVA3MDAwIFBIT1RPR1JBUEhZAAAAKIKaAAUAAAABAAAC3oKdAAUAAAABAAAC5ogiAAMAAAABAAMAAIgnAAMAAAABCJgAAIgwAAMAAAABAAIAAIgyAAQAAAABAAAImJAAAAcAAAAEMDIzMZADAAIAAAAUAAAC7pAEAAIAAAAUAAADApAQAAIAAAAHAAADFpARAAIAAAAHAAADHpASAAIAAAAHAAADJpEBAAcAAAAEAQIDAJECAAUAAAABAAADLpIEAAoAAAABAAADNpIFAAUAAAABAAADPpIHAAMAAAABAAUAAJIIAAMAAAABAAAAAJIJAAMAAAABAA8AAJIKAAUAAAABAAADRpKGAAcAAAAsAAADTpKRAAIAAAADNzAAAJKSAAIAAAADNzAAAKAAAAcAAAAEMDEwMKABAAMAAAABAAEAAKACAAQAAAABAAAgQKADAAQAAAABAAAVgKIXAAMAAAABAAIAAKMAAAcAAAABAwAAAKMBAAcAAAABAQAAAKQBAAMAAAABAAAAAKQCAAMAAAABAAAAAKQDAAMAAAABAAAAAKQFAAMAAAABAEYAAKQGAAMAAAABAAAAAKQHAAMAAAABAAEAAKQIAAMAAAABAAAAAKQJAAMAAAABAAAAAKQKAAMAAAABAAAAAKQMAAMAAAABAAAAAAAAAAAAAAABAAAAUAAAABwAAAAFMjAxOTowMzowMyAxNzo0Mzo1NwAyMDE5OjAzOjAzIDE3OjQzOjU3AC0wNTowMAAALTA1OjAwAAAtMDU6MDAAAAAAAAIAAAABAAAAAAAAAAEAAAADAAAAAQAAAEYAAAABQVNDSUkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/hDDRodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6YXV4PSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wL2F1eC8iIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiBhdXg6TGVuc0luZm89IjI0LzEgNzAvMSAxNC81IDE0LzUiIGF1eDpJbWFnZU51bWJlcj0iNzE2MCIgYXV4OkxlbnNJRD0iLTc4MzM5NTA2ODI5MjgwODE2NTgiIGF1eDpMZW5zPSJBRi1TIFpvb20tTmlra29yIDI0LTcwbW0gZi8yLjhHIEVEIiBhdXg6U2VyaWFsTnVtYmVyPSIzMDUxMTQ5IiB4bXA6TW9kaWZ5RGF0ZT0iMjAxOS0wMy0wNFQwMDoyOToyMS0wNTowMCIgeG1wOlJhdGluZz0iMCIgeG1wOkNyZWF0ZURhdGU9IjIwMTktMDMtMDNUMTc6NDM6NTcuNzAiIHBob3Rvc2hvcDpEYXRlQ3JlYXRlZD0iMjAxOS0wMy0wM1QxNzo0Mzo1Ny43MC0wNTowMCIgeG1wTU06UHJlc2VydmVkRmlsZU5hbWU9IkRTQ183MTQ3LkpQRyI+IDxkYzpyaWdodHM+IDxyZGY6QWx0PiA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPlNOQVA3MDAwIFBIT1RPR1JBUEhZPC9yZGY6bGk+IDwvcmRmOkFsdD4gPC9kYzpyaWdodHM+IDxkYzpjcmVhdG9yPiA8cmRmOlNlcT4gPHJkZjpsaT5OSVNTSU0gSEFST1NIPC9yZGY6bGk+IDwvcmRmOlNlcT4gPC9kYzpjcmVhdG9yPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+AP/AABEIANUBQAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/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	f	active	2026-02-16 21:55:24.348	2026-02-05 16:44:02.747827	2026-02-16 21:55:24.349
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.applications (id, applicant_user_id, property_id, unit_id, status, application_data, submitted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.entities (id, name, type, tax_id, address, city, state, zip, contact_name, contact_email, contact_phone, stripe_account_id, stripe_account_status, payment_enabled, created_at, updated_at) FROM stdin;
bfae676a-6310-4003-bdee-be325725f489	Atid Medical Center	llc							\N	\N	\N	pending	f	2026-02-05 20:11:41.568646	2026-02-10 00:06:27.373
da45dbd5-04ae-4786-aa8f-2ec4c3a8b504	Atid Realty	llc							\N	\N	\N	pending	f	2026-02-05 20:11:26.326676	2026-02-10 00:06:40.63
e4f1d9b1-6672-47e7-9b9b-7695b829d372	Beraz Investment	llc							\N	\N	\N	pending	f	2026-02-05 20:12:17.382595	2026-02-10 00:06:48.618
26dc033b-8d71-411e-80eb-2ac85218ec86	DCPC	llc							\N	\N	\N	pending	f	2026-02-05 14:57:02.059579	2026-02-10 00:06:56.372
3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	Cocomil	llc							\N	\N	\N	pending	f	2026-02-05 14:57:02.18624	2026-02-10 00:07:03.535
c549fe59-23d1-45d5-838d-85f551957912	Factory 26	llc							\N	\N	\N	pending	f	2026-02-05 14:57:02.156636	2026-02-10 00:07:18.51
dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	Mars Real Estate	llc							\N	\N	\N	pending	f	2026-02-05 14:57:01.79285	2026-02-10 00:07:28.503
6c37f1e9-f30b-4c04-b69a-249798bde6b2	Lubren	llc							\N	\N	\N	pending	f	2026-02-05 14:57:02.216078	2026-02-10 00:07:41.807
a9de61aa-42e3-409d-b183-baea5b237b99	Prosperity ARN	llc							\N	\N	\N	pending	f	2026-02-06 00:15:17.104676	2026-02-10 00:08:05.945
8b7cb4fe-2542-4cd8-abbc-28feeba55822	Niritb	llc							\N	\N	\N	pending	f	2026-02-05 14:57:01.822678	2026-02-10 00:08:18.016
bd5001c1-8633-41ed-a1cd-9089e096012d	Yugolo	llc							\N	\N	\N	pending	f	2026-02-05 14:57:01.881801	2026-02-10 00:08:30.44
98ec115e-e98b-4f0e-af4e-e9bf1c2e18dc	Maximiliano	individual						Maximiliano Belgrano	\N	\N	\N	pending	f	2026-02-05 20:12:45.318143	2026-02-19 02:34:59.67
dd2c3274-b04f-41c0-bac8-8ca4d0e725a2	Asaf	llc						Asaf Hasson                         	\N	\N	\N	pending	f	2026-02-05 14:57:01.738399	2026-02-19 02:36:13.566
3987a416-fc35-416c-b086-36a5f138a8d5	Marcela Sabag	individual							\N	\N	\N	pending	f	2026-02-05 14:57:02.001163	2026-02-05 20:58:36.489
35a4ff06-18a0-484a-8da8-b648c06f66b0	Martin Piliponsky	individual							\N	\N	\N	pending	f	2026-02-05 14:57:02.123722	2026-02-05 20:58:50.589
959b423a-2b09-4acb-8087-de75ef5522f4	Asher Ron	individual							\N	\N	\N	pending	f	2026-02-05 14:57:02.030436	2026-02-05 22:00:39.277
efec181c-4168-457a-9ba3-26b23ddcc95d	Elad Goldstein	individual							\N	\N	\N	pending	f	2026-02-05 14:57:01.942639	2026-02-05 22:00:52.575
4032f9e7-ad7d-4f76-8bd2-7f356339ef2e	Eliyahu Sabag	individual							\N	\N	\N	pending	f	2026-02-05 14:57:02.093681	2026-02-05 22:01:02.063
9f3e0261-305c-422e-87a9-1389a22cb167	Moti Levy	individual							\N	\N	\N	pending	f	2026-02-05 14:57:01.911847	2026-02-05 22:01:14.835
9e442be2-ead7-40ea-8c7b-52d6599d3303	Yaakov Sayag	individual							\N	\N	\N	pending	f	2026-02-05 14:57:01.852421	2026-02-05 22:01:28.781
3bf1eda2-a356-4819-9b79-5137bcd6582b	Yehoshua Mizrahi	individual							\N	\N	\N	pending	f	2026-02-05 14:57:01.971597	2026-02-05 22:01:38.022
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expenses (id, property_id, tenant_id, maintenance_request_id, date, amount, category, description, notes, file_url, file_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.files (id, owner_type, owner_id, filename, mime_type, size, storage_key, tags, uploaded_by_user_id, created_at) FROM stdin;
ea598210-9010-446c-b82d-5038f0081416	general	admin	3-Day Notice.pdf	application/pdf	125035	documents/1771434006088_3-Day Notice.pdf	{}	\N	2026-02-18 17:00:06.105691
b985c67b-1213-4a45-b40d-81eefd4c5872	general	admin	Addendum To Lease.pdf	application/pdf	35768	documents/1771434013155_Addendum To Lease.pdf	{}	\N	2026-02-18 17:00:13.171678
3720e7aa-3969-414f-8c0a-968c8db1d7dd	general	admin	Asaf Invoice 2026.pdf	application/pdf	62941	documents/1771434020460_Asaf Invoice 2026.pdf	{}	\N	2026-02-18 17:00:20.476486
aa7df209-450c-4e13-9d1d-0a47eee70c27	general	admin	Asaf LLC Master Lease 2026.pdf	application/pdf	249756	documents/1771434026752_Asaf LLC Master Lease 2026.pdf	{}	\N	2026-02-18 17:00:26.769733
c5ac0775-1487-4067-961e-819d627c7ceb	general	admin	Mars Invoice 2026.pdf	application/pdf	54266	documents/1771434036809_Mars Invoice 2026.pdf	{}	\N	2026-02-18 17:00:36.828016
2dcc452a-b6cb-4fdf-a1bc-edd102abd088	general	admin	Mars Real Estate LLC Master Lease 2026.pdf	application/pdf	248455	documents/1771434044441_Mars Real Estate LLC Master Lease 2026.pdf	{}	\N	2026-02-18 17:00:44.457837
a7efdd6f-eea2-4444-b0c8-8f783336b72e	general	admin	Master Commercial Lease 7351 W Oakland 2026.pdf	application/pdf	344232	documents/1771434049768_Master Commercial Lease 7351 W Oakland 2026.pdf	{}	\N	2026-02-18 17:00:49.784511
2f42fc68-a908-4ca5-879a-1753b44476a1	general	admin	Master Lease Atid Realty LLC 2026.pdf	application/pdf	125367	documents/1771434055326_Master Lease Atid Realty LLC 2026.pdf	{}	\N	2026-02-18 17:00:55.343103
1d0e0529-dc7b-4f86-b3ca-b7705913f70a	lease	a807700e-9e65-41f4-88cf-3a1f442e4843	Signed Lease - Joseph Raussell - 455 S. Pine Island Rd. Apt 409C, Plantation, FL 33324.html	text/html	5854	signed-leases/signed_lease_a807700e-9e65-41f4-88cf-3a1f442e4843_1771368007766.html	\N	\N	2026-02-17 22:40:07.781759
90ad7e81-3056-454c-9324-dac87fea8462	lease	eb38211f-0970-42c7-ab44-9edee1d2d87d	Eliyahu 1800-1304 Liliana Churo & Peterson Pierre 2025.pdf	application/pdf	241935	documents/1771427597110_Eliyahu 1800-1304 Liliana Churo & Peterson Pierre 2025.pdf	{}	\N	2026-02-18 15:13:17.129789
f8d90c78-2ada-4429-94de-1b2191cf1897	lease	650334fd-aa3d-40cf-bedb-191e670f1e0e	Factory 7027 Harold Barranco & Jameele 2025.pdf	application/pdf	4786116	documents/1771433955008_Factory 7027 Harold Barranco & Jameele 2025.pdf	{}	\N	2026-02-18 16:59:15.028578
afa20b66-b494-4312-8122-752ffe621221	lease	6da5d7db-41fc-46d7-ae8d-7dd54453724e	Factory 7300 Paul 2025.pdf	application/pdf	9679176	documents/1771434057249_Factory 7300 Paul 2025.pdf	{}	\N	2026-02-18 17:00:57.271849
a7e63301-e403-4204-9e7b-b0286fd5f01e	general	admin	Release Form.pdf	application/pdf	42872	documents/1771434060465_Release Form.pdf	{}	\N	2026-02-18 17:01:00.48081
190fba68-fcf4-41c1-b5b4-e3f647cbea6a	general	admin	Security Deposit Legal Letter.pdf	application/pdf	149889	documents/1771434065543_Security Deposit Legal Letter.pdf	{}	\N	2026-02-18 17:01:05.559536
95b25e9b-4b93-4d71-a4e2-699a5d915bd1	lease	6073b604-86b5-440e-be97-fc5355ad2eba	Factory 721-116 Luis Mejias 2025.pdf	application/pdf	282211	documents/1771434175291_Factory 721-116 Luis Mejias 2025.pdf	{}	\N	2026-02-18 17:02:55.307825
c766ffa2-579b-4d6b-85f3-729eaa9ce743	lease	5dbe1e69-a6e7-4152-9c8b-0201a00bb7cf	Factory 26 4169 Janick 2026.pdf	application/pdf	357940	documents/1771434241064_Factory 26 4169 Janick 2026.pdf	{}	\N	2026-02-18 17:04:01.079542
d05f2d9c-fdc5-4777-b836-7a37b4ea1e5f	lease	e6cbcc99-b084-4f97-aecd-206281a27e88	Factory 3634 Jose Gnecco & Giorgina Ortega lopez 2025.pdf	application/pdf	377146	documents/1771434426591_Factory 3634 Jose Gnecco & Giorgina Ortega lopez 2025.pdf	{}	\N	2026-02-18 17:07:06.607479
c91859dc-213d-4a29-b13d-3b849c64d4f9	lease	cdcf6eae-8d79-4d61-8ff3-0eeb4edaada4	Factory 406-308 Terry 2025.pdf	application/pdf	317284	documents/1771434585570_Factory 406-308 Terry 2025.pdf	{}	\N	2026-02-18 17:09:45.586813
da485951-a026-46d1-93bc-c7a70f9a8597	lease	4dd2e94e-35df-4e69-a355-d1b91a499cad	Factory 406-509 Katie 2025.pdf	application/pdf	393846	documents/1771434644388_Factory 406-509 Katie 2025.pdf	{}	\N	2026-02-18 17:10:44.404511
b233eb6d-a81b-44ae-8e89-af8eeb5795e3	lease	ab57b285-385e-459b-b3dd-4015e42da4d1	Factory 3262 Jah 2025.pdf	application/pdf	351336	documents/1771434704983_Factory 3262 Jah 2025.pdf	{}	\N	2026-02-18 17:11:44.999808
887a80be-0b7f-4ded-b95b-9125762a3712	lease	2f60ba43-9926-4c70-bff9-0d205c483902	DCPC 1800-1205 Daniel Figueroa 2025.pdf	application/pdf	385702	documents/1771435284839_DCPC 1800-1205 Daniel Figueroa 2025.pdf	{}	\N	2026-02-18 17:21:24.855132
54c45820-3176-45b5-9c57-4bcc9095e6a3	lease	710a0cf7-5008-4690-9b82-2ef6170a37f5	DCPC 1800-1401 Fidel Jolly 2025.pdf	application/pdf	354093	documents/1771435344048_DCPC 1800-1401 Fidel Jolly 2025.pdf	{}	\N	2026-02-18 17:22:24.064067
4f84ea4c-c706-414f-ab94-6f982d3c607f	lease	e98a262a-7c0f-40e6-bf7e-56c920d29f71	DCPC 1820-3211 Luc Atis 2026.pdf	application/pdf	596137	documents/1771435409484_DCPC 1820-3211 Luc Atis 2026.pdf	{}	\N	2026-02-18 17:23:29.500617
0e998641-cc2a-435a-a0f0-59519e22df89	lease	b2ca8462-a53e-4d11-99b1-69af254515f8	DCPC 1820-3216 Adams Tilus 2025.pdf	application/pdf	365509	documents/1771435484516_DCPC 1820-3216 Adams Tilus 2025.pdf	{}	\N	2026-02-18 17:24:44.540621
550360ae-9020-4168-8b41-ed2a7945a7b8	lease	ce6d33c9-a4e9-43d2-8c2f-b0cd819b3e48	DCPC 1820-3200 Antonio 2025.pdf	application/pdf	789451	documents/1771435621372_DCPC 1820-3200 Antonio 2025.pdf	{}	\N	2026-02-18 17:27:01.388075
4e4b9f5a-9c92-4c85-84f1-ecacbcb44c3b	lease	f0bc1797-34f3-4dec-befc-a00948f68001	DCPC 1830-4215 Anthony Darden 2025.pdf	application/pdf	138378	documents/1771435871730_DCPC 1830-4215 Anthony Darden 2025.pdf	{}	\N	2026-02-18 17:31:11.746348
9e4940ca-f021-418f-8794-837d742c9c79	lease	97613182-1000-4a55-bb31-e22d5b91c0f6	DCPC 7900-206 Georgia 2025 innago.pdf	application/pdf	387172	documents/1771435977334_DCPC 7900-206 Georgia 2025 innago.pdf	{}	\N	2026-02-18 17:32:57.351227
46bbbd9e-aa38-4f40-aa91-66ee88194bd3	lease	b1dcaa8a-80ec-4d38-97c7-f2a6ebf79814	DCPC 8060-202 Donnell 2026.pdf	application/pdf	359110	documents/1771436054294_DCPC 8060-202 Donnell 2026.pdf	{}	\N	2026-02-18 17:34:14.310893
f9d9bf01-4279-4127-838f-25908e2c9308	lease	e09441b4-686b-4536-a094-c1847ff8c88c	DCPC 7800-102 Aura 2026.pdf	application/pdf	6131640	documents/1771436102599_DCPC 7800-102 Aura 2026.pdf	{}	\N	2026-02-18 17:35:02.617307
6b0a7533-0c81-40b4-bf7e-740864b12b14	lease	34914b15-e564-44f4-8c35-f36a8ffafc71	Signed Lease - Yanni Sabag - 1640 SW 40th Terrace # 1, Fort Lauderdale, FL 33317.html	text/html	3796	signed-leases/signed_lease_34914b15-e564-44f4-8c35-f36a8ffafc71_1771437515075.html	\N	\N	2026-02-18 17:58:35.09222
9fbe1f31-aaed-4e19-aaa9-05c1cbb7ffd2	lease	a807700e-9e65-41f4-88cf-3a1f442e4843	Signed Lease - Joseph Raussell - 455 S. Pine Island Rd. Apt 409C, Plantation, FL 33324.html	text/html	3810	signed-leases/signed_lease_a807700e-9e65-41f4-88cf-3a1f442e4843_1771459528641.html	\N	\N	2026-02-19 00:05:28.658609
5e6d55ce-65a9-4a77-afc3-194941e9d89a	lease	8ddbf2e8-545a-433d-bdb8-1855066368a2	Marcela 7801-209 Raymond 2026.pdf	application/pdf	378915	documents/1771506724930_Marcela 7801-209 Raymond 2026.pdf	{}	\N	2026-02-19 13:12:04.952013
537605fc-26a5-44dc-b063-e84f56c4476c	lease	b42e4e08-a6ee-434b-a7f0-f0124accf161	Maximiliano 10050 Roger Vilca 2025.pdf	application/pdf	478506	documents/1771506810816_Maximiliano 10050 Roger Vilca 2025.pdf	{}	\N	2026-02-19 13:13:30.833928
b4297629-398e-4cb9-a729-3f8028f1c11e	lease	43319232-c196-4182-8a50-92fc03ee5fed	Cocomil 711-102  Barbara 20251.pdf	application/pdf	614612	documents/1771506942847_Cocomil 711-102  Barbara 20251.pdf	{}	\N	2026-02-19 13:15:42.864532
93328031-6176-48e0-925b-43cc98117dac	lease	c88fc26e-2885-4053-8a0d-c39f6d7cf207	Cocomil 711-403 Mayanna 2025.pdf	application/pdf	2713447	documents/1771507000494_Cocomil 711-403 Mayanna 2025.pdf	{}	\N	2026-02-19 13:16:40.513635
f00864cf-9a66-48de-92a9-f0f8b407f79a	lease	9c3cc3be-0354-4fb9-9724-b90f6d752ab5	Cocomil 721-307 Mario 2026.pdf	application/pdf	351390	documents/1771507149772_Cocomil 721-307 Mario 2026.pdf	{}	\N	2026-02-19 13:19:09.788985
47fc661a-1c1e-4aa8-b0bf-29a69db81e6e	lease	ba307b62-df7f-46e8-b18d-6ab4047552d2	Cocomil 721-402 Nathaniel 2026.pdf	application/pdf	375248	documents/1771507221488_Cocomil 721-402 Nathaniel 2026.pdf	{}	\N	2026-02-19 13:20:21.506657
aac67fcd-642b-42c5-b010-e6400b71706a	lease	8ebb7b20-e804-4890-8cb1-472c9a039f90	Cocomil 701-102 Mr Chong 2026.pdf	application/pdf	1243328	documents/1771507305202_Cocomil 701-102 Mr Chong 2026.pdf	{}	\N	2026-02-19 13:21:45.220377
67232858-d5a8-4bb1-8a68-e945caccfa17	general	admin	Asaf LLC Master Lease 2026.doc	application/msword	169472	documents/1771553999363_Asaf LLC Master Lease 2026.doc	{}	\N	2026-02-20 02:19:59.384334
ad4816bc-7e6f-42e0-a0e7-e18d1bc27100	general	admin	Mars Real Estate LLC Master Lease 2026.doc	application/msword	170496	documents/1771554005898_Mars Real Estate LLC Master Lease 2026.doc	{}	\N	2026-02-20 02:20:05.919491
d433e93d-f199-4436-af07-12210ea7fd8a	general	admin	Security Deposit Legal Letter.doc	application/msword	31744	documents/1771554011795_Security Deposit Legal Letter.doc	{}	\N	2026-02-20 02:20:11.811025
093d5e5b-e1c9-4ac0-a3de-791933f34821	general	admin	Addendum To Lease.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	20761	documents/1771554017975_Addendum To Lease.docx	{}	\N	2026-02-20 02:20:17.991523
644a8692-53dc-43d1-9cb3-d57351ab32ca	general	admin	Asaf Invoice 2026.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	13879	documents/1771554025578_Asaf Invoice 2026.docx	{}	\N	2026-02-20 02:20:25.594871
7951476d-59dd-448d-ac70-414b19a0614a	general	admin	Mars Invoice 2026.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	13890	documents/1771554030393_Mars Invoice 2026.docx	{}	\N	2026-02-20 02:20:30.409499
62bfc693-c121-47a1-bff6-4a2a79164d50	general	admin	Master Commercial Lease 7351 W Oakland 2026.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	43239	documents/1771554036844_Master Commercial Lease 7351 W Oakland 2026.docx	{}	\N	2026-02-20 02:20:36.86108
cb9427b2-7eed-4926-9086-201496dd4833	general	admin	Master Lease Atid Realty LLC 2026.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	48855	documents/1771554042869_Master Lease Atid Realty LLC 2026.docx	{}	\N	2026-02-20 02:20:42.889804
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_items (id, rent_charge_id, description, amount, created_at) FROM stdin;
c7b686b7-1566-4eba-ad41-4512e3c1559a	9862312b-92e3-422a-b9b6-a493ddf3b319	Late Fee	93.75	2026-02-19 04:08:07.562109
\.


--
-- Data for Name: lease_documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lease_documents (id, lease_id, lease_date, landlord_name, tenant_names, premises_address, lease_term, commencing_date, ending_date, monthly_rent, first_month_rent, last_month_rent, security_deposit, late_fee_percent, payment_info, no_pets, no_smoking, landlord_signature, landlord_signed_at, landlord_signed_by, tenant_signature, tenant_signed_at, tenant_signed_by, tenant_signing_token, status, created_at, updated_at, insurance_minimum, repair_copay, ac_filter_checkbox, tenant_phone, tenant_email, landlord_phone, landlord_email) FROM stdin;
4b5b6fca-25f4-4a55-a339-61bbee81deae	\N		Atid Realty LLC			1 year							5	\N	t	t	\N	\N	\N	\N	\N	\N	619a87c99f275b5609f4c4bd84f2c4c4da5211df9769e6f8165aed659d29022b	draft	2026-02-11 16:03:12.431033	2026-02-11 16:03:12.431033	$300,000.00	$250	t			\N	\N
24a80e17-378f-467f-bb3a-2e78b46b639a	\N	February 11th, 2026	Cocomil LLC	Hillary Erica Davis-Campbell and Mayanna Amanda Campbell 	711 N. Pine Island Rd Apt 403 plantation, FL 33324	1 year	March 1st, 2026	February 28th, 2027	$1,900.00	$1,900.00	$1,850.00	$1,850.00	5	\N	t	t	\N	\N	\N	\N	\N	\N	ea30bf31efa9afaa6d795987e2b79c66de4a05d1fec8280651f8fc28f91435be	draft	2026-02-11 19:05:22.6667	2026-02-11 19:05:38.255	$300,000.00	$250	t	954.681.2360. 954.268.0092	mymycampbell19@gmail.com	\N	\N
e84de5d6-afa0-4974-b198-9151b808b393	c88fc26e-2885-4053-8a0d-c39f6d7cf207	February 17, 2026	Cocomil LLC	Myanna Campbell	711 N. Pine Island Rd. Apt 403, Plantation, FL 33324	1 year	March 1, 2026	February 28, 2027	$1,900.00	$1,900.00	$1,850.00	$1,850.00	5	\N	t	t	Yanni Sabag	2026-02-18 14:46:22.327	Landlord	\N	\N	\N	5ebbaa3933f8b8ad2917003f04fabd798bc8c4a69657e0cb1f6c8354b1b0619b	partially_signed	2026-02-18 02:43:23.320401	2026-02-18 14:46:27.212	$300,000.00	$250	t	954.268.0092	mymycampbell19@gmail.com	954-338-3885	info@atidrealty.com
d6474f7c-2ae9-4fa7-a4a3-573c7b8b2d38	\N		Atid Realty LLC			1 year							5	\N	t	t	\N	\N	\N	\N	\N	\N	517cf7cbabf2c0aedc9af9562c9b51e4e68c692140401853aa9936a40b4a5071	draft	2026-02-17 03:45:39.335661	2026-02-17 03:45:39.335661	$300,000.00	$250	t			\N	\N
3b427cba-bfa2-4ee5-a200-8523f61b389c	866bcf7b-087f-4a3f-9746-60df4073bbe6	February 17, 2026	Atid Realty LLC	Shaquila Ford	8000 Fairview Dr Apt # 205, Tamarac, FL 33321	1 year	March 1, 2026	February 28, 2027	$1,700.00	$1,700.00	$1,700.00	$1,700.00	5	\N	t	t	Yanni Sabag	2026-02-18 02:34:07.386	Landlord	\N	\N	\N	6ab5942c16157298e49cee0eadc06c25618edba46c914ecea3f410048518efe2	partially_signed	2026-02-18 01:32:49.072056	2026-02-18 02:35:25.597	$300,000.00	$250	t	954.439.9442	shaquilaford0@gmail.com	954-338-3885	info@atidrealty.com
40409ed4-d40a-474f-a130-16f54a1fedf4	8672f231-0a7e-49cc-bde1-62eb48183e29	February 19, 2026	Beraz Investment LLC	Stephanie Thelemaque	1640 SW 40th Terrace # 1, Fort Lauderdale, FL 33317	1 year	March 1, 2026	February 28, 2027	$1,800.00	$1,800.00	$1,800.00	$1,800.00	5	\N	t	t	\N	\N	\N	Stephanie Thelemaque	2026-02-20 06:07:34.18	Stephanie Thelemaque	c24762acdb481a4e1569b95bf2902849a5fb89b6743968c8b05cd750f59a4eca	partially_signed	2026-02-19 22:42:13.725532	2026-02-20 06:07:34.18	$300,000.00	$250	t	239.234.9063	Stephaniethelemaque4@gmail.com	954-338-3885	info@atidrealty.com
f48517e6-1dda-4e3a-8e0c-ff5895c314eb	519e532b-5c82-4400-bb7e-306aaf1fae41	February 18, 2026	Prosperity ARN LLC	Olga Martinez	483 N. Pine Island Rd Apt 202C, Plantation, FL 33324	Annual	March 1, 2026	February 28, 2027	$1,875.00	$1,875.00	$1,200.00	$1,200.00	5	\N	t	t	Yanni Sabag	2026-02-18 15:48:21.294	Landlord	\N	\N	\N	273aa1d2be3f315c6e54855817ec8321d4cbd857e059026d0b78d60d74b956d3	partially_signed	2026-02-18 15:47:28.331357	2026-02-18 15:48:27.19	$300,000.00	$250	t	954.661.3854	olga.velasquez1@gmail.com	954-338-3885	info@atidrealty.com
87e06e52-a9be-475d-993f-b637d3447a18	eab56592-bd8e-441e-a946-20c189ab9d9b	February 17, 2026	Factory 26 LLC	Catia Fenelus	3100 N. Pine Island Rd. Apt 202, Sunrise, FL 33351	Annual	March 1, 2026	February 28, 2027	$1,850.00	$1,850.00	$1450.00	$1450.00	5	\N	t	t	Yanni Sabag	2026-02-18 14:45:37.27	Landlord	\N	\N	\N	38f7dc0d181634b381fb979abf81096c92a8c0ed9d4b7881ee98961630d64654	partially_signed	2026-02-18 02:48:04.662173	2026-02-18 14:45:45.446	$300,000.00	$250	t	954.702.7919	catusca@yahoo.com	954-338-3885	info@atidrealty.com
591f3e2e-5f1f-4830-9bb1-e9a5bbb02c45	a807700e-9e65-41f4-88cf-3a1f442e4843	February 17, 2026	Eliyahu Sabag	Joseph Raussell	455 S. Pine Island Rd. Apt 409C, Plantation, FL 33324	1 year	March 1, 2026	February 28, 2027	$1,925.00	$1,925.00	$1,900.00	$1,900.00	5	\N	t	t	Yanni Sabag	2026-02-18 14:46:56.221	Landlord	Joseph Roussell	2026-02-19 00:05:28.608	Joseph Roussell	b3c6a4cbbef8dd1f7958b6757ecaa10b887185034c4980367939f4b1b61862d6	fully_signed	2026-02-18 02:44:28.134745	2026-02-19 00:05:28.608	$300,000.00	$250	t	954.670.3603	rossell.joseph@gmail.com	954-338-3885	info@atidrealty.com
22d406db-d536-48bf-bcf7-d80f109347eb	e98a262a-7c0f-40e6-bf7e-56c920d29f71	February 18, 2026	DCPC LLC	Luc & Kimberly Atis	1820 SW 81st Ave. Apt 3211, North Lauderdale, FL 33068	1 year	March 1, 2026	February 28, 2027	$1,550.00	$1,550.00	$1,500.00	$1,500.00	5	\N	t	t	\N	\N	\N	\N	\N	\N	7e75f26a19497650aa2c4ccbac893a29faa170c36acafae2c0260eacad798538	draft	2026-02-19 02:42:44.382546	2026-02-19 02:42:46.35	$300,000.00	$250	t	754.245.9328	atislouco8@gmail.com	954-338-3885	info@atidrealty.com
\.


--
-- Data for Name: leases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.leases (id, tenant_id, property_id, unit_id, start_date, end_date, rent_amount, deposit_amount, status, lease_file_id, created_at, lease_type, late_fee_rate, late_fee_grace_days, last_month_rent) FROM stdin;
17a3f2f6-44c2-4189-9de2-e745c3dd7c5c	e407f7e6-c8de-4e44-9467-9ffae0074195	89b8685b-d8e4-43fa-9739-913898d1322e	\N	2025-01-01 00:00:00	2026-12-31 00:00:00	2000.00	0.00	active	\N	2026-02-05 15:25:46.287257	annual	0.0500	5	\N
ac82b0e5-0ceb-435d-a2fe-bc0f633df32e	ef9e1cf1-5bc5-41e6-bbd5-5277650ccc14	51faa6a3-a75f-4c02-ab1a-24a25c42917d	\N	2025-04-01 00:00:00	2028-03-31 00:00:00	6270.83	0.00	active	\N	2026-02-05 15:25:45.641286	annual	0.0500	5	\N
cdcf6eae-8d79-4d61-8ff3-0eeb4edaada4	676223ba-a96d-419f-84c0-70e53399b9b9	abe74a99-2bb2-495a-9602-bbefaa9d30a0	\N	2025-07-01 00:00:00	2026-06-30 00:00:00	1600.00	975.00	active	\N	2026-02-05 15:25:46.405782	annual	0.0500	5	\N
ce6d33c9-a4e9-43d2-8c2f-b0cd819b3e48	387fdafb-4fc9-4628-b3c4-8e01cdbbbc4c	be8fe484-b83e-4a28-9563-a3ef22d34862	\N	2024-07-01 00:00:00	2026-06-30 00:00:00	1650.00	1050.00	active	\N	2026-02-05 15:25:46.665144	annual	0.0500	5	\N
4dd2e94e-35df-4e69-a355-d1b91a499cad	cc87fbd3-42ae-42b8-a0bf-393ad8d98b08	42cb0b25-7347-4d58-8194-298763c49d33	\N	2025-07-01 00:00:00	2026-06-30 00:00:00	1650.00	1100.00	active	\N	2026-02-05 15:25:46.376738	annual	0.0500	5	\N
e0eecb68-0eb3-49f5-9afb-e222a43fbf90	775fda8a-0a5c-4265-b129-561208527fa6	8f1d97be-3e81-41cf-9fc0-8919857ff31d	\N	2022-01-01 00:00:00	2026-12-31 00:00:00	2830.18	0.00	active	\N	2026-02-05 15:25:45.555249	annual	0.0500	5	\N
27415c42-877f-4b05-b0ad-221a9cd2fc40	9a061ce9-a28c-4c65-acfc-13afbae8f1b2	8a948e9e-08c6-441b-9088-7d07c453b370	\N	2022-04-01 00:00:00	2028-03-31 00:00:00	17775.00	0.00	active	\N	2026-02-05 15:25:45.75669	annual	0.0500	5	\N
d367f74c-66c8-42ba-b363-5b0ce0405b40	e601757e-e0bf-4f9d-98eb-aab1e07d7b84	60ea4864-efb7-43eb-bf7b-89289ae0a5ef	\N	2024-06-01 00:00:00	2026-05-31 00:00:00	111296.80	0.00	active	\N	2026-02-05 15:25:45.487732	annual	0.0500	5	\N
091557a4-e4e2-408d-ad0d-a9b78a2acd0d	4af12acd-6b9d-4594-bc38-e8f9ad363ff5	a676d548-44b7-4650-9d48-f2018d70ace2	\N	2025-04-01 00:00:00	2028-03-31 00:00:00	4940.83	0.00	active	\N	2026-02-05 15:25:45.5838	annual	0.0500	5	\N
2abe3e09-f69f-4413-af11-eb0a67d85659	95fda6d0-8705-4bad-aea8-16f89386264d	4366c6a4-72a1-4252-b6a5-64a33fdd170c	\N	2022-04-01 00:00:00	2027-03-31 00:00:00	18344.02	0.00	active	\N	2026-02-05 15:25:45.612345	annual	0.0500	5	\N
036ee103-d1ba-4bc5-8a5c-f0eeea5c58eb	05562977-ba94-4ab0-95b5-6f8f079d26c5	269da26f-21d6-4b5f-88fb-064a6ee484d8	\N	2023-04-01 00:00:00	2026-03-31 00:00:00	3700.00	0.00	active	\N	2026-02-05 15:25:45.670401	annual	0.0500	5	\N
65febff4-3847-42e8-a707-2015c9e87f5b	156a0479-b7ec-4409-83cd-df2cfcd42fd8	969baf09-8994-41fb-afde-ac67fd532fa6	\N	2024-09-01 00:00:00	2027-11-30 00:00:00	3427.74	0.00	active	\N	2026-02-05 15:25:45.786092	annual	0.0500	5	\N
3d5a0477-e964-42eb-b835-2e95f2d7e3c6	19d74eec-4607-4e74-a8ff-f110a0e303f3	67199d1c-bff2-4b61-b9d5-e8c705d7a6be	\N	2024-08-01 00:00:00	2027-07-31 00:00:00	3379.06	0.00	active	\N	2026-02-05 15:25:45.82003	annual	0.0500	5	\N
e3afb1e1-60d0-4a88-b25b-14e6128c6712	f4ad0dde-2f80-4fc6-a72a-52f8c459aeed	42c6c99f-893a-4b5c-8b3b-0a565f66a82d	\N	2024-10-01 00:00:00	2027-06-30 00:00:00	6194.60	0.00	active	\N	2026-02-05 15:25:45.849725	annual	0.0500	5	\N
b2ca8462-a53e-4d11-99b1-69af254515f8	7f3cf108-79c5-41c5-a8d8-1cdcfe7b9192	b2d5c003-a7d9-48d8-92b5-140a63e41fc9	\N	2025-09-01 00:00:00	2026-08-31 00:00:00	1875.00	1850.00	active	\N	2026-02-05 15:25:46.606578	annual	0.0500	5	\N
8ddbf2e8-545a-433d-bdb8-1855066368a2	d5789aeb-3df6-413d-be54-f85190e324c2	e8bac227-c8ff-42fe-adb4-c131e85bf61d	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	1875.00	1700.00	active	\N	2026-02-05 15:25:46.520531	annual	0.0500	5	\N
fd435234-8554-4401-abc6-b7b81154b3f0	b5b430a2-cf8e-417b-a758-56b8e05488ca	bb4dbf04-dd29-4cf2-9c72-310b3388698f	\N	2024-10-01 00:00:00	2026-09-30 00:00:00	3000.00	0.00	active	\N	2026-02-05 15:25:46.051796	annual	0.0500	5	\N
97613182-1000-4a55-bb31-e22d5b91c0f6	47346ea8-fa52-4ba9-a9b5-ccc77972f869	455195c3-bd74-418f-b604-b8973e63888d	\N	2024-09-20 00:00:00	2026-08-31 00:00:00	1850.00	1250.00	active	\N	2026-02-05 15:25:45.878829	annual	0.0500	5	\N
e6cbcc99-b084-4f97-aecd-206281a27e88	02715854-9903-4614-83bd-ababe94e0bda	72d41b3a-57da-401e-b935-e4df326e908d	\N	2025-08-01 00:00:00	2026-07-31 00:00:00	2300.00	2300.00	active	\N	2026-02-05 15:25:46.434157	annual	0.0500	5	\N
79577654-1eab-49ff-ab6c-0c35ec850af0	c20b400c-982f-41e4-8a3f-e03a540f6e44	14768530-05db-4656-b419-8ca2a1c664d9	\N	2025-02-01 00:00:00	2026-02-28 00:00:00	1800.00	0.00	active	\N	2026-02-05 15:25:46.197135	annual	0.0500	5	\N
cc7bac68-e28d-4ebe-8007-cd7bd7ea4587	92351ec6-bd88-4325-bf78-40b792f7d86a	cc7c14fc-3218-493c-bd93-3924788d0bfa	\N	2023-05-01 00:00:00	2026-03-31 00:00:00	1850.00	0.00	active	\N	2026-02-05 15:25:46.22743	m2m	0.0500	5	\N
3aac5884-9026-4278-8808-8f5407c424e1	418c14d6-8945-48f4-ad32-50c3e8f537e1	7b30c68a-d317-4ee2-97aa-f4bbf42f9b12	\N	2024-09-01 00:00:00	2026-08-31 00:00:00	2150.00	0.00	active	\N	2026-02-05 15:25:46.316631	annual	0.0500	5	\N
7b1664ae-53ad-4cf5-9f2b-f700edd0c128	6d28935a-c2c0-4b11-8aa2-98aaf948f15b	183262a6-dfef-45f2-b103-cdf3cb232877	\N	2025-02-01 00:00:00	2027-01-31 00:00:00	1875.00	0.00	active	\N	2026-02-05 15:25:46.346139	annual	0.0500	5	\N
ab57b285-385e-459b-b3dd-4015e42da4d1	4c7acff0-69a8-4492-b9ce-83e88037b125	2ad6b6cc-0ddd-411b-b04d-f3b443faef79	\N	2025-04-01 00:00:00	2026-03-31 00:00:00	1850.00	1800.00	active	\N	2026-02-05 15:25:46.25777	annual	0.0500	5	\N
5dbe1e69-a6e7-4152-9c8b-0201a00bb7cf	bf180b48-07c9-4d0f-beba-acab894d5a66	d91bcd2a-01e1-48c8-94bf-4f4070c108f6	\N	2026-02-01 00:00:00	2027-01-31 00:00:00	1850.00	1750.00	active	\N	2026-02-05 15:25:46.080043	annual	0.0500	5	\N
e09441b4-686b-4536-a094-c1847ff8c88c	e98f0623-49a8-4eac-a0e4-330c92900ff2	5eb0172c-2bd3-497a-8aa0-eab3e6151aa8	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	1850.00	1800.00	active	\N	2026-02-05 15:25:46.548982	annual	0.0500	5	\N
292eecab-0fef-4c8f-b844-c147c9ce3dc1	29be5c7c-205b-4851-a829-1108fcd5c3a4	fc8496d2-6418-452c-b00f-933f0e6ac1a9	\N	2024-06-01 00:00:00	2026-05-31 00:00:00	1850.00	0.00	active	\N	2026-02-05 15:25:46.491647	annual	0.0500	5	\N
eab56592-bd8e-441e-a946-20c189ab9d9b	c5553482-066e-4931-bdfc-19e33ca0c712	4d0aa3df-a596-4365-90dd-daa354f7e54c	\N	2023-05-31 00:00:00	2026-02-28 00:00:00	1800.00	1450.00	active	\N	2026-02-05 15:25:46.136699	annual	0.0500	5	\N
e98a262a-7c0f-40e6-bf7e-56c920d29f71	86aa7513-2cfc-481e-8ef3-799e54a4ad78	09e02c29-ca98-4401-a02c-bf7ff8c05690	\N	2026-03-01 00:00:00	2027-02-28 00:00:00	1550.00	1500.00	active	\N	2026-02-05 15:25:46.636383	annual	0.0500	5	\N
b1dcaa8a-80ec-4d38-97c7-f2a6ebf79814	a5996f00-086c-4ceb-82a5-7c98d442f799	c6b6c9a9-56f9-4aaa-bb36-195ca6bf816b	\N	2026-02-01 00:00:00	2027-01-31 00:00:00	1825.00	1750.00	active	\N	2026-02-05 15:25:46.462804	annual	0.0500	5	\N
f0bc1797-34f3-4dec-befc-a00948f68001	b3fcd381-a046-4c25-a28d-71992ac1ebf1	1c6aa700-bc22-4acb-9159-01eab97f09f9	\N	2025-10-01 00:00:00	2026-09-30 00:00:00	2050.00	1950.00	active	\N	2026-02-05 15:25:46.577663	annual	0.0500	5	\N
4a5fb498-0496-4754-881e-21d87a32e307	60b12745-2f37-463b-8122-68959b522b81	27abbaba-c587-4e63-8904-e6aca672a77b	\N	2025-03-01 00:00:00	2027-02-28 00:00:00	1850.00	0.00	active	\N	2026-02-05 15:25:46.693739	annual	0.0500	5	\N
43319232-c196-4182-8a50-92fc03ee5fed	40167b05-30f6-4952-94c8-edc9e7c550ad	98074ce8-8e6b-43d7-b364-6df96cd393a2	\N	2025-10-01 00:00:00	2026-09-30 00:00:00	1900.00	1300.00	active	\N	2026-02-05 15:25:45.907387	annual	0.0500	5	\N
6da5d7db-41fc-46d7-ae8d-7dd54453724e	d7a221fc-0dcd-4504-874e-5ef686290b93	02da684a-bd59-4c73-bdd6-f58d5c2eba87	\N	2025-05-01 00:00:00	2026-04-30 00:00:00	1850.00	1700.00	active	\N	2026-02-05 15:25:46.167977	annual	0.0500	5	\N
c88fc26e-2885-4053-8a0d-c39f6d7cf207	7f75947a-6576-4644-9061-01f593d5b975	4f6a2ee5-190f-4234-96ce-c22b8c496e9a	\N	2025-03-01 00:00:00	2026-02-28 00:00:00	1850.00	1850.00	active	\N	2026-02-05 15:25:47.155893	annual	0.0500	5	\N
c1ea5ea4-78c8-42ac-9097-b65173587f51	755fd861-0122-48b8-a0d2-fa33d9266758	30edf4a6-bcec-4a51-b113-a67ba4162030	\N	2024-07-01 00:00:00	2026-06-30 00:00:00	1900.00	0.00	active	\N	2026-02-05 15:25:47.213968	annual	0.0500	5	\N
1f75c58e-c016-4872-9071-53705ce27cd9	ec6b578f-2814-4e56-8ec8-f3b78956585b	83e3e8c8-3a19-43e7-ac98-decf70e07373	\N	2021-09-01 00:00:00	2026-08-31 00:00:00	2247.00	0.00	active	\N	2026-02-09 04:01:50.147049	annual	0.0500	5	\N
13142a3f-ed20-4201-bd67-6efb89f8e65f	5285bdc3-fd24-4657-ad05-95fc6158d319	86f68b5a-519e-451b-aa3f-3715e0d4e312	\N	2026-03-01 00:00:00	2029-02-28 00:00:00	2200.00	2200.00	active	\N	2026-02-09 02:55:21.939625	annual	0.0500	5	\N
6b31a584-091d-4edb-b318-b6cb7e35330f	db290e15-abbc-4293-aa64-604cf78d9796	90070f5e-3a98-4ebf-8ad5-3e6f40e10a89	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	1900.00	1900.00	active	\N	2026-02-09 02:57:16.733506	annual	0.0500	5	\N
eb97b9bd-9e8e-4957-8697-343ab5e2ec6a	90460276-b6bb-4859-b5eb-06d5a452fb67	4d0b1796-73dc-4845-a88e-15defa0a6597	\N	2025-12-01 00:00:00	2026-11-30 00:00:00	2200.00	2200.00	active	\N	2026-02-09 03:04:34.900811	annual	0.0500	5	\N
bcc784b1-fc07-4419-9c1f-d4fadcbebbf5	0eb4a8cf-ecac-4106-9847-76b875c048b4	e0d13e3b-0693-4a08-a08a-a08f96743052	\N	2025-12-15 00:00:00	2026-12-31 00:00:00	3200.00	3200.00	active	\N	2026-02-09 03:06:12.417881	annual	0.0500	5	\N
b4b192da-9e07-427b-964c-02c4d011fd46	57daac38-7e27-4bd0-9124-9518be954dc9	f8481f03-f05a-48f3-9c41-49dd2ceb22b7	\N	2025-11-01 00:00:00	2027-10-31 00:00:00	3500.00	3500.00	active	\N	2026-02-09 03:07:31.162701	annual	0.0500	5	\N
3d7e16df-219e-4249-8c81-7df230acf6f8	98a9fbb2-2d28-4b6c-91cd-70a95b97022a	d77557c8-e5c1-4bb8-a615-91b762b4ce44	\N	2025-10-15 00:00:00	2026-10-31 00:00:00	1900.00	1900.00	active	\N	2026-02-09 03:08:47.944188	annual	0.0500	5	\N
21477e28-59bb-4e0d-9000-c8c4d4bddba8	b0174803-da61-4ff8-8ed8-f57d03d4cbb0	b3049bba-0101-4c43-9f9f-4444591f9d1a	\N	2025-11-01 00:00:00	2026-10-31 00:00:00	2000.00	2000.00	active	\N	2026-02-09 03:10:05.161901	annual	0.0500	5	\N
d38ffc32-8c53-45e8-bef4-8ed7da4f29b7	da1db128-3ee4-4648-b736-5b4cf1f6d83a	59ef9f3d-685c-4557-92f8-7bb67244d303	\N	2025-10-01 00:00:00	2026-09-30 00:00:00	1900.00	1900.00	active	\N	2026-02-09 03:11:45.60507	annual	0.0500	5	\N
02e444a6-af65-4c97-93ad-afb30c7c38e2	8a3ac9d3-7d4a-473f-bf80-f43a8cd5db64	164584b9-d32b-46e8-aa11-b09957e47c3e	\N	2025-09-15 00:00:00	2026-09-30 00:00:00	1750.00	1750.00	active	\N	2026-02-09 03:13:06.060526	annual	0.0500	5	\N
ee2ee37d-c4be-4251-b783-518d44c06577	443f3c98-78c2-4344-b378-1b60a711255e	43195ca4-5135-4371-bce8-3b5e6ecc7372	\N	2025-08-01 00:00:00	2028-07-31 00:00:00	3500.00	3500.00	active	\N	2026-02-09 03:20:15.174574	annual	0.0500	5	\N
1f13c4ae-1a25-4c44-bbc0-8cefa575ac6e	3ba53dee-cbc3-44cc-9bf4-1b956c8258c7	c772f7e6-edc6-4152-9b94-f47653df0094	\N	2025-07-10 00:00:00	2026-07-31 00:00:00	2200.00	2200.00	active	\N	2026-02-06 02:52:56.114082	m2m	0.0500	5	\N
da67beac-6a3f-46da-b825-4a1a8b5f1732	0e6a0f87-c26a-4810-adaa-93eb993b0e90	36586d77-bd0e-46b2-95e0-bf8eae913eb9	\N	2024-08-01 00:00:00	2027-07-31 00:00:00	7936.49	0.00	active	\N	2026-02-09 03:39:34.185016	annual	0.0500	5	\N
fb71289f-60ff-4b5d-911a-b031952e5c16	d48f96fc-74c4-4ae8-a1a8-125c294aaef2	08a4ac57-f238-4da3-9bae-2fe844271b97	\N	2024-09-20 00:00:00	2026-09-30 00:00:00	1700.00	0.00	active	\N	2026-02-09 03:42:31.564076	annual	0.0500	5	\N
ddf0b58b-71c1-4338-8587-c43a6c0bbd83	b8179d2a-2831-4889-b6a2-46e621f62da2	d4c28d6e-b53a-47e9-b162-596be30afdc4	\N	2026-02-01 00:00:00	2027-01-31 00:00:00	2000.00	0.00	active	\N	2026-02-09 03:50:23.721671	annual	0.0500	5	\N
4b3cdcd6-3640-4029-8ba8-be27495eed1b	e482bc80-5b03-4556-93cf-0a945c5de35c	196b5689-3295-4b2a-a79b-cb111ad934ec	\N	2026-02-01 00:00:00	2027-01-31 00:00:00	11000.00	0.00	active	\N	2026-02-09 03:54:20.694254	annual	0.0500	5	\N
13c0d43e-c327-4d50-bf21-65cdd968b05a	0946dcb5-100a-417e-9810-505628513a45	e3816d0c-ecf7-4513-bc85-c8bfd9cd8205	\N	2024-08-01 00:00:00	2026-07-31 00:00:00	1823.20	0.00	active	\N	2026-02-09 03:57:59.260051	annual	0.0500	5	\N
a7c2e607-b16d-47dd-b805-52de32710674	14044383-1b71-42b2-8777-82d3cc09dcb1	67708874-dff1-4013-baa7-7781a95ed6a6	\N	2023-01-01 00:00:00	2027-12-31 00:00:00	1843.96	0.00	active	\N	2026-02-09 03:59:22.915914	annual	0.0500	5	\N
6377cfaa-28c0-44cd-9c00-10af8c90dffb	f66f312c-7270-4a9a-8b46-bfc07687bdd3	0da4bc3f-b4af-4d76-9236-6d357eb629d6	\N	2024-04-01 00:00:00	2028-03-31 00:00:00	3800.00	0.00	active	\N	2026-02-09 04:00:26.756363	annual	0.0500	5	\N
bf29a770-2cf8-44c5-be65-09babaf66220	4f6730b8-5351-48d3-af64-485a8ba3ff19	e88fd285-ed8f-4704-a29e-9453177c1a78	\N	2023-08-01 00:00:00	2028-07-31 00:00:00	5400.00	0.00	active	\N	2026-02-09 04:02:50.004298	annual	0.0500	5	\N
9f67e196-ddce-48b3-bcae-e60bfeaacdf1	48d65dcf-badd-44c2-8cea-48f380e85805	fa3d9be2-16fc-4144-aec3-d484b7b08de7	\N	2023-04-01 00:00:00	2026-03-31 00:00:00	1250.00	0.00	active	\N	2026-02-09 04:04:24.840199	m2m	0.0500	5	\N
225684ec-89cb-426c-9da8-87f851167db7	dd0e9bff-2c5b-41e3-898d-a5eb61797aab	a86ac1b9-2e41-4e82-bef0-f89a4c2c6af3	\N	2023-04-01 00:00:00	2026-03-31 00:00:00	1050.00	0.00	active	\N	2026-02-09 04:05:21.035401	m2m	0.0500	5	\N
b6c318f6-2abe-469e-8c3b-411efaf2de4f	44ae318e-01e2-429a-8fb5-a5808c1ea797	ddd7b82e-4db2-40a0-bcbe-fe71d2929a23	\N	2023-04-01 00:00:00	2026-03-31 00:00:00	1050.00	0.00	active	\N	2026-02-09 04:06:27.836542	annual	0.0500	5	\N
b8ddbfe3-792c-49e6-ac9c-d3e7cc8442e9	319c445e-131e-4beb-b85b-44e58ae2b06f	21aa2680-ec07-4f0d-9422-73a55b6fb60d	\N	2024-08-01 00:00:00	2026-07-31 00:00:00	2325.00	0.00	active	\N	2026-02-05 15:25:46.839023	annual	0.0500	5	\N
650334fd-aa3d-40cf-bedb-191e670f1e0e	1e95d34d-5dce-4ec2-a749-0ce70d7e5ff5	1f346dfa-32c1-44eb-a9dd-556d4d1de13f	\N	2025-08-01 00:00:00	2026-07-31 00:00:00	2000.00	2000.00	active	\N	2026-02-09 03:15:33.963915	annual	0.0500	5	\N
fde9a8a0-2f8f-44a2-86a4-3da365143e47	fe5243c2-dca1-46b0-a98c-b9bd09e8edde	b89f602d-1298-41e5-90fc-9b63afec44e9	\N	2024-05-01 00:00:00	2026-04-30 00:00:00	1825.00	0.00	active	\N	2026-02-05 15:25:46.895932	annual	0.0500	5	\N
1c9d630b-8a2c-45d8-9da3-4e9c679c0860	507b7e5c-655d-48f7-b9b4-17c1441c77ae	011896b8-9ba6-4d23-9513-b63271aa508f	\N	2025-01-01 00:00:00	2026-12-31 00:00:00	1700.00	0.00	active	\N	2026-02-05 15:25:46.95362	annual	0.0500	5	\N
9c6156a3-c50b-4e18-b847-6ee08e8ac1d3	e73e273f-1c08-4b92-a73c-e03b6ff26518	9026f5c4-57cd-424a-b2f5-530bf180c84f	\N	2024-07-01 00:00:00	2026-06-30 00:00:00	1900.00	0.00	active	\N	2026-02-05 15:25:46.982157	annual	0.0500	5	\N
45da57e1-7967-45b5-bd81-4e4c076720c5	69f472b0-c0b1-4c0d-a016-f51cd07c9a8a	8cee52a3-83f8-4901-b8dd-dd4cb7ce691b	\N	2024-06-01 00:00:00	2026-05-31 00:00:00	1900.00	0.00	active	\N	2026-02-05 15:25:47.01105	annual	0.0500	5	\N
a807700e-9e65-41f4-88cf-3a1f442e4843	6a5073bc-24d2-421f-b8b5-7ee1ae241b15	90a27344-6e91-46d9-953a-8ed29d05d856	\N	2025-03-01 00:00:00	2027-02-28 00:00:00	1925.00	1900.00	active	9fbe1f31-aaed-4e19-aaa9-05c1cbb7ffd2	2026-02-05 15:25:46.867445	annual	0.0500	5	\N
ba307b62-df7f-46e8-b18d-6ab4047552d2	b1ac5f2e-f232-405c-a20f-2e121313bd3f	6ff38c86-1c2f-4c91-9acf-7458690fee8a	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	1900.00	1850.00	active	\N	2026-02-05 15:25:47.039835	annual	0.0500	5	\N
0defb5b2-04c9-4edd-b3eb-2a4c37a5d140	6deb9d17-9d36-40cd-b1fd-f0967c04c3fc	ac746e92-6ecb-4e56-b4e7-eebbc1f7b27d	\N	2024-11-01 00:00:00	2026-10-31 00:00:00	1975.00	0.00	active	\N	2026-02-05 15:25:47.097118	annual	0.0500	5	\N
2f60ba43-9926-4c70-bff9-0d205c483902	3feb20b8-aa55-465d-9ee1-161a5ca508d6	5b25bdca-4101-4e1e-b4cd-36e8ce0e2b0e	\N	2025-06-01 00:00:00	2026-05-31 00:00:00	1500.00	1500.00	active	\N	2026-02-09 03:37:33.32858	annual	0.0500	5	\N
9c3cc3be-0354-4fb9-9724-b90f6d752ab5	38211b59-9de9-4767-be3a-02ba13c8ca02	7ce7b18e-da70-49ee-b9c3-204e3142a749	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	1875.00	0.00	active	\N	2026-02-05 15:25:47.068681	annual	0.0500	5	\N
b42e4e08-a6ee-434b-a7f0-f0124accf161	7845ce20-b115-4785-a452-ecda45d633b0	a591f7bd-9537-4d4d-a3dd-ade92561d0a9	\N	2025-05-01 00:00:00	2026-04-30 00:00:00	1700.00	1700.00	active	\N	2026-02-06 22:40:32.567925	annual	0.0500	5	\N
6073b604-86b5-440e-be97-fc5355ad2eba	73666509-04c7-4196-bbb1-32bb625aabc8	aa936a22-415e-421f-a8f6-864de4bea92e	\N	2025-10-01 00:00:00	2026-09-30 00:00:00	2300.00	2200.00	active	\N	2026-02-05 15:25:47.125568	annual	0.0500	5	\N
e560b5db-4033-4a1e-b78a-42b3238d8eff	1ec163c9-fd42-45a1-ad8f-810523061042	92930759-61f7-4699-98a1-bc5fdd072327	\N	2024-04-01 00:00:00	2026-03-31 00:00:00	2600.00	0.00	active	\N	2026-02-09 04:08:46.865147	annual	0.0500	5	\N
738c4af9-7982-40b2-acf8-7a0ae849d1e3	41d84dfe-4957-44af-8a98-cd2d59c4d711	5af20f69-9c8a-4e08-a4fb-1424a3c8b4ba	\N	2024-11-01 00:00:00	2026-10-31 00:00:00	2100.00	2100.00	active	\N	2026-02-09 04:11:11.304781	annual	0.0500	5	\N
7b190fab-a3c8-45d3-a113-a4d6b15f2096	1dd67894-ce61-4481-a7f9-5333f7d75f00	a4ca4214-210f-436d-8f8c-6fc1b51fb7fb	\N	2024-11-01 00:00:00	2026-10-31 00:00:00	2000.00	0.00	active	\N	2026-02-09 04:23:41.636075	annual	0.0500	5	\N
184f54bb-e74d-4c82-9f82-c60267c38752	5c60223e-f188-4b9d-9fb7-b1550ea2525e	d8a88cf6-3d2b-4d68-b777-b9a59b0559de	\N	2024-08-01 00:00:00	2026-07-31 00:00:00	1900.00	0.00	active	\N	2026-02-05 15:25:46.924661	annual	0.0500	5	\N
68bd918e-8af5-462c-a1aa-a93793a314e5	2cf23989-3794-41f0-bc24-2fd7b104f285	9c83270c-dae1-4cad-a21a-a6fb64f13b59	\N	2024-11-01 00:00:00	2026-10-31 00:00:00	2250.00	0.00	active	\N	2026-02-09 04:41:35.038366	annual	0.0500	5	\N
866bcf7b-087f-4a3f-9746-60df4073bbe6	303409bf-06de-49cc-842c-88cb9b25930c	1498ec04-ea47-48ab-affd-6bc5e645db54	\N	2025-03-04 00:00:00	2026-02-28 00:00:00	1700.00	1700.00	active	\N	2026-02-09 04:43:24.757084	annual	0.0500	5	\N
b79d77f4-eb40-4968-96e6-65965124cccd	7b106bde-0ce3-4ae1-97f3-1ff0a6136af6	a99f9e45-fecc-4c64-8914-7929e6c98ae9	\N	2024-06-01 00:00:00	2026-05-31 00:00:00	2050.00	0.00	active	\N	2026-02-09 04:45:39.191324	annual	0.0500	5	\N
416552ea-4ad5-4950-8a11-bf7f07e802ef	c1317972-e10e-4ff5-9dfc-b7a49065b703	fa291d82-436a-4552-a950-fc76c4ef3f94	\N	2025-10-01 00:00:00	2026-09-30 00:00:00	1700.00	1700.00	active	\N	2026-02-09 04:47:04.248207	annual	0.0500	5	\N
beb55f34-0bb8-4cd4-9a7f-2a705a55cc87	72842a58-b129-40f1-9d36-ae87ef2a0969	c2aaa73a-7f84-4c7d-931d-d5fba202d61c	\N	2024-12-01 00:00:00	2026-11-30 00:00:00	2050.00	0.00	active	\N	2026-02-09 04:48:25.761173	annual	0.0500	5	\N
30260d12-5414-4b86-a549-0e663992c872	f1a1a294-4139-4bb2-8483-b4985ea104b4	8c330a58-e474-4b1c-a2d0-294d9edf0a7f	\N	2025-07-01 00:00:00	2026-06-30 00:00:00	2300.00	2300.00	active	\N	2026-02-09 04:49:45.757919	annual	0.0500	5	\N
36471db9-43e0-4014-b296-53da729f9fa0	38828046-9d17-417e-a704-f96137e60581	a1c05875-31c4-474f-8cd8-20e36fc1372f	\N	2026-02-01 00:00:00	2027-01-31 00:00:00	1850.00	1850.00	active	\N	2026-02-09 13:46:37.099826	annual	0.0500	5	\N
eb38211f-0970-42c7-ab44-9edee1d2d87d	e38460d5-c080-40d9-a3d3-7d03a045108e	5bc42ae3-b5cc-4d58-9333-b33bec9dd821	\N	2025-12-01 00:00:00	2026-11-30 00:00:00	1695.00	1695.00	active	\N	2026-02-18 01:27:27.305403	annual	0.0500	5	\N
8ebb7b20-e804-4890-8cb1-472c9a039f90	ec0175d2-39cf-4c93-9b36-704922b9f9f2	e22bddd3-4771-4451-bdd9-95cd11e328ea	\N	2026-01-01 00:00:00	2026-12-31 00:00:00	2150.00	1500.00	active	\N	2026-02-09 04:13:37.139913	annual	0.0500	5	\N
8672f231-0a7e-49cc-bde1-62eb48183e29	18dbb1ab-a366-48fa-9aaf-3cdb5ae65c7a	b3e38bb5-c629-4dbe-a8e7-ba12833b79b7	\N	2026-03-01 00:00:00	2027-02-28 00:00:00	1800.00	1800.00	active	\N	2026-02-19 22:41:45.200789	annual	0.0500	5	\N
519e532b-5c82-4400-bb7e-306aaf1fae41	088d235c-277f-4a8b-9ebe-33f7d0f20221	2b357005-1311-4eb2-82de-ae4017d78303	\N	2025-03-01 00:00:00	2026-02-28 00:00:00	1875.00	1200.00	active	\N	2026-02-09 04:50:57.196463	annual	0.0500	5	\N
94e95a05-fc41-4a7f-87b2-df207dea12ca	216b86ab-2883-493e-ab68-f1a3ef1503e4	569d10ea-aadf-4416-9ece-4564c90b2da9	\N	2025-01-01 00:00:00	2025-12-31 00:00:00	2250.00	0.00	active	\N	2026-02-09 04:22:19.453454	m2m	0.0500	5	\N
710a0cf7-5008-4690-9b82-2ef6170a37f5	8c95b41e-1670-40e6-a3b7-41cca215b272	46e7ec52-2246-44b6-9c77-640bd843dba7	\N	2025-07-01 00:00:00	2026-06-30 00:00:00	1650.00	1050.00	active	\N	2026-02-05 15:25:46.781622	annual	0.0500	5	\N
\.


--
-- Data for Name: maintenance_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.maintenance_attachments (id, request_id, file_id) FROM stdin;
\.


--
-- Data for Name: maintenance_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.maintenance_messages (id, request_id, sender_type, sender_user_id, message, created_at) FROM stdin;
\.


--
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.maintenance_requests (id, tenant_id, property_id, unit_id, ticket_number, name, email, phone, property_address, unit_label, category, description, status, priority, entry_permission, has_pets, created_at, updated_at, photos) FROM stdin;
c697327a-16c7-4e06-9efd-f02ce3e029b3	\N	\N	\N	MR-MLSISH2K	Yanni Sabag	yanisho@hotmail.com	\N	\N	\N	hvac	my ac is not working please help	submitted	medium	t	t	2026-02-18 21:04:13.691668	2026-02-18 21:04:13.691668	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, tenant_id, property_id, property_code, email, amount, method, status, stripe_payment_intent_id, paid_at, receipt_url, description, created_at, entity_id, stripe_transfer_id) FROM stdin;
763e0728-9bbf-4db7-b1e7-cf33bad428ab	\N	\N	\N	\N	1.00	ach	completed	\N	2026-02-11 18:56:50.013	\N	\N	2026-02-11 18:56:50.029781	\N	\N
90f2ecae-d054-4fee-94f9-835fc594c569	\N	\N	\N	\N	1.00	card	completed	\N	2026-02-18 21:23:51.708	\N	test	2026-02-18 21:23:51.723735	\N	\N
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.properties (id, property_code, name, address, city, state, zip, type, status, description, image_url, created_at, updated_at, entity_id, bedrooms, bathrooms, sqft, nickname) FROM stdin;
92930759-61f7-4699-98a1-bc5fdd072327	1699	1699	1699 NW 127th Street	Miami	FL	33167	house	occupied		\N	2026-02-05 15:16:49.98324	2026-02-17 22:38:16.262	8b7cb4fe-2542-4cd8-abbc-28feeba55822	3	2.0	1500	
14768530-05db-4656-b419-8ca2a1c664d9	3900107	3900 Apt 107	3900 NW 76 Ave. Apt 107	Sunrise	FL	33351	condo	occupied		\N	2026-02-05 15:16:50.196009	2026-02-17 22:38:16.092	bd5001c1-8633-41ed-a1cd-9089e096012d	2	2.0	\N	
a1c05875-31c4-474f-8cd8-20e36fc1372f	711301	711 Apt 301	711 N. Pine Island Rd. Apt 301	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.240158	2026-02-17 22:38:15.161	6c37f1e9-f30b-4c04-b69a-249798bde6b2	2	2.0	\N	
a591f7bd-9537-4d4d-a3dd-ade92561d0a9	10050103	10050 Apt 103	10050 Winding Lakes Apt 103	Sunrise	FL	33351	condo	occupied		\N	2026-02-05 23:49:52.861744	2026-02-19 13:13:30.462	98ec115e-e98b-4f0e-af4e-e9bf1c2e18dc	2	2.0	1000	
e22bddd3-4771-4451-bdd9-95cd11e328ea	701102	701 Apt 102	701 SW 148th Ave Apt 102	Davie	FL	33325	townhouse	occupied		\N	2026-02-05 23:52:49.277215	2026-02-19 13:21:44.503	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	3	2.0	1200	
c772f7e6-edc6-4152-9b94-f47653df0094	129201	12920 # 1	12920 Westview Dr. #1	Miami	FL	33167	house	occupied		\N	2026-02-05 15:16:49.921399	2026-02-17 22:38:16.29	8b7cb4fe-2542-4cd8-abbc-28feeba55822	3	2.0	\N	
02da684a-bd59-4c73-bdd6-f58d5c2eba87	7300201	7300 Apt 201	7300 NW 17th Street Apt 201	Plantation	FL	33313	condo	occupied		\N	2026-02-05 15:16:50.165343	2026-02-18 17:00:56.397	c549fe59-23d1-45d5-838d-85f551957912	2	2.0	\N	
2ad6b6cc-0ddd-411b-b04d-f3b443faef79	3262	3262	3262 Coral Ridge Dr.	Coral Springs	FL	33065	condo	occupied		\N	2026-02-05 15:16:50.256319	2026-02-18 17:11:44.538	c549fe59-23d1-45d5-838d-85f551957912	2	2.0	\N	
cc7c14fc-3218-493c-bd93-3924788d0bfa	300303	300 Apt 303	300 Palm Circle W. Apt 303	Pembroke Pines	FL	33025	condo	occupied		\N	2026-02-05 15:16:50.226201	2026-02-17 22:38:16.064	9f3e0261-305c-422e-87a9-1389a22cb167	2	2.0	1100	
bb4dbf04-dd29-4cf2-9c72-310b3388698f	92O	92 Ohio	92 Ohio Rd.	Lake Worth	FL	33467	house	occupied		\N	2026-02-05 15:16:50.043783	2026-02-17 22:38:16.207	8b7cb4fe-2542-4cd8-abbc-28feeba55822	3	2.0	\N	
d91bcd2a-01e1-48c8-94bf-4f4070c108f6	4169205	4169 Apt 205	4169 SW 67th Ave. Apt 205	Davie	FL	33314	condo	occupied		\N	2026-02-05 15:16:50.074029	2026-02-19 02:48:48.701	c549fe59-23d1-45d5-838d-85f551957912	2	2.0	\N	
4d0aa3df-a596-4365-90dd-daa354f7e54c	3100202	3100 Apt 202	3100 N. Pine Island Rd. Apt 202	Sunrise	FL	33351	condo	occupied		\N	2026-02-05 15:16:50.134357	2026-02-20 02:16:03.587	c549fe59-23d1-45d5-838d-85f551957912	2	2.0	\N	
98074ce8-8e6b-43d7-b364-6df96cd393a2	711102	711 Apt 102	711 N. Pine Island Rd. Apt 102	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:49.89072	2026-02-19 13:15:42.19	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	2	2.0	\N	
fa3d9be2-16fc-4144-aec3-d484b7b08de7	129204	12920 # 4	12920 Westview Dr. #4	Miami	FL	33167	house	occupied		\N	2026-02-05 23:41:18.227561	2026-02-17 22:38:14.993	8b7cb4fe-2542-4cd8-abbc-28feeba55822	1	1.0	300	
ddd7b82e-4db2-40a0-bcbe-fe71d2929a23	129202	12920 # 2	12920 Westview Dr # 2	Miami	FL	33167	house	occupied		\N	2026-02-05 23:39:27.366943	2026-02-17 22:38:15.049	8b7cb4fe-2542-4cd8-abbc-28feeba55822	0	1.0	300	
7b30c68a-d317-4ee2-97aa-f4bbf42f9b12	99991004	9999 Apt 1004	9999 Summerbreeze Dr. Apt 1004	Sunrise	FL	33322	condo	occupied		\N	2026-02-05 15:16:50.318273	2026-02-17 22:38:15.97	efec181c-4168-457a-9ba3-26b23ddcc95d	2	2.0	\N	
89b8685b-d8e4-43fa-9739-913898d1322e	5090105	5090 Apt 105	5090 SW 64th Ave. Apt 105	Davie	FL	33314	condo	occupied		\N	2026-02-05 15:16:50.286901	2026-02-17 22:38:16.002	3bf1eda2-a356-4819-9b79-5137bcd6582b	2	2.0	\N	
455195c3-bd74-418f-b604-b8973e63888d	7900206	7900 Apt 206	7900 Fairview Dr Apt 206	Tamarac	FL	33321	condo	occupied		\N	2026-02-05 15:16:49.860579	2026-02-18 17:32:56.836	26dc033b-8d71-411e-80eb-2ac85218ec86	2	2.0	\N	
d77557c8-e5c1-4bb8-a615-91b762b4ce44	9971	9971	9971 Nob Hill Lane	Sunrise	FL	33351	condo	occupied		\N	2026-02-05 15:16:50.103915	2026-02-17 22:38:16.151	9e442be2-ead7-40ea-8c7b-52d6599d3303	2	2.0	\N	
59ef9f3d-685c-4557-92f8-7bb67244d303	909	909	909 NW 16th Ter.	Fort Lauderdale	FL	33311	house	occupied		\N	2026-02-05 15:16:50.013558	2026-02-17 22:38:16.235	8b7cb4fe-2542-4cd8-abbc-28feeba55822	1	1.0	\N	
67199d1c-bff2-4b61-b9d5-e8c705d7a6be	205 NW 4th Ave	205 NW 4th Ave	205 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.798832	2026-02-17 22:38:16.4	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
969baf09-8994-41fb-afde-ac67fd532fa6	207 NW 4th Ave	207 NW 4th Ave	207 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.768747	2026-02-17 22:38:16.428	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
8a948e9e-08c6-441b-9088-7d07c453b370	220-230 NW 4th Ave	220-230 NW 4th Ave	220-230 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.738348	2026-02-17 22:38:16.456	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	3	3.0	\N	
e0d13e3b-0693-4a08-a08a-a08f96743052	301 NW 10th Ter	301 NW 10th Ter	301 NW 10th Ter	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.708009	2026-02-17 22:38:16.483	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	1700	
d4c28d6e-b53a-47e9-b162-596be30afdc4	226 NW 6th Ave	226 NW 6th Ave	226 NW 6th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.67774	2026-02-17 22:38:16.511	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
51faa6a3-a75f-4c02-ab1a-24a25c42917d	221 NW 4th Ave	221 NW 4th Ave	221 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.585787	2026-02-17 22:38:16.567	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
4366c6a4-72a1-4252-b6a5-64a33fdd170c	213-227 NW 5th Ave	213-227 NW 5th Ave	213-227 NW 5th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.555522	2026-02-17 22:38:16.594	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	4	4.0	\N	
a676d548-44b7-4650-9d48-f2018d70ace2	229 NW 5th Ave	229 NW 5th Ave	229 NW 5th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.525224	2026-02-17 22:38:16.622	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	3688	
8f1d97be-3e81-41cf-9fc0-8919857ff31d	222 NW 6th Ave	222 NW 6th Ave	222 NW 6th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.494661	2026-02-17 22:38:16.649	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
60ea4864-efb7-43eb-bf7b-89289ae0a5ef	233-237 NW 4th Ave	233-237 NW 4th Ave	233-237 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.41765	2026-02-17 22:38:16.705	dd2c3274-b04f-41c0-bac8-8ca4d0e725a2	3	2.0	\N	
dd5700cb-c3ec-49f6-907d-f059a6840dac	8214	8214	8214 SW 14th Court	North Lauderdale	FL	33068	house	active		\N	2026-02-05 15:16:49.952176	2026-02-18 01:16:28.055	8b7cb4fe-2542-4cd8-abbc-28feeba55822	3	2.0	\N	
1f346dfa-32c1-44eb-a9dd-556d4d1de13f	7027	7027	7027 W. Sunrise Blvd	Plantation	FL	33313	townhouse	occupied		\N	2026-02-05 23:34:12.859495	2026-02-18 16:59:14.483	c549fe59-23d1-45d5-838d-85f551957912	2	2.5	\N	
30edf4a6-bcec-4a51-b113-a67ba4162030	711203	711 Apt 203	711 N. Pine Island Rd. Apt 203	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.271516	2026-02-17 22:38:15.132	6c37f1e9-f30b-4c04-b69a-249798bde6b2	2	2.0	\N	
aa936a22-415e-421f-a8f6-864de4bea92e	721116	721 Apt 116	721 N. Pine Island Rd. Apt 116	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.179248	2026-02-18 17:02:55.027	c549fe59-23d1-45d5-838d-85f551957912	3	2.0	\N	
5b25bdca-4101-4e1e-b4cd-36e8ce0e2b0e	18001205	1800 Apt 1205	1800 SW 81st Ave. Apt 1205	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.783605	2026-02-18 17:21:24.235	26dc033b-8d71-411e-80eb-2ac85218ec86	1	1.5	\N	
c6b6c9a9-56f9-4aaa-bb36-195ca6bf816b	8060202	8060 Apt 202	8060 Colony Circle N. Apt 202	Tamarac	FL	33321	condo	occupied		\N	2026-02-05 15:16:50.471683	2026-02-18 17:34:13.911	26dc033b-8d71-411e-80eb-2ac85218ec86	2	2.0	\N	
be8fe484-b83e-4a28-9563-a3ef22d34862	18203200	1820 Apt 3200	1820 SW 81st Ave Apt. Apt 3200	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.692249	2026-02-18 17:27:00.963	26dc033b-8d71-411e-80eb-2ac85218ec86	1	1.5	\N	
fa291d82-436a-4552-a950-fc76c4ef3f94	721204	721 Apt 204	721 N. Pine Island Rd Apt 204	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.301643	2026-02-17 22:38:15.104	8b7cb4fe-2542-4cd8-abbc-28feeba55822	1	1.5	1200	
27abbaba-c587-4e63-8904-e6aca672a77b	18102110	1810 Apt 2110	1810 SW 81st Ave. Apt 2110	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.722342	2026-02-17 22:38:15.607	959b423a-2b09-4acb-8087-de75ef5522f4	2	2.0	\N	
46e7ec52-2246-44b6-9c77-640bd843dba7	18001401	1800 Apt 1401	1800 SW 81st Ave. Apt 1401	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.813847	2026-02-18 17:22:23.7	26dc033b-8d71-411e-80eb-2ac85218ec86	1	1.5	\N	
b2d5c003-a7d9-48d8-92b5-140a63e41fc9	18203216	1820 Apt 3216	1820 SW 81st Ave. Apt 3216	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.63097	2026-02-18 17:24:44.176	26dc033b-8d71-411e-80eb-2ac85218ec86	2	2.0	\N	
1c6aa700-bc22-4acb-9159-01eab97f09f9	18304215	1830 Apt 4215	1830 SW 81st Ave. Apt 4215	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.600707	2026-02-18 17:31:11.235	26dc033b-8d71-411e-80eb-2ac85218ec86	2	2.0	\N	
183262a6-dfef-45f2-b103-cdf3cb232877	9999418	9999 Apt 418	9999 Summerbreeze Dr. Apt 418	Sunrise	FL	33322	condo	occupied		\N	2026-02-05 15:16:50.348544	2026-02-17 22:38:15.942	efec181c-4168-457a-9ba3-26b23ddcc95d	2	2.0	\N	
21aa2680-ec07-4f0d-9422-73a55b6fb60d	605201	605 Apt 201A	605 S. Pine Island Rd. Apt 201A	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.874444	2026-02-19 02:19:45.055	e4f1d9b1-6672-47e7-9b9b-7695b829d372	3	2.0	\N	
b89f602d-1298-41e5-90fc-9b63afec44e9	455407	455 Apt 407C	455 S. Pine Island Rd. Apt 407C	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.934971	2026-02-17 22:38:15.441	4032f9e7-ad7d-4f76-8bd2-7f356339ef2e	2	2.0	\N	
4d0b1796-73dc-4845-a88e-15defa0a6597	4204	4204 NW 114th Ter	4204 NW 114th Ter	Coral Springs	FL	33065	townhouse	occupied		\N	2026-02-05 23:55:33.327884	2026-02-17 22:38:14.882	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	3	2.0	1600	
72d41b3a-57da-401e-b935-e4df326e908d	3634	3634	3634 NW 95th Ter. Apt 8L	Sunrise	FL	33351	condo	occupied		\N	2026-02-05 15:16:50.441614	2026-02-18 17:07:06.194	c549fe59-23d1-45d5-838d-85f551957912	3	2.0	\N	
a4ca4214-210f-436d-8f8c-6fc1b51fb7fb	7341	7341	7341 W. Sunrise Blvd	Plantation	FL	33313	townhouse	occupied		\N	2026-02-05 23:53:57.801969	2026-02-17 22:38:14.909	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	2	2.0	1000	
a86ac1b9-2e41-4e82-bef0-f89a4c2c6af3	129203	12920 # 3	12920 Westview Dr # 3	Miami	FL	33167	house	occupied		\N	2026-02-05 23:40:27.95739	2026-02-17 22:38:15.021	8b7cb4fe-2542-4cd8-abbc-28feeba55822	0	1.0	300	
7ce7b18e-da70-49ee-b9c3-204e3142a749	721307	721 Apt 307	721 N. Pine Island Rd. Apt 307	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.117185	2026-02-19 13:19:09.209	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	2	2.0	\N	
ac746e92-6ecb-4e56-b4e7-eebbc1f7b27d	721205	721 Apt 205	721 N. Pine Island Rd. Apt 205	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.148788	2026-02-17 22:38:15.245	6c37f1e9-f30b-4c04-b69a-249798bde6b2	2	2.0	\N	
6ff38c86-1c2f-4c91-9acf-7458690fee8a	721402	721 Apt 402	721 N. Pine Island Rd. Apt 402	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.087146	2026-02-19 13:20:20.87	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	2	2.0	\N	
90a27344-6e91-46d9-953a-8ed29d05d856	455409	455 Apt 409C	455 S. Pine Island Rd. Apt 409C	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.904882	2026-02-20 02:10:32.514	4032f9e7-ad7d-4f76-8bd2-7f356339ef2e	2	2.0	\N	
8cee52a3-83f8-4901-b8dd-dd4cb7ce691b	721405	721 Apt 405	721 N. Pine Island Rd. Apt 405	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.057033	2026-02-17 22:38:15.329	35a4ff06-18a0-484a-8da8-b648c06f66b0	2	2.0	\N	
9026f5c4-57cd-424a-b2f5-530bf180c84f	721407	721 Apt 407	721 N. Pine Island Rd. Apt 407	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.02588	2026-02-17 22:38:15.357	35a4ff06-18a0-484a-8da8-b648c06f66b0	2	2.0	\N	
011896b8-9ba6-4d23-9513-b63271aa508f	405214	405 Apt 214D	405 S. Pine Island Rd. Apt 214D	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.99575	2026-02-17 22:38:15.385	6c37f1e9-f30b-4c04-b69a-249798bde6b2	1	1.0	\N	
09e02c29-ca98-4401-a02c-bf7ff8c05690	18203211	1820 Apt 3211	1820 SW 81st Ave. Apt 3211	North Lauderdale	FL	33068	condo	active		\N	2026-02-05 15:16:50.661496	2026-02-19 02:42:01.966	26dc033b-8d71-411e-80eb-2ac85218ec86	1	1.5	\N	
90070f5e-3a98-4ebf-8ad5-3e6f40e10a89	605304	605 Apt 304A	605 S. Pine Island Rd. Apt 304A	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.844216	2026-02-19 02:19:58.495	e4f1d9b1-6672-47e7-9b9b-7695b829d372	2	2.0	\N	
d8a88cf6-3d2b-4d68-b777-b9a59b0559de	455304	455 Apt 304C	455 S. Pine Island Rd. Apt 304C	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:50.965658	2026-02-19 02:20:20.607	e4f1d9b1-6672-47e7-9b9b-7695b829d372	2	2.0	\N	
e8bac227-c8ff-42fe-adb4-c131e85bf61d	7801209	7801 Apt 209	7801 Colony Circle S. Apt 209	Tamarac	FL	33321	condo	occupied		\N	2026-02-05 15:16:50.534569	2026-02-19 13:12:04.568	3987a416-fc35-416c-b086-36a5f138a8d5	2	2.0	\N	
5bc42ae3-b5cc-4d58-9333-b33bec9dd821	18001304	1800 Apt 1304	1800 SW 81st Ave. Apt 1304	North Lauderdale	FL	33068	condo	occupied		\N	2026-02-05 15:16:50.753179	2026-02-18 20:15:34.868	4032f9e7-ad7d-4f76-8bd2-7f356339ef2e	2	2.0	\N	
4f6a2ee5-190f-4234-96ce-c22b8c496e9a	711403	711 Apt 403	711 N. Pine Island Rd. Apt 403	Plantation	FL	33324	condo	occupied		\N	2026-02-05 15:16:51.209477	2026-02-19 13:16:39.838	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	2	2.0	\N	
5eb0172c-2bd3-497a-8aa0-eab3e6151aa8	7800102	7800 Apt 102	7800 Colony Circle S. Apt 102	Tamarac	FL	33321	condo	occupied		\N	2026-02-05 15:16:50.564814	2026-02-18 17:35:01.937	26dc033b-8d71-411e-80eb-2ac85218ec86	2	2.0	\N	
42cb0b25-7347-4d58-8194-298763c49d33	406509	406 Apt 509	406 NW 68th Ave. Apt 509	Plantation	FL	33317	condo	occupied		\N	2026-02-05 15:16:50.380332	2026-02-18 17:10:43.975	c549fe59-23d1-45d5-838d-85f551957912	1	1.5	\N	
36586d77-bd0e-46b2-95e0-bf8eae913eb9	224 NW 6th Ave	224 NW 6th Ave	224 NW 6th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-06 00:04:58.327397	2026-02-17 22:38:14.798	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	2500	
164584b9-d32b-46e8-aa11-b09957e47c3e	7925205	7925 Apt 205	7925 Colony Cir S. Apt 205	Tamarac	FL	33321	condo	occupied		\N	2026-02-06 00:25:43.012857	2026-02-17 22:38:14.631	da45dbd5-04ae-4786-aa8f-2ec4c3a8b504	2	2.0	1000	
a99f9e45-fecc-4c64-8914-7929e6c98ae9	3849	3849	3849 NW 90th Ave	Sunrise	FL	33351	townhouse	occupied		\N	2026-02-06 00:24:18.453339	2026-02-17 22:38:14.659	da45dbd5-04ae-4786-aa8f-2ec4c3a8b504	3	2.0	1300	
86f68b5a-519e-451b-aa3f-3715e0d4e312	7351103	7351 Suite # 103	7351 W. Oakland Park Blvd Suite 103	Tamarac	FL	33319	commercial	active		\N	2026-02-06 00:33:40.999847	2026-02-06 00:33:40.999847	bfae676a-6310-4003-bdee-be325725f489	5	2.0	1550	
569d10ea-aadf-4416-9ece-4564c90b2da9	10937	10937	10937 NW 30th Place	Sunrise	FL	33322	townhouse	active		\N	2026-02-05 23:59:09.564825	2026-02-18 02:40:12.703	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	3	2.0	1300	
0da4bc3f-b4af-4d76-9236-6d357eb629d6	7351104	7351 Suite # 104	7351 W. Oakland Park Blvd Suite 101	Tamarac	FL	33319	commercial	occupied		\N	2026-02-06 02:19:23.983241	2026-02-17 22:38:14.493	bfae676a-6310-4003-bdee-be325725f489	4	2.0	3000	
b3e38bb5-c629-4dbe-a8e7-ba12833b79b7	16401	1640 # 1	1640 SW 40th Terrace # 1	Fort Lauderdale	FL	33317	house	active		\N	2026-02-06 00:21:30.531857	2026-02-20 02:08:25.917	e4f1d9b1-6672-47e7-9b9b-7695b829d372	2	1.0	1000	
196b5689-3295-4b2a-a79b-cb111ad934ec	207 NW 3rd Ave	207-217 NW 3rd Ave	207-217 NW 3rd Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-06 02:32:53.924459	2026-02-17 22:38:14.405	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	10350	
83e3e8c8-3a19-43e7-ac98-decf70e07373	7351102	7351 Suite # 102	7351 W. Oakland Park Blvd Suite 102	Tamarac	FL	33319	commercial	occupied		\N	2026-02-06 00:33:08.454217	2026-02-17 22:38:14.521	bfae676a-6310-4003-bdee-be325725f489	3	2.0	1500	
e3816d0c-ecf7-4513-bc85-c8bfd9cd8205	7351106	7351 Suite # 106	7351 W. Oakland Park Blvd Suite 101	Tamarac	FL	33319	commercial	occupied		\N	2026-02-06 02:21:23.207781	2026-02-17 22:38:14.437	bfae676a-6310-4003-bdee-be325725f489	3	2.0	786	
67708874-dff1-4013-baa7-7781a95ed6a6	7351105	7351 Suite # 105	7351 W. Oakland Park Blvd Suite 101	Tamarac	FL	33319	commercial	occupied		\N	2026-02-06 02:20:51.727064	2026-02-17 22:38:14.465	bfae676a-6310-4003-bdee-be325725f489	3	2.0	1500	
e88fd285-ed8f-4704-a29e-9453177c1a78	7351101	7351 Suite # 101	7351 W. Oakland Park Blvd Suite 101	Tamarac	FL	33319	commercial	occupied		\N	2026-02-06 00:32:22.932184	2026-02-17 22:38:14.548	bfae676a-6310-4003-bdee-be325725f489	6	2.0	3000	
08a4ac57-f238-4da3-9bae-2fe844271b97	7901205	7901 Apt 205	7901 Colony Cir S. Apt 205	Tamarac	FL	33321	condo	occupied		\N	2026-02-06 00:30:04.415885	2026-02-17 22:38:14.576	da45dbd5-04ae-4786-aa8f-2ec4c3a8b504	2	2.0	1000	
1498ec04-ea47-48ab-affd-6bc5e645db54	8000205	8000 Apt 205	8000 Fairview Dr Apt # 205	Tamarac	FL	33321	condo	occupied		\N	2026-02-06 00:27:25.427135	2026-02-17 22:38:14.603	da45dbd5-04ae-4786-aa8f-2ec4c3a8b504	2	2.0	1000	
c2aaa73a-7f84-4c7d-931d-d5fba202d61c	505408	505 Apt 408B	505 S. Pine Island Rd Apt 408B	Plantation	FL	33324	condo	occupied		\N	2026-02-06 00:19:43.964954	2026-02-17 22:38:14.686	a9de61aa-42e3-409d-b183-baea5b237b99	2	2.0	1000	
8c330a58-e474-4b1c-a2d0-294d9edf0a7f	485201	485 Apt 201A	485 N. Pine Island Rd Apt 201A	Plantation	FL	33324	condo	occupied		\N	2026-02-06 00:16:23.970246	2026-02-17 22:38:14.715	a9de61aa-42e3-409d-b183-baea5b237b99	3	2.0	1150	
5af20f69-9c8a-4e08-a4fb-1424a3c8b4ba	3933	3933	3933 NW 94th Ave	Sunrise	FL	33351	townhouse	occupied		\N	2026-02-06 00:11:25.680391	2026-02-17 22:38:14.743	9e442be2-ead7-40ea-8c7b-52d6599d3303	3	2.0	1400	
b3049bba-0101-4c43-9f9f-4444591f9d1a	443919	4439 Apt 19D	4439 Treehouse Lane Apt 19D	Tamarac	FL	33319	townhouse	occupied		\N	2026-02-06 00:09:48.869033	2026-02-17 22:38:14.77	3bf1eda2-a356-4819-9b79-5137bcd6582b	3	2.0	1250	
f8481f03-f05a-48f3-9c41-49dd2ceb22b7	517 NE 2nd Ave # 1	517 NE 2nd Ave # 1	517 NE 2nd Ave #1	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-06 00:01:45.227747	2026-02-17 22:38:14.825	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	2400	
9c83270c-dae1-4cad-a21a-a6fb64f13b59	471408	471 Apt 408D	471 N. Pine Island Rd Apt 408D	Plantation	FL	33324	condo	occupied		\N	2026-02-05 23:57:15.655564	2026-02-17 22:38:14.854	3fa1e91c-f52f-4095-b92b-fbcb7ec738a2	3	2.0	1200	
fc8496d2-6418-452c-b00f-933f0e6ac1a9	7925210	7925 Apt 210	7925 Fairview Dr. Apt 210	Tamarac	FL	33321	condo	occupied		\N	2026-02-05 15:16:50.502123	2026-02-17 22:38:15.801	3bf1eda2-a356-4819-9b79-5137bcd6582b	2	2.0	\N	
42c6c99f-893a-4b5c-8b3b-0a565f66a82d	219-221 NW 2nd Ave	219-221 NW 2nd Ave	219-221 NW 2nd Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.829923	2026-02-17 22:38:16.373	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
269da26f-21d6-4b5f-88fb-064a6ee484d8	517 NE 2nd Ave # 2	517 NE 2nd Ave # 2	517 NE 2nd Ave # 2	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.617133	2026-02-17 22:38:16.539	dc4d2931-e43b-4f86-a487-9fe5eefcd5aa	1	1.0	\N	
43195ca4-5135-4371-bce8-3b5e6ecc7372	231 NW 4th Ave	231 NW 4th Ave	231 NW 4th Ave	Hallandale Beach	FL	33009	commercial	occupied		\N	2026-02-05 15:16:49.462778	2026-02-17 22:38:16.677	dd2c3274-b04f-41c0-bac8-8ca4d0e725a2	1	1.0	2500	
8ba371a7-9289-4d65-b742-7c9f46568829	16402	1640 # 2	1640 SW 40th Terrace # 2	Fort Lauderdale	FL	33317	house	active		\N	2026-02-06 00:22:36.521837	2026-02-20 02:10:53.876	e4f1d9b1-6672-47e7-9b9b-7695b829d372	1	1.0	350	
abe74a99-2bb2-495a-9602-bbefaa9d30a0	406308	406 Apt 308	406 NW 68th Ave. Apt 308	Plantation	FL	33317	condo	occupied		\N	2026-02-05 15:16:50.410673	2026-02-18 17:09:45.22	c549fe59-23d1-45d5-838d-85f551957912	1	1.5	\N	
2b357005-1311-4eb2-82de-ae4017d78303	483202	483 Apt 202C	483 N. Pine Island Rd Apt 202C	Plantation	FL	33324	condo	occupied		\N	2026-02-06 00:18:36.626242	2026-02-20 02:14:41.397	a9de61aa-42e3-409d-b183-baea5b237b99	2	2.0	1000	
\.


--
-- Data for Name: public_properties; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.public_properties (id, property_id, address, unit_number, bedrooms, bathrooms, owner_name, description, amenities, images, is_available, monthly_rent, created_at, updated_at) FROM stdin;
90a60b86-f5f0-47fd-a515-8dc761a737ba	300303	300 Palm Circle W Pembroke Pines, FL 33025	303	2	2.0	Moti Levy	\N	\N	{}	t	\N	2026-02-05 23:01:34.288981	2026-02-13 00:35:34.071
872148c6-ad04-4a3e-9a5c-ef472453b61b	405214	405 S. Pine Island Rd Plantation, FL 33324	D214	1	1.0	Lubren LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.525799	2026-02-13 00:35:34.295
3a4a0a85-f362-42a5-aef5-8a01ddb127a4	8214	8214 SW 14th Court North Lauderdale, FL 33068	8214	4	2.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.687557	2026-02-13 00:35:35.744
20156f64-0460-4778-946f-d2f92402e702	18203211	1820 SW 81st Ave North Lauderdale, FL 33068	3211	1	1.5	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.197237	2026-02-13 00:35:33.947
7d7b3e4d-3299-480e-8029-feb521b6d0aa	909	909 NW 16th Ter Fort Lauderdale, FL 33311	909	2	2.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.717212	2026-02-13 00:35:35.775
4d8b145b-da40-49b3-84f4-54d73d45118c	721402	721 N. Pine Island Rd Plantation, FL 33324	402	2	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.319718	2026-02-13 00:35:35.326
7253b802-0150-40f4-887b-48dc189bf63a	721204	721 N. Pine Island Rd Plantation, FL 33324	204	1	1.5	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.227085	2026-02-13 00:35:35.358
1c0e4c84-bdec-41fb-8d1c-c5949aa13e23	92	92 Ohio Rd Lake Worth, FL 33467	92	3	2.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.746588	2026-02-13 00:35:35.805
ff33855e-d606-4c16-a055-9703b520e7f1	129201	12920 Westview Dr Miami, FL 33167	1	3	2.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.860817	2026-02-13 00:35:33.624
858b1209-0a0b-4509-8fe0-688a822bf38b	10937	10937 30th Place Sunrise, FL 33322	242	3	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.82998	2026-02-13 00:35:33.561
601ec8ff-c5ce-41d2-9a78-ef49ce38f684	129204	12920 Westview Dr Miami, FL 33167	4	1	1.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.954558	2026-02-13 00:35:33.591
00e8154d-1762-4fd7-9fe1-6ed9da05cadc	3933	3933 NW 94th Ave Sunrise, FL 33351	3933	3	2.0	Yaakov Sayag	\N	\N	{}	t	\N	2026-02-05 23:01:34.49606	2026-02-13 00:35:34.264
4b00ca10-e8bd-472b-935a-c1ef970b324f	721307	721 N. Pine Island Rd Plantation, FL 33324	307	2	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.290082	2026-02-13 00:35:35.226
9bca3f34-3f30-4909-8b81-7291c9511fda	721116	721 N. Pine Island Rd Plantation, FL 33324	116	3	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.197165	2026-02-13 00:35:35.422
be11725e-64ef-4cc8-b372-f1ba8af4d66e	7801209	7801 Colony Circle S Tamarac, FL 33321	209	2	2.0	Marcela Sabag	\N	\N	{}	t	\N	2026-02-05 23:01:35.497589	2026-02-13 00:35:35.551
bb21ab6b-d858-4af2-9b4b-7dda06700cf3	18001205	1800 SW 81st Ave North Lauderdale, FL 33068	1205	1	1.5	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.076819	2026-02-13 00:35:33.823
5e5e8a87-95a0-47fc-9a02-46c8ed75ba62	18001304	1800 SW 81st Ave North Lauderdale, FL 33068	1304	2	2.0	Eliyahu Sabag	\N	\N	{}	t	\N	2026-02-05 23:01:34.107035	2026-02-13 00:35:33.885
26d09e7f-7d38-4871-a66d-712ce23882a4	721407	721 N. Pine Island Rd Plantation, FL 33324	407	2	2.0	Martin Piliponsky	\N	\N	{}	t	\N	2026-02-05 23:01:35.379115	2026-02-13 00:35:35.257
b22c81eb-fec5-403e-8584-6e4c4dc2934c	9971	9971 Nob Hill Lane Sunrise, FL 33351	9971	2	2.0	Yaakov Sayag	\N	\N	{}	t	\N	2026-02-05 23:01:35.776485	2026-02-13 00:35:35.836
f302fd02-8478-4ff4-a7bb-38172549e0f9	9999418	9999 Summerbreeze Dr Sunrise, FL 33322	418	2	2.0	Elad Goldstein	\N	\N	{}	t	\N	2026-02-05 23:01:35.836857	2026-02-13 00:35:35.898
faf260a3-fea9-4a06-a2cc-07afebfd2943	3900107	3900 NW 76th Ave Sunrise, FL 33351	107	2	2.0	Yugolo LLC	\N	\N	{/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/193c7a1f-db5a-48f7-969c-c7df091c1760,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/cb447d4e-7adc-4db1-aad8-2d2648319a33,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/dbeeb089-99f4-49d1-8cdd-a1fc817f09ee,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/624b2280-cc14-496e-a619-e86e1bd9f2c6,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/d908a7f9-cdd3-4231-bc1e-d8e6c3c028af,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/8207d37f-18a8-4fd3-b0a8-f674c3e0ea80,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/16a4d64c-2075-4ad9-8c0c-d2a06b9c50ed,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/fdd150ed-ee6c-4594-bacf-914d333b1e46,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/7961073e-7ccd-4331-81d0-00c3a6350c0e,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/8a87f9be-72bc-4cb7-b3af-1db921d76b0d,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/ad7a68c9-aa8d-472e-98d8-facd1eba8ac5,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/db14f39f-7dcf-4e91-b028-f5fac0875bc4,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/ed97eccd-5bf6-4875-8552-ae94f3d3df47,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/2aa72d22-6649-4766-bff0-288afd79d74d,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/211a8e51-b035-4954-8515-da032d048289,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/6690a9ed-5ab3-478c-93b9-1e5725c8a95f,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/58df5c2f-b1a6-4154-b256-9c79d1219558,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/5e8dd518-2574-4ab8-bc3c-c011ac586429}	t	\N	2026-02-05 23:01:34.46664	2026-02-19 02:25:38.826
a225a7aa-b416-4ed9-80b1-6d8cedca8621	3849	3849 NW 90th Ave. Sunrise, FL 33351	3849	2	2.0	Atid Realty LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.4373	2026-02-13 00:35:34.201
fc18756b-128a-45b7-815a-eebeaad7df9d	711403	711 N. Pine Island Rd Plantation, FL 33324	403	2	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.167718	2026-02-13 00:35:35.132
74170e7e-c663-4fe5-8729-84622e3c0f78	701102	701 SW 148th Ave Davie, FL 33325	102	3	3.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.013525	2026-02-13 00:35:35.037
fcc58f3f-cb2a-41d1-bff7-552294cacbb2	8060202	8060 Colony Circle N Tamarac, FL 33321	202	2	2.0	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.649835	2026-02-13 00:35:35.714
850c8d78-54f9-463f-9b68-906afa835504	8000205	8000 Fairview Dr Tamarac, FL 33321	205	2	2.0	Atid Realty LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.617686	2026-02-13 00:35:35.684
99af5fcb-2de4-4af2-b037-bf7037269efb	99991004	9999 Summerbreeze Dr Sunrise, FL 33322	1004	2	2.0	Elad Goldstein	\N	\N	{}	t	\N	2026-02-05 23:01:35.806798	2026-02-13 00:35:35.867
6dc18f11-82a3-46bd-9fb1-e6582da7d4c3	711203	711 N. Pine Island Rd Plantation, FL 33324	203	2	2.0	Lubren LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.106101	2026-02-13 00:35:35.163
e1eab10c-bfc1-477d-ab47-05e97e65c0d3	16401	1640 SW 40th Terrace Fort Lauderdale, FL 33317	1	2	2.0	Beraz Investment LLC	\N	\N	{/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/449915c5-a340-4c6d-a6a3-519f57837d29,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/50aad6db-2c7a-4616-91aa-eaaf76b31614,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/72e575e6-1aad-4839-a6cd-5ba71ccd9adb,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/e8390f2d-48ba-48cb-833f-4c9b8c40e3e2,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/c500a1b8-dac3-441c-a0f4-18f5f7d1ad26,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/4089476d-ace6-4af0-ad66-b3f90e6c2de0}	t	\N	2026-02-05 23:01:33.985892	2026-02-20 02:17:22.037
5e46250b-7b04-422f-b8d9-4a1a5406d62e	605201	605 S. Pine Island Rd Plantation, FL 33324	201A	3	2.0	Beraz Investment LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.945942	2026-02-13 00:35:34.741
5c4b3079-a2fc-41a7-a630-3c85e3d4677d	721405	721 N. Pine Island Rd Plantation, FL 33324	405	2	2.0	Martin Piliponsky	\N	\N	{}	t	\N	2026-02-05 23:01:35.349556	2026-02-13 00:35:35.288
eadc0f43-6597-4abd-a659-1b00fab7b9fd	7925210	7925 Fairview Dr. Tamarac, FL 33321	210	2	2.0	Yehoshua Mizrahi	\N	\N	{}	t	\N	2026-02-05 23:01:35.58733	2026-02-13 00:35:35.652
d952a10d-53c3-4ca1-a243-bfef0293db06	485201	485 N. Pine Island Rd Plantation, FL 33324	201A	2	2.0	Prosperity ARN LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.855855	2026-02-13 00:35:34.646
b4509aa6-55f4-4141-a270-af88f592f0ee	10050103	10050 Winding Lakes Sunrise, FL 33351	103	2	2.0	Niluc LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.788856	2026-02-13 00:35:33.527
89e380f7-c416-4aee-822d-46a5b5db0f4d	129202	12920 Westview Dr Miami, FL 33167	2	0	1.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.891004	2026-02-13 00:35:33.657
e0a41b41-51e4-4d95-8b52-10ef24c35ebc	129203	12920 Westview Dr Miami, FL 33167	3	0	1.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:33.924035	2026-02-13 00:35:33.688
36c03f97-910e-4c8f-9928-c76ee114f421	7925205	7925 Colony Cir S Tamarac, FL 33321	205	2	2.0	Atid Realty LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.557734	2026-02-13 00:35:35.616
548bd909-1244-49f6-929f-7439859283b4	16402	1640 SW 40th Terrace Fort Lauderdale, FL 33317	2	1	1.0	Beraz Investment LLC	\N	\N	{/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/2d843081-36ca-4919-bee1-452a0c5e9204,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/e8fdc9bf-f378-4f12-b7dd-d1aa8f84d333,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/01dc0cdd-1991-4044-9551-9262f503e1ac,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/6b33a3f7-6e35-4af1-8660-43dc8c437d52,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/c9a35c3d-30cc-42d4-ae0b-79f9a93f186d,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/044f008c-f5ca-46e3-9dc4-dfbb02ac13e0,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/b3463b2e-30f7-4ea1-8cb3-2022365d292e,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/355bfb19-b5f4-47bf-b4b0-a30f2e2e3a78,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/5f23342a-c732-4293-8116-37ca9d836719,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/75d9b746-2eeb-4b7e-922f-b9297258dea0,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/c5dbb6e2-3f2f-4f99-b9b0-0fb0134eebe1,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/9f3278aa-8376-40f0-947e-9a990b9d61f8,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/91f621c4-b70f-4197-9097-db1b02013e9a,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/c7f458fe-43de-4ed0-a4f6-927964588e6d,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/ecdc5c6b-31ca-4c11-9795-64d514058ede,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/b31f9f18-7c3a-4d5b-8667-4e1d05fb5028,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/0030d749-b4da-4170-888f-1bc3c76c04e8,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/57cbf3c3-8225-4924-8b21-d4e60affc988,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/6a938d9e-8351-4391-a5f1-3d3bc805b7f4,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/5ead2d75-a769-4972-a9c8-17764c6fe17f,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/0c9a356d-f7bb-4fa9-bdef-96b6f3d2f5a9,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/a5db2780-ff73-4cb0-8dde-f244bc0a5992,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/939c259d-3243-4ba4-9d68-2cb437a5ddee,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/24361479-69d9-493b-ab02-dffc2ac75d36,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/81771915-b906-4ddc-8089-d23b18dc2ca2,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/d3a6123f-5193-41d3-ae5e-71e1127598a6,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/a1267539-0666-4469-8084-bcf0a8f33b85,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/5f2dc0f9-98ba-4b63-9e52-0029025ab7a7,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/2b642d87-c677-4297-846f-7eb0e14ebd0c,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/1abee8ad-228c-4a94-a7d6-eef532c11a82,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/287e52cf-f0bc-4608-9944-7fe0e18925ae,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/99acdc36-3e90-4a3d-9517-105479e41f80,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/a83a4134-ee77-4388-b57d-b7b44be097a2,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/10f6a021-81aa-479b-963c-0419c5991bad,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/cbfd309b-46b5-447c-9ec3-02dea3d9261c,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/6ef6d346-81cf-4e8b-a965-9192e12918b4,/replit-objstore-9d4d7b5c-7c67-4425-bcaf-16d70225523d/public/property-images/7a19232c-f871-4afc-b082-1db88f010264}	t	\N	2026-02-05 23:01:34.016162	2026-02-19 02:24:56.158
54f4110a-9ee8-4330-bd51-2108abf81297	483202	483 N. Pine Island Rd Plantation, FL 33324	202C	2	2.0	Prosperity ARN LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.825577	2026-02-13 00:35:34.615
eba5b546-d1fe-4c32-8230-a3326afa3994	505408	505 S. Pine Island Rd Plantation, FL 33324	408B	2	2.0	Prosperity ARN LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.885816	2026-02-13 00:35:34.678
f565bd12-9e29-42d3-9385-c246f7d75884	7027	7027 W. Sunrise Blvd Plantation, FL 33313	7027	2	2.5	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.046158	2026-02-13 00:35:35.069
82934dbf-cf10-4943-bf5e-03c31c1fe4f7	7800102	7800 Colony Circle S Tamarac, FL 33321	102	2	2.0	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.468143	2026-02-13 00:35:35.518
dacd12f9-cc1f-4edb-9470-186337b87270	7901205	7901 Colony Cir S Tamarac, FL 33321	205	2	2.0	Atid Realty LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.527922	2026-02-13 00:35:35.583
6b4acb7a-2453-4d09-b0e7-7924578ca894	18203216	1820 SW 81st Ave North Lauderdale, FL 33068	3216	2	2.0	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.228084	2026-02-13 00:35:33.978
af460b11-1e5f-494d-ae27-ec7ec781beef	7341	7341 W. Sunrise Blvd Plantation, FL 33313	7341	2	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.438815	2026-02-13 00:35:35.486
066a5546-82bc-46ce-9035-19aff37cd90e	18102110	1810 SW 81st Ave North Lauderdale, FL 33068	2110	2	2.0	Asher Ron	\N	\N	{}	t	\N	2026-02-05 23:01:34.318635	2026-02-13 00:35:33.916
221c55fd-14b7-491d-bfec-0f8783683fd9	443919	4439 Treehouse Lane Tamarac, FL 33319	19D	3	2.0	Yehoshua Mizrahi	\N	\N	{}	t	\N	2026-02-05 23:01:34.675487	2026-02-13 00:35:34.451
2d0d2f04-32ff-4c1f-b4f2-796a6f819f15	18001401	1800 SW 81st Ave North Lauderdale, FL 33068	1401	1	1.5	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.137437	2026-02-13 00:35:33.854
454765a6-b77f-4801-926f-88e1c0871028	5090105	5090 SW 64th Ave Davie, FL 33314	105	2	2.0	Yehoshua Mizrahi	\N	\N	{}	t	\N	2026-02-05 23:01:34.915264	2026-02-13 00:35:34.71
675a243c-33b3-4188-ab07-1f55ba714455	7300201	7300 NW 17th St Plantation, FL 33313	201	2	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.408692	2026-02-13 00:35:35.455
5bd6b7cb-f3b9-4b67-adb5-f43c7b1e4ddb	18203200	1820 SW 81st Ave North Lauderdale, FL 33068	3200	1	1.5	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.167082	2026-02-13 00:35:34.01
24a2dc9e-4c4d-41da-9d8f-738b0ca10894	18304215	1830 SW 81st Ave North Lauderdale, FL 33068	4215	2	2.0	DCPC LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.258246	2026-02-13 00:35:34.041
e92a5477-fd0b-426d-979d-48cbb7069813	3262	3262 Coral Ridge Dr Coral Springs, FL 33065	3262	2	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.377182	2026-02-13 00:35:34.139
58992ec0-510f-42c9-9b7b-7025455920d8	3634	3634 NW 95th Terrace Sunrise, FL 33351	8L	3	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.407464	2026-02-13 00:35:34.17
2db432af-0111-4d26-8a6f-7c937f6ce6e2	4169205	4169 SW 67 Ave Davie, FL 33314	205A	2	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.614974	2026-02-13 00:35:34.388
833386b3-230d-4600-a86a-bcf3663d22e4	4204	4204 NW 114th Terrace Coral Springs, FL 33065	4204	3	2.5	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.64472	2026-02-13 00:35:34.42
bab2d165-0df2-4bf6-916d-4e8d1440fccd	1699	1699 NW 127th Street North Miami, FL 33167	1699	3	2.0	Niritb LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.046653	2026-02-13 00:35:33.792
2be0a5e3-a7f7-4700-a351-bd2100ad793e	3100202	3100 N. Pine Island Rd Sunrise, FL 33351	202	2	2.0	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.347748	2026-02-13 00:35:34.101
34b57a34-ea34-4203-b7cd-578a92387719	721205	721 N. Pine Island Rd Plantation, FL 33324	205	2	2.0	Lubren LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.259867	2026-02-13 00:35:35.39
ae6d2a44-5f47-49ea-a46a-336886217117	455304	455 S. Pine Island Rd Plantation, FL 33324	304C	2	2.0	Beraz Investment LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.704993	2026-02-13 00:35:34.549
3525a1aa-b17d-40e1-b990-b3746763823c	605304	605 S. Pine Island Rd Plantation, FL 33324	304A	2	2.0	Beraz Investment LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.978307	2026-02-13 00:35:34.773
ea310309-d19a-4a0d-a943-346be258016a	711301	711 N. Pine Island Rd Plantation, FL 33324	301	2	2.0	Lubren LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.138015	2026-02-13 00:35:35.195
a353a3ec-9b65-4002-83e8-0cdc81409908	455409	455 S. Pine Island Rd Plantation, FL 33324	409C	2	2.0	Eliyahu Sabag	\N	\N	{}	t	\N	2026-02-05 23:01:34.76598	2026-02-13 00:35:34.484
a5c22c2a-10d5-4df2-b119-625db3bfa5e7	455407	455 S. Pine Island Rd Plantation, FL 33324	407C	2	2.0	Eliyahu Sabag	\N	\N	{}	t	\N	2026-02-05 23:01:34.735833	2026-02-13 00:35:34.518
9bc367a7-469b-4fc7-9c9e-91dc92bd1ee6	406509	406 NW 68th Ave Plantation, FL 33317	509	1	1.5	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.585297	2026-02-13 00:35:34.326
c3c7c2ab-90f9-43bf-89d0-35435ddb7b2e	406308	406 NW 68th Ave Plantation, FL 33317	308	1	1.5	Factory 26 LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.55545	2026-02-13 00:35:34.357
2be831d1-393f-4325-b539-28c1357de2d3	471408	471 N. Pine Island Rd Plantation, FL 33324	408D	3	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:34.795673	2026-02-13 00:35:34.583
a8f50e23-a72e-4f60-b8cc-d12e276bb1a7	711102	711 N. Pine Island Rd Plantation, FL 33324	102	2	2.0	Cocomil LLC	\N	\N	{}	t	\N	2026-02-05 23:01:35.076066	2026-02-13 00:35:35.1
\.


--
-- Data for Name: rent_charges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rent_charges (id, lease_id, tenant_id, property_id, charge_month, base_rent, late_fee_amount, late_fee_applied, late_fee_applied_at, total_due, amount_paid, status, due_date, paid_at, created_at) FROM stdin;
f562c7e7-1586-413f-a509-458ee8c11877	036ee103-d1ba-4bc5-8a5c-f0eeea5c58eb	05562977-ba94-4ab0-95b5-6f8f079d26c5	269da26f-21d6-4b5f-88fb-064a6ee484d8	2026-02	3700.00	0.00	f	2026-02-13 05:01:11.453	3700.00	3700.00	paid	2026-02-01 00:00:00	2026-02-18 23:08:04.014	2026-02-11 05:54:01.021502
a884108f-3124-4fd4-a01e-9ba641acb4c8	27415c42-877f-4b05-b0ad-221a9cd2fc40	9a061ce9-a28c-4c65-acfc-13afbae8f1b2	8a948e9e-08c6-441b-9088-7d07c453b370	2026-02	17775.00	0.00	f	2026-02-13 05:01:10.753	17775.00	17775.00	paid	2026-02-01 00:00:00	2026-02-18 15:40:05.727	2026-02-11 05:54:00.766784
e1bc0c7a-2d5e-4d19-8fc6-31e1b8b490b2	e0eecb68-0eb3-49f5-9afb-e222a43fbf90	775fda8a-0a5c-4265-b129-561208527fa6	8f1d97be-3e81-41cf-9fc0-8919857ff31d	2026-02	2830.18	0.00	f	2026-02-17 22:15:24.143	2830.18	2830.18	paid	2026-02-01 00:00:00	2026-02-19 02:44:04.401	2026-02-11 05:54:00.707426
17a986da-afbc-44e1-aa2b-5d43796ce403	091557a4-e4e2-408d-ad0d-a9b78a2acd0d	4af12acd-6b9d-4594-bc38-e8f9ad363ff5	a676d548-44b7-4650-9d48-f2018d70ace2	2026-02	4940.83	0.00	f	2026-02-17 00:19:30.999	4940.83	4940.83	paid	2026-02-01 00:00:00	2026-02-18 23:07:15.449	2026-02-11 05:54:00.885569
10ac4a61-4d1b-46ec-9408-58e50da88385	e3afb1e1-60d0-4a88-b25b-14e6128c6712	f4ad0dde-2f80-4fc6-a72a-52f8c459aeed	42c6c99f-893a-4b5c-8b3b-0a565f66a82d	2026-02	6194.60	0.00	f	2026-02-13 05:01:12.353	6194.60	6194.60	paid	2026-02-01 00:00:00	2026-02-19 02:46:48.079	2026-02-11 05:54:01.198933
5138b643-79f5-456b-ac1e-de3902bca5b1	2abe3e09-f69f-4413-af11-eb0a67d85659	95fda6d0-8705-4bad-aea8-16f89386264d	4366c6a4-72a1-4252-b6a5-64a33fdd170c	2026-02	18344.02	0.00	f	2026-02-17 23:15:10.443	18344.02	18344.02	paid	2026-02-01 00:00:00	2026-02-18 15:09:20.967	2026-02-11 05:54:00.962726
72fa11e8-9b7b-4001-81fe-61a52cef7064	3d5a0477-e964-42eb-b835-2e95f2d7e3c6	19d74eec-4607-4e74-a8ff-f110a0e303f3	67199d1c-bff2-4b61-b9d5-e8c705d7a6be	2026-02	3379.06	0.00	f	2026-02-13 05:01:12.153	3379.06	3379.06	paid	2026-02-01 00:00:00	2026-02-18 23:08:34.697	2026-02-11 05:54:01.13983
1958ce2b-5e27-43ef-bf81-4889622cafd3	292eecab-0fef-4c8f-b844-c147c9ce3dc1	29be5c7c-205b-4851-a829-1108fcd5c3a4	fc8496d2-6418-452c-b00f-933f0e6ac1a9	2026-02	1850.00	0.00	f	2026-02-11 05:54:56.581	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-18 23:10:44.082	2026-02-11 05:54:02.02262
0ba97d62-6330-400a-8ce9-c00d881a5b5d	cc7bac68-e28d-4ebe-8007-cd7bd7ea4587	92351ec6-bd88-4325-bf78-40b792f7d86a	cc7c14fc-3218-493c-bd93-3924788d0bfa	2026-02	1850.00	0.00	f	2026-02-13 05:01:12.953	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-18 23:08:51.798	2026-02-11 05:54:01.672504
00260b7e-eecd-400e-86b3-a8fa05224685	6da5d7db-41fc-46d7-ae8d-7dd54453724e	d7a221fc-0dcd-4504-874e-5ef686290b93	02da684a-bd59-4c73-bdd6-f58d5c2eba87	2026-02	1850.00	0.00	f	2026-02-11 05:54:53.181	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 02:47:19.405	2026-02-11 05:54:01.552895
315ea754-6ed7-416b-b2a4-d8515ea20d74	e98a262a-7c0f-40e6-bf7e-56c920d29f71	86aa7513-2cfc-481e-8ef3-799e54a4ad78	09e02c29-ca98-4401-a02c-bf7ff8c05690	2026-02	1550.00	0.00	f	2026-02-11 05:54:51.881	1550.00	1550.00	paid	2026-02-01 00:00:00	2026-02-18 23:09:16.127	2026-02-11 05:54:01.493882
65c147c6-a2a7-486e-b116-b34a661711e1	ab57b285-385e-459b-b3dd-4015e42da4d1	4c7acff0-69a8-4492-b9ce-83e88037b125	2ad6b6cc-0ddd-411b-b04d-f3b443faef79	2026-02	1850.00	92.50	t	2026-02-11 05:54:50.881	1942.50	1850.00	partial	2026-02-01 00:00:00	\N	2026-02-11 05:54:01.257788
e0abb730-7384-4e4d-8c00-ceb975e5e1d3	65febff4-3847-42e8-a707-2015c9e87f5b	156a0479-b7ec-4409-83cd-df2cfcd42fd8	969baf09-8994-41fb-afde-ac67fd532fa6	2026-02	3427.74	0.00	f	2026-02-13 05:01:11.853	3427.74	3427.74	paid	2026-02-01 00:00:00	2026-02-18 23:09:57.087	2026-02-11 05:54:01.080705
636d1432-45f5-470b-901f-8b15aee7d572	fd435234-8554-4401-abc6-b7b81154b3f0	b5b430a2-cf8e-417b-a758-56b8e05488ca	bb4dbf04-dd29-4cf2-9c72-310b3388698f	2026-02	3000.00	150.00	t	2026-02-11 05:54:51.481	3150.00	3000.00	partial	2026-02-01 00:00:00	\N	2026-02-11 05:54:01.374573
9862312b-92e3-422a-b9b6-a493ddf3b319	7b1664ae-53ad-4cf5-9f2b-f700edd0c128	6d28935a-c2c0-4b11-8aa2-98aaf948f15b	183262a6-dfef-45f2-b103-cdf3cb232877	2026-02	1875.00	0.00	f	2026-02-11 05:54:55.481	1968.75	1968.75	paid	2026-02-01 00:00:00	2026-02-19 04:08:24.639	2026-02-11 05:54:01.789423
6542ec81-b610-4eb1-91f4-d9514b45ee05	ce6d33c9-a4e9-43d2-8c2f-b0cd819b3e48	387fdafb-4fc9-4628-b3c4-8e01cdbbbc4c	be8fe484-b83e-4a28-9563-a3ef22d34862	2026-02	1650.00	0.00	f	2026-02-11 05:54:58.681	1650.00	1650.00	paid	2026-02-01 00:00:00	2026-02-18 23:11:01.161	2026-02-11 05:54:02.296677
25a07226-e12c-4315-a221-fca41e3a7b3e	b2ca8462-a53e-4d11-99b1-69af254515f8	7f3cf108-79c5-41c5-a8d8-1cdcfe7b9192	b2d5c003-a7d9-48d8-92b5-140a63e41fc9	2026-02	1850.00	0.00	f	2026-02-16 23:19:32.193	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:49:50.402	2026-02-11 05:54:00.583854
3a5298f0-0db6-467c-997d-d49c922b91c4	79577654-1eab-49ff-ab6c-0c35ec850af0	c20b400c-982f-41e4-8a3f-e03a540f6e44	14768530-05db-4656-b419-8ca2a1c664d9	2026-02	1800.00	0.00	f	2026-02-11 05:54:53.881	1800.00	1800.00	paid	2026-02-01 00:00:00	2026-02-13 04:24:19.331	2026-02-11 05:54:01.612446
b8ccb1c9-3096-448d-b7cb-717b16bcbc14	b1dcaa8a-80ec-4d38-97c7-f2a6ebf79814	a5996f00-086c-4ceb-82a5-7c98d442f799	c6b6c9a9-56f9-4aaa-bb36-195ca6bf816b	2026-02	1825.00	0.00	f	2026-02-11 05:54:56.281	1825.00	1825.00	paid	2026-02-01 00:00:00	2026-02-19 03:50:08.099	2026-02-11 05:54:01.964402
f28f57f3-d135-4c6a-a856-bb66c2a70276	ac82b0e5-0ceb-435d-a2fe-bc0f633df32e	ef9e1cf1-5bc5-41e6-bbd5-5277650ccc14	51faa6a3-a75f-4c02-ab1a-24a25c42917d	2026-02	6270.83	0.00	f	2026-02-13 05:01:10.553	6270.83	6270.83	paid	2026-02-01 00:00:00	2026-02-19 02:39:44.261	2026-02-11 05:54:00.461464
9b7c26e6-7976-44ba-b46f-e6f8e2fe0490	4dd2e94e-35df-4e69-a355-d1b91a499cad	cc87fbd3-42ae-42b8-a0bf-393ad8d98b08	42cb0b25-7347-4d58-8194-298763c49d33	2026-02	1650.00	0.00	f	2026-02-11 05:54:55.681	1650.00	1650.00	paid	2026-02-01 00:00:00	2026-02-13 04:24:34.31	2026-02-11 05:54:01.84752
715856ae-d1bc-4453-b33c-8d98f7b9e958	f0bc1797-34f3-4dec-befc-a00948f68001	b3fcd381-a046-4c25-a28d-71992ac1ebf1	1c6aa700-bc22-4acb-9159-01eab97f09f9	2026-02	2050.00	0.00	f	2026-02-11 05:54:58.381	2050.00	2050.00	paid	2026-02-01 00:00:00	2026-02-19 03:22:29.192	2026-02-11 05:54:02.199368
cd6d6799-0f2e-49f5-8006-eabd2a8c759e	8ddbf2e8-545a-433d-bdb8-1855066368a2	d5789aeb-3df6-413d-be54-f85190e324c2	e8bac227-c8ff-42fe-adb4-c131e85bf61d	2026-02	1875.00	0.00	f	2026-02-11 05:54:57.081	1875.00	1875.00	paid	2026-02-01 00:00:00	2026-02-19 03:50:37.501	2026-02-11 05:54:02.081244
3ca71100-a3d4-44c6-8376-b76192afe315	cdcf6eae-8d79-4d61-8ff3-0eeb4edaada4	676223ba-a96d-419f-84c0-70e53399b9b9	abe74a99-2bb2-495a-9602-bbefaa9d30a0	2026-02	1600.00	0.00	f	2026-02-19 03:00:41.733	1600.00	1600.00	paid	2026-02-01 00:00:00	2026-02-19 03:26:07.002	2026-02-11 05:54:01.905778
afd6d82e-45c6-466e-90b0-487f2372143c	e09441b4-686b-4536-a094-c1847ff8c88c	e98f0623-49a8-4eac-a0e4-330c92900ff2	5eb0172c-2bd3-497a-8aa0-eab3e6151aa8	2026-02	1850.00	0.00	f	2026-02-11 05:54:57.781	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:51:37.586	2026-02-11 05:54:02.140761
caf6973f-aa79-4d07-889c-1c208719a5b7	5dbe1e69-a6e7-4152-9c8b-0201a00bb7cf	bf180b48-07c9-4d0f-beba-acab894d5a66	d91bcd2a-01e1-48c8-94bf-4f4070c108f6	2026-02	1850.00	0.00	f	2026-02-13 05:01:09.898	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:52:23.197	2026-02-11 05:54:00.522862
e90ea450-2a62-4354-8c04-e9c1c6aefb97	43319232-c196-4182-8a50-92fc03ee5fed	40167b05-30f6-4952-94c8-edc9e7c550ad	98074ce8-8e6b-43d7-b364-6df96cd393a2	2026-02	1900.00	0.00	f	2026-02-11 05:54:59.481	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:52:58.378	2026-02-11 05:54:02.896768
6646cfd5-50e1-4795-8ea8-5b569876a6ab	97613182-1000-4a55-bb31-e22d5b91c0f6	47346ea8-fa52-4ba9-a9b5-ccc77972f869	455195c3-bd74-418f-b604-b8973e63888d	2026-02	1850.00	0.00	f	2026-02-11 05:54:59.781	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:53:15.948	2026-02-11 05:54:04.899519
c49c3bb9-71af-4517-8db4-4ccc0c9d9d4e	e6cbcc99-b084-4f97-aecd-206281a27e88	02715854-9903-4614-83bd-ababe94e0bda	72d41b3a-57da-401e-b935-e4df326e908d	2026-02	2300.00	115.00	t	2026-02-11 05:54:46.581	2415.00	2415.00	paid	2026-02-01 00:00:00	2026-02-12 03:29:02.665	2026-02-11 05:54:00.647602
569e50d4-d12a-4218-9b91-888971779b99	b42e4e08-a6ee-434b-a7f0-f0124accf161	7845ce20-b115-4785-a452-ecda45d633b0	a591f7bd-9537-4d4d-a3dd-ade92561d0a9	2026-02	1700.00	0.00	f	2026-02-13 05:01:13.753	1700.00	1700.00	paid	2026-02-01 00:00:00	2026-02-19 03:53:32.218	2026-02-11 05:54:09.896652
320d253e-55b7-458f-ae74-74938f34972f	1f75c58e-c016-4872-9071-53705ce27cd9	ec6b578f-2814-4e56-8ec8-f3b78956585b	83e3e8c8-3a19-43e7-ac98-decf70e07373	2026-02	2247.00	0.00	f	2026-02-13 05:01:13.253	2247.00	2247.00	paid	2026-02-01 00:00:00	2026-02-19 03:53:48.966	2026-02-11 05:54:10.696856
b3d192f7-82c8-455b-bca7-b176ffdf3665	13142a3f-ed20-4201-bd67-6efb89f8e65f	5285bdc3-fd24-4657-ad05-95fc6158d319	86f68b5a-519e-451b-aa3f-3715e0d4e312	2026-02	2200.00	0.00	f	2026-02-11 05:55:01.583	2200.00	2200.00	paid	2026-02-01 00:00:00	2026-02-19 03:54:04.92	2026-02-11 05:54:11.996508
ef4f3dc7-9e40-4028-a8e6-028a628e9b85	b4b192da-9e07-427b-964c-02c4d011fd46	57daac38-7e27-4bd0-9124-9518be954dc9	f8481f03-f05a-48f3-9c41-49dd2ceb22b7	2026-02	3500.00	175.00	t	2026-02-19 03:54:28.764	3675.00	3675.00	paid	2026-02-01 00:00:00	2026-02-19 03:54:32.47	2026-02-11 05:54:13.596475
a2ddfd0e-3f7c-4f2a-a6fd-e60d833cd71e	3d7e16df-219e-4249-8c81-7df230acf6f8	98a9fbb2-2d28-4b6c-91cd-70a95b97022a	d77557c8-e5c1-4bb8-a615-91b762b4ce44	2026-02	1900.00	0.00	f	2026-02-11 05:55:03.381	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:55:20.728	2026-02-11 05:54:13.896881
6176e733-ca90-4946-8a2a-ce12ad478b68	ddf0b58b-71c1-4338-8587-c43a6c0bbd83	b8179d2a-2831-4889-b6a2-46e621f62da2	d4c28d6e-b53a-47e9-b162-596be30afdc4	2026-02	2000.00	0.00	f	2026-02-11 05:55:05.698	2000.00	2000.00	paid	2026-02-01 00:00:00	2026-02-19 03:59:17.561	2026-02-11 05:54:28.196443
721da1dd-cdeb-40e7-8508-bd4e738b84f4	21477e28-59bb-4e0d-9000-c8c4d4bddba8	b0174803-da61-4ff8-8ed8-f57d03d4cbb0	b3049bba-0101-4c43-9f9f-4444591f9d1a	2026-02	2000.00	0.00	f	2026-02-11 05:55:03.581	2000.00	2000.00	paid	2026-02-01 00:00:00	2026-02-19 03:56:07.373	2026-02-11 05:54:14.096621
f52ac336-99c6-4470-83d7-33b8a80f492a	d38ffc32-8c53-45e8-bef4-8ed7da4f29b7	da1db128-3ee4-4648-b736-5b4cf1f6d83a	59ef9f3d-685c-4557-92f8-7bb67244d303	2026-02	1900.00	0.00	f	2026-02-11 05:55:03.881	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:54:50.831	2026-02-11 05:54:14.396669
d8ec4d3a-483a-4146-ae14-2dd35336552d	ee2ee37d-c4be-4251-b783-518d44c06577	443f3c98-78c2-4344-b378-1b60a711255e	43195ca4-5135-4371-bce8-3b5e6ecc7372	2026-02	3500.00	0.00	f	2026-02-11 05:55:04.781	3500.00	3500.00	paid	2026-02-01 00:00:00	2026-02-19 03:55:37.935	2026-02-11 05:54:16.296727
b89e64ce-10ec-4637-bf6b-9caaf9f15539	eb97b9bd-9e8e-4957-8697-343ab5e2ec6a	90460276-b6bb-4859-b5eb-06d5a452fb67	4d0b1796-73dc-4845-a88e-15defa0a6597	2026-02	2200.00	0.00	f	2026-02-11 05:55:02.481	2200.00	2200.00	paid	2026-02-01 00:00:00	2026-02-19 03:56:20.48	2026-02-11 05:54:13.096549
d19788cc-e7e5-4439-bf2f-434e04939482	6b31a584-091d-4edb-b318-b6cb7e35330f	db290e15-abbc-4293-aa64-604cf78d9796	90070f5e-3a98-4ebf-8ad5-3e6f40e10a89	2026-02	1900.00	0.00	f	2026-02-11 05:55:02.081	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:55:06.849	2026-02-11 05:54:12.596708
e48b3e88-67eb-4d58-9553-42f4f4fa6039	b6c318f6-2abe-469e-8c3b-411efaf2de4f	44ae318e-01e2-429a-8fb5-a5808c1ea797	ddd7b82e-4db2-40a0-bcbe-fe71d2929a23	2026-02	1050.00	0.00	f	2026-02-11 05:55:10.281	1050.00	1050.00	paid	2026-02-01 00:00:00	2026-02-19 03:46:31.645	2026-02-11 05:54:31.696838
d2c4bff3-69b4-4298-a904-02edb31d350d	bcc784b1-fc07-4419-9c1f-d4fadcbebbf5	0eb4a8cf-ecac-4106-9847-76b875c048b4	e0d13e3b-0693-4a08-a08a-a08f96743052	2026-02	3200.00	0.00	f	2026-02-11 05:55:02.681	3200.00	3200.00	paid	2026-02-01 00:00:00	2026-02-19 03:55:52.177	2026-02-11 05:54:13.396631
513e9623-9362-4758-a909-acb7aee2d162	a7c2e607-b16d-47dd-b805-52de32710674	14044383-1b71-42b2-8777-82d3cc09dcb1	67708874-dff1-4013-baa7-7781a95ed6a6	2026-02	1843.96	0.00	f	2026-02-11 05:55:06.681	1843.96	1843.96	paid	2026-02-01 00:00:00	2026-02-19 04:05:10.65	2026-02-11 05:54:28.996966
79ab8def-74af-4f12-bea7-91ab92fdc524	225684ec-89cb-426c-9da8-87f851167db7	dd0e9bff-2c5b-41e3-898d-a5eb61797aab	a86ac1b9-2e41-4e82-bef0-f89a4c2c6af3	2026-02	1050.00	0.00	f	2026-02-11 05:55:09.681	1050.00	1050.00	paid	2026-02-01 00:00:00	2026-02-19 04:05:58.131	2026-02-11 05:54:30.896924
d16521b6-bd8f-43f5-90b3-6b67c198615a	13c0d43e-c327-4d50-bf21-65cdd968b05a	0946dcb5-100a-417e-9810-505628513a45	e3816d0c-ecf7-4513-bc85-c8bfd9cd8205	2026-02	1823.20	0.00	f	2026-02-11 05:55:06.281	1823.20	1823.20	paid	2026-02-01 00:00:00	2026-02-19 04:03:06.838	2026-02-11 05:54:28.696509
547c5679-1aec-4daa-98f8-77332ad8a7c0	da67beac-6a3f-46da-b825-4a1a8b5f1732	0e6a0f87-c26a-4810-adaa-93eb993b0e90	36586d77-bd0e-46b2-95e0-bf8eae913eb9	2026-02	7936.49	0.00	f	2026-02-11 05:55:05.579	7936.49	7936.49	paid	2026-02-01 00:00:00	2026-02-19 03:59:47.482	2026-02-11 05:54:26.796513
8c0f87bf-cc5f-4fc6-98dc-ca6ff5f87852	fb71289f-60ff-4b5d-911a-b031952e5c16	d48f96fc-74c4-4ae8-a1a8-125c294aaef2	08a4ac57-f238-4da3-9bae-2fe844271b97	2026-02	1700.00	0.00	f	2026-02-11 05:55:05.639	1700.00	1700.00	paid	2026-02-01 00:00:00	2026-02-19 03:59:30.151	2026-02-11 05:54:27.896581
120e0c0a-1e6c-45a6-96d9-2fc1c38f6aac	1f13c4ae-1a25-4c44-bbc0-8cefa575ac6e	3ba53dee-cbc3-44cc-9bf4-1b956c8258c7	c772f7e6-edc6-4152-9b94-f47653df0094	2026-02	2200.00	0.00	f	2026-02-11 05:55:04.981	2200.00	2200.00	paid	2026-02-01 00:00:00	2026-02-19 04:04:42.615	2026-02-11 05:54:17.296817
f2f7c2da-c49c-4d44-b513-d76b93d8b3c1	4b3cdcd6-3640-4029-8ba8-be27495eed1b	e482bc80-5b03-4556-93cf-0a945c5de35c	196b5689-3295-4b2a-a79b-cb111ad934ec	2026-02	11000.00	0.00	f	2026-02-11 05:55:05.981	11000.00	11000.00	paid	2026-02-01 00:00:00	2026-02-19 04:03:23.639	2026-02-11 05:54:28.396842
39baa2da-f26b-4f76-8234-e9c07b57d591	2f60ba43-9926-4c70-bff9-0d205c483902	3feb20b8-aa55-465d-9ee1-161a5ca508d6	5b25bdca-4101-4e1e-b4cd-36e8ce0e2b0e	2026-02	1500.00	0.00	f	2026-02-11 05:55:05.518	1500.00	1500.00	paid	2026-02-01 00:00:00	2026-02-19 04:05:24.58	2026-02-11 05:54:25.497338
ac52df17-021a-484e-ab0a-09c3696791bc	6377cfaa-28c0-44cd-9c00-10af8c90dffb	f66f312c-7270-4a9a-8b46-bfc07687bdd3	0da4bc3f-b4af-4d76-9236-6d357eb629d6	2026-02	3800.00	0.00	f	2026-02-11 05:55:06.981	3800.00	3800.00	paid	2026-02-01 00:00:00	2026-02-19 04:06:41.26	2026-02-11 05:54:29.296702
2d7c75c7-604f-4249-a877-0353a4746e19	bf29a770-2cf8-44c5-be65-09babaf66220	4f6730b8-5351-48d3-af64-485a8ba3ff19	e88fd285-ed8f-4704-a29e-9453177c1a78	2026-02	5400.00	0.00	f	2026-02-11 05:55:07.481	5400.00	5400.00	paid	2026-02-01 00:00:00	2026-02-19 04:06:28.212	2026-02-11 05:54:29.696444
b7725de0-8b25-41bc-aa0f-d98d10c6ea69	9f67e196-ddce-48b3-bcae-e60bfeaacdf1	48d65dcf-badd-44c2-8cea-48f380e85805	fa3d9be2-16fc-4144-aec3-d484b7b08de7	2026-02	1250.00	0.00	f	2026-02-11 05:55:08.081	1250.00	1250.00	paid	2026-02-01 00:00:00	2026-02-19 04:06:14.656	2026-02-11 05:54:29.896404
acad8129-bf27-4b92-ac04-9b516b128423	1c9d630b-8a2c-45d8-9da3-4e9c679c0860	507b7e5c-655d-48f7-b9b4-17c1441c77ae	011896b8-9ba6-4d23-9513-b63271aa508f	2026-02	1700.00	0.00	f	2026-02-11 05:55:11.981	1700.00	1700.00	paid	2026-02-01 00:00:00	2026-02-19 03:46:55.817	2026-02-11 05:54:35.096588
255cda7e-6550-4ee4-a542-65c49aa89e67	650334fd-aa3d-40cf-bedb-191e670f1e0e	1e95d34d-5dce-4ec2-a749-0ce70d7e5ff5	1f346dfa-32c1-44eb-a9dd-556d4d1de13f	2026-02	2000.00	0.00	f	2026-02-19 03:00:42.333	2000.00	2000.00	paid	2026-02-01 00:00:00	2026-02-19 03:52:40.635	2026-02-11 05:54:15.196795
3cc2f742-21cf-40e9-b8be-1f6d9c1180e3	9c6156a3-c50b-4e18-b847-6ee08e8ac1d3	e73e273f-1c08-4b92-a73c-e03b6ff26518	9026f5c4-57cd-424a-b2f5-530bf180c84f	2026-02	1900.00	0.00	f	2026-02-11 05:55:12.281	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:48:44.309	2026-02-11 05:54:35.396445
9a44fd31-79a2-45cf-8aeb-d70e06d4a2d4	fde9a8a0-2f8f-44a2-86a4-3da365143e47	fe5243c2-dca1-46b0-a98c-b9bd09e8edde	b89f602d-1298-41e5-90fc-9b63afec44e9	2026-02	1825.00	0.00	f	2026-02-11 05:55:11.581	1825.00	1825.00	paid	2026-02-01 00:00:00	2026-02-19 03:47:52.192	2026-02-11 05:54:34.896455
d2b41fd7-416d-4b7b-a2b1-37e2b06dc019	45da57e1-7967-45b5-bd81-4e4c076720c5	69f472b0-c0b1-4c0d-a016-f51cd07c9a8a	8cee52a3-83f8-4901-b8dd-dd4cb7ce691b	2026-02	1900.00	0.00	f	2026-02-11 05:55:12.681	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:49:10.129	2026-02-11 05:54:35.69651
15c78dcd-e330-4161-b756-980f5c02d74b	a807700e-9e65-41f4-88cf-3a1f442e4843	6a5073bc-24d2-421f-b8b5-7ee1ae241b15	90a27344-6e91-46d9-953a-8ed29d05d856	2026-02	1900.00	0.00	f	2026-02-11 05:55:11.381	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:49:26.17	2026-02-11 05:54:34.696484
14d7299a-cd33-42bb-bd57-8c42700fcde8	c1ea5ea4-78c8-42ac-9097-b65173587f51	755fd861-0122-48b8-a0d2-fa33d9266758	30edf4a6-bcec-4a51-b113-a67ba4162030	2026-02	1900.00	0.00	f	2026-02-13 05:01:13.453	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-18 23:16:45.647	2026-02-11 05:54:11.597741
eeedac96-0cf7-4f3b-9363-0828915154db	b8ddbfe3-792c-49e6-ac9c-d3e7cc8442e9	319c445e-131e-4beb-b85b-44e58ae2b06f	21aa2680-ec07-4f0d-9422-73a55b6fb60d	2026-02	2325.00	0.00	f	2026-02-11 05:55:11.081	2325.00	2325.00	paid	2026-02-01 00:00:00	2026-02-19 03:42:31.053	2026-02-11 05:54:34.297172
5667a73e-b5fb-42a0-bb54-221a24cc5e55	ba307b62-df7f-46e8-b18d-6ab4047552d2	b1ac5f2e-f232-405c-a20f-2e121313bd3f	6ff38c86-1c2f-4c91-9acf-7458690fee8a	2026-02	1900.00	0.00	f	2026-02-11 05:55:12.881	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:42:13.6	2026-02-11 05:54:35.896348
5cc43447-39ae-42da-8f70-6259c2dd8171	02e444a6-af65-4c97-93ad-afb30c7c38e2	8a3ac9d3-7d4a-473f-bf80-f43a8cd5db64	164584b9-d32b-46e8-aa11-b09957e47c3e	2026-02	1750.00	0.00	f	2026-02-19 03:43:35.377	1750.00	1750.00	paid	2026-02-01 00:00:00	2026-02-19 03:43:58.779	2026-02-11 05:54:14.696824
47d4f907-322f-4480-908a-ec1d031b891b	9c3cc3be-0354-4fb9-9724-b90f6d752ab5	38211b59-9de9-4767-be3a-02ba13c8ca02	7ce7b18e-da70-49ee-b9c3-204e3142a749	2026-02	1875.00	0.00	f	2026-02-11 05:55:13.181	1875.00	1875.00	paid	2026-02-01 00:00:00	2026-02-19 03:41:48.53	2026-02-11 05:54:36.096529
7ca57c2c-9b0a-47f9-b1df-7214f45acd90	7b190fab-a3c8-45d3-a113-a4d6b15f2096	1dd67894-ce61-4481-a7f9-5333f7d75f00	a4ca4214-210f-436d-8f8c-6fc1b51fb7fb	2026-02	2000.00	0.00	f	2026-02-11 05:55:15.081	2000.00	2000.00	paid	2026-02-01 00:00:00	2026-02-19 03:38:38.194	2026-02-11 05:54:38.69672
8168f68b-e24e-44ae-aad7-a11cb9f20deb	6073b604-86b5-440e-be97-fc5355ad2eba	73666509-04c7-4196-bbb1-32bb625aabc8	aa936a22-415e-421f-a8f6-864de4bea92e	2026-02	2300.00	0.00	f	2026-02-11 05:55:13.682	2300.00	2300.00	paid	2026-02-01 00:00:00	2026-02-19 03:40:48.537	2026-02-11 05:54:36.796355
03a77ae2-1d35-4b3b-8233-278c544d6426	710a0cf7-5008-4690-9b82-2ef6170a37f5	8c95b41e-1670-40e6-a3b7-41cca215b272	46e7ec52-2246-44b6-9c77-640bd843dba7	2026-02	1650.00	0.00	f	2026-02-11 05:55:15.281	1650.00	1650.00	paid	2026-02-01 00:00:00	2026-02-19 03:37:02.704	2026-02-11 05:54:38.896685
5b296f3e-bc5c-4486-945a-269649cc1f7d	e560b5db-4033-4a1e-b78a-42b3238d8eff	1ec163c9-fd42-45a1-ad8f-810523061042	92930759-61f7-4699-98a1-bc5fdd072327	2026-02	2600.00	0.00	f	2026-02-11 05:55:14.281	2600.00	2600.00	paid	2026-02-01 00:00:00	2026-02-19 03:40:06.752	2026-02-11 05:54:37.296782
f806ad68-b184-498f-be20-5e9231ab2b00	8ebb7b20-e804-4890-8cb1-472c9a039f90	ec0175d2-39cf-4c93-9b36-704922b9f9f2	e22bddd3-4771-4451-bdd9-95cd11e328ea	2026-02	2150.00	0.00	f	2026-02-11 05:55:14.781	2150.00	2150.00	paid	2026-02-01 00:00:00	2026-02-19 03:39:02.45	2026-02-11 05:54:38.196864
4e3ab693-9ffc-4003-913e-9622e5215997	c88fc26e-2885-4053-8a0d-c39f6d7cf207	7f75947a-6576-4644-9061-01f593d5b975	4f6a2ee5-190f-4234-96ce-c22b8c496e9a	2026-02	1850.00	0.00	f	2026-02-11 05:55:14.081	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:37:41.762	2026-02-11 05:54:37.096884
1052d794-2385-4176-b671-dd428876832a	738c4af9-7982-40b2-acf8-7a0ae849d1e3	41d84dfe-4957-44af-8a98-cd2d59c4d711	5af20f69-9c8a-4e08-a4fb-1424a3c8b4ba	2026-02	2100.00	0.00	f	2026-02-11 05:55:14.581	2100.00	2100.00	paid	2026-02-01 00:00:00	2026-02-19 03:36:32.899	2026-02-11 05:54:37.696706
9f157c16-34fe-41b9-9422-fe4c3827fb81	30260d12-5414-4b86-a549-0e663992c872	f1a1a294-4139-4bb2-8483-b4985ea104b4	8c330a58-e474-4b1c-a2d0-294d9edf0a7f	2026-02	2300.00	0.00	f	2026-02-11 05:55:17.481	2300.00	2300.00	paid	2026-02-01 00:00:00	2026-02-19 03:32:42.955	2026-02-11 05:54:41.996874
b78da935-2ef0-43dc-9968-b3b6550f2aed	519e532b-5c82-4400-bb7e-306aaf1fae41	088d235c-277f-4a8b-9ebe-33f7d0f20221	2b357005-1311-4eb2-82de-ae4017d78303	2026-02	1875.00	0.00	f	2026-02-11 05:55:18.981	1875.00	1875.00	paid	2026-02-01 00:00:00	2026-02-19 03:31:40.935	2026-02-11 05:54:43.296627
b3fbb527-cc7d-42d4-8139-12187bf808be	4a5fb498-0496-4754-881e-21d87a32e307	60b12745-2f37-463b-8122-68959b522b81	27abbaba-c587-4e63-8904-e6aca672a77b	2026-02	1850.00	0.00	f	2026-02-13 05:01:12.78	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:33:50.279	2026-02-11 05:54:02.596702
7dc1ad68-521f-436c-a593-08b73944d083	68bd918e-8af5-462c-a1aa-a93793a314e5	2cf23989-3794-41f0-bc24-2fd7b104f285	9c83270c-dae1-4cad-a21a-a6fb64f13b59	2026-02	2250.00	0.00	f	2026-02-11 05:55:15.881	2250.00	2250.00	paid	2026-02-01 00:00:00	2026-02-19 03:32:23.491	2026-02-11 05:54:39.39706
ec63da5a-6972-4884-928e-91f2d4afcbdc	866bcf7b-087f-4a3f-9746-60df4073bbe6	303409bf-06de-49cc-842c-88cb9b25930c	1498ec04-ea47-48ab-affd-6bc5e645db54	2026-02	1700.00	0.00	f	2026-02-11 05:55:16.081	1700.00	1700.00	paid	2026-02-01 00:00:00	2026-02-19 03:30:59.8	2026-02-11 05:54:39.796695
4e816f6a-8983-4786-9670-85ba093041e5	94e95a05-fc41-4a7f-87b2-df207dea12ca	216b86ab-2883-493e-ab68-f1a3ef1503e4	569d10ea-aadf-4416-9ece-4564c90b2da9	2026-02	2250.00	0.00	f	2026-02-11 05:55:17.881	2250.00	2250.00	paid	2026-02-01 00:00:00	2026-02-19 03:33:02.856	2026-02-11 05:54:42.396584
ba727435-26cd-4aff-af20-63b917ca964b	b79d77f4-eb40-4968-96e6-65965124cccd	7b106bde-0ce3-4ae1-97f3-1ff0a6136af6	a99f9e45-fecc-4c64-8914-7929e6c98ae9	2026-02	2050.00	0.00	f	2026-02-11 05:55:16.381	2050.00	2050.00	paid	2026-02-01 00:00:00	2026-02-19 03:33:22.763	2026-02-11 05:54:40.096778
7785ef94-0822-4300-89a0-4b39dcd2d702	beb55f34-0bb8-4cd4-9a7f-2a705a55cc87	72842a58-b129-40f1-9d36-ae87ef2a0969	c2aaa73a-7f84-4c7d-931d-d5fba202d61c	2026-02	2050.00	0.00	f	2026-02-11 05:55:16.981	2050.00	2050.00	paid	2026-02-01 00:00:00	2026-02-19 03:29:01.029	2026-02-11 05:54:41.196764
bb67023e-91b9-442f-ab03-a7b90f5b2297	36471db9-43e0-4014-b296-53da729f9fa0	38828046-9d17-417e-a704-f96137e60581	a1c05875-31c4-474f-8cd8-20e36fc1372f	2026-02	1850.00	0.00	f	2026-02-11 05:55:18.181	1850.00	1850.00	paid	2026-02-01 00:00:00	2026-02-19 03:27:26.712	2026-02-11 05:54:42.796639
94742379-a41b-4d4c-817e-7049078ea324	416552ea-4ad5-4950-8a11-bf7f07e802ef	c1317972-e10e-4ff5-9dfc-b7a49065b703	fa291d82-436a-4552-a950-fc76c4ef3f94	2026-02	1700.00	0.00	f	2026-02-11 05:55:16.681	1700.00	1700.00	paid	2026-02-01 00:00:00	2026-02-19 03:32:04.103	2026-02-11 05:54:40.396787
bd8783b8-cf84-4898-8dbc-fdfb402aa65b	184f54bb-e74d-4c82-9f82-c60267c38752	5c60223e-f188-4b9d-9fb7-b1550ea2525e	d8a88cf6-3d2b-4d68-b777-b9a59b0559de	2026-02	1900.00	0.00	f	2026-02-11 05:55:15.581	1900.00	1900.00	paid	2026-02-01 00:00:00	2026-02-19 03:35:20.014	2026-02-11 05:54:39.196724
2def3d8a-ab54-4b95-874f-a00c85bb1802	eb38211f-0970-42c7-ab44-9edee1d2d87d	e38460d5-c080-40d9-a3d3-7d03a045108e	5bc42ae3-b5cc-4d58-9333-b33bec9dd821	2026-02	1695.00	84.75	t	2026-02-18 02:14:59.244	1779.75	1695.00	partial	2026-02-01 00:00:00	\N	2026-02-18 02:14:58.685908
141f2142-e549-491e-9695-96b565a52ea4	8672f231-0a7e-49cc-bde1-62eb48183e29	18dbb1ab-a366-48fa-9aaf-3cdb5ae65c7a	b3e38bb5-c629-4dbe-a8e7-ba12833b79b7	2026-02	1800.00	90.00	t	2026-02-20 04:00:34.556	1890.00	0.00	late	2026-02-01 00:00:00	\N	2026-02-19 23:00:37.348841
aa617310-a3ff-46f5-99db-e44ce870e689	0defb5b2-04c9-4edd-b3eb-2a4c37a5d140	6deb9d17-9d36-40cd-b1fd-f0967c04c3fc	ac746e92-6ecb-4e56-b4e7-eebbc1f7b27d	2026-02	1975.00	0.00	f	2026-02-11 05:55:13.381	1975.00	1975.00	paid	2026-02-01 00:00:00	2026-02-19 03:42:53.808	2026-02-11 05:54:36.396701
04eca39b-c1df-4666-9e5d-98e7e4fcbc23	eab56592-bd8e-441e-a946-20c189ab9d9b	c5553482-066e-4931-bdfc-19e33ca0c712	4d0aa3df-a596-4365-90dd-daa354f7e54c	2026-02	1800.00	0.00	f	2026-02-11 05:55:00.081	1800.00	1800.00	paid	2026-02-01 00:00:00	2026-02-19 03:44:23.247	2026-02-11 05:54:09.49686
8373e774-0554-4a33-ab59-4afd3ab4fd14	3aac5884-9026-4278-8808-8f5407c424e1	418c14d6-8945-48f4-ad32-50c3e8f537e1	7b30c68a-d317-4ee2-97aa-f4bbf42f9b12	2026-02	2150.00	0.00	f	2026-02-19 03:44:47.208	2150.00	2150.00	paid	2026-02-01 00:00:00	2026-02-19 03:45:04.828	2026-02-11 05:54:01.730851
83365ac3-3d63-4ffd-b3d7-924872dca363	d367f74c-66c8-42ba-b363-5b0ce0405b40	e601757e-e0bf-4f9d-98eb-aab1e07d7b84	60ea4864-efb7-43eb-bf7b-89289ae0a5ef	2026-02	111296.80	0.00	f	2026-02-11 05:54:47.681	111296.80	111296.80	paid	2026-02-01 00:00:00	2026-02-19 03:45:33.844	2026-02-11 05:54:00.826324
c5cb3401-04be-4e32-bc27-61ef86a0be37	17a3f2f6-44c2-4189-9de2-e745c3dd7c5c	e407f7e6-c8de-4e44-9467-9ffae0074195	89b8685b-d8e4-43fa-9739-913898d1322e	2026-02	2000.00	0.00	f	2026-02-11 05:54:44.581	2000.00	2000.00	paid	2026-02-01 00:00:00	2026-02-19 03:45:51.427	2026-02-11 05:54:00.395766
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
CDlQbEKthD-V5RNCPhTbsjAoYi0ayVEN	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-27T02:12:29.724Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "HvmRPl6DdnmThGD48X5EBgBD1DzWSpJWjNyVDkee1rs"}}	2026-02-27 02:12:30
Yu6xE1_oQ-qdG40U-ymXts0q7I1Rvg7q	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-23T01:02:57.721Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "VCcXIWYnHzZqu61Lbic9xdbeH9Rfhuv0U9TU3NWn8Xo"}}	2026-02-23 01:02:58
_FegmJocwWKwLi1ifLV_Zg4WMVXBtCYH	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-15T03:22:58.762Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "oNgxBsr8fKvu_XEMaoAox_1KxABRMkr3rXf7H89N9io"}}	2026-02-20 19:54:58
gCL5tIyqEOw6Gi6XiyO_1DSUb7s-90rj	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-26T13:51:46.060Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "FEwvSdbSPBf8UuqofQjkhncnxbzYqe-CydsEtvGhYlQ"}}	2026-02-26 13:51:47
ii-egkB81f86itaABrYyUfDo2vPVvU2w	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-25T02:37:04.907Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "ba78d033-2fe4-4c70-8bd0-2c0486dcbf56", "exp": 1771385824, "iat": 1771382224, "iss": "https://replit.com/oidc", "sub": "53984724", "email": "yanisho@hotmail.com", "at_hash": "a8jqTqoIIlN0Kow87duy2w", "username": "Yannisabag", "auth_time": 1771382224, "last_name": "Sabag", "first_name": "Yanni", "email_verified": true}, "expires_at": 1771385824, "access_token": "fjKhz3dOWDDl8g4Y26yfNcO0CrOQOjTSyGemTSuUiHr", "refresh_token": "yjhVqczaztqyailUMqR2I8POvRH9pDaXUqekEQypoPn"}}}	2026-02-25 02:37:22
XpStOU4sKNh2WoEIRV-ZyzTv4yXkn0Sq	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-26T13:14:10.994Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-27 13:20:50
1X8xo6x7Px2HxIItwTZcaz8h3Jh3L0Iy	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-24T22:37:53.956Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-25 17:59:16
Opatc5XDEu8_W5Sd1Xwp_QTeGPqFbwWd	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-24T03:36:11.447Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "544360db-ced8-49e3-8e39-4c767d1d2d9c", "exp": 1771302971, "iat": 1771299371, "iss": "https://replit.com/oidc", "sub": "53984724", "email": "yanisho@hotmail.com", "at_hash": "pLUUqEA2JVJy0l-YWLkt7Q", "username": "Yannisabag", "auth_time": 1771299370, "last_name": "Sabag", "first_name": "Yanni", "email_verified": true}, "expires_at": 1771302971, "access_token": "Vo-Y-c0MounXMAQ1fArzOLIU1chfb56QUS-sk-W91BK", "refresh_token": "J0Y91Hwzpv0mdKkHXHdCtGB-JgXdMP9PvDlLhlOyhEg"}}}	2026-02-24 03:36:19
w6twLEkJNAC_j_uquu0JFmuFfSejdiT2	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-25T23:24:10.071Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "replit.com": {"code_verifier": "eVzAhkUSuWTjJwSnbRdWQmtt4KzeUS3mlYpzY6h0sks"}, "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-26 15:22:25
6VOAlABI-kTRSeiELZQ7n8iGcVpqZ2Ro	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-25T20:33:43.224Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-25 21:36:53
DVvbQUMXILl7MfZvRnk0E76F1oXeYNW0	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-25T20:24:51.081Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-25 20:31:18
b9gWoLABn19c3dLmw3S-hBK97Rq3rCxR	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-26T00:11:04.735Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "replit.com": {"code_verifier": "Jarh1Uuez31svABFAm7IT2gAR058oJmqrMFeYox-nWQ"}, "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-26 00:11:05
LyhBrmIMgI-l_u04-1wbMOiVcMOocA9k	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-23T21:55:21.538Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "MANAGER", "adminUserId": "33fa6fcc-d5ca-4671-aab3-3c40310d20bd"}	2026-02-27 14:19:42
ICegLH5qJIzk8QUi1Hz1HYvpSEhb4e0C	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-26T08:41:38.716Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "nb0XnNNGZfS6I541GEoVlVK6ltffDa-ZzuUF_6TR4wc"}}	2026-02-26 08:41:39
MLyUnEQWV3QsPLs7-9zGyx-mJlcgvZPs	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-26T09:09:17.230Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "OjNsP2gFE_9YJDmrObeOiPJsqWkuAv9KKXWKSePq2pA"}}	2026-02-26 09:09:18
VawaV92WbdC03bbr_-D3vR0uIBe1ACIT	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-24T13:08:33.043Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-24 21:04:25
yHpxQivkB38bz54YFKEGOe16SU_N-ct4	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-25T20:42:22.940Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "cecb5f54-7ce2-4f86-8926-d2850ee3af41", "exp": 1771450942, "iat": 1771447342, "iss": "https://replit.com/oidc", "sub": "53984724", "email": "yanisho@hotmail.com", "at_hash": "99izb1fiyA7opwfj_NTAxg", "username": "Yannisabag", "auth_time": 1771447340, "last_name": "Sabag", "first_name": "Yanni", "email_verified": true}, "expires_at": 1771450942, "access_token": "SX4inc5OfkzS6sGtVgdTjeXBmVz_IIXhEb7C78pFRWM", "refresh_token": "R_zOtslstOtvimbkIQRYJ35V0uJPvm2txp8UdKz9T-x"}}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-27 03:36:02
y2l81UFcQW-eD9oNX7ogS7eitDy-G0Si	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T04:34:29.917Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-25 04:23:23
r_nC0pGJIa6hvzBECnxR0lYSy2W8UPHB	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-17T13:03:57.450Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "adminRole": "ADMIN", "adminUserId": "9c3ffe01-bcd0-443b-a249-3816aa2c2521"}	2026-02-24 03:55:26
\.


--
-- Data for Name: tenant_invitations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenant_invitations (id, tenant_id, token, email, status, expires_at, used_at, created_at) FROM stdin;
e977f1ee-f469-423c-b261-1920735f7bc7	9a061ce9-a28c-4c65-acfc-13afbae8f1b2	3915d2bfbdfafe8ecaf80fca895ffe2d40fca4db95faf1f2c2353c06a7218b4c	ichakkiwala@gmail.com	pending	2026-02-12 22:46:02.078	\N	2026-02-05 22:46:02.094374
a0b9caea-7fc9-4cfb-8718-5c01cbb39ab9	6a5073bc-24d2-421f-b8b5-7ee1ae241b15	dd7710e15b6a2bb1fa42e700399c8a1c25e7acb1f4ae8efb86225e7e11549080	rossell.joseph@gmail.com	pending	2026-02-19 02:56:38.28	\N	2026-02-12 02:56:38.294812
3811f676-f7ea-4cf4-b3c4-22b0e746997b	e38460d5-c080-40d9-a3d3-7d03a045108e	5532309c4260e8171d456eae28b10d21c1a3213d6ed31d6e2ad2e441a524c962	petersonnoel2012@gmail.com	pending	2026-02-25 01:21:03.31	\N	2026-02-18 01:21:03.325168
72c33d77-8695-4d99-ada3-95d85d7c3722	113c4ba7-e8f2-4230-baaa-c087d8fd9c1f	bcddbf7cb9cb994c73fb287011c139f452bc6c0fcd31404ae739880840b0d1a0	yanisho@hotmail.com	pending	2026-02-25 17:45:45.776	\N	2026-02-18 17:45:45.7911
2ea3ea55-12fa-483c-a135-faffe8f28086	113c4ba7-e8f2-4230-baaa-c087d8fd9c1f	41e9b2962d620547a54246ea001c40e735b9349c5665884ec459ed9bb467cffa	yanisho@hotmail.com	pending	2026-02-25 19:36:08.719	\N	2026-02-18 19:36:08.734906
3519fd1a-9d4e-4641-b58c-154991e7ea2f	18dbb1ab-a366-48fa-9aaf-3cdb5ae65c7a	179ed9006673c6bacb3bef5953ce6f209f698c21e9a2fea4ebfb3407ca0ccb42	Stephaniethelemaque4@gmail.com	pending	2026-02-26 22:40:22.731	\N	2026-02-19 22:40:22.749165
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenants (id, user_id, property_id, unit_id, first_name, last_name, email, phone, status, move_in_date, move_out_date, created_at, rent_amount, security_deposit, last_month_payment) FROM stdin;
b5b430a2-cf8e-417b-a758-56b8e05488ca	\N	bb4dbf04-dd29-4cf2-9c72-310b3388698f	\N	Marta & Maylo	Sazo	zoereyes58@gmail.com	561.633.5460	inactive	2024-10-01 00:00:00	\N	2026-02-05 15:25:44.112778	3000.00	\N	\N
9a061ce9-a28c-4c65-acfc-13afbae8f1b2	\N	8a948e9e-08c6-441b-9088-7d07c453b370	\N	Imran	Chakkiwala	ichakkiwala@gmail.com	407.928.5172	inactive	2022-04-01 00:00:00	\N	2026-02-05 15:25:43.820501	17483.63	\N	\N
d7a221fc-0dcd-4504-874e-5ef686290b93	\N	02da684a-bd59-4c73-bdd6-f58d5c2eba87	\N	Paul	Metro	pmetro@nextpointe.com	954.683.3927	inactive	2025-03-01 00:00:00	\N	2026-02-05 15:25:44.229832	1850.00	\N	\N
4c7acff0-69a8-4492-b9ce-83e88037b125	\N	2ad6b6cc-0ddd-411b-b04d-f3b443faef79	\N	Jah	Pierreline	pierrelinegermain1234@gmail.com	786.538.9388	inactive	2024-04-01 00:00:00	\N	2026-02-05 15:25:44.316385	1800.00	\N	\N
05562977-ba94-4ab0-95b5-6f8f079d26c5	\N	269da26f-21d6-4b5f-88fb-064a6ee484d8	\N	Lucian	Pirone	lucianpirone@yahoo.com	954.297.7834	inactive	2023-04-01 00:00:00	\N	2026-02-05 15:25:43.733019	3656.50	\N	\N
47346ea8-fa52-4ba9-a9b5-ccc77972f869	\N	455195c3-bd74-418f-b604-b8973e63888d	\N	Georgia	Smith	georgiaswatt1403@yahoo.com	954.816.3043	inactive	2024-09-01 00:00:00	\N	2026-02-05 15:25:43.936625	1800.00	\N	\N
bf180b48-07c9-4d0f-beba-acab894d5a66	\N	d91bcd2a-01e1-48c8-94bf-4f4070c108f6	\N	Janick	Serrallonga	janickserrallonga@gmail.com	786.270.8070	inactive	2024-12-01 00:00:00	\N	2026-02-05 15:25:44.142485	1750.00	\N	\N
40167b05-30f6-4952-94c8-edc9e7c550ad	\N	98074ce8-8e6b-43d7-b364-6df96cd393a2	\N	Barbara	Chanlatte	bpenna102@gmail.com	347.301.1766	inactive	2024-10-01 00:00:00	\N	2026-02-05 15:25:43.965854	1900.00	\N	\N
19d74eec-4607-4e74-a8ff-f110a0e303f3	\N	67199d1c-bff2-4b61-b9d5-e8c705d7a6be	\N	Iulia	Tyshhchenko	prccloudnine@gmail.com	631.507.6364	inactive	2024-08-01 00:00:00	\N	2026-02-05 15:25:43.877525	3296.00	\N	\N
cc87fbd3-42ae-42b8-a0bf-393ad8d98b08	\N	42cb0b25-7347-4d58-8194-298763c49d33	\N	Katie	Sherman	misskatie723@gmail.com	954.477.4357	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:44.431908	1550.00	\N	\N
c5553482-066e-4931-bdfc-19e33ca0c712	\N	4d0aa3df-a596-4365-90dd-daa354f7e54c	\N	Catia	Fenelus	nelusse@yahoo.fr	954.702.7919	inactive	2023-06-01 00:00:00	\N	2026-02-05 15:25:44.200644	1800.00	\N	\N
e407f7e6-c8de-4e44-9467-9ffae0074195	\N	89b8685b-d8e4-43fa-9739-913898d1322e	\N	Evencia Jackenson	Bastien	Evenciapointdujour3@gmail.com	786.608.8952	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:44.345576	1825.00	\N	\N
775fda8a-0a5c-4265-b129-561208527fa6	\N	8f1d97be-3e81-41cf-9fc0-8919857ff31d	\N	Doron	Doar	ddoar@bellsouth.net	954.709.2555	inactive	2022-01-01 00:00:00	\N	2026-02-05 15:25:43.616792	2817.93	\N	\N
418c14d6-8945-48f4-ad32-50c3e8f537e1	\N	7b30c68a-d317-4ee2-97aa-f4bbf42f9b12	\N	Rochambeau	Dolcine	dolcrj@gmail.com	954.599.8987	inactive	2024-09-01 00:00:00	\N	2026-02-05 15:25:44.374107	2150.00	\N	\N
f4ad0dde-2f80-4fc6-a72a-52f8c459aeed	\N	42c6c99f-893a-4b5c-8b3b-0a565f66a82d	\N	Dymitro	Dekanozishvili	deka2333@gmail.com	954.681.2628	inactive	2024-10-01 00:00:00	\N	2026-02-05 15:25:43.906865	6180.00	\N	\N
95fda6d0-8705-4bad-aea8-16f89386264d	\N	4366c6a4-72a1-4252-b6a5-64a33fdd170c	\N	Eddie	Fishman	artemgoldman@gmail.com	440.317.1637	inactive	2022-04-01 00:00:00	\N	2026-02-05 15:25:43.674244	18344.02	\N	\N
156a0479-b7ec-4409-83cd-df2cfcd42fd8	\N	969baf09-8994-41fb-afde-ac67fd532fa6	\N	Avi	Gershon	avi@abcscreens.com	305.903.7980	inactive	2024-09-01 00:00:00	\N	2026-02-05 15:25:43.849087	3296.00	\N	\N
4af12acd-6b9d-4594-bc38-e8f9ad363ff5	\N	a676d548-44b7-4650-9d48-f2018d70ace2	\N	Josef	Gopin	joe@koshercentral.com	917.860.8839	inactive	2022-04-01 00:00:00	\N	2026-02-05 15:25:43.645549	4644.09	\N	\N
c20b400c-982f-41e4-8a3f-e03a540f6e44	\N	14768530-05db-4656-b419-8ca2a1c664d9	\N	Germanie	Jean	germanie201@gmail.com	954.380.2207	inactive	2025-02-01 00:00:00	\N	2026-02-05 15:25:44.259373	1800.00	\N	\N
ef9e1cf1-5bc5-41e6-bbd5-5277650ccc14	\N	51faa6a3-a75f-4c02-ab1a-24a25c42917d	\N	Edward	Lisenko	wudconceptstudio@gmail.com	917.359.7949	inactive	2023-04-01 00:00:00	\N	2026-02-05 15:25:43.702605	5693.42	\N	\N
e601757e-e0bf-4f9d-98eb-aab1e07d7b84	\N	60ea4864-efb7-43eb-bf7b-89289ae0a5ef	\N	Elizabeth	Levy	elizabeth@polarmonkeys.com	954.993.6767	inactive	2024-06-01 00:00:00	\N	2026-02-05 15:25:43.549639	11124.00	\N	\N
6d28935a-c2c0-4b11-8aa2-98aaf948f15b	\N	183262a6-dfef-45f2-b103-cdf3cb232877	\N	Jamal	King	ljking36@gmail.com	803.431.9427	inactive	2025-02-01 00:00:00	\N	2026-02-05 15:25:44.402517	1875.00	\N	\N
92351ec6-bd88-4325-bf78-40b792f7d86a	\N	cc7c14fc-3218-493c-bd93-3924788d0bfa	\N	Iraida	Liriano	iraidaduran16@hotmail.com	786.252.1889	inactive	2023-05-01 00:00:00	\N	2026-02-05 15:25:44.287881	1850.00	\N	\N
0e6a0f87-c26a-4810-adaa-93eb993b0e90	\N	36586d77-bd0e-46b2-95e0-bf8eae913eb9	\N	Imran	Chakkiwala	ichakkiwala@gmail.com	407.928.5172	inactive	\N	\N	2026-02-06 02:43:22.739489	\N	\N	\N
507b7e5c-655d-48f7-b9b4-17c1441c77ae	\N	011896b8-9ba6-4d23-9513-b63271aa508f	\N	Rene	Torres	renejtorres@gmail.com	787.628.3334	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:45.021674	1650.00	\N	\N
3ba53dee-cbc3-44cc-9bf4-1b956c8258c7	\N	ddd7b82e-4db2-40a0-bcbe-fe71d2929a23	\N	Giovana	Blanco	giovanna.blanco@hotmail.com	786.992.5941	inactive	\N	\N	2026-02-06 02:50:35.751985	\N	\N	\N
2cf23989-3794-41f0-bc24-2fd7b104f285	\N	9c83270c-dae1-4cad-a21a-a6fb64f13b59	\N	Christian	Arbelaez	carbelaez77@gmail.com	516.528.2835	inactive	2024-11-01 00:00:00	\N	2026-02-06 19:34:35.422033	\N	\N	\N
38211b59-9de9-4767-be3a-02ba13c8ca02	\N	7ce7b18e-da70-49ee-b9c3-204e3142a749	\N	Mario	Cagigas	luvycagigas@gmail.com	954.801.8171	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:45.141663	1850.00	\N	\N
98a9fbb2-2d28-4b6c-91cd-70a95b97022a	\N	d77557c8-e5c1-4bb8-a615-91b762b4ce44	\N	Ana Maria	Chanlatte	bpenna102@gmail.com	850.977.4014	inactive	\N	\N	2026-02-06 19:24:51.602421	\N	\N	\N
7f3cf108-79c5-41c5-a8d8-1cdcfe7b9192	\N	b2d5c003-a7d9-48d8-92b5-140a63e41fc9	\N	Adams	Tilus	tilusadams44@gmail.com	561.888.2822	inactive	2024-09-01 00:00:00	\N	2026-02-05 15:25:44.666545	1850.00	\N	\N
755fd861-0122-48b8-a0d2-fa33d9266758	\N	30edf4a6-bcec-4a51-b113-a67ba4162030	\N	Dominique	Garreau	dominique.g@me.com	954.632.2285	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:45.287342	1900.00	\N	\N
7f75947a-6576-4644-9061-01f593d5b975	\N	4f6a2ee5-190f-4234-96ce-c22b8c496e9a	\N	Myanna	Campbell	mymycampbell19@gmail.com	954.268.0092	inactive	2025-03-01 00:00:00	\N	2026-02-05 15:25:45.229085	1850.00	\N	\N
69f472b0-c0b1-4c0d-a016-f51cd07c9a8a	\N	8cee52a3-83f8-4901-b8dd-dd4cb7ce691b	\N	Carmen Naranjo	Rattia	luinar70@gmail.com	786.260.4287	inactive	2024-06-01 00:00:00	\N	2026-02-05 15:25:45.083342	1900.00	\N	\N
44ae318e-01e2-429a-8fb5-a5808c1ea797	\N	ddd7b82e-4db2-40a0-bcbe-fe71d2929a23	\N	Gloria	Gonzalez	urbinamichael17@gmail.com	786.820.9477	inactive	\N	\N	2026-02-06 19:49:10.462356	\N	\N	\N
8c95b41e-1670-40e6-a3b7-41cca215b272	\N	46e7ec52-2246-44b6-9c77-640bd843dba7	\N	Fidel	Jolly	medicroot14@gmail.com	954.245.2124	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:44.844622	1650.00	\N	\N
a5996f00-086c-4ceb-82a5-7c98d442f799	\N	c6b6c9a9-56f9-4aaa-bb36-195ca6bf816b	\N	Donell	Lott	donnell_lott@yahoo.com	954.856.5318	inactive	2025-02-01 00:00:00	\N	2026-02-05 15:25:44.520641	1825.00	\N	\N
db290e15-abbc-4293-aa64-604cf78d9796	\N	90070f5e-3a98-4ebf-8ad5-3e6f40e10a89	\N	Andrei	Stamate	andymiami25@yahoo.com	305.519.5449	inactive	\N	\N	2026-02-06 19:29:13.437273	\N	\N	\N
f1a1a294-4139-4bb2-8483-b4985ea104b4	\N	8c330a58-e474-4b1c-a2d0-294d9edf0a7f	\N	Alan	Martinez	alan_barber_rd@hotmail.com	954.508.9800	inactive	\N	\N	2026-02-06 19:23:41.850778	\N	\N	\N
6deb9d17-9d36-40cd-b1fd-f0967c04c3fc	\N	ac746e92-6ecb-4e56-b4e7-eebbc1f7b27d	\N	Michael	Castillo	mikecast7@gmail.com	305.684.2511	inactive	2024-11-01 00:00:00	\N	2026-02-05 15:25:45.170736	1975.00	\N	\N
6a5073bc-24d2-421f-b8b5-7ee1ae241b15	\N	90a27344-6e91-46d9-953a-8ed29d05d856	\N	Joseph	Raussell	roussell.joseph@gmail.com	954.670.3603	inactive	2025-03-01 00:00:00	\N	2026-02-05 15:25:44.93277	1900.00	\N	\N
e73e273f-1c08-4b92-a73c-e03b6ff26518	\N	9026f5c4-57cd-424a-b2f5-530bf180c84f	\N	Chris	Brooks	chrisbrooks269@gmail.com	954.279.7434	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:45.05176	1900.00	\N	\N
60b12745-2f37-463b-8122-68959b522b81	\N	27abbaba-c587-4e63-8904-e6aca672a77b	\N	Sheeba & Mason	Cole	ColeRealtyFL@gmail.com	954.778.6886	inactive	2025-03-01 00:00:00	\N	2026-02-05 15:25:44.756385	1850.00	\N	\N
dd0e9bff-2c5b-41e3-898d-a5eb61797aab	\N	a86ac1b9-2e41-4e82-bef0-f89a4c2c6af3	\N	Grendha Torres	Fernandez	torresgrendha@gmail.com	803.205.9363	inactive	\N	\N	2026-02-06 19:51:29.126987	\N	\N	\N
ec0175d2-39cf-4c93-9b36-704922b9f9f2	\N	e22bddd3-4771-4451-bdd9-95cd11e328ea	\N	Chong Hui	Yim	yimch1965.cy@gmail.com	901.631.0001	inactive	\N	\N	2026-02-06 19:33:00.974403	\N	\N	\N
4f6730b8-5351-48d3-af64-485a8ba3ff19	\N	e88fd285-ed8f-4704-a29e-9453177c1a78	\N	Aida	Matos	amatos@palmmedicalcenters.com	954.865.2867	inactive	\N	\N	2026-02-06 19:19:47.41978	\N	\N	\N
d5789aeb-3df6-413d-be54-f85190e324c2	\N	e8bac227-c8ff-42fe-adb4-c131e85bf61d	\N	Raymond	Rodriguez	Rays6090@yahoo.com	954.234.0027	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:44.577803	1850.00	\N	\N
1e95d34d-5dce-4ec2-a749-0ce70d7e5ff5	\N	1f346dfa-32c1-44eb-a9dd-556d4d1de13f	\N	Harold	Barranco	harold.barranco@outlook.com	305.600.8780	inactive	\N	\N	2026-02-06 19:54:22.405317	\N	\N	\N
73666509-04c7-4196-bbb1-32bb625aabc8	\N	aa936a22-415e-421f-a8f6-864de4bea92e	\N	Luis	Mejias	ldmejis@gmail.com	954.630.6598	inactive	2024-10-01 00:00:00	\N	2026-02-05 15:25:45.199574	2300.00	\N	\N
b8179d2a-2831-4889-b6a2-46e621f62da2	\N	d4c28d6e-b53a-47e9-b162-596be30afdc4	\N	Eli 	Zeno	limorzeno@gmail.com	786.543.0687	inactive	\N	\N	2026-02-06 19:40:13.10483	\N	\N	\N
b0174803-da61-4ff8-8ed8-f57d03d4cbb0	\N	b3049bba-0101-4c43-9f9f-4444591f9d1a	\N	Evana	Francois	francoisevena80@gmail.com	754.204.7931	inactive	\N	\N	2026-02-06 19:42:19.136605	\N	\N	\N
86aa7513-2cfc-481e-8ef3-799e54a4ad78	\N	09e02c29-ca98-4401-a02c-bf7ff8c05690	\N	Luc & Kimberly	Atis	atislouco8@gmail.com	754.245.9328	inactive	2026-02-01 00:00:00	2027-01-31 00:00:00	2026-02-05 15:25:44.698108	1500.00	\N	\N
b3fcd381-a046-4c25-a28d-71992ac1ebf1	\N	1c6aa700-bc22-4acb-9159-01eab97f09f9	\N	Anthony	Darden	tonydarden677@gmail.com	954.628.2838	inactive	2024-10-01 00:00:00	\N	2026-02-05 15:25:44.636548	2050.00	\N	\N
3feb20b8-aa55-465d-9ee1-161a5ca508d6	\N	5b25bdca-4101-4e1e-b4cd-36e8ce0e2b0e	\N	Daniel	Figueroa	c.m.d.787@live.com	786.750.2743	inactive	\N	\N	2026-02-06 19:36:13.558783	\N	\N	\N
b1ac5f2e-f232-405c-a20f-2e121313bd3f	\N	6ff38c86-1c2f-4c91-9acf-7458690fee8a	\N	Nate	Philipson	natephilipson@yahoo.com	973.830.9772	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:45.112757	1850.00	\N	\N
e98f0623-49a8-4eac-a0e4-330c92900ff2	\N	5eb0172c-2bd3-497a-8aa0-eab3e6151aa8	\N	Aura	Garces	auraandre@hotmail.com	305.992.3055	inactive	2025-01-01 00:00:00	\N	2026-02-05 15:25:44.606492	1825.00	\N	\N
5c60223e-f188-4b9d-9fb7-b1550ea2525e	\N	d8a88cf6-3d2b-4d68-b777-b9a59b0559de	\N	Doris	Navarro	dorisnava81@gmail.com	786.923.6116	inactive	2024-08-01 00:00:00	\N	2026-02-05 15:25:44.992673	1800.00	\N	\N
29be5c7c-205b-4851-a829-1108fcd5c3a4	\N	fc8496d2-6418-452c-b00f-933f0e6ac1a9	\N	Ann	Hamilton	rhodaannhamilton@gmail.com	305.335.0995	inactive	2024-06-01 00:00:00	\N	2026-02-05 15:25:44.549155	1800.00	\N	\N
387fdafb-4fc9-4628-b3c4-8e01cdbbbc4c	\N	be8fe484-b83e-4a28-9563-a3ef22d34862	\N	Antonio	Munroe	randellmunroe@gmail.com	954.909.8074	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:44.727148	1650.00	\N	\N
676223ba-a96d-419f-84c0-70e53399b9b9	\N	abe74a99-2bb2-495a-9602-bbefaa9d30a0	\N	Terry	Mais	terimaiswalters@gmail.com	954.371.9048	inactive	2024-07-01 00:00:00	\N	2026-02-05 15:25:44.460563	1600.00	\N	\N
fe5243c2-dca1-46b0-a98c-b9bd09e8edde	\N	b89f602d-1298-41e5-90fc-9b63afec44e9	\N	Marialina	Villa Rivas	translationaid@aol.com	541.613.3215	inactive	2024-05-01 00:00:00	\N	2026-02-05 15:25:44.962041	1800.00	\N	\N
319c445e-131e-4beb-b85b-44e58ae2b06f	\N	21aa2680-ec07-4f0d-9422-73a55b6fb60d	\N	Indira	Ramdial	iramdial928@yahoo.com	954.446.3037	inactive	2024-08-01 00:00:00	\N	2026-02-05 15:25:44.903998	2300.00	\N	\N
48d65dcf-badd-44c2-8cea-48f380e85805	\N	fa3d9be2-16fc-4144-aec3-d484b7b08de7	\N	Marta	Morazan	marthamorazan09@gmail.com	786.926.0157	inactive	\N	\N	2026-02-06 20:23:30.685806	\N	\N	\N
e38460d5-c080-40d9-a3d3-7d03a045108e	\N	5bc42ae3-b5cc-4d58-9333-b33bec9dd821	\N	Peterson	Pierre	petersonnoel2012@gmail.com	954.553.6919	inactive	2025-12-01 00:00:00	2026-11-30 00:00:00	2026-02-18 01:21:02.880572	\N	\N	\N
1ec163c9-fd42-45a1-ad8f-810523061042	\N	92930759-61f7-4699-98a1-bc5fdd072327	\N	Reinier	Soto	reiniersoto20@gmail.com	719.726.0997	inactive	\N	\N	2026-02-06 22:17:35.903752	\N	\N	\N
72842a58-b129-40f1-9d36-ae87ef2a0969	\N	c2aaa73a-7f84-4c7d-931d-d5fba202d61c	\N	Javier	Gomez	jjgomezcruz78@gmail.com	954.872.6504	inactive	\N	\N	2026-02-06 20:03:10.476819	\N	\N	\N
f66f312c-7270-4a9a-8b46-bfc07687bdd3	\N	0da4bc3f-b4af-4d76-9236-6d357eb629d6	\N	Norma	Feldman	stevenleefeldmanmd@gmail.com	954.816.2212	inactive	\N	\N	2026-02-06 20:26:44.521525	\N	\N	\N
da1db128-3ee4-4648-b736-5b4cf1f6d83a	\N	59ef9f3d-685c-4557-92f8-7bb67244d303	\N	Scott	Parmley	scott@alphacgc.com	305.389.4766	inactive	\N	\N	2026-02-06 20:40:23.930232	\N	\N	\N
57daac38-7e27-4bd0-9124-9518be954dc9	\N	f8481f03-f05a-48f3-9c41-49dd2ceb22b7	\N	Katia	Acevedo	infoatouchofmagic@gmail.com	786.510.7049	inactive	\N	\N	2026-02-06 20:12:40.355155	\N	\N	\N
d48f96fc-74c4-4ae8-a1a8-125c294aaef2	\N	08a4ac57-f238-4da3-9bae-2fe844271b97	\N	Rayon	Angell	jhopp2021@gmail.com	954.816.3043	inactive	\N	\N	2026-02-06 20:32:28.1287	\N	\N	\N
443f3c98-78c2-4344-b378-1b60a711255e	\N	43195ca4-5135-4371-bce8-3b5e6ecc7372	\N	Hershel	Brach	hershy@sheilamanagement.com	917.494.4348	inactive	\N	\N	2026-02-06 19:55:52.15788	\N	\N	\N
41d84dfe-4957-44af-8a98-cd2d59c4d711	\N	5af20f69-9c8a-4e08-a4fb-1424a3c8b4ba	\N	Luz	Betancur	luzb077@yahoo.com	603.966.8545	inactive	\N	\N	2026-02-06 20:21:05.878222	\N	\N	\N
e482bc80-5b03-4556-93cf-0a945c5de35c	\N	196b5689-3295-4b2a-a79b-cb111ad934ec	\N	Yuda	Cohen	bek.envy@yahoo.com	954.868.0100	inactive	\N	\N	2026-02-06 20:46:34.616778	\N	\N	\N
90460276-b6bb-4859-b5eb-06d5a452fb67	\N	4d0b1796-73dc-4845-a88e-15defa0a6597	\N	Julissa	Fermin	jufermin@yahoo.com	864.509.4833	inactive	\N	\N	2026-02-06 20:11:24.678197	\N	\N	\N
14044383-1b71-42b2-8777-82d3cc09dcb1	\N	67708874-dff1-4013-baa7-7781a95ed6a6	\N	Jones	John	drjjohn3@gmail.com	954.465.9819	inactive	\N	\N	2026-02-06 20:06:41.550622	\N	\N	\N
303409bf-06de-49cc-842c-88cb9b25930c	\N	1498ec04-ea47-48ab-affd-6bc5e645db54	\N	Shaquila	Ford	shaquilaford0@gmail.com	954.439.9442	inactive	\N	\N	2026-02-06 20:41:45.494411	\N	\N	\N
02715854-9903-4614-83bd-ababe94e0bda	\N	72d41b3a-57da-401e-b935-e4df326e908d	\N	Jose	Gnecco	fellohtlm@gmail.com	561.801.5082	inactive	\N	\N	2026-02-06 20:10:05.793296	\N	\N	\N
38828046-9d17-417e-a704-f96137e60581	\N	a1c05875-31c4-474f-8cd8-20e36fc1372f	\N	Carolyn	Perez	carolynreyespe@gmail.com	786.413.8302	inactive	2026-02-01 00:00:00	\N	2026-02-09 13:44:55.924479	\N	\N	\N
7b106bde-0ce3-4ae1-97f3-1ff0a6136af6	\N	a99f9e45-fecc-4c64-8914-7929e6c98ae9	\N	Lori	Gray	calypso4life@gmail.com	954.696.7467	inactive	\N	\N	2026-02-06 20:19:24.498284	\N	\N	\N
c1317972-e10e-4ff5-9dfc-b7a49065b703	\N	fa291d82-436a-4552-a950-fc76c4ef3f94	\N	Joanna	Kearns	loren7296@gmail.com	786.382.5401	inactive	\N	\N	2026-02-06 20:04:31.984765	\N	\N	\N
0eb4a8cf-ecac-4106-9847-76b875c048b4	\N	e0d13e3b-0693-4a08-a08a-a08f96743052	\N	Valerii	Kononenko	business.mail1832@gmail.com	754.801.1832	inactive	\N	\N	2026-02-06 20:43:09.551421	\N	\N	\N
216b86ab-2883-493e-ab68-f1a3ef1503e4	\N	569d10ea-aadf-4416-9ece-4564c90b2da9	\N	Jackie	Moncada	usmaanmoncada@gmail.com	754.210.4933	inactive	\N	\N	2026-02-06 20:01:30.912166	\N	\N	\N
ec6b578f-2814-4e56-8ec8-f3b78956585b	\N	83e3e8c8-3a19-43e7-ac98-decf70e07373	\N	William	Mathurin	wmathurin64@gmail.com	504.710.5269	inactive	\N	\N	2026-02-06 20:45:47.302581	\N	\N	\N
088d235c-277f-4a8b-9ebe-33f7d0f20221	\N	2b357005-1311-4eb2-82de-ae4017d78303	\N	Olga	Martinez	olga.velasquez1@gmail.com	954.661.3854	inactive	\N	\N	2026-02-06 20:30:44.761182	\N	\N	\N
0946dcb5-100a-417e-9810-505628513a45	\N	e3816d0c-ecf7-4513-bc85-c8bfd9cd8205	\N	Michele	Oleary	michele.debuonooleary@usoncology.com	954.695.5392	inactive	\N	\N	2026-02-06 20:25:14.054216	\N	\N	\N
1dd67894-ce61-4481-a7f9-5333f7d75f00	\N	a4ca4214-210f-436d-8f8c-6fc1b51fb7fb	\N	Lannie	Walker	lannie_walker@yahoo.com	954.383.7031	inactive	\N	\N	2026-02-06 20:14:35.128076	\N	\N	\N
8a3ac9d3-7d4a-473f-bf80-f43a8cd5db64	\N	164584b9-d32b-46e8-aa11-b09957e47c3e	\N	Olenni	Rosario	lennyrosario99@gmail.com	786.376.9552	inactive	\N	\N	2026-02-06 20:29:37.877492	\N	\N	\N
5285bdc3-fd24-4657-ad05-95fc6158d319	\N	86f68b5a-519e-451b-aa3f-3715e0d4e312	\N	Jorge	Galvez	paveldominguez33@gmail.com	786.539.6579	inactive	2026-03-01 00:00:00	2029-02-28 00:00:00	2026-02-06 20:08:29.122404	\N	\N	\N
7845ce20-b115-4785-a452-ecda45d633b0	\N	a591f7bd-9537-4d4d-a3dd-ade92561d0a9	\N	Roger	Vilca	vilcaespinozaroger@gmail.com	954.982.4659	inactive	\N	\N	2026-02-06 20:39:00.032862	1700.00	\N	\N
113c4ba7-e8f2-4230-baaa-c087d8fd9c1f	\N	8ba371a7-9289-4d65-b742-7c9f46568829	\N	Yanni	Sabag	yanisho@hotmail.com	9543383885	inactive	2026-02-18 00:00:00	2026-04-30 00:00:00	2026-02-18 17:45:45.102123	\N	\N	\N
18dbb1ab-a366-48fa-9aaf-3cdb5ae65c7a	\N	b3e38bb5-c629-4dbe-a8e7-ba12833b79b7	\N	Stephanie	Thelemaque	Stephaniethelemaque4@gmail.com	239.234.9063	inactive	2026-03-01 00:00:00	2027-02-28 00:00:00	2026-02-19 22:40:20.12395	1800.00	1800.00	\N
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.units (id, property_id, unit_label, bedrooms, bathrooms, sqft, rent_amount, status, created_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_profiles (id, user_id, role, phone, status, created_at, updated_at, profile_image) FROM stdin;
4ffcd49c-963b-465f-856a-59fd82475266	VrrvTB	ADMIN	\N	active	2026-01-27 04:46:56.619105	2026-01-27 04:46:56.619105	\N
87e4654c-19fe-49c5-8405-a4d42a913978	48030321	ADMIN	\N	active	2026-01-31 00:00:53.317074	2026-01-31 00:00:53.317074	\N
e9e1a312-168d-425b-8b18-6a7383ce06cf	53984724	ADMIN	\N	active	2026-01-31 01:44:26.112673	2026-01-31 01:44:26.112673	\N
9d1acc87-40d8-4af9-bf08-ef60fa34024b	53972680	ADMIN	\N	active	2026-01-31 20:07:27.238763	2026-01-31 20:07:27.238763	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
VrrvTB	VrrvTB@example.com	John	Doe	\N	2026-01-27 04:46:32.789065	2026-01-27 04:46:32.789065
48030321	manceraj215@gmail.com	\N	\N	\N	2026-01-29 03:07:22.307036	2026-01-31 00:00:51.992
53893346	entpnrseb29@gmail.com	\N	\N	\N	2026-01-29 03:05:24.257275	2026-01-31 20:05:08.975
53972680	kairosaiagency@gmail.com	\N	\N	\N	2026-01-30 18:27:21.022586	2026-01-31 20:07:25.617
53984724	yanisho@hotmail.com	Yanni	Sabag	\N	2026-01-31 01:44:24.307248	2026-02-18 20:42:22.845
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 16, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_unique UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: lease_documents lease_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lease_documents
    ADD CONSTRAINT lease_documents_pkey PRIMARY KEY (id);


--
-- Name: lease_documents lease_documents_tenant_signing_token_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lease_documents
    ADD CONSTRAINT lease_documents_tenant_signing_token_unique UNIQUE (tenant_signing_token);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: maintenance_attachments maintenance_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_attachments
    ADD CONSTRAINT maintenance_attachments_pkey PRIMARY KEY (id);


--
-- Name: maintenance_messages maintenance_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_messages
    ADD CONSTRAINT maintenance_messages_pkey PRIMARY KEY (id);


--
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- Name: maintenance_requests maintenance_requests_ticket_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_ticket_number_unique UNIQUE (ticket_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: properties properties_property_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_property_code_unique UNIQUE (property_code);


--
-- Name: public_properties public_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.public_properties
    ADD CONSTRAINT public_properties_pkey PRIMARY KEY (id);


--
-- Name: public_properties public_properties_property_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.public_properties
    ADD CONSTRAINT public_properties_property_id_unique UNIQUE (property_id);


--
-- Name: rent_charges rent_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rent_charges
    ADD CONSTRAINT rent_charges_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: tenant_invitations tenant_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id);


--
-- Name: tenant_invitations tenant_invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_token_unique UNIQUE (token);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: applications applications_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: applications applications_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: expenses expenses_maintenance_request_id_maintenance_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_maintenance_request_id_maintenance_requests_id_fk FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id);


--
-- Name: expenses expenses_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: expenses expenses_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invoice_items invoice_items_rent_charge_id_rent_charges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_rent_charge_id_rent_charges_id_fk FOREIGN KEY (rent_charge_id) REFERENCES public.rent_charges(id) ON DELETE CASCADE;


--
-- Name: lease_documents lease_documents_lease_id_leases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lease_documents
    ADD CONSTRAINT lease_documents_lease_id_leases_id_fk FOREIGN KEY (lease_id) REFERENCES public.leases(id);


--
-- Name: leases leases_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: leases leases_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: leases leases_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: maintenance_attachments maintenance_attachments_file_id_files_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_attachments
    ADD CONSTRAINT maintenance_attachments_file_id_files_id_fk FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: maintenance_attachments maintenance_attachments_request_id_maintenance_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_attachments
    ADD CONSTRAINT maintenance_attachments_request_id_maintenance_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id);


--
-- Name: maintenance_messages maintenance_messages_request_id_maintenance_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_messages
    ADD CONSTRAINT maintenance_messages_request_id_maintenance_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id);


--
-- Name: maintenance_requests maintenance_requests_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: maintenance_requests maintenance_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: maintenance_requests maintenance_requests_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: payments payments_entity_id_entities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_entity_id_entities_id_fk FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: payments payments_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: payments payments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: properties properties_entity_id_entities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_entity_id_entities_id_fk FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: rent_charges rent_charges_lease_id_leases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rent_charges
    ADD CONSTRAINT rent_charges_lease_id_leases_id_fk FOREIGN KEY (lease_id) REFERENCES public.leases(id);


--
-- Name: rent_charges rent_charges_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rent_charges
    ADD CONSTRAINT rent_charges_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: rent_charges rent_charges_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rent_charges
    ADD CONSTRAINT rent_charges_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_invitations tenant_invitations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenants tenants_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: tenants tenants_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: tenants tenants_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: units units_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: user_profiles user_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict esggmDIDh1gaVGbHMB6lRL9lqsxsC9dnYioFH2i1ILqXeGjuwkUJPJdzBQTHOYk

