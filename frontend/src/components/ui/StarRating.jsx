import { Star } from 'lucide-react';

export default function StarRating({ rating, count, size = 14 }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'} />
      ))}
      <span className="text-sm text-gray-300 ml-1">{rating}</span>
      {count !== undefined && <span className="text-xs text-gray-500">({count})</span>}
    </div>
  );
}
