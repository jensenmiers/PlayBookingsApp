import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  BRAND_CONCEPT_IDS,
  BRAND_CONCEPTS,
  BrandConceptPreview,
  type BrandConceptId,
} from '@/components/brand-concepts/brand-concept-preview'

type PageProps = {
  params: Promise<{ concept: string }>
}

export const dynamicParams = false

function isBrandConceptId(value: string): value is BrandConceptId {
  return BRAND_CONCEPT_IDS.some((concept) => concept === value)
}

export function generateStaticParams() {
  return BRAND_CONCEPT_IDS.map((concept) => ({ concept }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { concept } = await params

  if (!isBrandConceptId(concept)) {
    return {
      title: 'Brand Concept Not Found',
      robots: { index: false, follow: false },
    }
  }

  const definition = BRAND_CONCEPTS[concept]

  return {
    title: `${definition.name} — Brand Concept ${concept}`,
    description: definition.thesis,
    robots: { index: false, follow: false },
  }
}

export default async function BrandConceptRoute({ params }: PageProps) {
  const { concept } = await params

  if (!isBrandConceptId(concept)) {
    notFound()
  }

  return <BrandConceptPreview concept={concept} />
}
