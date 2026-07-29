import React from 'react';
import { Image } from 'react-native';
import topIcon from '../../../../assets/remoteControlScreen/top.png';
import leftIcon from '../../../../assets/remoteControlScreen/left.png';
import rightIcon from '../../../../assets/remoteControlScreen/right.png';
import downIcon from '../../../../assets/remoteControlScreen/down.png';
import type { Direction } from '../type';
import { styles } from '../remoteControl.styles';

export type RemoteDirectionIndicatorsProps = {
  direction: Direction | null;
};

export function RemoteDirectionIndicators({
  direction,
}: RemoteDirectionIndicatorsProps) {
  return (
    <>
      <Image
        source={topIcon}
        style={[styles.directionIcon, styles.directionIconTop]}
        tintColor={direction === 'top' ? '#f5f8fa' : '#ccc'}
      />
      <Image
        source={leftIcon}
        style={[styles.directionIcon, styles.directionIconLeft]}
        tintColor={direction === 'left' ? '#f5f8fa' : '#ccc'}
      />
      <Image
        source={rightIcon}
        style={[styles.directionIcon, styles.directionIconRight]}
        tintColor={direction === 'right' ? '#f5f8fa' : '#ccc'}
      />
      <Image
        source={downIcon}
        style={[styles.directionIcon, styles.directionIconBottom]}
        tintColor={direction === 'bottom' ? '#f5f8fa' : '#ccc'}
      />
    </>
  );
}
