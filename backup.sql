--
-- PostgreSQL database dump
--

\restrict itEIBIoV0yG9PkAJrCHwMTMF8Pd3PTGxdb4w9fxebiZfd0dBdrtsTqrpws4QAAJ

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

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
    status character varying(20) DEFAULT 'waiting'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    ready_again text[] DEFAULT '{}'::text[],
    players text[] DEFAULT '{}'::text[]
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

COPY public.rooms (id, name, game_mode, host, player_count, status, created_at, ready_again, players) FROM stdin;
\.


--
-- Data for Name: solo_scores; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.solo_scores (id, username, score, created_at) FROM stdin;
1	Titi	40	2026-02-24 19:53:37.569791
2	Titi	17820	2026-03-06 22:01:04.603488
3	Titi	0	2026-03-07 08:18:09.247155
4	Titi	0	2026-03-07 08:18:37.719448
5	Titi	0	2026-03-07 08:24:22.2098
6	riri	7260	2026-04-01 08:40:35.996624
7	riri	14740	2026-04-01 08:46:28.419808
8	riri	2240	2026-04-01 08:50:59.244551
9	riri	0	2026-04-01 08:53:24.341687
10	riri	3960	2026-04-01 08:58:20.500061
11	riri	1600	2026-04-01 13:21:07.662453
12	riri	0	2026-04-01 15:56:27.612203
13	riri	0	2026-04-01 15:56:44.48687
14	riri	0	2026-04-01 15:56:47.305297
15	riri	0	2026-04-01 15:56:50.118407
16	riri	0	2026-04-01 15:56:53.245949
17	riri	0	2026-04-01 15:57:02.192106
18	riri	0	2026-04-01 15:57:05.246732
19	riri	0	2026-04-01 15:57:11.88455
20	riri	0	2026-04-01 15:57:20.57028
21	riri	0	2026-04-01 15:57:23.633301
22	riri	0	2026-04-01 15:57:27.388669
23	riri	9560	2026-04-02 12:34:53.389773
24	riri	0	2026-04-02 12:53:12.716765
25	riri	3600	2026-04-02 12:54:44.504898
26	riri	0	2026-04-02 12:59:39.346677
27	riri	3600	2026-04-02 14:56:49.742154
28	Titi	9660	2026-04-02 15:01:08.238103
29	riri	37620	2026-04-02 15:03:25.64209
30	riri	19420	2026-04-02 15:09:10.208496
31	riri	2360	2026-04-02 15:14:41.155982
32	riri	0	2026-04-02 15:27:22.081028
33	​	4180	2026-04-02 16:04:11.701241
34	[][$#@$*@!-+...	0	2026-04-02 16:22:11.291152
35	azdazd	0	2026-04-02 16:25:03.593397
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.users (id, username, avatar, solo_games_played, highest_solo_score, multiplayer_games_played, multiplayer_wins, multiplayer_losses) FROM stdin;
\.


--
-- Name: coop_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.coop_scores_id_seq', 1, false);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.rooms_id_seq', 106, true);


--
-- Name: solo_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.solo_scores_id_seq', 35, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.users_id_seq', 78, true);


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
-- PostgreSQL database dump complete
--

\unrestrict itEIBIoV0yG9PkAJrCHwMTMF8Pd3PTGxdb4w9fxebiZfd0dBdrtsTqrpws4QAAJ

