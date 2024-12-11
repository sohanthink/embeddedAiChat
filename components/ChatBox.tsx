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
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const { reply } = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred. Please try again." },
      ]);
    } finally {
      setLoading(false);
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="chat-box w-full md:w-2/4 flex flex-col justify-between h-[95vh] md:h-screen">
      <h3 className="text-lg md:text-[40px] font-sans font-bold text-white leading-7 md:leading-10">
        Hey there,
        <br /> What would you like to know about{" "}
        <span className="bg-slate-200 text-black p-2 rounded-e-full leading-10 md:leading-[80px]">
          embeddedExpert?
        </span>
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
              className={`${
                msg.role === "assistant"
                  ? "w-3/4 bg-slate-600 p-3 rounded-xl rounded-tl-none"
                  : "font-bold bg-slate-100 p-2 text-black rounded-xl rounded-tr-none"
              }`}
            >
              {msg.role === "assistant"
                ? msg.content.split("\n").map((line, index) => (
                    <span key={index}>
                      {line}
                      <br />
                      <br />
                    </span>
                  ))
                : msg.content}
            </span>
          </p>
        ))}
        <div ref={messageEndRef} />
      </div>
      <div className="p-4 flex items-center mb-3">
        <input
          className="text-emerald-950 w-full px-4 py-6 rounded-xl border-2 mr-2"
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
          className="bg-slate-700 text-white p-6 rounded-xl cursor-pointer"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
