'use client';

import { redirect } from 'next/navigation';

export default function ChatIndex() {
  redirect('/chat/new');
}
