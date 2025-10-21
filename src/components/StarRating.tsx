import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = 'md',
  className 
}: StarRatingProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const starSize = sizeClasses[size];

  return (
    <div className={cn('flex gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          disabled={readonly}
          className={cn(
            'transition-all',
            !readonly && 'hover:scale-110 cursor-pointer',
            readonly && 'cursor-default'
          )}
        >
          <Star
            className={cn(
              starSize,
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
