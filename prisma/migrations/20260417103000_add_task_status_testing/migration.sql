-- Add new task status for QA/testing phase.
ALTER TYPE "agenda"."TaskStatus" ADD VALUE IF NOT EXISTS 'testing';
