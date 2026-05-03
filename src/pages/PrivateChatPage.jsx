import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AppIcon from '../components/AppIcon';

const PrivateChatPage = () => {
    const { receiverId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [receiverProfile, setReceiverProfile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const recordingIntervalRef = useRef(null);
    const messagesEndRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
    const currentUserId = user.id;

    useEffect(() => {
        if (!receiverId || !currentUserId) return;
        fetchReceiverProfile();
        fetchMessages();
        markMessagesAsRead();

        const channel = supabase
            .channel(`private-chat-${[currentUserId, receiverId].sort().join('-')}`)
            .on('postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'private_messages',
                    filter: `sender_id=eq.${receiverId},receiver_id=eq.${currentUserId}`
                },
                (payload) => handleNewMessage(payload.new)
            )
            .on('postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'private_messages',
                    filter: `sender_id=eq.${currentUserId},receiver_id=eq.${receiverId}`
                },
                (payload) => handleNewMessage(payload.new)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [receiverId, currentUserId]);

    const handleNewMessage = (msg) => {
        setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, {
                id: msg.id,
                text: msg.content,
                type: msg.type || 'text',
                sender: msg.sender_id === currentUserId ? 'me' : 'other',
                time: new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            }];
        });
        setTimeout(scrollToBottom, 50);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await sendAudioMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            setAudioChunks(chunks);
            setMediaRecorder(recorder);
            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Errore accesso microfono:", err);
            alert("Permesso microfono negato o non supportato.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const sendAudioMessage = async (blob) => {
        const fileName = `${currentUserId}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('voice_messages')
            .upload(fileName, blob);

        if (uploadError) {
            console.error("Errore upload audio:", uploadError);
            alert("Errore caricamento audio. Assicurati di aver creato il bucket 'voice_messages' su Supabase.");
            return;
        }

        const { data: urlData } = supabase.storage.from('voice_messages').getPublicUrl(fileName);
        const audioUrl = urlData.publicUrl;

        await supabase.from('private_messages').insert([{
            sender_id: currentUserId,
            receiver_id: receiverId,
            content: audioUrl,
            type: 'audio'
        }]);
    };

    const markMessagesAsRead = async () => {
        try {
            await supabase
                .from('private_messages')
                .update({ is_read: true })
                .eq('sender_id', receiverId)
                .eq('receiver_id', currentUserId)
                .eq('is_read', false);
        } catch (e) {
            console.error("Error marking messages as read", e);
        }
    };

    const fetchReceiverProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', receiverId).single();
        if (data) setReceiverProfile(data);
    };

    const fetchMessages = async () => {
        try {
            const { data } = await supabase
                .from('private_messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
                .order('created_at', { ascending: true });
            
            if (data) {
                setMessages(data.map(msg => ({
                    id: msg.id,
                    text: msg.content,
                    type: msg.type || 'text',
                    sender: msg.sender_id === currentUserId ? 'me' : 'other',
                    time: new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                })));
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!loading) scrollToBottom();
    }, [messages, loading]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const textToSend = inputText;
        setInputText(""); 

        const { error } = await supabase.from('private_messages').insert([{
            content: textToSend,
            sender_id: currentUserId,
            receiver_id: receiverId
        }]);

        if (error) {
            setInputText(textToSend);
            alert("Errore invio");
        } else {
            setTimeout(scrollToBottom, 50);
        }
    };

    const styles = {
        container: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-primary)',
            overflow: 'hidden',
        },
        header: {
            padding: '12px 16px',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            cursor: 'pointer',
        },
        avatar: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            overflow: 'hidden',
        },
        messageList: {
            flex: 1,
            overflowY: 'auto',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },
        bubble: (sender) => ({
            maxWidth: '80%',
            padding: '10px 14px',
            borderRadius: '18px',
            backgroundColor: sender === 'me' ? 'var(--color-primary)' : 'white',
            color: sender === 'me' ? 'white' : 'var(--color-text-primary)',
            alignSelf: sender === 'me' ? 'flex-end' : 'flex-start',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            borderBottomRightRadius: sender === 'me' ? '4px' : '18px',
            borderBottomLeftRadius: sender === 'me' ? '18px' : '4px',
        }),
        messageText: {
            margin: 0,
            fontSize: '15px',
            lineHeight: '1.4',
        },
        messageTime: {
            fontSize: '10px',
            opacity: 0.7,
            textAlign: 'right',
            marginTop: '4px',
        },
        inputArea: {
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            backgroundColor: 'white',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            position: 'sticky',
            bottom: 0,
            zIndex: 100,
        },
        input: {
            flex: 1,
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #E5E7EB',
            fontSize: '15px',
            outline: 'none',
            backgroundColor: '#F9FAFB',
        },
        sendButton: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header} onClick={() => navigate(`/profilo/${receiverId}`)}>
                <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <AppIcon name="arrow-left" size={24} color="primary" />
                </button>
                <div style={styles.avatar}>
                    {receiverProfile?.photo_url ? <img src={receiverProfile.photo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="P" /> : receiverProfile?.name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{receiverProfile?.name} {receiverProfile?.surname}</div>
                    <div style={{ fontSize: '11px', color: '#10b981' }}>Online</div>
                </div>
            </div>

            <div style={styles.messageList}>
                {messages.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', marginTop: '20px' }}>Inizia la conversazione con un messaggio!</div>}
                {messages.map(msg => (
                    <div key={msg.id} style={styles.bubble(msg.sender)}>
                        {msg.type === 'audio' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
                                <AppIcon name="microphone" size={20} color={msg.sender === 'me' ? "#fff" : "primary"} />
                                <audio controls style={{ height: '30px', width: '100%' }}>
                                    <source src={msg.text} type="audio/webm" />
                                </audio>
                            </div>
                        ) : (
                            <p style={styles.messageText}>{msg.text}</p>
                        )}
                        <div style={styles.messageTime}>{msg.time}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
                {isRecording ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', color: '#EF4444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            <span>Registrazione... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <button onClick={stopRecording} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer' }}>Invia</button>
                    </div>
                ) : (
                    <>
                        <input
                            type="text"
                            placeholder="Messaggio..."
                            style={styles.input}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={startRecording} 
                            style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer' }}
                            title="Registra vocale"
                        >
                            <AppIcon name="microphone" size={24} color="primary" />
                        </button>
                        <button style={styles.sendButton} onClick={handleSend} disabled={!inputText.trim()}>
                            <AppIcon name="paper-plane" size={20} color="white" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PrivateChatPage;
