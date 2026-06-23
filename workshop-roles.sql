--
-- PostgreSQL database cluster dump
--

\restrict t7bXvdqFAVJUcbfIVc9BmIRewGPtalr2sVOyEihb5p4ZeQqPRRJk9Jasah5uEea

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE workshop;
ALTER ROLE workshop WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ILffL7zEz3Y+jShAot0GDQ==$YtRrUpQM7OJR0umYYz1jutpuN5yVIvnZSjqaiEuTRiE=:SIk+29sxsv7feozIyvOvVNaxcHk9bxRMTbknVMQ8OpM=';
CREATE ROLE workshop_app;
ALTER ROLE workshop_app WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;

--
-- User Configurations
--






\unrestrict t7bXvdqFAVJUcbfIVc9BmIRewGPtalr2sVOyEihb5p4ZeQqPRRJk9Jasah5uEea

--
-- PostgreSQL database cluster dump complete
--

