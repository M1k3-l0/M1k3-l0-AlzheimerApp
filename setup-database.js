// Script di Setup Database - ESEGUI UNA VOLTA SOLA
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://naqwhpgtawbsdhuogrgp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Carica da variabili d'ambiente

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
    console.log('🔧 Inizio setup database...')

    // 1. Crea tabella messages
    const { error: messagesError } = await supabase.rpc('exec_sql', {
        sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        text TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_id TEXT NOT NULL
      );

      -- Policy per permettere a tutti di leggere
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow public read" ON messages;
      CREATE POLICY "Allow public read" ON messages FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Allow public insert" ON messages;
      CREATE POLICY "Allow public insert" ON messages FOR INSERT WITH CHECK (true);
    `
    })

    if (messagesError) {
        console.log('⚠️ Tabella messages probabilmente esiste già, continuo...')
    } else {
        console.log('✅ Tabella messages creata!')
    }

    // 2. Crea tabella posts
    const { error: postsError } = await supabase.rpc('exec_sql', {
        sql: `
      CREATE TABLE IF NOT EXISTS posts (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        likes INT DEFAULT 0
      );

      -- Policy per permettere a tutti di leggere
      ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow public read" ON posts;
      CREATE POLICY "Allow public read" ON posts FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Allow public insert" ON posts;
      CREATE POLICY "Allow public insert" ON posts FOR INSERT WITH CHECK (true);
    `
    })

    if (postsError) {
        console.log('⚠️ Tabella posts probabilmente esiste già, continuo...')
    } else {
        console.log('✅ Tabella posts creata!')
    }

    console.log('🎉 Setup completato! Puoi cancellare questo file ora.')
}

setupDatabase()
