import React from 'react';

type AvatarProps = {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function Avatar({ name = 'User', src, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  };

  return src ? (
    <img src={src} alt={name} className={`rounded-full object-cover ${sizeClasses[size]}`} />
  ) : (
    <div className={`flex items-center justify-center rounded-full bg-blue-600 font-semibold text-white ${sizeClasses[size]}`}>{name.charAt(0).toUpperCase()}</div>
  );
}
