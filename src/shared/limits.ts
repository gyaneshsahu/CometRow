// Pilot policy lives here; future plan settings must resolve through this module.
export const pilotLimits = Object.freeze({
  videosPerCampaign: 2,
  videoDurationSeconds: 120,
  videoUploadBytes: 200 * 1024 * 1024,
  imagesPerCampaign: 10,
  imageUploadBytes: 10 * 1024 * 1024,
  blocksPerCampaign: 20,
  channelsPerCampaign: 10,
  retainedVersions: 10,
  analyticsRetentionDays: 90,
  deletedCampaignRetentionDays: 30,
});
