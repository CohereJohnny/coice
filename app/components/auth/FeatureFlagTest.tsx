'use client'
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag'

export default function FeatureFlagTest() {
  const [enabled, loading] = useFeatureFlag('googleOauth')
  return (
    <div style={{ color: 'purple', fontWeight: 'bold', textAlign: 'center', margin: 20 }}>
      FeatureFlagTest: enabled={String(enabled)} loading={String(loading)}
    </div>
  )
} 