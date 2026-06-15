import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function SupportButton() {
  return (
    <Link
      to="/donate"
      className="absolute top-4 right-4 z-[1001] w-9 h-9 rounded-full bg-pink-500 text-white shadow-lg hover:bg-pink-600 transition-colors flex items-center justify-center"
      title="Support PotholePing"
    >
      <Heart className="w-4 h-4" />
    </Link>
  );
}