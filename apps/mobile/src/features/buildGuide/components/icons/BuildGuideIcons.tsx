import React from 'react';
import { Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import leftIcon from '../../../../../assets/buildGuideScreen/ChevronLeftIcon.png';
import rightIcon from '../../../../../assets/buildGuideScreen/ChevronRightIcon.png';
import listIcon from '../../../../../assets/buildGuideScreen/listIcon.png';
import settingsIcon from '../../../../../assets/buildGuideScreen/setting.png';
import backIcon from '../../../../../assets/buildGuideScreen/back.png';
type IconProps = {
  width?: number;
  height?: number;
  color?: string;
};

export function ChevronLeftIcon({
  width = 24,
  height = 24,
  color = '#111827',
}: IconProps) {
  return (
    <Image source={leftIcon} style={{ width, height, tintColor: color }} />
  );
}

export function ChevronRightIcon({
  width = 24,
  height = 24,
  color = '#111827',
}: IconProps) {
  return (
    <Image source={rightIcon} style={{ width, height, tintColor: color }} />
  );
}

export function ListIcon({
  width = 24,
  height = 24,
  color = '#111827',
}: IconProps) {
  return (
    <Image source={listIcon} style={{ width, height, tintColor: color }} />
  );
}

// export function CheckIcon({ size = 24, color = '#047857' }: IconProps) {
//   return (
//     <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//       <Path
//         d="M20 6L9 17l-5-5"
//         stroke={color}
//         strokeWidth={2}
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </Svg>
//   );
// }

export function SettingsIcon({
  width = 24,
  height = 24,
  color = '#111827',
}: IconProps) {
  return (
    <Image source={settingsIcon} style={{ width, height, tintColor: color }} />
  );
}

export function BackIcon({
  width = 24,
  height = 24,
  color = '#111827',
}: IconProps) {
  return (
    <Image source={backIcon} style={{ width, height, tintColor: color }} />
  );
}
