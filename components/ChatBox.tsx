"use client";

import Image from "next/image";
import { send } from "process";
import { useState, ChangeEvent, useRef, useEffect } from "react";
import logo from "@/public/logo icon white.png";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false); // Track loading state
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Load cached messages from local storage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    setUserInput(e.target.value);

  // Function to auto-scroll to the latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage: Message = { role: "user", content: userInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setUserInput("");
    setLoading(true); // Start loading

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again.",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="chat-box w-2/4 flex flex-col justify-between h-screen">
      <h3 className="text-[40px] font-sans font-bold text-white">
        Hey there,
        <br /> What would you like to know about{" "}
        <span className="text-fuchsia-300">embeddedExpert?</span>
      </h3>
      <div className="messages overflow-y-auto py-4 h-[650px]">
        {messages.map((msg, index) => (
          <p
            key={index}
            className={`${msg.role} py-3 text-right text-white ${
              msg.role == "assistant" &&
              "flex items-center justify gap-4 text-start"
            }`}
          >
            <strong>
              {msg.role === "user" ? (
                ""
              ) : (
                <Image objectFit="cover" width={50} src={logo} alt="logo" />
              )}
            </strong>{" "}
            <span
              className={`${msg.role === "assistant" ? "w-3/4" : "font-bold"}`}
            >
              {msg.content}
            </span>
          </p>
        ))}
        <div ref={messageEndRef} />
      </div>
      <div className="p-4 flex items-center">
        <input
          className="text-emerald-950 w-full p-3 rounded-full border-2 mr-2"
          placeholder="Ask Anything about embeddedExpert !!"
          type="text"
          value={userInput}
          onChange={handleInputChange}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && userInput.trim()) {
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !userInput.trim()}
          className="bg-blue-500 text-white p-3 rounded-full"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
