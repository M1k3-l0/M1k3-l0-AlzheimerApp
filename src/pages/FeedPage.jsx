import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, X, Edit2, Check, Maximize2, User } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';

const FeedPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPostText, setNewPostText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [enlargedImage, setEnlargedImage] = useState(null);
    const [showCommentsFor, setShowCommentsFor] = useState(null);
    const [comments, setComments] = useState({});
    const [newCommentText, setNewCommentText] = useState('');
    const [userMoods, setUserMoods] = useState({}); // { author_id: mood }
    const fileInputRef = useRef(null);

    const [likedPosts, setLikedPosts] = useState(() => {
        const saved = localStorage.getItem('alzheimer_liked_posts');
        return saved ? JSON.parse(saved) : [];
    });

    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{"name":"Utente"}');

    // Helper functions for mood
    const getMoodColor = (mood) => {
        switch (mood) {
            case 'happy': return '#22c55e';
            case 'neutral': return '#eab308';
            case 'sad': return '#ef4444';
            default: return '#E5E7EB';
        }
    };

    const getMoodEmoji = (mood) => {
        switch (mood) {
            case 'happy': return '😊';
            case 'neutral': return '😐';
            case 'sad': return '😢';
            default: return '';
        }
    };

    useEffect(() => {
        localStorage.setItem('alzheimer_liked_posts', JSON.stringify(likedPosts));
    }, [likedPosts]);

    useEffect(() => {
        fetchPosts();
        // Realtime Posts
        const postsChannel = supabase
            .channel('posts-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
                if (payload.eventType === 'INSERT') setPosts(prev => [{ ...payload.new, comment_count: 0 }, ...prev]);
                else if (payload.eventType === 'UPDATE') setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                else if (payload.eventType === 'DELETE') setPosts(prev => prev.filter(p => p.id !== payload.old.id));
            })
            .subscribe();

        // Realtime Comments
        const commentsChannel = supabase
            .channel('comments-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
                const newComment = payload.new;
                setComments(prev => {
                    const existingComments = prev[newComment.post_id] || [];
                    if (existingComments.some(c => c.id === newComment.id)) {
                        return prev;
                    }
                    return {
                        ...prev,
                        [newComment.post_id]: [...existingComments, newComment]
                    };
                });
                setPosts(prev => prev.map(p => {
                    if (p.id === newComment.post_id) {
                        return { ...p, comment_count: (p.comment_count || 0) + 1 };
                    }
                    return p;
                }));
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(commentsChannel);
        };
    }, []);

    const fetchUserMoods = async (authorIds) => {
        if (!authorIds || authorIds.length === 0) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, current_mood, role')
                .in('id', authorIds);
            
            if (!error && data) {
                const moodsMap = {};
                data.forEach(profile => {
                    moodsMap[profile.id] = { mood: profile.current_mood, role: profile.role };
                });
                setUserMoods(moodsMap);
            }
        } catch (e) {
            console.error("Error fetching user moods:", e);
        }
    };

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*, comments(count)')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Errore fetch posts:", error);
                return;
            }

            if (data) {
                const formattedPosts = data.map(p => ({
                    ...p,
                    comment_count: p.comments?.[0]?.count || 0
                }));
                setPosts(formattedPosts);
                
                // Fetch moods for all unique authors
                const authorIds = [...new Set(data.map(p => p.author_id).filter(Boolean))];
                fetchUserMoods(authorIds);
                
                fetchAllComments();
            }
        } catch (e) {
            console.error("Errore fetch posts", e);
        }
        setLoading(false);
    };

    const fetchAllComments = async () => {
        try {
            // Carica TUTTI i commenti in una sola query
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                // Raggruppa i commenti per post_id
                const commentsByPost = {};
                data.forEach(comment => {
                    if (!commentsByPost[comment.post_id]) {
                        commentsByPost[comment.post_id] = [];
                    }
                    commentsByPost[comment.post_id].push(comment);
                });
                setComments(commentsByPost);
            }
        } catch (e) {
            console.error("Errore fetch commenti:", e);
        }
    };

    const fetchComments = async (postId) => {
        if (comments[postId]) return; // Evita fetch doppi
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (!error && data) {
            setComments(prev => ({ ...prev, [postId]: data }));
        }
    };

    const toggleComments = (postId) => {
        if (showCommentsFor === postId) {
            setShowCommentsFor(null);
        } else {
            setShowCommentsFor(postId);
            fetchComments(postId);
        }
    };

    const addComment = async (postId) => {
        if (!newCommentText.trim()) return;
        const text = newCommentText.trim();
        const commentObj = {
            post_id: postId,
            author_id: user.id || (user.name + (user.surname || '')),
            author_name: user.name + ' ' + (user.surname || ''),
            author_photo: user.photo,
            text
        };

        const { data: inserted, error } = await supabase
            .from('comments')
            .insert([commentObj], { returning: 'representation' });

        if (error) {
            console.error("Errore salvataggio commento:", error);
            alert("Errore nel salvare il commento: " + error.message);
        } else {
            setNewCommentText('');
            if (inserted?.[0]) {
                setComments(prev => ({
                    ...prev,
                    [postId]: [...(prev[postId] || []), inserted[0]]
                }));
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
            }
        }
    };

    const handleLike = async (postId, currentLikes) => {
        if (likedPosts.includes(postId)) return; // Evita like multipli dallo stesso utente locale

        // Ottimismo: aggiorna subito UI
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
        setLikedPosts(prev => [...prev, postId]);

        try {
            const { error } = await supabase
                .from('posts')
                .update({ likes: (currentLikes || 0) + 1 })
                .eq('id', postId);
            
            if (error) throw error;
        } catch (e) {
            console.error("Errore nel mettere like", e);
            // Revert in caso di errore
            setLikedPosts(prev => prev.filter(id => id !== postId));
            fetchPosts(); 
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width; let height = img.height; const max_size = 1024;
                    if (width > height) { if (width > max_size) { height *= max_size / width; width = max_size; } }
                    else { if (height > max_size) { width *= max_size / height; height = max_size; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                    setSelectedImage(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const createPost = async () => {
        if (!newPostText.trim() && !selectedImage) return;
        const currentUserId = user.id || (user.name + (user.surname || ''));
        const newPostObj = { 
            author: user.name + ' ' + (user.surname || ''), 
            author_id: currentUserId,
            author_photo: user.photo, 
            text: newPostText, 
            image: selectedImage 
        };
        
        setNewPostText(''); 
        setSelectedImage(null);
        
        try { 
            const { error } = await supabase.from('posts').insert([newPostObj]); 
            if (error) {
                console.error("Errore Supabase inserimento post:", error);
                alert("Errore nel salvataggio: " + error.message);
            }
        } catch (e) {
            console.error("Errore catastrofico creazione post:", e);
        }
    };

    const deletePost = async (postId) => {
        if (!window.confirm("Eliminare il post?")) return;
        try { await supabase.from('posts').delete().eq('id', postId); } catch (e) {}
    };

    const styles = {
        container: { width: '100%', maxWidth: '100%', minWidth: 0, backgroundColor: 'var(--color-bg-primary)', minHeight: '100%', padding: '0 14px 100px 14px', boxSizing: 'border-box', overflowX: 'hidden' },
        stickyHeader: { position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--color-bg-primary)', padding: '12px 0 1px 0', maxWidth: '100%' },
        card: { backgroundColor: '#fff', margin: '0 0 var(--section-gap) 0', borderRadius: 'var(--card-radius)', padding: 'var(--content-padding-x)', boxShadow: 'var(--card-shadow)', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' },
        lightbox: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'pointer', padding: '20px', boxSizing: 'border-box' },
        avatar: (mood) => ({ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 'bold', 
            overflow: 'hidden',
            border: `3px solid ${getMoodColor(mood)}`,
            boxShadow: `0 2px 8px ${getMoodColor(mood)}40`,
            transition: 'all 0.3s ease',
        }),
        avatarSmall: (mood) => ({ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 'bold', 
            overflow: 'hidden', 
            fontSize: '12px',
            border: `2px solid ${getMoodColor(mood)}`,
            boxShadow: `0 2px 6px ${getMoodColor(mood)}40`,
            transition: 'all 0.3s ease',
        }),
        avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
        input: { flex: 1, minWidth: 0, maxWidth: '100%', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '22px', padding: '10px 16px', fontSize: '15px', outline: 'none' },
        btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' },
        postImageWrap: { width: '100%', aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--card-radius)', margin: '8px 0', cursor: 'zoom-in', display: 'block', backgroundColor: '#f0f0f0' },
        postImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
        actionBtn: { background: 'none', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '14px' },
        commentSection: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
        comment: { display: 'flex', gap: '10px', marginBottom: '10px' },
        commentBubble: { backgroundColor: '#F3F4F6', padding: '8px 12px', borderRadius: 'var(--card-radius)', flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'break-word' },
        commentAuthor: { fontWeight: '700', fontSize: '13px', color: 'var(--color-primary-dark)' },
        commentText: { fontSize: '14px', color: '#333', textAlign: 'left', wordBreak: 'break-word' },
        statsBar: { display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #f9f9f9', marginBottom: '8px', fontSize: '13px', color: '#666' }
    };

    return (
        <div style={styles.container} className="last-scroll-block">
            {enlargedImage && (
                <div style={styles.lightbox} onClick={() => setEnlargedImage(null)}>
                    <img src={enlargedImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Fullscreen" />
                </div>
            )}

            {/* Creazione Post - Sticky */}
            <div style={styles.stickyHeader}>
                <div style={styles.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={styles.avatar(userMoods[user.id || (user.name + (user.surname || ''))]?.mood)}>
                            {user.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? <img src={user.photo} style={styles.avatarImg} alt="Profilo" /> : user.name[0]}
                        </div>
                        <input style={styles.input} placeholder={`A che pensi, ${user.name}?`} value={newPostText} onChange={(e) => setNewPostText(e.target.value)} />
                    </div>
                    {selectedImage && (
                        <div style={{ position: 'relative', marginBottom: '12px', maxWidth: '100%' }}>
                            <img src={selectedImage} style={{ width: '100%', maxWidth: '100%', borderRadius: '12px', display: 'block' }} alt="Preview" />
                            <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', padding: '4px' }}><X size={16}/></button>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button style={styles.actionBtn} onClick={() => fileInputRef.current.click()}><AppIcon name="picture" size={20} color="primary"/> Foto</button>
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                        <button style={styles.btnPrimary} onClick={createPost}>Pubblica</button>
                    </div>
                </div>
            </div>

            {/* Ciclo Post */}
            {posts.map(post => {
                const authorData = userMoods[post.author_id] || {};
                const authorMood = authorData.mood;
                const authorRole = authorData.role;
                return (
                <div key={post.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px', minWidth: 0, flex: 1 }}>
                            <div style={styles.avatar(authorMood)}>
                                {post.author_photo && typeof post.author_photo === 'string' && post.author_photo.startsWith('http') ? <img src={post.author_photo} style={styles.avatarImg} alt="Autore" /> : (post.author?.[0] || 'U')}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '700', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {post.author}
                                    {authorRole === 'admin' && <AppIcon name="crown" size={14} color="primary" />}
                                    {authorMood && <span style={{ fontSize: '18px' }}>{getMoodEmoji(authorMood)}</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: '#999' }}>{new Date(post.created_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                        {(post.author_id === user.id || user.role === 'admin' || user.role === 'moderator') && (
                            <button style={{ background: 'none', border: 'none' }} onClick={() => deletePost(post.id)} aria-label="Elimina">
                                <AppIcon name="trash" size={18} color="error" />
                            </button>
                        )}
                    </div>

                    <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{post.text}</div>
                    {post.image && (
                        <div style={styles.postImageWrap} onClick={() => setEnlargedImage(post.image)}>
                            <img src={post.image} style={styles.postImage} alt="Post" />
                        </div>
                    )}

                    {/* Barra Statistiche */}
                    <div style={styles.statsBar}>
                        <span>{post.likes || 0} Like</span>
                        <span onClick={() => toggleComments(post.id)} style={{cursor:'pointer'}}>{post.comment_count || 0} Commenti</span>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                        <button style={styles.actionBtn} onClick={() => handleLike(post.id, post.likes)}>
                            <AppIcon name="thumbs-up" size={18} color={likedPosts.includes(post.id) ? 'primary' : 'textSecondary'} />
                            Mi piace
                        </button>
                        <button style={styles.actionBtn} onClick={() => toggleComments(post.id)}><AppIcon name="comments" size={18} color="primary"/> Commenta</button>
                    </div>

                    {/* Sezione Commenti */}
                    {showCommentsFor === post.id && (
                        <div style={styles.commentSection}>
                            {(comments[post.id] || []).map(comm => (
                                <div key={comm.id} style={styles.comment}>
                                    <div style={styles.avatarSmall()}>
                                        {comm.author_photo && typeof comm.author_photo === 'string' && comm.author_photo.startsWith('http') ? <img src={comm.author_photo} style={styles.avatarImg} alt="C" /> : comm.author_name[0]}
                                    </div>
                                    <div style={styles.commentBubble}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={styles.commentAuthor}>{comm.author_name}</div>
                                            {(comm.author_id === user.id || user.role === 'admin' || user.role === 'moderator') && (
                                                <button 
                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: 0.6 }} 
                                                    onClick={() => {
                                                        if (window.confirm("Eliminare il commento?")) {
                                                            supabase.from('comments').delete().eq('id', comm.id).then(() => fetchAllComments());
                                                        }
                                                    }}
                                                >
                                                    <X size={14} color="#ef4444" />
                                                </button>
                                            )}
                                        </div>
                                        <div style={styles.commentText}>{comm.text}</div>
                                    </div>
                                </div>
                            ))}
                            
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <div style={styles.avatarSmall()}>
                                    {user.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? <img src={user.photo} style={styles.avatarImg} alt="Me" /> : user.name[0]}
                                </div>
                                <input 
                                    style={styles.input} 
                                    placeholder="Scrivi un commento..." 
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                                />
                                <button style={{ border: 'none', background: 'none', color: 'var(--color-primary)' }} onClick={() => addComment(post.id)} aria-label="Invia"><AppIcon name="paper-plane" size={20} color="primary"/></button>
                            </div>
                        </div>
                    )}
                </div>
                );
            })}
        </div>
    );
};

export default FeedPage;
