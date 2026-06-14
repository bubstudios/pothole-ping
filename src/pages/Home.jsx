import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8 bg-card rounded-2xl border shadow-sm max-w-md">
        <h1 className="font-heading font-bold text-2xl mb-2">PotholePing</h1>
        <p className="text-muted-foreground">Home page loads! The issue is in a sub-component.</p>
      </div>
    </div>
  );
}