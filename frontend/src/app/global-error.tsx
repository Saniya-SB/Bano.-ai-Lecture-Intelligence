"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#F6F2E9] p-6 text-[#25251F]">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Critical Application Error</h2>
          <p className="text-sm text-[#6B6A61] mb-6">
            A critical error occurred. Please try reloading the application.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-[#B85C43] px-4 py-2 text-sm font-medium text-white shadow-none hover:bg-[#A24E38]"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
