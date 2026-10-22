import React from 'react';
import Svg, { Path } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

export function PlayIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.2-6.86a1 1 0 0 0 0-1.68l-10.2-6.86A1 1 0 0 0 8 5.14z" fill={color} />
    </Svg>
  );
}

export function PencilIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={color}
      />
    </Svg>
  );
}

export function TrashIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 7h12l-.8 13.2a1 1 0 0 1-1 .8H7.8a1 1 0 0 1-1-.8L6 7zm3.5-3h5l1 2h4v2H4.5V6h4l1-2z"
        fill={color}
      />
    </Svg>
  );
}

export function CheckIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill={color} />
    </Svg>
  );
}
