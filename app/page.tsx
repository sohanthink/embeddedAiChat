import ChatBox from "@/components/ChatBox";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full w-full">
      <div className="flex flex-col h-screen items-center justify-between p-5 gap-3">
        <ChatBox />
      </div>
    </div>
  );
}
