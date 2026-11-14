import { useMemo } from 'react';
import { useArogyaStore } from '../store/useArogyaStore';
import type { DriveAssetRole } from '../types';

export function useDriveMedia() {
  const driveAssets = useArogyaStore((s) => s.driveAssets);

  return useMemo(() => {
    const findByRole = (role: DriveAssetRole) =>
      driveAssets.find((item) => item.role === role);

    const videoAsset = findByRole('dashboard_video');
    const astronautModel = findByRole('astronaut_model');
    const brainModel = findByRole('brain_model');
    const heartModel = findByRole('heart_model');
    const lungsModel = findByRole('lungs_model');
    const imageAssets = driveAssets.filter((item) => item.role === 'image_asset');
    const supplementaryFiles = driveAssets.filter(
      (item) => item.role === 'supplementary_file'
    );

    return {
      allAssets: driveAssets,
      videoUrl: videoAsset?.objectUrl,
      videoAsset,
      astronautModelUrl: astronautModel?.objectUrl,
      brainModelUrl: brainModel?.objectUrl,
      heartModelUrl: heartModel?.objectUrl,
      lungsModelUrl: lungsModel?.objectUrl,
      imageAssets,
      supplementaryFiles,
      hasSyncedAssets: driveAssets.length > 0,
    };
  }, [driveAssets]);
}
