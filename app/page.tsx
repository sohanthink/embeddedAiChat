import ChatBox from "@/components/ChatBox";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-slate-400 h-full w-full">
      <div className="flex flex-col h-screen items-center justify-between p-5">
        <h3 className='text-[40px] font-sans font-bold'>Hey there,<br/> What would you like to know?</h3>
        <ChatBox/>
      </div>
    </div>
  );
}
