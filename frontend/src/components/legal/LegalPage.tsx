import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalPage({ title, description, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white px-4 py-10 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-charcoal-600 transition-colors hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mb-10 border-b border-cream-200 pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-700">
            Dual Kitchens · Policies
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-charcoal-600">
            {description}
          </p>
          <p className="mt-4 text-xs text-charcoal-500">
            Last updated: 31 October 2026
          </p>
        </header>

        <div className="space-y-8 text-sm leading-7 text-charcoal-700 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-charcoal-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2 [&_a]:font-medium [&_a]:text-primary-700 [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </article>
    </div>
  );
}
