import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://naqwhpgtawbsdhuogrgp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetDb() {
    console.log('Inizio reset del database...');

    console.log('1. Eliminazione commenti...');
    const { error: errComments } = await supabase.from('comments').delete().not('id', 'is', null);
    if (errComments) console.error('Errore commenti:', errComments);

    console.log('2. Eliminazione posts...');
    const { error: errPosts } = await supabase.from('posts').delete().not('id', 'is', null);
    if (errPosts) console.error('Errore posts:', errPosts);

    console.log('3. Eliminazione messaggi...');
    const { error: errMessages } = await supabase.from('messages').delete().not('id', 'is', null);
    if (errMessages) console.error('Errore messaggi:', errMessages);

    console.log('4. Eliminazione profili...');
    const { error: errProfiles } = await supabase.from('profiles').delete().not('id', 'is', null);
    if (errProfiles) console.error('Errore profili:', errProfiles);

    console.log('5. Recupero utenti auth...');
    const { data: users, error: errAuthFetch } = await supabase.auth.admin.listUsers();
    if (errAuthFetch) {
        console.error('Errore recupero utenti:', errAuthFetch);
    } else if (users && users.users) {
        console.log(`Trovati ${users.users.length} utenti da eliminare.`);
        for (const user of users.users) {
            const { error: errDel } = await supabase.auth.admin.deleteUser(user.id);
            if (errDel) console.error(`Errore eliminazione utente ${user.id}:`, errDel);
        }
    }

    console.log('Reset del database completato!');
}

resetDb();
