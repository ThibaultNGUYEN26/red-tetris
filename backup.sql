--
-- PostgreSQL database dump
--

\restrict TeXQgekwbkeE3Kje6m4wKcaIFLaGZeSraGZSkoSqEayNPblHTNjGtuyLGHTHBiw

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: riri
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    game_mode character varying(20) NOT NULL,
    host character varying(100) NOT NULL,
    player_count integer DEFAULT 1 NOT NULL,
    players jsonb NOT NULL,
    status character varying(20) DEFAULT 'waiting'::character varying,
    created_at timestamp without time zone DEFAULT now()
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
    multiplayer_losses integer DEFAULT 0 NOT NULL
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
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: riri
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.rooms (id, name, game_mode, host, player_count, players, status, created_at) FROM stdin;
18	RedGame-YO6K	classic	Titi	1	["Titi"]	waiting	2026-02-20 13:24:55.71817
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.users (id, username, avatar, solo_games_played, highest_solo_score, multiplayer_games_played, multiplayer_wins, multiplayer_losses) FROM stdin;
\.


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.rooms_id_seq', 17, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


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
-- PostgreSQL database dump complete
--

\unrestrict TeXQgekwbkeE3Kje6m4wKcaIFLaGZeSraGZSkoSqEayNPblHTNjGtuyLGHTHBiw

