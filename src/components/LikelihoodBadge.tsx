import type { Likelihood } from '../model/types'
import Badge from './Badge'

const TONE: Record<Likelihood, 'red' | 'amber' | 'gray'> = { likely: 'red', possible: 'amber', unlikely: 'gray' }
const LABEL: Record<Likelihood, string> = { likely: 'Likely', possible: 'Possible', unlikely: 'Unlikely' }

/** SCF 2026.3+ likelihood rating; renders nothing for releases without ratings. */
export default function LikelihoodBadge({ rating }: { rating: Likelihood | undefined }) {
  if (!rating) return null
  return (
    <Badge tone={TONE[rating]}>
      <span title="SCF likelihood rating">{LABEL[rating]}</span>
    </Badge>
  )
}
