"use client";
import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-3xl font-bold mb-2">☪️ Islomiy Hisobchi</h1>
            <p className="opacity-60 mb-10 text-sm">Hanafiy mazhabi qoidalari asosida</p>
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <Link href="/inheritance" className="primary-btn block py-4 rounded-xl text-center font-bold bg-blue-600 text-white">📜 Meros (Faroiz)</Link>
                <Link href="/zakat" className="primary-btn block py-4 rounded-xl text-center font-bold bg-green-600 text-white">💰 Zakot</Link>
                <Link href="/will" className="primary-btn block py-4 rounded-xl text-center font-bold bg-purple-600 text-white">✍️ Vasiyat</Link>
            </div>
            <p className="mt-16 text-xs opacity-30 italic">Ilova maslahat beradi, fatvo emas.</p>
        </div>
    );
}
