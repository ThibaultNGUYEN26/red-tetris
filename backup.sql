--
-- PostgreSQL database dump
--

\restrict 45uAIZdkzyAKbQgoK2whcLxmCAlAs3OcdRDMgFe2ZOPx1dh4icLFowRSOS4qy9H

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
    players text[] DEFAULT '{}'::text[],
    ready_again text[] DEFAULT '{}'::text[]
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
1	riri	Titi	0	2026-04-03 09:32:45.261756
2	riri	Titi	120	2026-04-03 09:34:24.477138
3	riri	Titi	40	2026-04-03 09:36:06.134892
4	riri	Titi	2120	2026-04-03 09:46:59.065248
5	riri	Titi	1860	2026-04-03 09:50:22.216508
6	riri	Titi	56560	2026-04-03 09:59:07.816415
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.rooms (id, name, game_mode, host, player_count, status, created_at, players, ready_again) FROM stdin;
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
6	Titi	23600	2026-04-01 09:00:57.302614
7	nonion	960	2026-04-01 12:20:24.394961
8	Titi	2700	2026-04-01 12:48:41.785705
9	Titi	11420	2026-04-01 14:44:48.559245
10	hanmin	12480	2026-04-01 14:44:57.086123
11	riri	1500	2026-04-01 14:54:16.495214
12	Titi	16620	2026-04-01 14:54:48.879444
13	riri	2840	2026-04-01 14:55:34.088608
14	riri	2000	2026-04-01 15:02:56.254595
15	riri	1920	2026-04-01 15:04:53.104818
16	Titi	53360	2026-04-01 15:04:54.284829
17	riri	2500	2026-04-01 15:07:55.266851
18	riri	140	2026-04-01 15:08:23.678165
19	riri	1080	2026-04-01 15:10:33.175442
20	riri	7480	2026-04-01 15:13:20.49803
21	Titi	2380	2026-04-01 15:13:27.669964
22	riri	26800	2026-04-01 15:19:22.366975
23	Titi	5560	2026-04-01 15:22:44.482487
24	Heinz	15060	2026-04-01 15:23:05.919714
25	Heinz	0	2026-04-01 15:23:16.404778
26	Heinz	0	2026-04-01 15:23:21.645856
27	Heinz	1840	2026-04-01 15:25:27.304808
28	riri	26060	2026-04-01 15:26:17.747022
29	Heinz	4280	2026-04-01 15:27:39.330022
30	Heinz	0	2026-04-01 15:27:55.692234
31	Heinz	0	2026-04-01 15:28:02.187172
32	Heinz	12080	2026-04-01 15:32:32.083299
33	Heinz	1840	2026-04-01 15:34:37.359467
34	rriham	0	2026-04-01 15:55:59.454809
35	Titi	0	2026-04-01 15:56:31.650282
36	Titi	0	2026-04-01 15:56:40.227881
37	Titi	0	2026-04-01 16:50:02.895764
38	Titi	0	2026-04-01 16:50:06.833554
39	Titi	15200	2026-04-02 13:00:04.670609
40	Titi	2520	2026-04-02 13:02:09.14514
41	Titi	10580	2026-04-03 08:05:44.311889
42	Titi	51560	2026-04-03 08:15:43.921987
43	Titi	340	2026-04-03 08:21:34.581197
44	riri	14840	2026-04-03 09:40:34.827667
45	Hiro	27680	2026-04-03 09:56:53.48502
46	Hiro	5860	2026-04-03 10:01:17.384046
47	Hiro	27660	2026-04-03 10:08:02.363875
48	Titi	11240	2026-04-03 10:08:14.811716
49	Hiro	0	2026-04-03 10:09:00.314557
50	Hiro	9220	2026-04-03 10:12:08.22557
51	Hiro	0	2026-04-03 10:12:15.708859
52	Hiro	22280	2026-04-03 10:18:03.707402
53	Hiro	9160	2026-04-03 10:21:35.068168
54	Hiro	4180	2026-04-03 10:24:15.36154
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: riri
--

COPY public.users (id, username, avatar, solo_games_played, highest_solo_score, multiplayer_games_played, multiplayer_wins, multiplayer_losses) FROM stdin;
24	Rir	{"eyeType": "fear", "mouthType": "scream", "skinColor": "#70d470"}	0	0	0	0	0
35	RIri	{"eyeType": "fear", "mouthType": "laugth", "skinColor": "#70d470"}	0	0	0	0	0
34	TIti	{"eyeType": "uwu", "mouthType": "open", "skinColor": "#d49e70"}	0	0	0	0	0
58	nonino	{"eyeType": "uwu", "mouthType": "not_smile", "skinColor": "#70d4d4"}	0	0	5	1	4
69	GrosseMerde	{"eyeType": "close", "mouthType": "horrified", "skinColor": "#7070d4"}	0	0	0	0	0
65	riham	{"eyeType": "normal", "mouthType": "laugth", "skinColor": "#d4d470"}	0	0	1	1	0
68	rriham	{"eyeType": "dead", "mouthType": "not_smile", "skinColor": "#70d4d4"}	1	0	3	1	2
61	hanmin	{"eyeType": "fear", "mouthType": "sad", "skinColor": "#9966cc"}	1	12480	0	0	0
57	riri	{"eyeType": "very_sad", "mouthType": "kiss", "skinColor": "#d49e70"}	11	26800	11	5	6
66	nonion	{"eyeType": "uwu", "mouthType": "horrified", "skinColor": "#d4d470"}	1	960	1	0	1
22	Titi	{"eyeType": "uwu", "mouthType": "horrified", "skinColor": "#70d470"}	23	53360	30	19	11
64	Nonino	{"eyeType": "cold_fear", "mouthType": "laugth", "skinColor": "#d4d470"}	0	0	7	1	6
70	Hiro	{"eyeType": "uwu", "mouthType": "uwu", "skinColor": "#70d4d4"}	9	27680	0	0	0
25	Riri	{"eyeType": "blink", "mouthType": "neutral", "skinColor": "#9966cc"}	0	0	13	0	13
62	Heinz	{"eyeType": "love", "mouthType": "uwu", "skinColor": "#d47070"}	9	15060	0	0	0
59	TRuc	{"eyeType": "happy", "mouthType": "kiss", "skinColor": "#7070d4"}	0	0	0	0	0
60	grwgw	{"eyeType": "sad", "mouthType": "horrified", "skinColor": "#70d470"}	0	0	0	0	0
56	214	{"eyeType": "normal", "mouthType": "not_smile", "skinColor": "#7070d4"}	0	0	0	0	0
\.


--
-- Name: coop_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.coop_scores_id_seq', 6, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.rooms_id_seq', 85, true);


--
-- Name: solo_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.solo_scores_id_seq', 54, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: riri
--

SELECT pg_catalog.setval('public.users_id_seq', 72, true);


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

\unrestrict 45uAIZdkzyAKbQgoK2whcLxmCAlAs3OcdRDMgFe2ZOPx1dh4icLFowRSOS4qy9H

