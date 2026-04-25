--
-- PostgreSQL database dump
--

\restrict Cfw3vQKhVtS2I7Iqzh8aSzpGMsOQwvTdWT2ereTUwW8QshM1KNnw4xy2cyfKrH3

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: riri
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO riri;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: riri
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: coop_scores; Type: TABLE; Schema: public; Owner: riri
--

CREATE TABLE public.coop_scores (
    id integer NOT NULL,
    player_one character varying(50) NOT NULL,
    player_two character varying(50) NOT NULL,
    score integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.coop_scores OWNER TO riri;

--
-- Name: coop_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: riri
--

CREATE SEQUENCE public.coop_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.coop_scores_id_seq OWNER TO riri;

--
-- Name: coop_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: riri
--

ALTER SEQUENCE public.coop_scores_id_seq OWNED BY public.coop_scores.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: riri
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    game_mode character varying(20) NOT NULL,
    host character varying(100) NOT NULL,
    player_count integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'waiting'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    ready_again text[] DEFAULT '{}'::text[],
    players text[] DEFAULT '{}'::text[],
    players_tmp text[] DEFAULT '{}'::text[],
    is_listed boolean DEFAULT true NOT NULL
);


ALTER TABLE public.rooms OWNER TO riri;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: riri
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_id_seq OWNER TO riri;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: riri
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: solo_scores; Type: TABLE; Schema: public; Owner: riri
--

CREATE TABLE public.solo_scores (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    score integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.solo_scores OWNER TO riri;

--
-- Name: solo_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: riri
--

CREATE SEQUENCE public.solo_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.solo_scores_id_seq OWNER TO riri;

--
-- Name: solo_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: riri
--

ALTER SEQUENCE public.solo_scores_id_seq OWNED BY public.solo_scores.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: riri
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    avatar jsonb NOT NULL,
    solo_games_played integer DEFAULT 0 NOT NULL,
    highest_solo_score integer DEFAULT 0 NOT NULL,
    multiplayer_games_played integer DEFAULT 0 NOT NULL,
    multiplayer_wins integer DEFAULT 0 NOT NULL,
    multiplayer_losses integer DEFAULT 0 NOT NULL,
    password_hash text,
    email text,
    reset_password_token text,
    reset_password_expires_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO riri;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: riri
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO riri;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: riri
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: coop_scores id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.coop_scores ALTER COLUMN id SET DEFAULT nextval('public.coop_scores_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: solo_scores id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.solo_scores ALTER COLUMN id SET DEFAULT nextval('public.solo_scores_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: coop_scores; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.coop_scores (id, player_one, player_two, score, created_at) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.rooms (id, name, game_mode, host, player_count, status, created_at, ready_again, players, players_tmp, is_listed) FROM stdin;
\.


--
-- Data for Name: solo_scores; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.solo_scores (id, username, score, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.users (id, username, avatar, solo_games_played, highest_solo_score, multiplayer_games_played, multiplayer_wins, multiplayer_losses, password_hash, email, reset_password_token, reset_password_expires_at) FROM stdin;
4	Titi	{"eyeType": "uwu", "mouthType": "scream", "skinColor": "#d4d470"}	0	0	0	0	0	$2b$10$qgThazB8iwHZHt0LnwSs7Oei/x9BEWrjoh6sexKZOjIMv/wxmgvXq	thibault2605@gmail.com	\N	\N
\.


--
-- Name: coop_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.coop_scores_id_seq', 1, false);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.rooms_id_seq', 2, true);


--
-- Name: solo_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.solo_scores_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: coop_scores coop_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.coop_scores
    ADD CONSTRAINT coop_scores_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_name_key UNIQUE (name);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: solo_scores solo_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.solo_scores
    ADD CONSTRAINT solo_scores_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users_email_unique_idx; Type: INDEX; Schema: public; Owner: riri
--

CREATE UNIQUE INDEX users_email_unique_idx ON public.users USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: users_reset_password_token_unique_idx; Type: INDEX; Schema: public; Owner: riri
--

CREATE UNIQUE INDEX users_reset_password_token_unique_idx ON public.users USING btree (reset_password_token) WHERE (reset_password_token IS NOT NULL);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: riri
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Cfw3vQKhVtS2I7Iqzh8aSzpGMsOQwvTdWT2ereTUwW8QshM1KNnw4xy2cyfKrH3

