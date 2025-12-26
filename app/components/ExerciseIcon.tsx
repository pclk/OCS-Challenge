'use client';

import Image from 'next/image';

interface ExerciseIconProps {
  exerciseName: string;
  className?: string;
}

export default function ExerciseIcon({ exerciseName, className = 'w-5 h-5' }: ExerciseIconProps) {
  const normalizedName = exerciseName.toLowerCase().trim();
  
  // Map exercise names to image files
  // Default to dumbbell.png for newly added exercises
  let imageSrc = '/dumbbell.png';
  
  if (normalizedName.includes('burpee')) {
    imageSrc = '/burpee.png';
  } else if (normalizedName.includes('push') || normalizedName.includes('push-up')) {
    imageSrc = '/pushup.png';
  } else if (normalizedName.includes('situp') || normalizedName.includes('sit-up') || normalizedName.includes('sit up')) {
    imageSrc = '/situp.png';
  } else if (normalizedName.includes('squat') || normalizedName.includes('pulse')) {
    imageSrc = '/squat.png';
  }
  
  // Extract width and height from className if provided, default to 20
  const size = className.includes('w-') ? parseInt(className.match(/w-(\d+)/)?.[1] || '5') * 4 : 20;
  
  return (
    <Image
      src={imageSrc}
      alt={exerciseName}
      width={size}
      height={size}
      className={className}
      style={{ 
        // Convert black to accent color (#ff7301) using CSS filter
        // brightness(0) makes it black, then we use sepia and hue-rotate to get orange
        filter: 'brightness(0) saturate(100%) invert(70%) sepia(100%) saturate(5000%) hue-rotate(0deg) brightness(1.2)',
      }}
    />
  );
}

