-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  id integer NOT NULL DEFAULT nextval('admin_id_seq'::regclass),
  nev text NOT NULL,
  email text NOT NULL UNIQUE,
  jelszo text NOT NULL,
  CONSTRAINT admin_pkey PRIMARY KEY (id)
);
CREATE TABLE public.attendance (
  id integer NOT NULL DEFAULT nextval('attendance_id_seq'::regclass),
  course_id integer NOT NULL,
  diak_id integer NOT NULL,
  datum timestamp without time zone NOT NULL,
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT attendance_diak_id_fkey FOREIGN KEY (diak_id) REFERENCES public.diak(id)
);
CREATE TABLE public.bluetooth (
  diak_id integer NOT NULL,
  rssi integer,
  app_uuid uuid,
  student_id text NOT NULL UNIQUE,
  CONSTRAINT bluetooth_diak_id_fkey FOREIGN KEY (diak_id) REFERENCES public.diak(id)
);
CREATE TABLE public.courses (
  id integer NOT NULL DEFAULT nextval('courses_id_seq'::regclass),
  nev text NOT NULL,
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.diak (
  id integer NOT NULL DEFAULT nextval('diak_id_seq'::regclass),
  nev text NOT NULL,
  indexszam text NOT NULL UNIQUE,
  jelszo text NOT NULL,
  CONSTRAINT diak_pkey PRIMARY KEY (id)
);
CREATE TABLE public.raspberry_devices (
  id integer NOT NULL DEFAULT nextval('raspberry_devices_id_seq'::regclass),
  terem USER-DEFINED NOT NULL,
  aktiv boolean NOT NULL DEFAULT true,
  CONSTRAINT raspberry_devices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sync_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  raspberry_devices_id integer NOT NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sync_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sync_logs_raspberry_devices_id_fkey FOREIGN KEY (raspberry_devices_id) REFERENCES public.raspberry_devices(id)
);
CREATE TABLE public.teacher (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nev text NOT NULL,
  email text NOT NULL UNIQUE,
  jelszo text NOT NULL,
  CONSTRAINT teacher_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teacher_courses (
  id integer NOT NULL DEFAULT nextval('teacher_courses_id_seq'::regclass),
  teacher_id uuid NOT NULL,
  course_id integer NOT NULL,
  CONSTRAINT teacher_courses_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher(id),
  CONSTRAINT teacher_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.teacher_login_logs (
  id bigint NOT NULL DEFAULT nextval('teacher_login_logs_id_seq'::regclass),
  teacher_id uuid,
  success boolean NOT NULL,
  logged_at timestamp without time zone DEFAULT now(),
  error_message text,
  CONSTRAINT teacher_login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_login_logs_teacher_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher(id)
);