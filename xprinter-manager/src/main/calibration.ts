import type { LabelProfile, UserAlignmentFeedback, CalibrationState } from '../shared/types';
import { logger } from './logger';

const MAX_OFFSET_MM = 20;

export function applyFeedback(
  profile: LabelProfile,
  feedback: UserAlignmentFeedback
): LabelProfile {
  let dx = 0;
  let dy = 0;

  if (feedback.xDirection === 'left') dx = feedback.xAmountMm;
  else if (feedback.xDirection === 'right') dx = -feedback.xAmountMm;

  if (feedback.yDirection === 'up') dy = -feedback.yAmountMm;
  else if (feedback.yDirection === 'down') dy = feedback.yAmountMm;

  const newLeftOffset = clamp(profile.leftOffsetMm + dx, -MAX_OFFSET_MM, MAX_OFFSET_MM);
  const newTopOffset = clamp(profile.topOffsetMm + dy, -MAX_OFFSET_MM, MAX_OFFSET_MM);

  logger.info(
    `Calibration adjustment: X ${dx >= 0 ? '+' : ''}${dx.toFixed(2)}mm, Y ${dy >= 0 ? '+' : ''}${dy.toFixed(2)}mm`,
    `New offsets: left=${newLeftOffset.toFixed(2)}mm, top=${newTopOffset.toFixed(2)}mm`
  );

  return {
    ...profile,
    leftOffsetMm: Math.round(newLeftOffset * 100) / 100,
    topOffsetMm: Math.round(newTopOffset * 100) / 100,
  };
}

export function initCalibrationState(
  printerName: string,
  profile: LabelProfile
): CalibrationState {
  return {
    printerName,
    profileId: profile.id,
    currentOffsetX: profile.leftOffsetMm,
    currentOffsetY: profile.topOffsetMm,
    iteration: 0,
    history: [],
  };
}

export function advanceCalibration(
  state: CalibrationState,
  feedback: UserAlignmentFeedback
): CalibrationState {
  return {
    ...state,
    iteration: state.iteration + 1,
    history: [
      ...state.history,
      {
        iteration: state.iteration,
        offsetX: state.currentOffsetX,
        offsetY: state.currentOffsetY,
        feedback,
      },
    ],
  };
}

export function isCalibrated(feedback: UserAlignmentFeedback): boolean {
  return (
    feedback.xDirection === 'center' &&
    feedback.yDirection === 'center'
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
