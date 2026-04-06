import { generateStructuredData } from '@/lib/structured-data';

export default function StructuredData() {
  const structuredData = generateStructuredData();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
