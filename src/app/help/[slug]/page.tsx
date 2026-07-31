import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/core/server/prisma";

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) { const article = await prisma.helpArticle.findFirst({ where: { slug: (await params).slug, status: "PUBLISHED" } }); if (!article) notFound(); return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/help" className="text-sm font-semibold text-blue-700 hover:underline">← Help center</Link><article className="prose mt-6 max-w-none"><h1>{article.title}</h1>{article.summary ? <p className="lead">{article.summary}</p> : null}<ReactMarkdown>{article.content}</ReactMarkdown></article></main>; }
