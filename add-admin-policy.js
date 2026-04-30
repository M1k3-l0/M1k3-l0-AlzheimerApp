import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://naqwhpgtawbsdhuogrgp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
    const sql = `
        DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
        CREATE POLICY "Admins can update any profile" ON profiles 
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        );
    `
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) console.error(error)
    else console.log('Policy aggiunta con successo!')
}
run()
