-- Partage de notes (lecture) avec collaborateurs.
CREATE TABLE "agenda"."NoteShare" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NoteShare_noteId_userId_key" ON "agenda"."NoteShare"("noteId", "userId");
CREATE INDEX "NoteShare_noteId_idx" ON "agenda"."NoteShare"("noteId");
CREATE INDEX "NoteShare_userId_idx" ON "agenda"."NoteShare"("userId");

ALTER TABLE "agenda"."NoteShare" ADD CONSTRAINT "NoteShare_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "agenda"."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda"."NoteShare" ADD CONSTRAINT "NoteShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "agenda"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
