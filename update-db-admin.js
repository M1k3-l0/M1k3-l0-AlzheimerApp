import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://naqwhpgtawbsdhuogrgp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateDb() {
    console.log('🔧 Aggiornamento database per Admin/Moderazione...')

    const sql = `
      -- 1. Aggiorna ruoli consentiti
      ALTER TABLE profiles 
      DROP CONSTRAINT IF EXISTS profiles_role_check;

      ALTER TABLE profiles 
      ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('patient', 'caregiver', 'healthcare', 'admin', 'moderator'));

      -- 2. Aggiungi colonna is_banned
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

      -- 3. Rendi le policy più robuste per gli admin
      -- Post
      DROP POLICY IF EXISTS "Admins can delete any post" ON posts;
      CREATE POLICY "Admins can delete any post" ON posts 
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'moderator')
        )
      );

      -- Commenti
      DROP POLICY IF EXISTS "Admins can delete any comment" ON comments;
      CREATE POLICY "Admins can delete any comment" ON comments 
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'moderator')
        )
      );

      -- 4. Impedisci ai bannati di scrivere
      -- Nota: Dobbiamo assicurarci che questa policy non blocchi gli utenti normali
      -- In Supabase, se più policy di INSERT esistono, almeno una deve passare.
      -- Ma qui vogliamo un blocco esplicito se is_banned = true.
      -- Un modo migliore è modificare le policy esistenti di INSERT.
    `

    // Eseguiamo tramite RPC se disponibile, altrimenti dovremo informare l'utente
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
        console.error('❌ Errore durante l\'aggiornamento SQL:', error)
        console.log('Suggerimento: Se exec_sql non è configurato, esegui manualmente lo script nel SQL Editor di Supabase.')
    } else {
        console.log('✅ Database aggiornato con successo!')
    }
}

updateDb()
