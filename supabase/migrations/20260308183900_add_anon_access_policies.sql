/*
  # Add anonymous access policies

  Since the app does not use authentication, the anon role needs access
  to all tables so the Supabase JS client (using the anon key) can read
  and write data.

  1. Changes
    - Add SELECT, INSERT, UPDATE, DELETE policies for `anon` role on:
      - `properties`
      - `homeowners`
      - `notes`
      - `skip_trace_logs`
      - `skip_trace_contacts`

  2. Security
    - These policies grant the anon role full CRUD access
    - Appropriate for internal/demo tool without user authentication
*/

-- properties
CREATE POLICY "Anon users can view all properties"
  ON properties FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert properties"
  ON properties FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update properties"
  ON properties FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete properties"
  ON properties FOR DELETE TO anon USING (true);

-- homeowners
CREATE POLICY "Anon users can view all homeowners"
  ON homeowners FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert homeowners"
  ON homeowners FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update homeowners"
  ON homeowners FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete homeowners"
  ON homeowners FOR DELETE TO anon USING (true);

-- notes
CREATE POLICY "Anon users can view all notes"
  ON notes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert notes"
  ON notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update notes"
  ON notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete notes"
  ON notes FOR DELETE TO anon USING (true);

-- skip_trace_logs
CREATE POLICY "Anon users can view all skip trace logs"
  ON skip_trace_logs FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert skip trace logs"
  ON skip_trace_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update skip trace logs"
  ON skip_trace_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete skip trace logs"
  ON skip_trace_logs FOR DELETE TO anon USING (true);

-- skip_trace_contacts
CREATE POLICY "Anon users can view all skip trace contacts"
  ON skip_trace_contacts FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert skip trace contacts"
  ON skip_trace_contacts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update skip trace contacts"
  ON skip_trace_contacts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete skip trace contacts"
  ON skip_trace_contacts FOR DELETE TO anon USING (true);
