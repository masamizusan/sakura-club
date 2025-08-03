-- ============================================
-- STEP 1: Extensions and Custom Types
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE membership_type AS ENUM ('free', 'premium');
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE experience_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('registered', 'confirmed', 'cancelled');