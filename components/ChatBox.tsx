'use client';

import { useState, ChangeEvent, useRef, useEffect } from 'react';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export default function ChatBox() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false); // Track loading state
    const messageEndRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value);

    // Function to auto-scroll to the latest message
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!userInput.trim()) return;

        const userMessage: Message = { role: 'user', content: userInput };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setUserInput('');
        setLoading(true); // Start loading

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userInput }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.reply };
            setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: "Sorry, I couldn't process your request. Please try again.",
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setLoading(false); // Stop loading
        }
    };

    return (
        <div className="chat-box w-1/3">
            <div className="messages">
                {messages.map((msg, index) => (
                    <p key={index} className={msg.role}>
                        <strong>{msg.role}:</strong> {msg.content}
                    </p>
                ))}
                <div ref={messageEndRef} />
            </div>
            <div>
            <input
                className="text-black w-full p-5"
                placeholder='What do you want to know about embeddedExpert?'
                type="text"
                value={userInput}
                onChange={handleInputChange}
                disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !userInput.trim()}>
                {loading ? 'Sending...' : 'Send'}
            </button>
            </div>
        </div>
    );
}
