"use client";

import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}
