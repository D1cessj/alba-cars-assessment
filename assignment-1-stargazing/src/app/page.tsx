import { Suspense } from "react";
import { StarsBackground } from "@/components/StarsBackground";
import { StargazingApp } from "@/components/StargazingApp";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center">
      <StarsBackground />
      <Suspense fallback={null}>
        <StargazingApp />
      </Suspense>
    </main>
  );
}
